import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createSeed } from './lib/seed'
import { qtyAt } from './lib/inventory'
import { generateOtp, hashPassword, nowIso, uid } from './lib/utils'
import type {
  AppState,
  Category,
  Document,
  DocumentLine,
  DocType,
  Location,
  Product,
  ReorderRule,
  Role,
  User,
  Warehouse,
} from './types'

const KEY = 'stocksense-v1'

const PREFIX: Record<DocType, string> = {
  receipt: 'WH/IN',
  delivery: 'WH/OUT',
  internal: 'WH/INT',
  adjustment: 'WH/ADJ',
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {
    /* ignore */
  }
  const seed = createSeed()
  localStorage.setItem(KEY, JSON.stringify(seed))
  return seed
}

function persist(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

function nextNumber(state: AppState, type: DocType): { number: string; sequences: AppState['sequences'] } {
  const n = state.sequences[type] + 1
  return {
    number: `${PREFIX[type]}/${String(n).padStart(5, '0')}`,
    sequences: { ...state.sequences, [type]: n },
  }
}

function applyQty(
  state: AppState,
  productId: string,
  locationId: string,
  delta: number,
): AppState {
  const idx = state.quants.findIndex((q) => q.productId === productId && q.locationId === locationId)
  const quants = [...state.quants]
  if (idx === -1) {
    if (delta === 0) return state
    quants.push({ id: uid('q'), productId, locationId, qty: delta })
  } else {
    const next = { ...quants[idx], qty: quants[idx].qty + delta }
    if (next.qty === 0) quants.splice(idx, 1)
    else quants[idx] = next
  }
  return { ...state, quants }
}

type StoreApi = {
  state: AppState
  currentUser: User | null
  login: (email: string, password: string) => Promise<string | null>
  signup: (input: { name: string; email: string; password: string; role: Role; phone: string }) => Promise<string | null>
  logout: () => void
  requestOtp: (email: string) => Promise<{ error: string | null; otp?: string }>
  resetPassword: (email: string, otp: string, password: string) => Promise<string | null>
  updateProfile: (patch: Partial<Pick<User, 'name' | 'phone' | 'role'>>) => void
  saveProduct: (product: Omit<Product, 'id'> & { id?: string; initialStock?: number; locationId?: string }) => string
  saveCategory: (name: string) => string
  saveReorderRule: (rule: Omit<ReorderRule, 'id'> & { id?: string }) => void
  deleteReorderRule: (id: string) => void
  saveWarehouse: (wh: Omit<Warehouse, 'id'> & { id?: string }) => string
  saveLocation: (loc: Omit<Location, 'id'> & { id?: string }) => void
  saveDocument: (doc: Partial<Document> & { type: DocType }) => string
  confirmDocument: (id: string) => string | null
  pickDocument: (id: string) => string | null
  packDocument: (id: string) => string | null
  validateDocument: (id: string) => string | null
  cancelDocument: (id: string) => string | null
  defaultLocations: (type: DocType, warehouseId: string) => { source: string; dest: string }
}

const StoreContext = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => {
    persist(state)
  }, [state])

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.sessionUserId) ?? null,
    [state.users, state.sessionUserId],
  )

  const api = useMemo<StoreApi>(() => {
    const login: StoreApi['login'] = async (email, password) => {
      const hash = await hashPassword(password)
      const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      if (!user || user.passwordHash !== hash) return 'Invalid email or password.'
      setState((s) => ({ ...s, sessionUserId: user.id }))
      return null
    }

    const signup: StoreApi['signup'] = async (input) => {
      if (state.users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
        return 'An account with this email already exists.'
      }
      if (input.password.length < 6) return 'Password must be at least 6 characters.'
      const user: User = {
        id: uid('usr'),
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        passwordHash: await hashPassword(input.password),
        role: input.role,
        phone: input.phone.trim(),
      }
      setState((s) => ({ ...s, users: [...s.users, user], sessionUserId: user.id }))
      return null
    }

    const logout = () => setState((s) => ({ ...s, sessionUserId: null }))

    const requestOtp: StoreApi['requestOtp'] = async (email) => {
      const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      if (!user) return { error: 'No account found for that email.' }
      const code = generateOtp()
      setState((s) => ({
        ...s,
        pendingOtp: { email: user.email, code, expiresAt: Date.now() + 10 * 60 * 1000 },
      }))
      return { error: null, otp: code }
    }

    const resetPassword: StoreApi['resetPassword'] = async (email, otp, password) => {
      const pending = state.pendingOtp
      if (!pending || pending.email !== email.trim().toLowerCase()) return 'Request a new OTP first.'
      if (Date.now() > pending.expiresAt) return 'OTP expired. Request a new one.'
      if (pending.code !== otp.trim()) return 'Incorrect OTP.'
      if (password.length < 6) return 'Password must be at least 6 characters.'
      const hash = await hashPassword(password)
      setState((s) => ({
        ...s,
        pendingOtp: null,
        users: s.users.map((u) =>
          u.email === pending.email ? { ...u, passwordHash: hash } : u,
        ),
      }))
      return null
    }

    const updateProfile: StoreApi['updateProfile'] = (patch) => {
      if (!state.sessionUserId) return
      setState((s) => ({
        ...s,
        users: s.users.map((u) => (u.id === s.sessionUserId ? { ...u, ...patch } : u)),
      }))
    }

    const saveCategory: StoreApi['saveCategory'] = (name) => {
      const existing = state.categories.find((c) => c.name.toLowerCase() === name.trim().toLowerCase())
      if (existing) return existing.id
      const cat: Category = { id: uid('cat'), name: name.trim() }
      setState((s) => ({ ...s, categories: [...s.categories, cat] }))
      return cat.id
    }

    const saveProduct: StoreApi['saveProduct'] = (product) => {
      const id = product.id ?? uid('prd')
      setState((s) => {
        let next: AppState = { ...s }
        const body: Product = {
          id,
          name: product.name.trim(),
          sku: product.sku.trim().toUpperCase(),
          categoryId: product.categoryId,
          uom: product.uom,
          description: product.description.trim(),
        }
        const idx = next.products.findIndex((p) => p.id === id)
        const products = [...next.products]
        if (idx === -1) products.push(body)
        else products[idx] = body
        next = { ...next, products }
        if (!product.id && product.initialStock && product.initialStock > 0 && product.locationId) {
          next = applyQty(next, id, product.locationId, product.initialStock)
          next = {
            ...next,
            ledger: [
              {
                id: uid('led'),
                date: nowIso(),
                productId: id,
                fromLocationId: null,
                toLocationId: product.locationId,
                qty: product.initialStock,
                type: 'initial',
                documentId: null,
                documentNumber: 'OPENING',
                note: 'Initial stock',
                userId: next.sessionUserId ?? 'system',
              },
              ...next.ledger,
            ],
          }
        }
        return next
      })
      return id
    }

    const saveReorderRule: StoreApi['saveReorderRule'] = (rule) => {
      setState((s) => {
        const id = rule.id ?? uid('rr')
        const body: ReorderRule = { ...rule, id }
        const rules = [...s.reorderRules]
        const idx = rules.findIndex((r) => r.id === id)
        if (idx === -1) rules.push(body)
        else rules[idx] = body
        return { ...s, reorderRules: rules }
      })
    }

    const deleteReorderRule: StoreApi['deleteReorderRule'] = (id) => {
      setState((s) => ({ ...s, reorderRules: s.reorderRules.filter((r) => r.id !== id) }))
    }

    const saveWarehouse: StoreApi['saveWarehouse'] = (wh) => {
      const id = wh.id ?? uid('wh')
      setState((s) => {
        const body: Warehouse = { id, name: wh.name.trim(), code: wh.code.trim().toUpperCase(), address: wh.address.trim() }
        const warehouses = [...s.warehouses]
        const idx = warehouses.findIndex((w) => w.id === id)
        let locations = s.locations
        if (idx === -1) {
          warehouses.push(body)
          locations = [
            ...locations,
            {
              id: uid('loc'),
              warehouseId: id,
              name: 'Stock',
              code: `${body.code}/Stock`,
              type: 'internal',
            },
          ]
        } else warehouses[idx] = body
        return { ...s, warehouses, locations }
      })
      return id
    }

    const saveLocation: StoreApi['saveLocation'] = (loc) => {
      setState((s) => {
        const id = loc.id ?? uid('loc')
        const body: Location = { ...loc, id, name: loc.name.trim(), code: loc.code.trim() }
        const locations = [...s.locations]
        const idx = locations.findIndex((l) => l.id === id)
        if (idx === -1) locations.push(body)
        else locations[idx] = body
        return { ...s, locations }
      })
    }

    const defaultLocations: StoreApi['defaultLocations'] = (type, warehouseId) => {
      const internals = state.locations.filter((l) => l.warehouseId === warehouseId && l.type === 'internal')
      const stock = internals.find((l) => l.code.endsWith('/Stock')) ?? internals[0]
      const vendor = state.locations.find((l) => l.type === 'vendor')
      const customer = state.locations.find((l) => l.type === 'customer')
      const loss = state.locations.find((l) => l.type === 'inventory_loss')
      if (type === 'receipt') return { source: vendor?.id ?? '', dest: stock?.id ?? '' }
      if (type === 'delivery') return { source: stock?.id ?? '', dest: customer?.id ?? '' }
      if (type === 'adjustment') return { source: stock?.id ?? '', dest: loss?.id ?? '' }
      return { source: stock?.id ?? '', dest: internals[1]?.id ?? stock?.id ?? '' }
    }

    const saveDocument: StoreApi['saveDocument'] = (doc) => {
      const id = doc.id ?? uid('doc')
      setState((s) => {
        const existing = s.documents.find((d) => d.id === id)
        if (existing && existing.status !== 'draft') return s
        let sequences = s.sequences
        let number = existing?.number
        if (!number) {
          const nxt = nextNumber(s, doc.type)
          number = nxt.number
          sequences = nxt.sequences
        }
        const warehouseId = doc.warehouseId ?? s.warehouses[0]?.id ?? ''
        const defaults = defaultLocations(doc.type, warehouseId)
        const body: Document = {
          id,
          number,
          type: doc.type,
          status: 'draft',
          warehouseId,
          sourceLocationId: doc.sourceLocationId ?? defaults.source,
          destLocationId: doc.destLocationId ?? defaults.dest,
          partnerName: doc.partnerName ?? '',
          scheduledDate: doc.scheduledDate ?? nowIso().slice(0, 10),
          notes: doc.notes ?? '',
          lines: (doc.lines ?? []).map((l) => ({
            id: l.id || uid('ln'),
            productId: l.productId,
            qty: Number(l.qty) || 0,
            countedQty: l.countedQty,
          })),
          createdAt: existing?.createdAt ?? nowIso(),
          pickDone: false,
          packDone: false,
          createdBy: s.sessionUserId ?? 'system',
        }
        const documents = existing
          ? s.documents.map((d) => (d.id === id ? body : d))
          : [body, ...s.documents]
        return { ...s, documents, sequences }
      })
      return id
    }

    const patchDoc = (id: string, fn: (s: AppState, doc: Document) => AppState | string) => {
      let error: string | null = null
      setState((s) => {
        const doc = s.documents.find((d) => d.id === id)
        if (!doc) {
          error = 'Document not found.'
          return s
        }
        const result = fn(s, doc)
        if (typeof result === 'string') {
          error = result
          return s
        }
        return result
      })
      return error
    }

    const confirmDocument: StoreApi['confirmDocument'] = (id) =>
      patchDoc(id, (s, doc) => {
        if (doc.status !== 'draft') return 'Only draft documents can be confirmed.'
        if (!doc.lines.length) return 'Add at least one product line.'
        let status: Document['status'] = 'ready'
        if (doc.type === 'delivery') {
          const shortage = doc.lines.some((line) => qtyAt(s, line.productId, doc.sourceLocationId) < line.qty)
          status = shortage ? 'waiting' : 'ready'
        }
        return {
          ...s,
          documents: s.documents.map((d) => (d.id === id ? { ...d, status } : d)),
        }
      })

    const pickDocument: StoreApi['pickDocument'] = (id) =>
      patchDoc(id, (s, doc) => {
        if (doc.type !== 'delivery') return 'Pick applies to delivery orders only.'
        if (doc.status === 'waiting') {
          const shortage = doc.lines.some((line) => qtyAt(s, line.productId, doc.sourceLocationId) < line.qty)
          if (shortage) return 'Not enough stock to pick. Receive goods or reduce quantity.'
          return {
            ...s,
            documents: s.documents.map((d) =>
              d.id === id ? { ...d, status: 'ready', pickDone: true } : d,
            ),
          }
        }
        if (doc.status !== 'ready') return 'Document must be ready to pick.'
        return {
          ...s,
          documents: s.documents.map((d) => (d.id === id ? { ...d, pickDone: true } : d)),
        }
      })

    const packDocument: StoreApi['packDocument'] = (id) =>
      patchDoc(id, (s, doc) => {
        if (doc.type !== 'delivery') return 'Pack applies to delivery orders only.'
        if (!doc.pickDone) return 'Pick items before packing.'
        if (doc.status !== 'ready') return 'Document must be ready to pack.'
        return {
          ...s,
          documents: s.documents.map((d) => (d.id === id ? { ...d, packDone: true } : d)),
        }
      })

    const validateDocument: StoreApi['validateDocument'] = (id) =>
      patchDoc(id, (s, doc) => {
        if (doc.status === 'done') return 'Already validated.'
        if (doc.status === 'canceled') return 'Canceled documents cannot be validated.'
        if (doc.status === 'draft') return 'Confirm the document first.'
        if (doc.type === 'delivery') {
          if (!doc.pickDone || !doc.packDone) return 'Pick and pack must be completed before validation.'
        }
        if (doc.status === 'waiting') return 'Waiting for availability.'

        let next = s
        const userId = s.sessionUserId ?? 'system'
        const ledgerAdds = []

        for (const line of doc.lines) {
          if (!line.productId || line.qty <= 0) continue
          if (doc.type === 'receipt') {
            next = applyQty(next, line.productId, doc.destLocationId, line.qty)
            ledgerAdds.push({
              id: uid('led'),
              date: nowIso(),
              productId: line.productId,
              fromLocationId: doc.sourceLocationId,
              toLocationId: doc.destLocationId,
              qty: line.qty,
              type: doc.type,
              documentId: doc.id,
              documentNumber: doc.number,
              note: doc.notes || 'Incoming stock',
              userId,
            })
          } else if (doc.type === 'delivery' || doc.type === 'internal') {
            const available = qtyAt(next, line.productId, doc.sourceLocationId)
            if (available < line.qty) return `Insufficient stock for a product (have ${available}, need ${line.qty}).`
            next = applyQty(next, line.productId, doc.sourceLocationId, -line.qty)
            next = applyQty(next, line.productId, doc.destLocationId, line.qty)
            ledgerAdds.push({
              id: uid('led'),
              date: nowIso(),
              productId: line.productId,
              fromLocationId: doc.sourceLocationId,
              toLocationId: doc.destLocationId,
              qty: line.qty,
              type: doc.type,
              documentId: doc.id,
              documentNumber: doc.number,
              note: doc.notes || (doc.type === 'delivery' ? 'Outgoing stock' : 'Internal transfer'),
              userId,
            })
          } else {
            const current = qtyAt(next, line.productId, doc.sourceLocationId)
            const counted = line.countedQty ?? line.qty
            const diff = counted - current
            if (diff === 0) continue
            next = applyQty(next, line.productId, doc.sourceLocationId, diff)
            if (diff < 0) {
              next = applyQty(next, line.productId, doc.destLocationId, -diff)
            }
            ledgerAdds.push({
              id: uid('led'),
              date: nowIso(),
              productId: line.productId,
              fromLocationId: diff < 0 ? doc.sourceLocationId : doc.destLocationId,
              toLocationId: diff < 0 ? doc.destLocationId : doc.sourceLocationId,
              qty: Math.abs(diff),
              type: doc.type,
              documentId: doc.id,
              documentNumber: doc.number,
              note: doc.notes || `Physical count ${counted} (was ${current})`,
              userId,
            })
          }
        }

        return {
          ...next,
          ledger: [...ledgerAdds, ...next.ledger],
          documents: next.documents.map((d) =>
            d.id === id ? { ...d, status: 'done' as const, validatedAt: nowIso() } : d,
          ),
        }
      })

    const cancelDocument: StoreApi['cancelDocument'] = (id) =>
      patchDoc(id, (s, doc) => {
        if (doc.status === 'done') return 'Validated documents cannot be canceled.'
        return {
          ...s,
          documents: s.documents.map((d) => (d.id === id ? { ...d, status: 'canceled' } : d)),
        }
      })

    return {
      state,
      currentUser,
      login,
      signup,
      logout,
      requestOtp,
      resetPassword,
      updateProfile,
      saveProduct,
      saveCategory,
      saveReorderRule,
      deleteReorderRule,
      saveWarehouse,
      saveLocation,
      saveDocument,
      confirmDocument,
      pickDocument,
      packDocument,
      validateDocument,
      cancelDocument,
      defaultLocations,
    }
  }, [state, currentUser])

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('Store missing')
  return ctx
}

export function emptyLine(): DocumentLine {
  return { id: uid('ln'), productId: '', qty: 1 }
}
