import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createSeed } from './lib/seed'
import { availableStock, qtyAt } from './lib/inventory'
import { generateOtp, hashPassword, nowIso, uid } from './lib/utils'
import { canUser } from './lib/rbac'
import { evaluateSystemNotifications } from './lib/notifications'
import type {
  AlertRulesConfig,
  AppState,
  ApprovalSettings,
  AuditAction,
  AuditLogEntry,
  BarcodeFormat,
  BarcodeRecord,
  CompanySettings,
  CycleCount,
  CycleCountLine,
  CycleCountStatus,
  Customer,
  Document,
  DocumentLine,
  DocType,
  InventorySettings,
  Location,
  LocationExtension,
  Lot,
  Package,
  Permission,
  PickingLine,
  PickingOrder,
  PickingStatus,
  Product,
  ProductExtension,
  ProductVariant,
  PurchaseOrder,
  PurchaseOrderLine,
  PutawayRule,
  ReorderRule,
  ReturnDestination,
  ReturnLine,
  ReturnOrder,
  ReturnType,
  Role,
  SalesOrder,
  SalesOrderLine,
  SalesOrderStatus,
  SerialMovement,
  SerialNumber,
  SerialStatus,
  Shipment,
  ShipmentStatus,
  StockReservation,
  User,
  Vendor,
  Warehouse,
  WarehouseZone,
} from './types'

const KEY_V1 = 'stocksense-v1'
const KEY_V2 = 'stocksense-v2'
const KEY_V3 = 'stocksense-v3'
const KEY = 'stocksense-v4'

const PREFIX: Record<DocType, string> = {
  receipt: 'WH/IN',
  delivery: 'WH/OUT',
  internal: 'WH/INT',
  adjustment: 'WH/ADJ',
}

function loadState(): AppState {
  try {
    let raw = localStorage.getItem(KEY)
    if (!raw) raw = localStorage.getItem(KEY_V3)
    if (!raw) raw = localStorage.getItem(KEY_V2)
    if (!raw) raw = localStorage.getItem(KEY_V1)

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>
      const seed = createSeed()

      // Ensure users has at least the full set of default role users
      const existingUserIds = new Set((parsed.users || []).map((u) => u.id))
      const combinedUsers: User[] = [
        ...(parsed.users || []).map((u) => ({
          ...u,
          active: u.active ?? true,
          createdAt: u.createdAt ?? '2026-01-01T00:00:00.000Z',
          lastLogin: u.lastLogin,
        })),
        ...seed.users.filter((su) => !existingUserIds.has(su.id)),
      ]

      const merged: AppState = {
        users: combinedUsers,
        sessionUserId: parsed.sessionUserId ?? seed.sessionUserId,
        pendingOtp: parsed.pendingOtp ?? null,
        warehouses: parsed.warehouses || seed.warehouses,
        locations: parsed.locations || seed.locations,
        categories: parsed.categories || seed.categories,
        products: (parsed.products || seed.products).map((p) => {
          const seedProd = seed.products.find((sp) => sp.id === p.id)
          return {
            ...p,
            costPrice: p.costPrice ?? seedProd?.costPrice ?? 30,
            salesPrice: p.salesPrice ?? seedProd?.salesPrice ?? 55,
            primaryVendorId: p.primaryVendorId ?? seedProd?.primaryVendorId ?? seed.vendors[0]?.id,
          }
        }),
        reorderRules: parsed.reorderRules || seed.reorderRules,
        quants: parsed.quants || seed.quants,
        documents: parsed.documents || seed.documents,
        ledger: parsed.ledger || seed.ledger,
        sequences: { ...seed.sequences, ...(parsed.sequences || {}) },
        vendors: parsed.vendors && parsed.vendors.length ? parsed.vendors : seed.vendors,
        customers: parsed.customers && parsed.customers.length ? parsed.customers : seed.customers,
        purchaseOrders: parsed.purchaseOrders && parsed.purchaseOrders.length ? parsed.purchaseOrders : seed.purchaseOrders,
        salesOrders: parsed.salesOrders && parsed.salesOrders.length ? parsed.salesOrders : seed.salesOrders,
        reservations: parsed.reservations || seed.reservations,
        returnOrders: parsed.returnOrders && parsed.returnOrders.length ? parsed.returnOrders : seed.returnOrders,
        // v3 warehouse operations
        barcodeRecords: parsed.barcodeRecords || seed.barcodeRecords || [],
        productExtensions: parsed.productExtensions || seed.productExtensions || [],
        productVariants: parsed.productVariants || seed.productVariants || [],
        lots: parsed.lots || seed.lots || [],
        serials: parsed.serials || seed.serials || [],
        warehouseZones: parsed.warehouseZones || seed.warehouseZones || [],
        locationExtensions: parsed.locationExtensions || seed.locationExtensions || [],
        putawayRules: parsed.putawayRules || seed.putawayRules || [],
        cycleCounts: parsed.cycleCounts || seed.cycleCounts || [],
        pickingOrders: parsed.pickingOrders || seed.pickingOrders || [],
        packages: parsed.packages || seed.packages || [],
        shipments: parsed.shipments || seed.shipments || [],
        // v4 enterprise administration
        auditLogs: parsed.auditLogs || seed.auditLogs || [],
        notifications: parsed.notifications || seed.notifications || [],
        companySettings: parsed.companySettings || seed.companySettings,
        inventorySettings: parsed.inventorySettings || seed.inventorySettings,
        approvalSettings: parsed.approvalSettings || seed.approvalSettings,
        alertRules: parsed.alertRules || seed.alertRules,
      }
      localStorage.setItem(KEY, JSON.stringify(merged))
      return merged
    }
  } catch (err) {
    console.error('Failed to load state from localStorage:', err)
  }
  const seed = createSeed()
  localStorage.setItem(KEY, JSON.stringify(seed))
  return seed
}

function persist(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

function nextNumber(
  state: AppState,
  type: DocType,
): { number: string; sequences: AppState['sequences'] } {
  const n = (state.sequences[type] || 0) + 1
  return {
    number: `${PREFIX[type]}/${String(n).padStart(5, '0')}`,
    sequences: { ...state.sequences, [type]: n },
  }
}

function nextSeq(
  state: AppState,
  key: string,
  prefix: string,
  pad = 5,
): { number: string; sequences: AppState['sequences'] } {
  const n = (state.sequences[key] || 0) + 1
  return {
    number: `${prefix}/${String(n).padStart(pad, '0')}`,
    sequences: { ...state.sequences, [key]: n },
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

export type StoreApi = {
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

  // Vendor Management
  saveVendor: (vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => string
  toggleVendorStatus: (id: string) => void
  deleteVendor: (id: string) => void

  // Customer Management
  saveCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => string
  toggleCustomerStatus: (id: string) => void
  deleteCustomer: (id: string) => void

  // Purchase Orders
  savePurchaseOrder: (po: Partial<PurchaseOrder> & { vendorId: string; warehouseId: string }) => string
  sendPurchaseOrder: (id: string) => string | null
  receivePurchaseOrder: (
    id: string,
    receivedLines: { productId: string; qty: number }[],
    allowOverReceipt?: boolean,
  ) => string | null
  cancelPurchaseOrder: (id: string) => string | null
  duplicatePurchaseOrder: (id: string) => string

  // Sales Orders
  saveSalesOrder: (so: Partial<SalesOrder> & { customerId: string; warehouseId: string }) => string
  confirmSalesOrder: (id: string) => string | null
  reserveSalesOrderStock: (id: string) => string | null
  advanceSalesOrderStatus: (id: string, nextStatus: SalesOrderStatus) => string | null
  cancelSalesOrder: (id: string) => string | null
  duplicateSalesOrder: (id: string) => string

  // Returns
  saveReturnOrder: (order: Partial<ReturnOrder> & { type: ReturnType; warehouseId: string }) => string
  advanceReturnStatus: (
    id: string,
    nextStatus: string,
    dispositions?: Record<string, ReturnDestination>,
  ) => string | null

  // ── Warehouse Operations Addon ──────────────────────────────

  // Barcodes
  generateBarcode: (entityType: BarcodeRecord['entityType'], entityId: string, format?: BarcodeFormat) => string
  lookupBarcode: (barcode: string) => BarcodeRecord | null
  assignBarcode: (entityType: BarcodeRecord['entityType'], entityId: string, barcode: string, format?: BarcodeFormat) => string | null

  // Product extensions (tracking type, variants config)
  saveProductExtension: (ext: Omit<ProductExtension, 'productId'> & { productId: string }) => void

  // Variants
  saveVariant: (variant: Omit<ProductVariant, 'id' | 'createdAt'> & { id?: string }) => string
  deleteVariant: (id: string) => void
  toggleVariantActive: (id: string) => void

  // Lots
  saveLot: (lot: Omit<Lot, 'id' | 'createdAt'> & { id?: string }) => string
  deleteLot: (id: string) => void
  receiveLot: (lot: Omit<Lot, 'id' | 'createdAt'>) => string

  // Serials
  saveSerial: (serial: Omit<SerialNumber, 'id' | 'createdAt' | 'history'> & { id?: string }) => string | { error: string }
  moveSerial: (id: string, toLocationId: string, docId: string | null, docNumber: string, note: string) => string | null
  deliverSerial: (id: string, customerId: string, deliveryDocId: string, deliveryDocNumber: string) => string | null

  // Warehouse Zones
  saveZone: (zone: Omit<WarehouseZone, 'id'> & { id?: string }) => string
  deleteZone: (id: string) => void

  // Location Extensions
  saveLocationExtension: (ext: LocationExtension) => void

  // Putaway Rules
  savePutawayRule: (rule: Omit<PutawayRule, 'id' | 'createdAt'> & { id?: string }) => string
  deletePutawayRule: (id: string) => void
  suggestPutaway: (productId: string, warehouseId: string, categoryId?: string) => string | null

  // Cycle Counts
  saveCycleCount: (cc: Partial<CycleCount> & { warehouseId: string; locationId: string }) => string
  advanceCycleCount: (id: string, nextStatus: CycleCountStatus, lines?: CycleCountLine[]) => string | null
  postCycleCount: (id: string) => string | null

  // Picking
  savePickingOrder: (order: Partial<PickingOrder> & { warehouseId: string; documentIds: string[] }) => string
  advancePickingOrder: (id: string, nextStatus: PickingStatus) => string | null
  confirmPickingLine: (pickingId: string, lineId: string, qtyDone: number, serialId?: string, lotId?: string) => string | null

  // Packing
  savePackage: (pkg: Omit<Package, 'id' | 'createdAt'> & { id?: string }) => string
  sealPackage: (id: string) => string | null

  // Shipping
  saveShipment: (shipment: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => string
  advanceShipmentStatus: (id: string, nextStatus: ShipmentStatus) => string | null

  // ── Enterprise Administration Addon ─────────────────────────
  can: (permission: Permission) => { allowed: boolean; reason?: string }
  saveUser: (input: { id?: string; name: string; email: string; role: Role; phone: string; active?: boolean; password?: string }) => Promise<string | null>
  toggleUserStatus: (userId: string) => string | null
  resetUserPassword: (userId: string, newPassword: string) => Promise<string | null>
  deleteUser: (userId: string) => string | null
  logAudit: (
    action: AuditAction,
    entity: string,
    entityId: string,
    documentNumber?: string,
    oldValue?: any,
    newValue?: any,
    metadata?: Record<string, any>,
  ) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void
  triggerAlertEvaluation: () => void
  submitPurchaseOrderForApproval: (id: string) => string | null
  approvePurchaseOrder: (id: string, comment?: string) => string | null
  rejectPurchaseOrder: (id: string, comment?: string) => string | null
  approveDocument: (id: string, comment?: string) => string | null
  rejectDocument: (id: string, comment?: string) => string | null
  saveCompanySettings: (settings: CompanySettings) => string | null
  saveInventorySettings: (settings: InventorySettings) => string | null
  saveApprovalSettings: (settings: ApprovalSettings) => string | null
  saveAlertRules: (rules: AlertRulesConfig) => string | null
  saveSequences: (seqs: Record<string, number>) => string | null
}

const StoreContext = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => {
    persist(state)
  }, [state])

  useEffect(() => {
    setState((s) => {
      const fresh = evaluateSystemNotifications(s)
      if (fresh.length === 0) return s
      return {
        ...s,
        notifications: [...fresh, ...s.notifications],
      }
    })
  }, [])

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.sessionUserId) ?? null,
    [state.users, state.sessionUserId],
  )

  const api = useMemo<StoreApi>(() => {
    const login: StoreApi['login'] = async (email, password) => {
      const hash = await hashPassword(password)
      const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      if (!user || user.passwordHash !== hash) return 'Invalid email or password.'
      if (user.active === false) return 'This account has been deactivated. Please contact an administrator.'

      const now = nowIso()
      setState((s) => ({
        ...s,
        sessionUserId: user.id,
        users: s.users.map((u) => (u.id === user.id ? { ...u, lastLogin: now } : u)),
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            action: 'LOGIN',
            entity: 'Session',
            entityId: user.id,
            metadata: { email: user.email },
          },
          ...s.auditLogs,
        ],
      }))
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
        active: true,
        createdAt: nowIso(),
        lastLogin: nowIso(),
      }
      setState((s) => ({ ...s, users: [...s.users, user], sessionUserId: user.id }))
      return null
    }

    const logout = () => {
      const current = currentUser
      const now = nowIso()
      setState((s) => ({
        ...s,
        sessionUserId: null,
        auditLogs: current
          ? [
              {
                id: uid('aud'),
                timestamp: now,
                userId: current.id,
                userName: current.name,
                userEmail: current.email,
                userRole: current.role,
                action: 'LOGOUT',
                entity: 'Session',
                entityId: current.id,
              },
              ...s.auditLogs,
            ]
          : s.auditLogs,
      }))
    }

    const requestOtp: StoreApi['requestOtp'] = async (email) => {
      const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      if (!user) return { error: 'No account found for that email.' }
      const code = generateOtp()

      try {
        const res = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, otp: code }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.success) {
          return {
            error:
              data?.error ||
              'Failed to send OTP to your email. Please verify SMTP settings in the .env file.',
          }
        }
      } catch {
        return {
          error:
            'Could not reach the email server. Please ensure the backend is running.',
        }
      }

      setState((s) => ({
        ...s,
        pendingOtp: { email: user.email, code, expiresAt: Date.now() + 10 * 60 * 1000 },
      }))
      return { error: null }
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
      setState((s) => {
        if (!s.sessionUserId) return s
        return {
          ...s,
          users: s.users.map((u) => (u.id === s.sessionUserId ? { ...u, ...patch } : u)),
        }
      })
    }

    const saveProduct: StoreApi['saveProduct'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const id = input.id || uid('prd')
        createdId = id
        const exists = s.products.some((p) => p.id === id)
        const products = exists
          ? s.products.map((p) =>
              p.id === id
                ? {
                    ...p,
                    name: input.name.trim(),
                    sku: input.sku.trim(),
                    categoryId: input.categoryId,
                    uom: input.uom,
                    description: input.description.trim(),
                    costPrice: input.costPrice ?? p.costPrice ?? 30,
                    salesPrice: input.salesPrice ?? p.salesPrice ?? 55,
                    primaryVendorId: input.primaryVendorId ?? p.primaryVendorId,
                  }
                : p,
            )
          : [
              ...s.products,
              {
                id,
                name: input.name.trim(),
                sku: input.sku.trim(),
                categoryId: input.categoryId,
                uom: input.uom,
                description: input.description.trim(),
                costPrice: input.costPrice ?? 30,
                salesPrice: input.salesPrice ?? 55,
                primaryVendorId: input.primaryVendorId,
              },
            ]

        let nextState = { ...s, products }
        if (!exists && input.initialStock && input.initialStock > 0 && input.locationId) {
          nextState = applyQty(nextState, id, input.locationId, input.initialStock)
          nextState = {
            ...nextState,
            ledger: [
              {
                id: uid('led'),
                date: nowIso(),
                productId: id,
                fromLocationId: null,
                toLocationId: input.locationId,
                qty: input.initialStock,
                type: 'initial',
                documentId: null,
                documentNumber: 'OPENING',
                note: 'Opening stock count',
                userId: s.sessionUserId ?? 'system',
                unitCost: input.costPrice ?? 30,
              },
              ...nextState.ledger,
            ],
          }
        }
        return nextState
      })
      return createdId!
    }

    const saveCategory: StoreApi['saveCategory'] = (name) => {
      const id = uid('cat')
      setState((s) => ({ ...s, categories: [...s.categories, { id, name: name.trim() }] }))
      return id
    }

    const saveReorderRule: StoreApi['saveReorderRule'] = (input) => {
      setState((s) => {
        const id = input.id || uid('rr')
        const exists = s.reorderRules.some((r) => r.id === id)
        const reorderRules = exists
          ? s.reorderRules.map((r) => (r.id === id ? { ...r, ...input, id } : r))
          : [...s.reorderRules, { ...input, id }]
        return { ...s, reorderRules }
      })
    }

    const deleteReorderRule: StoreApi['deleteReorderRule'] = (id) => {
      setState((s) => ({ ...s, reorderRules: s.reorderRules.filter((r) => r.id !== id) }))
    }

    const saveWarehouse: StoreApi['saveWarehouse'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const id = input.id || uid('wh')
        createdId = id
        const exists = s.warehouses.some((w) => w.id === id)
        const warehouses = exists
          ? s.warehouses.map((w) => (w.id === id ? { ...w, ...input, id } : w))
          : [...s.warehouses, { ...input, id }]

        let locations = s.locations
        if (!exists) {
          locations = [
            ...locations,
            { id: uid('loc'), warehouseId: id, name: `${input.name} Stock`, code: `${input.code}/Stock`, type: 'internal' },
            { id: uid('loc'), warehouseId: id, name: `${input.name} Input`, code: `${input.code}/Input`, type: 'internal' },
            { id: uid('loc'), warehouseId: id, name: `${input.name} Output`, code: `${input.code}/Output`, type: 'internal' },
          ]
        }
        return { ...s, warehouses, locations }
      })
      return createdId!
    }

    const saveLocation: StoreApi['saveLocation'] = (input) => {
      setState((s) => {
        const id = input.id || uid('loc')
        const exists = s.locations.some((l) => l.id === id)
        const locations = exists
          ? s.locations.map((l) => (l.id === id ? { ...l, ...input, id } : l))
          : [...s.locations, { ...input, id }]
        return { ...s, locations }
      })
    }

    const defaultLocations: StoreApi['defaultLocations'] = (type, warehouseId) => {
      const whLocs = state.locations.filter((l) => l.warehouseId === warehouseId && l.type === 'internal')
      const stock = whLocs.find((l) => l.code.endsWith('/Stock')) || whLocs[0]
      const input = whLocs.find((l) => l.code.endsWith('/Input')) || stock
      const output = whLocs.find((l) => l.code.endsWith('/Output')) || stock
      const vendor = state.locations.find((l) => l.type === 'vendor') || { id: 'loc_vendor' }
      const customer = state.locations.find((l) => l.type === 'customer') || { id: 'loc_customer' }
      const loss = state.locations.find((l) => l.type === 'inventory_loss') || { id: 'loc_loss' }

      switch (type) {
        case 'receipt':
          return { source: vendor.id, dest: input?.id || stock?.id || '' }
        case 'delivery':
          return { source: output?.id || stock?.id || '', dest: customer.id }
        case 'internal':
          return { source: stock?.id || '', dest: whLocs[1]?.id || stock?.id || '' }
        case 'adjustment':
          return { source: stock?.id || '', dest: loss.id }
      }
    }

    const saveDocument: StoreApi['saveDocument'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const isNew = !input.id
        const id = input.id || uid('doc')
        createdId = id
        const { number, sequences } = isNew ? nextNumber(s, input.type) : { number: input.number!, sequences: s.sequences }
        const defaults = defaultLocations(input.type, input.warehouseId || s.warehouses[0]?.id || '')

        const body: Document = {
          id,
          number: input.number || number,
          type: input.type,
          status: input.status || 'draft',
          warehouseId: input.warehouseId || s.warehouses[0]?.id || '',
          sourceLocationId: input.sourceLocationId || defaults.source,
          destLocationId: input.destLocationId || defaults.dest,
          partnerName: input.partnerName?.trim() || '',
          scheduledDate: input.scheduledDate || nowIso().slice(0, 10),
          notes: input.notes?.trim() || '',
          lines: (input.lines && input.lines.length ? input.lines : [{ id: uid('ln'), productId: '', qty: 1 }]).map((l) => ({
            ...l,
            id: l.id || uid('ln'),
          })),
          createdAt: input.createdAt || nowIso(),
          validatedAt: input.validatedAt,
          pickDone: input.pickDone ?? false,
          packDone: input.packDone ?? false,
          createdBy: input.createdBy || s.sessionUserId || 'system',
        }

        const documents = s.documents.some((d) => d.id === id)
          ? s.documents.map((d) => (d.id === id ? body : d))
          : [body, ...s.documents]
        return { ...s, documents, sequences }
      })
      return createdId!
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
          const prod = s.products.find((p) => p.id === line.productId)
          const unitCost = prod?.costPrice ?? 30

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
              unitCost,
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
              unitCost,
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
              fromLocationId: diff > 0 ? doc.destLocationId : doc.sourceLocationId,
              toLocationId: diff > 0 ? doc.sourceLocationId : doc.destLocationId,
              qty: Math.abs(diff),
              type: doc.type,
              documentId: doc.id,
              documentNumber: doc.number,
              note: doc.notes || 'Inventory adjustment count diff',
              userId,
              unitCost,
            })
          }
        }

        return {
          ...next,
          documents: next.documents.map((d) =>
            d.id === id ? { ...d, status: 'done', validatedAt: nowIso() } : d,
          ),
          ledger: [...ledgerAdds, ...next.ledger],
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

    // ----------------- VENDORS MODULE -----------------

    const saveVendor: StoreApi['saveVendor'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const id = input.id || uid('vnd')
        createdId = id
        const exists = s.vendors.some((v) => v.id === id)
        const vendorList = exists
          ? s.vendors.map((v) =>
              v.id === id
                ? {
                    ...v,
                    ...input,
                    id,
                    updatedAt: nowIso(),
                  }
                : v,
            )
          : [
              ...s.vendors,
              {
                ...input,
                id,
                code: input.code || `VND-${String(s.vendors.length + 1).padStart(3, '0')}`,
                status: input.status || 'active',
                createdAt: nowIso(),
                updatedAt: nowIso(),
              },
            ]
        return { ...s, vendors: vendorList }
      })
      return createdId!
    }

    const toggleVendorStatus: StoreApi['toggleVendorStatus'] = (id) => {
      setState((s) => ({
        ...s,
        vendors: s.vendors.map((v) =>
          v.id === id ? { ...v, status: v.status === 'active' ? 'inactive' : 'active', updatedAt: nowIso() } : v,
        ),
      }))
    }

    const deleteVendor: StoreApi['deleteVendor'] = (id) => {
      setState((s) => ({ ...s, vendors: s.vendors.filter((v) => v.id !== id) }))
    }

    // ----------------- CUSTOMERS MODULE -----------------

    const saveCustomer: StoreApi['saveCustomer'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const id = input.id || uid('cust')
        createdId = id
        const exists = s.customers.some((c) => c.id === id)
        const customerList = exists
          ? s.customers.map((c) =>
              c.id === id
                ? {
                    ...c,
                    ...input,
                    id,
                    updatedAt: nowIso(),
                  }
                : c,
            )
          : [
              ...s.customers,
              {
                ...input,
                id,
                code: input.code || `CUST-${String(s.customers.length + 1).padStart(3, '0')}`,
                status: input.status || 'active',
                createdAt: nowIso(),
                updatedAt: nowIso(),
              },
            ]
        return { ...s, customers: customerList }
      })
      return createdId!
    }

    const toggleCustomerStatus: StoreApi['toggleCustomerStatus'] = (id) => {
      setState((s) => ({
        ...s,
        customers: s.customers.map((c) =>
          c.id === id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active', updatedAt: nowIso() } : c,
        ),
      }))
    }

    const deleteCustomer: StoreApi['deleteCustomer'] = (id) => {
      setState((s) => ({ ...s, customers: s.customers.filter((c) => c.id !== id) }))
    }

    // ----------------- PURCHASE ORDERS MODULE -----------------

    const savePurchaseOrder: StoreApi['savePurchaseOrder'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const isNew = !input.id
        const id = input.id || uid('po')
        createdId = id
        const { number, sequences } = isNew ? nextSeq(s, 'po', 'PO') : { number: input.number!, sequences: s.sequences }

        const lines: PurchaseOrderLine[] = (input.lines && input.lines.length
          ? input.lines
          : [{ id: uid('pol'), productId: '', orderedQty: 10, receivedQty: 0, unitCost: 30, taxRate: 10, subtotal: 300, tax: 30, total: 330 }]
        ).map((l) => {
          const subtotal = l.orderedQty * l.unitCost
          const tax = subtotal * (l.taxRate / 100)
          return {
            id: l.id || uid('pol'),
            productId: l.productId,
            orderedQty: Number(l.orderedQty),
            receivedQty: Number(l.receivedQty || 0),
            unitCost: Number(l.unitCost),
            taxRate: Number(l.taxRate || 0),
            subtotal: Math.round(subtotal * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            total: Math.round((subtotal + tax) * 100) / 100,
          }
        })

        const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0)
        const tax = lines.reduce((sum, l) => sum + l.tax, 0)
        const total = subtotal + tax

        const body: PurchaseOrder = {
          id,
          number: input.number || number,
          vendorId: input.vendorId,
          warehouseId: input.warehouseId,
          orderDate: input.orderDate || nowIso().slice(0, 10),
          expectedDeliveryDate: input.expectedDeliveryDate || nowIso().slice(0, 10),
          status: input.status || 'draft',
          currency: input.currency || 'USD',
          notes: input.notes?.trim() || '',
          lines,
          subtotal: Math.round(subtotal * 100) / 100,
          tax: Math.round(tax * 100) / 100,
          total: Math.round(total * 100) / 100,
          allowOverReceipt: input.allowOverReceipt ?? false,
          createdAt: input.createdAt || nowIso(),
          updatedAt: nowIso(),
          receivedDocIds: input.receivedDocIds || [],
        }

        const purchaseOrders = s.purchaseOrders.some((p) => p.id === id)
          ? s.purchaseOrders.map((p) => (p.id === id ? body : p))
          : [body, ...s.purchaseOrders]

        return { ...s, purchaseOrders, sequences }
      })
      return createdId!
    }

    const sendPurchaseOrder: StoreApi['sendPurchaseOrder'] = (id) => {
      let error: string | null = null
      setState((s) => {
        const po = s.purchaseOrders.find((p) => p.id === id)
        if (!po) {
          error = 'Purchase order not found.'
          return s
        }
        if (po.status !== 'draft') {
          error = 'Only draft purchase orders can be sent.'
          return s
        }
        return {
          ...s,
          purchaseOrders: s.purchaseOrders.map((p) => (p.id === id ? { ...p, status: 'sent', updatedAt: nowIso() } : p)),
        }
      })
      return error
    }

    const receivePurchaseOrder: StoreApi['receivePurchaseOrder'] = (
      id,
      receivedLines,
      allowOverReceipt = false,
    ) => {
      let error: string | null = null
      setState((s) => {
        const po = s.purchaseOrders.find((p) => p.id === id)
        if (!po) {
          error = 'Purchase order not found.'
          return s
        }
        if (po.status === 'received' || po.status === 'canceled') {
          error = 'This purchase order cannot receive additional goods.'
          return s
        }

        const whLocs = s.locations.filter((l) => l.warehouseId === po.warehouseId && l.type === 'internal')
        const inputLoc = whLocs.find((l) => l.code.endsWith('/Input')) || whLocs.find((l) => l.code.endsWith('/Stock')) || whLocs[0]
        const vendorLoc = s.locations.find((l) => l.type === 'vendor') || { id: 'loc_vendor' }

        if (!inputLoc) {
          error = 'No destination storage location found for this warehouse.'
          return s
        }

        // Validate over-receipt
        for (const item of receivedLines) {
          const poLine = po.lines.find((l) => l.productId === item.productId)
          if (!poLine) continue
          const remaining = poLine.orderedQty - poLine.receivedQty
          if (item.qty > remaining && !po.allowOverReceipt && !allowOverReceipt) {
            error = `Cannot receive ${item.qty} units. Remaining quantity is ${remaining}. Enable over-receipt to proceed.`
            return s
          }
        }

        const itemsWithQty = receivedLines.filter((l) => l.qty > 0)
        if (!itemsWithQty.length) {
          error = 'Enter at least one item quantity to receive.'
          return s
        }

        // 1. Create Receipt Document
        const seqReceipt = (s.sequences['receipt'] || 0) + 1
        const receiptNumber = `${PREFIX['receipt']}/${String(seqReceipt).padStart(5, '0')}`
        const receiptDocId = uid('doc')
        const vendor = s.vendors.find((v) => v.id === po.vendorId)

        const receiptDoc: Document = {
          id: receiptDocId,
          number: receiptNumber,
          type: 'receipt',
          status: 'done',
          warehouseId: po.warehouseId,
          sourceLocationId: vendorLoc.id,
          destLocationId: inputLoc.id,
          partnerName: vendor ? vendor.companyName : 'Vendor',
          scheduledDate: nowIso().slice(0, 10),
          notes: `Received against Purchase Order ${po.number}`,
          lines: itemsWithQty.map((item) => ({ id: uid('ln'), productId: item.productId, qty: item.qty })),
          createdAt: nowIso(),
          validatedAt: nowIso(),
          pickDone: false,
          packDone: false,
          createdBy: s.sessionUserId || 'system',
        }

        // 2. Update stock quants and product Weighted Average Cost (WAC)
        let nextState = s
        const ledgerAdds = []
        const updatedProducts = [...s.products]

        for (const item of itemsWithQty) {
          nextState = applyQty(nextState, item.productId, inputLoc.id, item.qty)

          const poLine = po.lines.find((l) => l.productId === item.productId)
          const unitCost = poLine ? poLine.unitCost : 30

          // Calculate Weighted Average Cost:
          const pIdx = updatedProducts.findIndex((p) => p.id === item.productId)
          if (pIdx !== -1) {
            const currentP = updatedProducts[pIdx]
            const currentOnHand = nextState.quants
              .filter((q) => q.productId === item.productId)
              .reduce((sum, q) => sum + q.qty, 0)
            const oldCost = currentP.costPrice ?? 30
            // WAC = ((existingQty * oldCost) + (newQty * newCost)) / totalQty
            const priorQty = Math.max(0, currentOnHand - item.qty)
            const newWAC =
              priorQty + item.qty > 0
                ? Math.round(((priorQty * oldCost + item.qty * unitCost) / (priorQty + item.qty)) * 100) / 100
                : unitCost

            updatedProducts[pIdx] = { ...currentP, costPrice: newWAC }
          }

          ledgerAdds.push({
            id: uid('led'),
            date: nowIso(),
            productId: item.productId,
            fromLocationId: vendorLoc.id,
            toLocationId: inputLoc.id,
            qty: item.qty,
            type: 'receipt' as DocType,
            documentId: receiptDocId,
            documentNumber: receiptNumber,
            note: `Goods receipt for ${po.number}`,
            userId: s.sessionUserId || 'system',
            unitCost,
          })
        }

        // 3. Update PO lines receivedQty and determine new PO status
        const nextLines = po.lines.map((line) => {
          const matched = itemsWithQty.find((m) => m.productId === line.productId)
          if (!matched) return line
          return {
            ...line,
            receivedQty: line.receivedQty + matched.qty,
          }
        })

        const allReceived = nextLines.every((l) => l.receivedQty >= l.orderedQty)
        const nextStatus = allReceived ? 'received' : 'partial'

        const updatedPo: PurchaseOrder = {
          ...po,
          lines: nextLines,
          status: nextStatus,
          updatedAt: nowIso(),
          receivedDocIds: [...(po.receivedDocIds || []), receiptDocId],
        }

        return {
          ...nextState,
          products: updatedProducts,
          purchaseOrders: s.purchaseOrders.map((p) => (p.id === id ? updatedPo : p)),
          documents: [receiptDoc, ...s.documents],
          ledger: [...ledgerAdds, ...s.ledger],
          sequences: { ...s.sequences, receipt: seqReceipt },
        }
      })
      return error
    }

    const cancelPurchaseOrder: StoreApi['cancelPurchaseOrder'] = (id) => {
      let error: string | null = null
      setState((s) => {
        const po = s.purchaseOrders.find((p) => p.id === id)
        if (!po) {
          error = 'Purchase order not found.'
          return s
        }
        if (po.status === 'received' || po.status === 'partial') {
          error = 'Cannot cancel a purchase order that has already received items.'
          return s
        }
        return {
          ...s,
          purchaseOrders: s.purchaseOrders.map((p) => (p.id === id ? { ...p, status: 'canceled', updatedAt: nowIso() } : p)),
        }
      })
      return error
    }

    const duplicatePurchaseOrder: StoreApi['duplicatePurchaseOrder'] = (id) => {
      let createdId = ''
      setState((s) => {
        const po = s.purchaseOrders.find((p) => p.id === id)
        if (!po) return s
        const newId = uid('po')
        createdId = newId
        const { number, sequences } = nextSeq(s, 'po', 'PO')
        const duplicated: PurchaseOrder = {
          ...po,
          id: newId,
          number,
          status: 'draft',
          orderDate: nowIso().slice(0, 10),
          expectedDeliveryDate: nowIso().slice(0, 10),
          lines: po.lines.map((l) => ({ ...l, id: uid('pol'), receivedQty: 0 })),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          receivedDocIds: [],
        }
        return {
          ...s,
          purchaseOrders: [duplicated, ...s.purchaseOrders],
          sequences,
        }
      })
      return createdId
    }

    // ----------------- SALES ORDERS MODULE -----------------

    const saveSalesOrder: StoreApi['saveSalesOrder'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const isNew = !input.id
        const id = input.id || uid('so')
        createdId = id
        const { number, sequences } = isNew ? nextSeq(s, 'so', 'SO') : { number: input.number!, sequences: s.sequences }

        const lines: SalesOrderLine[] = (input.lines && input.lines.length
          ? input.lines
          : [{ id: uid('sol'), productId: '', qty: 1, unitPrice: 50, discount: 0, taxRate: 8, subtotal: 50, tax: 4, total: 54 }]
        ).map((l) => {
          const discountAmt = (l.qty * l.unitPrice * (l.discount || 0)) / 100
          const subtotal = l.qty * l.unitPrice - discountAmt
          const tax = subtotal * (l.taxRate / 100)
          return {
            id: l.id || uid('sol'),
            productId: l.productId,
            qty: Number(l.qty),
            unitPrice: Number(l.unitPrice),
            discount: Number(l.discount || 0),
            taxRate: Number(l.taxRate || 0),
            subtotal: Math.round(subtotal * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            total: Math.round((subtotal + tax) * 100) / 100,
          }
        })

        const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0)
        const tax = lines.reduce((sum, l) => sum + l.tax, 0)
        const total = subtotal + tax

        const body: SalesOrder = {
          id,
          number: input.number || number,
          customerId: input.customerId,
          warehouseId: input.warehouseId,
          orderDate: input.orderDate || nowIso().slice(0, 10),
          deliveryDate: input.deliveryDate || nowIso().slice(0, 10),
          status: input.status || 'draft',
          currency: input.currency || 'USD',
          notes: input.notes?.trim() || '',
          lines,
          subtotal: Math.round(subtotal * 100) / 100,
          tax: Math.round(tax * 100) / 100,
          total: Math.round(total * 100) / 100,
          createdAt: input.createdAt || nowIso(),
          updatedAt: nowIso(),
          deliveryDocId: input.deliveryDocId,
        }

        const salesOrders = s.salesOrders.some((so) => so.id === id)
          ? s.salesOrders.map((so) => (so.id === id ? body : so))
          : [body, ...s.salesOrders]

        return { ...s, salesOrders, sequences }
      })
      return createdId!
    }

    const confirmSalesOrder: StoreApi['confirmSalesOrder'] = (id) => {
      let error: string | null = null
      setState((s) => {
        const so = s.salesOrders.find((o) => o.id === id)
        if (!so) {
          error = 'Sales order not found.'
          return s
        }
        if (so.status !== 'draft') {
          error = 'Only draft orders can be confirmed.'
          return s
        }
        return {
          ...s,
          salesOrders: s.salesOrders.map((o) => (o.id === id ? { ...o, status: 'confirmed', updatedAt: nowIso() } : o)),
        }
      })
      return error
    }

    const reserveSalesOrderStock: StoreApi['reserveSalesOrderStock'] = (id) => {
      let error: string | null = null
      setState((s) => {
        const so = s.salesOrders.find((o) => o.id === id)
        if (!so) {
          error = 'Sales order not found.'
          return s
        }
        if (so.status !== 'confirmed') {
          error = 'Order must be confirmed before reserving stock.'
          return s
        }

        // Check stock availability
        for (const line of so.lines) {
          const avail = availableStock(s, line.productId, so.warehouseId)
          if (avail < line.qty) {
            const prod = s.products.find((p) => p.id === line.productId)
            error = `Insufficient available stock for ${prod?.name || 'Product'} (SKU: ${prod?.sku}). Available: ${avail}, Required: ${line.qty}.`
            return s
          }
        }

        // Create reservations
        const newReservations: StockReservation[] = so.lines.map((line) => ({
          id: uid('res'),
          salesOrderId: so.id,
          productId: line.productId,
          warehouseId: so.warehouseId,
          qty: line.qty,
          createdAt: nowIso(),
        }))

        return {
          ...s,
          reservations: [...s.reservations, ...newReservations],
          salesOrders: s.salesOrders.map((o) => (o.id === id ? { ...o, status: 'reserved', updatedAt: nowIso() } : o)),
        }
      })
      return error
    }

    const advanceSalesOrderStatus: StoreApi['advanceSalesOrderStatus'] = (id, nextStatus) => {
      let error: string | null = null
      setState((s) => {
        const so = s.salesOrders.find((o) => o.id === id)
        if (!so) {
          error = 'Sales order not found.'
          return s
        }

        // When transitioning to shipped, deduct physical stock and log ledger
        if (nextStatus === 'shipped') {
          const whLocs = s.locations.filter((l) => l.warehouseId === so.warehouseId && l.type === 'internal')
          const outputLoc = whLocs.find((l) => l.code.endsWith('/Output')) || whLocs.find((l) => l.code.endsWith('/Stock')) || whLocs[0]
          const customerLoc = s.locations.find((l) => l.type === 'customer') || { id: 'loc_customer' }

          if (!outputLoc) {
            error = 'Warehouse output location not found.'
            return s
          }

          let next = s
          const ledgerAdds = []

          // Deduct stock for each line
          for (const line of so.lines) {
            next = applyQty(next, line.productId, outputLoc.id, -line.qty)
            next = applyQty(next, line.productId, customerLoc.id, line.qty)

            const prod = s.products.find((p) => p.id === line.productId)
            ledgerAdds.push({
              id: uid('led'),
              date: nowIso(),
              productId: line.productId,
              fromLocationId: outputLoc.id,
              toLocationId: customerLoc.id,
              qty: line.qty,
              type: 'delivery' as DocType,
              documentId: null,
              documentNumber: so.number,
              note: `Shipped for Sales Order ${so.number}`,
              userId: s.sessionUserId || 'system',
              unitCost: prod?.costPrice ?? 30,
            })
          }

          // Release reservations
          const remainingReservations = next.reservations.filter((r) => r.salesOrderId !== id)

          // Create linked Delivery Document
          const seqDel = (s.sequences['delivery'] || 0) + 1
          const delNumber = `${PREFIX['delivery']}/${String(seqDel).padStart(5, '0')}`
          const customer = s.customers.find((c) => c.id === so.customerId)

          const delDoc: Document = {
            id: uid('doc'),
            number: delNumber,
            type: 'delivery',
            status: 'done',
            warehouseId: so.warehouseId,
            sourceLocationId: outputLoc.id,
            destLocationId: customerLoc.id,
            partnerName: customer ? customer.name : 'Customer',
            scheduledDate: so.deliveryDate,
            notes: `Delivery for Sales Order ${so.number}`,
            lines: so.lines.map((l) => ({ id: uid('ln'), productId: l.productId, qty: l.qty })),
            createdAt: nowIso(),
            validatedAt: nowIso(),
            pickDone: true,
            packDone: true,
            createdBy: s.sessionUserId || 'system',
          }

          return {
            ...next,
            reservations: remainingReservations,
            documents: [delDoc, ...next.documents],
            ledger: [...ledgerAdds, ...next.ledger],
            sequences: { ...next.sequences, delivery: seqDel },
            salesOrders: s.salesOrders.map((o) =>
              o.id === id ? { ...o, status: 'shipped', deliveryDocId: delDoc.id, updatedAt: nowIso() } : o,
            ),
          }
        }

        return {
          ...s,
          salesOrders: s.salesOrders.map((o) => (o.id === id ? { ...o, status: nextStatus, updatedAt: nowIso() } : o)),
        }
      })
      return error
    }

    const cancelSalesOrder: StoreApi['cancelSalesOrder'] = (id) => {
      let error: string | null = null
      setState((s) => {
        const so = s.salesOrders.find((o) => o.id === id)
        if (!so) {
          error = 'Sales order not found.'
          return s
        }
        if (so.status === 'shipped' || so.status === 'delivered') {
          error = 'Cannot cancel an order that has already been shipped.'
          return s
        }
        // Release reservations
        const remainingReservations = s.reservations.filter((r) => r.salesOrderId !== id)
        return {
          ...s,
          reservations: remainingReservations,
          salesOrders: s.salesOrders.map((o) => (o.id === id ? { ...o, status: 'canceled', updatedAt: nowIso() } : o)),
        }
      })
      return error
    }

    const duplicateSalesOrder: StoreApi['duplicateSalesOrder'] = (id) => {
      let createdId = ''
      setState((s) => {
        const so = s.salesOrders.find((o) => o.id === id)
        if (!so) return s
        const newId = uid('so')
        createdId = newId
        const { number, sequences } = nextSeq(s, 'so', 'SO')
        const duplicated: SalesOrder = {
          ...so,
          id: newId,
          number,
          status: 'draft',
          orderDate: nowIso().slice(0, 10),
          deliveryDate: nowIso().slice(0, 10),
          lines: so.lines.map((l) => ({ ...l, id: uid('sol') })),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          deliveryDocId: undefined,
        }
        return {
          ...s,
          salesOrders: [duplicated, ...s.salesOrders],
          sequences,
        }
      })
      return createdId
    }

    // ----------------- RETURNS MODULE -----------------

    const saveReturnOrder: StoreApi['saveReturnOrder'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const isNew = !input.id
        const id = input.id || uid('ret')
        createdId = id
        const seqKey = input.type === 'customer' ? 'ret_cust' : 'ret_vend'
        const prefix = input.type === 'customer' ? 'RET-C' : 'RET-V'
        const { number, sequences } = isNew ? nextSeq(s, seqKey, prefix) : { number: input.number!, sequences: s.sequences }

        const body: ReturnOrder = {
          id,
          number: input.number || number,
          type: input.type,
          status: input.status || (input.type === 'customer' ? 'delivered' : 'received'),
          partnerId: input.partnerId || '',
          partnerName: input.partnerName?.trim() || '',
          referenceDocNumber: input.referenceDocNumber?.trim() || '',
          warehouseId: input.warehouseId,
          notes: input.notes?.trim() || '',
          lines: (input.lines && input.lines.length
            ? input.lines
            : [{ id: uid('retl'), productId: '', qty: 1, reason: 'Defect or damage', destination: 'restock' as ReturnDestination }]
          ).map((l) => ({ ...l, id: l.id || uid('retl') })),
          createdAt: input.createdAt || nowIso(),
          updatedAt: nowIso(),
        }

        const returnOrders = s.returnOrders.some((r) => r.id === id)
          ? s.returnOrders.map((r) => (r.id === id ? body : r))
          : [body, ...s.returnOrders]

        return { ...s, returnOrders, sequences }
      })
      return createdId!
    }

    const advanceReturnStatus: StoreApi['advanceReturnStatus'] = (id, nextStatus, dispositions) => {
      let error: string | null = null
      setState((s) => {
        const ret = s.returnOrders.find((r) => r.id === id)
        if (!ret) {
          error = 'Return order not found.'
          return s
        }

        let next = s
        const ledgerAdds = []

        // If completed or final status, execute inventory adjustments
        if (nextStatus === 'completed' || nextStatus === 'restocked') {
          const whLocs = s.locations.filter((l) => l.warehouseId === ret.warehouseId && l.type === 'internal')
          const stockLoc = whLocs.find((l) => l.code.endsWith('/Stock')) || whLocs[0]
          const lossLoc = s.locations.find((l) => l.type === 'inventory_loss') || { id: 'loc_loss' }
          const vendorLoc = s.locations.find((l) => l.type === 'vendor') || { id: 'loc_vendor' }
          const customerLoc = s.locations.find((l) => l.type === 'customer') || { id: 'loc_customer' }

          if (ret.type === 'customer') {
            for (const line of ret.lines) {
              const dest = dispositions?.[line.id] || line.destination || 'restock'
              const prod = s.products.find((p) => p.id === line.productId)

              if (dest === 'restock' && stockLoc) {
                // Stock increases in main warehouse
                next = applyQty(next, line.productId, stockLoc.id, line.qty)
                ledgerAdds.push({
                  id: uid('led'),
                  date: nowIso(),
                  productId: line.productId,
                  fromLocationId: customerLoc.id,
                  toLocationId: stockLoc.id,
                  qty: line.qty,
                  type: 'return' as DocType,
                  documentId: ret.id,
                  documentNumber: ret.number,
                  note: `Customer return restocked: ${ret.number}`,
                  userId: s.sessionUserId || 'system',
                  unitCost: prod?.costPrice ?? 30,
                })
              } else if (lossLoc) {
                // Damaged/Scrap routed to inventory loss
                next = applyQty(next, line.productId, lossLoc.id, line.qty)
                ledgerAdds.push({
                  id: uid('led'),
                  date: nowIso(),
                  productId: line.productId,
                  fromLocationId: customerLoc.id,
                  toLocationId: lossLoc.id,
                  qty: line.qty,
                  type: 'adjustment' as DocType,
                  documentId: ret.id,
                  documentNumber: ret.number,
                  note: `Customer return scrap/loss (${dest}): ${ret.number}`,
                  userId: s.sessionUserId || 'system',
                  unitCost: prod?.costPrice ?? 30,
                })
              }
            }
          } else {
            // Vendor return
            for (const line of ret.lines) {
              const prod = s.products.find((p) => p.id === line.productId)
              if (stockLoc) {
                next = applyQty(next, line.productId, stockLoc.id, -line.qty)
                next = applyQty(next, line.productId, vendorLoc.id, line.qty)
                ledgerAdds.push({
                  id: uid('led'),
                  date: nowIso(),
                  productId: line.productId,
                  fromLocationId: stockLoc.id,
                  toLocationId: vendorLoc.id,
                  qty: line.qty,
                  type: 'return' as DocType,
                  documentId: ret.id,
                  documentNumber: ret.number,
                  note: `Vendor return sent: ${ret.number}`,
                  userId: s.sessionUserId || 'system',
                  unitCost: prod?.costPrice ?? 30,
                })
              }
            }
          }
        }

        const updatedLines = ret.lines.map((l) => ({
          ...l,
          disposition: dispositions?.[l.id] || l.disposition || l.destination,
        }))

        return {
          ...next,
          ledger: [...ledgerAdds, ...next.ledger],
          returnOrders: next.returnOrders.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: nextStatus,
                  lines: updatedLines,
                  completedAt: nextStatus === 'completed' ? nowIso() : r.completedAt,
                  updatedAt: nowIso(),
                }
              : r,
          ),
        }
      })
      return error
    }

    // ── WAREHOUSE OPERATIONS ADDON ──────────────────────────────────────────

    // ----- BARCODES -----

    const generateBarcode: StoreApi['generateBarcode'] = (entityType, entityId, format = 'CODE128') => {
      const existing = state.barcodeRecords.find((b) => b.entityId === entityId && b.entityType === entityType)
      if (existing) return existing.barcode
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      const rand = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      const barcode = `SS-${entityType.slice(0, 3).toUpperCase()}-${rand}`
      const record: BarcodeRecord = {
        id: uid('bc'),
        barcode,
        format,
        entityType,
        entityId,
        createdAt: nowIso(),
      }
      setState((s) => ({ ...s, barcodeRecords: [...s.barcodeRecords, record] }))
      return barcode
    }

    const lookupBarcode: StoreApi['lookupBarcode'] = (barcode) => {
      return state.barcodeRecords.find((b) => b.barcode === barcode) ?? null
    }

    const assignBarcode: StoreApi['assignBarcode'] = (entityType, entityId, barcode, format = 'CODE128') => {
      const duplicate = state.barcodeRecords.find(
        (b) => b.barcode === barcode && (b.entityId !== entityId || b.entityType !== entityType),
      )
      if (duplicate) return 'Barcode already assigned to another entity.'
      const record: BarcodeRecord = { id: uid('bc'), barcode, format, entityType, entityId, createdAt: nowIso() }
      setState((s) => {
        const filtered = s.barcodeRecords.filter((b) => !(b.entityId === entityId && b.entityType === entityType))
        return { ...s, barcodeRecords: [...filtered, record] }
      })
      return null
    }

    // ----- PRODUCT EXTENSIONS -----

    const saveProductExtension: StoreApi['saveProductExtension'] = (ext) => {
      setState((s) => {
        const existing = s.productExtensions.find((e) => e.productId === ext.productId)
        const list = existing
          ? s.productExtensions.map((e) => (e.productId === ext.productId ? { ...e, ...ext } : e))
          : [...s.productExtensions, ext]
        return { ...s, productExtensions: list }
      })
    }

    // ----- VARIANTS -----

    const saveVariant: StoreApi['saveVariant'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const id = input.id || uid('var')
        createdId = id
        const exists = s.productVariants.some((v) => v.id === id)
        const variant: ProductVariant = {
          id,
          productId: input.productId,
          variantSku: input.variantSku,
          barcode: input.barcode,
          attributeValues: input.attributeValues,
          costPrice: input.costPrice,
          salesPrice: input.salesPrice,
          active: input.active ?? true,
          createdAt: exists ? (s.productVariants.find((v) => v.id === id)?.createdAt ?? nowIso()) : nowIso(),
        }
        const list = exists ? s.productVariants.map((v) => (v.id === id ? variant : v)) : [...s.productVariants, variant]
        return { ...s, productVariants: list }
      })
      return createdId!
    }

    const deleteVariant: StoreApi['deleteVariant'] = (id) => {
      setState((s) => ({ ...s, productVariants: s.productVariants.filter((v) => v.id !== id) }))
    }

    const toggleVariantActive: StoreApi['toggleVariantActive'] = (id) => {
      setState((s) => ({
        ...s,
        productVariants: s.productVariants.map((v) => (v.id === id ? { ...v, active: !v.active } : v)),
      }))
    }

    // ----- LOTS -----

    const saveLot: StoreApi['saveLot'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const id = input.id || uid('lot')
        createdId = id
        const exists = s.lots.some((l) => l.id === id)
        const lot: Lot = { ...input, id, createdAt: exists ? (s.lots.find((l) => l.id === id)?.createdAt ?? nowIso()) : nowIso() }
        const list = exists ? s.lots.map((l) => (l.id === id ? lot : l)) : [...s.lots, lot]
        return { ...s, lots: list }
      })
      return createdId!
    }

    const deleteLot: StoreApi['deleteLot'] = (id) => {
      setState((s) => ({ ...s, lots: s.lots.filter((l) => l.id !== id) }))
    }

    const receiveLot: StoreApi['receiveLot'] = (input) => {
      const id = uid('lot')
      const lot: Lot = { ...input, id, createdAt: nowIso() }
      setState((s) => ({ ...s, lots: [...s.lots, lot] }))
      return id
    }

    // ----- SERIALS -----

    const saveSerial: StoreApi['saveSerial'] = (input) => {
      let result: string | { error: string } = input.id || ''
      setState((s) => {
        const id = input.id || uid('sn')
        const duplicate = s.serials.find((sn) => sn.serial === input.serial && sn.id !== id)
        if (duplicate) {
          result = { error: `Serial number "${input.serial}" already exists.` }
          return s
        }
        const exists = s.serials.some((sn) => sn.id === id)
        const serial: SerialNumber = {
          id,
          serial: input.serial,
          productId: input.productId,
          variantId: input.variantId,
          status: input.status,
          locationId: input.locationId,
          warehouseId: input.warehouseId,
          receiptDocId: input.receiptDocId,
          deliveryDocId: input.deliveryDocId,
          customerId: input.customerId,
          history: exists ? (s.serials.find((sn) => sn.id === id)?.history ?? []) : [],
          createdAt: exists ? (s.serials.find((sn) => sn.id === id)?.createdAt ?? nowIso()) : nowIso(),
        }
        result = id
        const list = exists ? s.serials.map((sn) => (sn.id === id ? serial : sn)) : [...s.serials, serial]
        return { ...s, serials: list }
      })
      return result
    }

    const moveSerial: StoreApi['moveSerial'] = (id, toLocationId, docId, docNumber, note) => {
      let error: string | null = null
      setState((s) => {
        const sn = s.serials.find((x) => x.id === id)
        if (!sn) { error = 'Serial not found.'; return s }
        const move: SerialMovement = {
          id: uid('snm'),
          date: nowIso(),
          fromLocationId: sn.locationId,
          toLocationId,
          documentId: docId,
          documentNumber: docNumber,
          note,
          userId: s.sessionUserId ?? 'system',
        }
        return {
          ...s,
          serials: s.serials.map((x) => x.id === id ? { ...x, locationId: toLocationId, history: [move, ...x.history] } : x),
        }
      })
      return error
    }

    const deliverSerial: StoreApi['deliverSerial'] = (id, customerId, deliveryDocId, deliveryDocNumber) => {
      let error: string | null = null
      setState((s) => {
        const sn = s.serials.find((x) => x.id === id)
        if (!sn) { error = 'Serial not found.'; return s }
        if (sn.status !== 'in_stock' && sn.status !== 'reserved') { error = 'Serial is not available for delivery.'; return s }
        const customerLoc = s.locations.find((l) => l.type === 'customer')
        const move: SerialMovement = {
          id: uid('snm'),
          date: nowIso(),
          fromLocationId: sn.locationId,
          toLocationId: customerLoc?.id ?? null,
          documentId: deliveryDocId,
          documentNumber: deliveryDocNumber,
          note: 'Delivered to customer',
          userId: s.sessionUserId ?? 'system',
        }
        return {
          ...s,
          serials: s.serials.map((x) =>
            x.id === id ? { ...x, status: 'delivered' as SerialStatus, customerId, deliveryDocId, locationId: customerLoc?.id ?? x.locationId, history: [move, ...x.history] } : x,
          ),
        }
      })
      return error
    }

    // ----- ZONES -----

    const saveZone: StoreApi['saveZone'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const id = input.id || uid('zone')
        createdId = id
        const exists = s.warehouseZones.some((z) => z.id === id)
        const zone: WarehouseZone = { ...input, id }
        const list = exists ? s.warehouseZones.map((z) => (z.id === id ? zone : z)) : [...s.warehouseZones, zone]
        return { ...s, warehouseZones: list }
      })
      return createdId!
    }

    const deleteZone: StoreApi['deleteZone'] = (id) => {
      setState((s) => ({ ...s, warehouseZones: s.warehouseZones.filter((z) => z.id !== id) }))
    }

    // ----- LOCATION EXTENSIONS -----

    const saveLocationExtension: StoreApi['saveLocationExtension'] = (ext) => {
      setState((s) => {
        const exists = s.locationExtensions.some((e) => e.locationId === ext.locationId)
        const list = exists
          ? s.locationExtensions.map((e) => (e.locationId === ext.locationId ? ext : e))
          : [...s.locationExtensions, ext]
        return { ...s, locationExtensions: list }
      })
    }

    // ----- PUTAWAY RULES -----

    const savePutawayRule: StoreApi['savePutawayRule'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const id = input.id || uid('pa')
        createdId = id
        const exists = s.putawayRules.some((r) => r.id === id)
        const rule: PutawayRule = { ...input, id, createdAt: exists ? (s.putawayRules.find((r) => r.id === id)?.createdAt ?? nowIso()) : nowIso() }
        const list = exists ? s.putawayRules.map((r) => (r.id === id ? rule : r)) : [...s.putawayRules, rule]
        return { ...s, putawayRules: list }
      })
      return createdId!
    }

    const deletePutawayRule: StoreApi['deletePutawayRule'] = (id) => {
      setState((s) => ({ ...s, putawayRules: s.putawayRules.filter((r) => r.id !== id) }))
    }

    const suggestPutaway: StoreApi['suggestPutaway'] = (productId, warehouseId, categoryId) => {
      const rules = state.putawayRules
        .filter((r) => r.active && r.warehouseId === warehouseId)
        .sort((a, b) => a.priority - b.priority)
      // Try product-specific first, then category
      const byProduct = rules.find((r) => r.productId === productId)
      if (byProduct) return byProduct.locationId
      if (categoryId) {
        const byCat = rules.find((r) => r.categoryId === categoryId)
        if (byCat) return byCat.locationId
      }
      const byWh = rules.find((r) => !r.productId && !r.categoryId)
      return byWh?.locationId ?? null
    }

    // ----- CYCLE COUNTS -----

    const saveCycleCount: StoreApi['saveCycleCount'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const isNew = !input.id
        const id = input.id || uid('cc')
        createdId = id
        const { number, sequences } = isNew ? nextSeq(s, 'cc', 'CC') : { number: input.number!, sequences: s.sequences }
        const exists = s.cycleCounts.some((c) => c.id === id)
        const cc: CycleCount = {
          id,
          number: input.number || number,
          warehouseId: input.warehouseId,
          locationId: input.locationId,
          assignedUserId: input.assignedUserId ?? s.sessionUserId ?? '',
          scheduledDate: input.scheduledDate ?? nowIso().slice(0, 10),
          completedDate: input.completedDate,
          status: input.status ?? 'draft',
          notes: input.notes ?? '',
          lines: input.lines ?? [],
          adjustmentDocId: input.adjustmentDocId,
          createdAt: exists ? (s.cycleCounts.find((c) => c.id === id)?.createdAt ?? nowIso()) : nowIso(),
          createdBy: input.createdBy ?? s.sessionUserId ?? 'system',
        }
        const list = exists ? s.cycleCounts.map((c) => (c.id === id ? cc : c)) : [...s.cycleCounts, cc]
        return { ...s, cycleCounts: list, sequences }
      })
      return createdId!
    }

    const advanceCycleCount: StoreApi['advanceCycleCount'] = (id, nextStatus, lines) => {
      let error: string | null = null
      setState((s) => {
        const cc = s.cycleCounts.find((c) => c.id === id)
        if (!cc) { error = 'Cycle count not found.'; return s }

        // When moving to counting, auto-populate lines from current stock
        let updatedLines = lines ?? cc.lines
        if (nextStatus === 'counting' && (!updatedLines || updatedLines.length === 0)) {
          const locQuants = s.quants.filter((q) => q.locationId === cc.locationId)
          updatedLines = locQuants.map((q) => ({
            id: uid('ccl'),
            productId: q.productId,
            expected: q.qty,
            counted: null,
            variance: null,
          }))
        }
        // If lines provided with counted values, compute variance
        if (lines) {
          updatedLines = lines.map((l) => ({
            ...l,
            variance: l.counted !== null ? l.counted - l.expected : null,
          }))
        }
        return {
          ...s,
          cycleCounts: s.cycleCounts.map((c) =>
            c.id === id ? { ...c, status: nextStatus, lines: updatedLines } : c,
          ),
        }
      })
      return error
    }

    const postCycleCount: StoreApi['postCycleCount'] = (id) => {
      let error: string | null = null
      setState((s) => {
        const cc = s.cycleCounts.find((c) => c.id === id)
        if (!cc) { error = 'Cycle count not found.'; return s }
        if (cc.status !== 'approved') { error = 'Cycle count must be approved before posting.'; return s }

        // Generate adjustment document
        const { number: adjNumber, sequences } = nextNumber(s, 'adjustment')
        const adjId = uid('doc')
        const lossLoc = s.locations.find((l) => l.type === 'inventory_loss') || { id: 'loc_loss' }

        const adjLines = cc.lines
          .filter((l) => l.counted !== null && l.variance !== 0)
          .map((l) => ({
            id: uid('ln'),
            productId: l.productId,
            qty: l.expected,
            countedQty: l.counted ?? l.expected,
          }))

        if (adjLines.length === 0) {
          // No variance — just mark as posted
          return {
            ...s,
            cycleCounts: s.cycleCounts.map((c) =>
              c.id === id ? { ...c, status: 'posted', completedDate: nowIso().slice(0, 10) } : c,
            ),
          }
        }

        const adjDoc: Document = {
          id: adjId,
          number: adjNumber,
          type: 'adjustment',
          status: 'done',
          warehouseId: cc.warehouseId,
          sourceLocationId: cc.locationId,
          destLocationId: lossLoc.id,
          partnerName: '',
          scheduledDate: nowIso().slice(0, 10),
          notes: `Cycle Count ${cc.number}`,
          lines: adjLines,
          createdAt: nowIso(),
          validatedAt: nowIso(),
          pickDone: false,
          packDone: false,
          createdBy: s.sessionUserId ?? 'system',
        }

        // Apply qty changes
        let next = s
        const ledgerAdds = []
        for (const line of cc.lines) {
          if (line.counted === null || line.variance === 0) continue
          const diff = (line.counted ?? line.expected) - line.expected
          const prod = s.products.find((p) => p.id === line.productId)
          next = applyQty(next, line.productId, cc.locationId, diff)
          if (diff < 0) next = applyQty(next, line.productId, lossLoc.id, -diff)
          ledgerAdds.push({
            id: uid('led'),
            date: nowIso(),
            productId: line.productId,
            fromLocationId: diff < 0 ? cc.locationId : lossLoc.id,
            toLocationId: diff < 0 ? lossLoc.id : cc.locationId,
            qty: Math.abs(diff),
            type: 'adjustment' as DocType,
            documentId: adjId,
            documentNumber: adjNumber,
            note: `Cycle count adjustment ${cc.number}`,
            userId: s.sessionUserId ?? 'system',
            unitCost: prod?.costPrice ?? 30,
          })
        }

        return {
          ...next,
          documents: [adjDoc, ...next.documents],
          ledger: [...ledgerAdds, ...next.ledger],
          sequences,
          cycleCounts: next.cycleCounts.map((c) =>
            c.id === id ? { ...c, status: 'posted', completedDate: nowIso().slice(0, 10), adjustmentDocId: adjId } : c,
          ),
        }
      })
      return error
    }

    // ----- PICKING -----

    const savePickingOrder: StoreApi['savePickingOrder'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const isNew = !input.id
        const id = input.id || uid('pick')
        createdId = id
        const { number, sequences } = isNew ? nextSeq(s, 'pick', 'PICK') : { number: input.number!, sequences: s.sequences }
        const exists = s.pickingOrders.some((p) => p.id === id)
        // Auto-build lines from linked documents
        let lines: PickingLine[] = input.lines ?? []
        if (isNew && lines.length === 0) {
          for (const docId of input.documentIds) {
            const doc = s.documents.find((d) => d.id === docId)
            if (!doc) continue
            for (const dl of doc.lines) {
              lines.push({
                id: uid('pkl'),
                documentId: docId,
                productId: dl.productId,
                qtyTodo: dl.qty,
                qtyDone: 0,
                sourceLocationId: doc.sourceLocationId,
                confirmed: false,
              })
            }
          }
        }
        const order: PickingOrder = {
          id,
          number: input.number || number,
          method: input.method ?? 'single',
          status: input.status ?? 'draft',
          warehouseId: input.warehouseId,
          documentIds: input.documentIds,
          lines,
          assignedUserId: input.assignedUserId ?? s.sessionUserId ?? '',
          scheduledDate: input.scheduledDate ?? nowIso().slice(0, 10),
          notes: input.notes ?? '',
          createdAt: exists ? (s.pickingOrders.find((p) => p.id === id)?.createdAt ?? nowIso()) : nowIso(),
          completedAt: input.completedAt,
        }
        const list = exists ? s.pickingOrders.map((p) => (p.id === id ? order : p)) : [...s.pickingOrders, order]
        return { ...s, pickingOrders: list, sequences }
      })
      return createdId!
    }

    const advancePickingOrder: StoreApi['advancePickingOrder'] = (id, nextStatus) => {
      let error: string | null = null
      setState((s) => {
        const pick = s.pickingOrders.find((p) => p.id === id)
        if (!pick) { error = 'Picking order not found.'; return s }
        if (nextStatus === 'done') {
          const incomplete = pick.lines.some((l) => !l.confirmed)
          if (incomplete) { error = 'All lines must be confirmed before completing.'; return s }
        }
        return {
          ...s,
          pickingOrders: s.pickingOrders.map((p) =>
            p.id === id ? { ...p, status: nextStatus, completedAt: nextStatus === 'done' ? nowIso() : p.completedAt } : p,
          ),
        }
      })
      return error
    }

    const confirmPickingLine: StoreApi['confirmPickingLine'] = (pickingId, lineId, qtyDone, serialId, lotId) => {
      let error: string | null = null
      setState((s) => {
        const pick = s.pickingOrders.find((p) => p.id === pickingId)
        if (!pick) { error = 'Picking order not found.'; return s }
        const line = pick.lines.find((l) => l.id === lineId)
        if (!line) { error = 'Picking line not found.'; return s }
        if (qtyDone > line.qtyTodo) { error = `Cannot confirm ${qtyDone} — only ${line.qtyTodo} required.`; return s }
        const updatedLine: PickingLine = { ...line, qtyDone, serialId, lotId, confirmed: true }
        return {
          ...s,
          pickingOrders: s.pickingOrders.map((p) =>
            p.id === pickingId ? { ...p, lines: p.lines.map((l) => (l.id === lineId ? updatedLine : l)) } : p,
          ),
        }
      })
      return error
    }

    // ----- PACKING -----

    const savePackage: StoreApi['savePackage'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const id = input.id || uid('pkg')
        createdId = id
        const exists = s.packages.some((p) => p.id === id)
        const pkg: Package = { ...input, id, createdAt: exists ? (s.packages.find((p) => p.id === id)?.createdAt ?? nowIso()) : nowIso() }
        const list = exists ? s.packages.map((p) => (p.id === id ? pkg : p)) : [...s.packages, pkg]
        return { ...s, packages: list }
      })
      return createdId!
    }

    const sealPackage: StoreApi['sealPackage'] = (id) => {
      let error: string | null = null
      setState((s) => {
        const pkg = s.packages.find((p) => p.id === id)
        if (!pkg) { error = 'Package not found.'; return s }
        if (pkg.status === 'sealed') { error = 'Package already sealed.'; return s }
        return {
          ...s,
          packages: s.packages.map((p) => p.id === id ? { ...p, status: 'sealed' as const, sealedAt: nowIso() } : p),
        }
      })
      return error
    }

    // ----- SHIPPING -----

    const saveShipment: StoreApi['saveShipment'] = (input) => {
      let createdId = input.id
      setState((s) => {
        const isNew = !input.id
        const id = input.id || uid('ship')
        createdId = id
        const { number, sequences } = isNew ? nextSeq(s, 'ship', 'SHIP') : { number: input.number ?? `SHIP/${id}`, sequences: s.sequences }
        const exists = s.shipments.some((sh) => sh.id === id)
        const shipment: Shipment = {
          ...input,
          id,
          number: input.number ?? number,
          createdAt: exists ? (s.shipments.find((sh) => sh.id === id)?.createdAt ?? nowIso()) : nowIso(),
          updatedAt: nowIso(),
        }
        const list = exists ? s.shipments.map((sh) => (sh.id === id ? shipment : sh)) : [...s.shipments, shipment]
        return { ...s, shipments: list, sequences: isNew ? sequences : s.sequences }
      })
      return createdId!
    }

    const advanceShipmentStatus: StoreApi['advanceShipmentStatus'] = (id, nextStatus) => {
      let error: string | null = null
      setState((s) => {
        const sh = s.shipments.find((x) => x.id === id)
        if (!sh) { error = 'Shipment not found.'; return s }
        return {
          ...s,
          shipments: s.shipments.map((x) =>
            x.id === id ? { ...x, status: nextStatus, shippedDate: nextStatus === 'shipped' ? (x.shippedDate ?? nowIso().slice(0, 10)) : x.shippedDate, updatedAt: nowIso() } : x,
          ),
        }
      })
      return error
    }

    // ── Enterprise Administration Addon Implementations ──

    const can: StoreApi['can'] = (permission) => {
      return canUser(currentUser, permission)
    }

    const logAudit: StoreApi['logAudit'] = (
      action,
      entity,
      entityId,
      documentNumber,
      oldValue,
      newValue,
      metadata,
    ) => {
      const now = nowIso()
      const entry: AuditLogEntry = {
        id: uid('aud'),
        timestamp: now,
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'System',
        userEmail: currentUser?.email || 'system@stocksense.io',
        userRole: currentUser?.role || 'admin',
        action,
        entity,
        entityId,
        documentNumber,
        oldValue,
        newValue,
        metadata,
      }
      setState((s) => ({
        ...s,
        auditLogs: [entry, ...s.auditLogs],
      }))
    }

    const saveUser: StoreApi['saveUser'] = async (input) => {
      const auth = canUser(currentUser, 'users.manage')
      if (!auth.allowed) return auth.reason!

      if (!input.name.trim() || !input.email.trim()) {
        return 'Name and email are required.'
      }

      const email = input.email.trim().toLowerCase()
      const isNew = !input.id

      if (isNew && (!input.password || input.password.length < 6)) {
        return 'A password of at least 6 characters is required for new users.'
      }

      if (isNew && state.users.some((u) => u.email.toLowerCase() === email)) {
        return 'A user with this email address already exists.'
      }

      const existing = input.id ? state.users.find((u) => u.id === input.id) : null
      if (input.id && !existing) {
        return 'User not found.'
      }

      let passwordHash = existing?.passwordHash || ''
      if (input.password && input.password.length >= 6) {
        passwordHash = await hashPassword(input.password)
      }

      const now = nowIso()
      const updatedUser: User = {
        id: input.id || uid('usr'),
        name: input.name.trim(),
        email,
        passwordHash,
        role: input.role,
        phone: input.phone.trim(),
        active: input.active !== undefined ? input.active : (existing?.active ?? true),
        createdAt: existing?.createdAt || now,
        lastLogin: existing?.lastLogin,
      }

      setState((s) => {
        const users = isNew
          ? [updatedUser, ...s.users]
          : s.users.map((u) => (u.id === updatedUser.id ? updatedUser : u))

        const auditEntry: AuditLogEntry = {
          id: uid('aud'),
          timestamp: now,
          userId: currentUser?.id || 'admin',
          userName: currentUser?.name || 'Administrator',
          userEmail: currentUser?.email || 'admin@stocksense.io',
          userRole: currentUser?.role || 'admin',
          action: isNew ? 'CREATE' : 'UPDATE',
          entity: 'User',
          entityId: updatedUser.id,
          oldValue: existing
            ? { name: existing.name, email: existing.email, role: existing.role, active: existing.active }
            : null,
          newValue: {
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            active: updatedUser.active,
          },
          metadata: { isNew },
        }

        return {
          ...s,
          users,
          auditLogs: [auditEntry, ...s.auditLogs],
        }
      })
      return null
    }

    const toggleUserStatus: StoreApi['toggleUserStatus'] = (userId) => {
      const auth = canUser(currentUser, 'users.manage')
      if (!auth.allowed) return auth.reason!

      if (userId === currentUser?.id) {
        return 'You cannot deactivate your own account.'
      }

      const target = state.users.find((u) => u.id === userId)
      if (!target) return 'User not found.'

      const nextActive = target.active === false ? true : false
      const now = nowIso()

      setState((s) => ({
        ...s,
        users: s.users.map((u) => (u.id === userId ? { ...u, active: nextActive } : u)),
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Administrator',
            userEmail: currentUser?.email || 'admin@stocksense.io',
            userRole: currentUser?.role || 'admin',
            action: 'UPDATE',
            entity: 'User',
            entityId: userId,
            oldValue: { active: target.active ?? true },
            newValue: { active: nextActive },
            metadata: { targetEmail: target.email, action: nextActive ? 'activate' : 'deactivate' },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

    const resetUserPassword: StoreApi['resetUserPassword'] = async (userId, newPassword) => {
      const auth = canUser(currentUser, 'users.manage')
      if (!auth.allowed) return auth.reason!

      if (!newPassword || newPassword.length < 6) {
        return 'Password must be at least 6 characters.'
      }

      const target = state.users.find((u) => u.id === userId)
      if (!target) return 'User not found.'

      const passwordHash = await hashPassword(newPassword)
      const now = nowIso()

      setState((s) => ({
        ...s,
        users: s.users.map((u) => (u.id === userId ? { ...u, passwordHash } : u)),
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Administrator',
            userEmail: currentUser?.email || 'admin@stocksense.io',
            userRole: currentUser?.role || 'admin',
            action: 'UPDATE',
            entity: 'User',
            entityId: userId,
            metadata: { action: 'password_reset', targetEmail: target.email },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

    const deleteUser: StoreApi['deleteUser'] = (userId) => {
      const auth = canUser(currentUser, 'users.manage')
      if (!auth.allowed) return auth.reason!

      if (userId === currentUser?.id) {
        return 'You cannot delete your own account.'
      }

      const target = state.users.find((u) => u.id === userId)
      if (!target) return 'User not found.'

      if (target.role === 'admin') {
        const adminCount = state.users.filter((u) => u.role === 'admin' && u.active !== false).length
        if (adminCount <= 1) {
          return 'Cannot delete the only remaining Administrator.'
        }
      }

      const now = nowIso()
      setState((s) => ({
        ...s,
        users: s.users.filter((u) => u.id !== userId),
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Administrator',
            userEmail: currentUser?.email || 'admin@stocksense.io',
            userRole: currentUser?.role || 'admin',
            action: 'DELETE',
            entity: 'User',
            entityId: userId,
            oldValue: { name: target.name, email: target.email, role: target.role },
            metadata: { deletedUser: target.email },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

    const markNotificationRead: StoreApi['markNotificationRead'] = (id) => {
      setState((s) => ({
        ...s,
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }))
    }

    const markAllNotificationsRead: StoreApi['markAllNotificationsRead'] = () => {
      setState((s) => ({
        ...s,
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      }))
    }

    const clearNotifications: StoreApi['clearNotifications'] = () => {
      setState((s) => ({
        ...s,
        notifications: [],
      }))
    }

    const triggerAlertEvaluation: StoreApi['triggerAlertEvaluation'] = () => {
      setState((s) => {
        const fresh = evaluateSystemNotifications(s)
        if (fresh.length === 0) return s
        return {
          ...s,
          notifications: [...fresh, ...s.notifications],
        }
      })
    }

    const submitPurchaseOrderForApproval: StoreApi['submitPurchaseOrderForApproval'] = (id) => {
      const po = state.purchaseOrders.find((p) => p.id === id)
      if (!po) return 'Purchase order not found.'

      const now = nowIso()
      setState((s) => ({
        ...s,
        purchaseOrders: s.purchaseOrders.map((p) =>
          p.id === id ? { ...p, approvalStatus: 'pending', updatedAt: now } : p,
        ),
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'user',
            userName: currentUser?.name || 'User',
            userEmail: currentUser?.email || '',
            userRole: currentUser?.role || 'warehouse_staff',
            action: 'CONFIRM',
            entity: 'PurchaseOrder',
            entityId: id,
            documentNumber: po.number,
            metadata: { total: po.total, action: 'submit_approval' },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

    const approvePurchaseOrder: StoreApi['approvePurchaseOrder'] = (id, comment) => {
      const auth = canUser(currentUser, 'purchasing.approve')
      if (!auth.allowed) return auth.reason!

      const po = state.purchaseOrders.find((p) => p.id === id)
      if (!po) return 'Purchase order not found.'

      const now = nowIso()
      setState((s) => ({
        ...s,
        purchaseOrders: s.purchaseOrders.map((p) =>
          p.id === id
            ? {
                ...p,
                approvalStatus: 'approved',
                approvedBy: currentUser?.name || 'Approver',
                approvedAt: now,
                approvalComment: comment || 'Approved',
                updatedAt: now,
              }
            : p,
        ),
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'user',
            userName: currentUser?.name || 'User',
            userEmail: currentUser?.email || '',
            userRole: currentUser?.role || 'admin',
            action: 'APPROVE',
            entity: 'PurchaseOrder',
            entityId: id,
            documentNumber: po.number,
            metadata: { total: po.total, comment },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

    const rejectPurchaseOrder: StoreApi['rejectPurchaseOrder'] = (id, comment) => {
      const auth = canUser(currentUser, 'purchasing.approve')
      if (!auth.allowed) return auth.reason!

      const po = state.purchaseOrders.find((p) => p.id === id)
      if (!po) return 'Purchase order not found.'

      const now = nowIso()
      setState((s) => ({
        ...s,
        purchaseOrders: s.purchaseOrders.map((p) =>
          p.id === id
            ? {
                ...p,
                approvalStatus: 'rejected',
                approvedBy: currentUser?.name || 'Approver',
                approvedAt: now,
                approvalComment: comment || 'Rejected',
                updatedAt: now,
              }
            : p,
        ),
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'user',
            userName: currentUser?.name || 'User',
            userEmail: currentUser?.email || '',
            userRole: currentUser?.role || 'admin',
            action: 'REJECT',
            entity: 'PurchaseOrder',
            entityId: id,
            documentNumber: po.number,
            metadata: { total: po.total, comment },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

    const approveDocument: StoreApi['approveDocument'] = (id, comment) => {
      const auth = canUser(currentUser, 'inventory.approve')
      if (!auth.allowed) return auth.reason!

      const doc = state.documents.find((d) => d.id === id)
      if (!doc) return 'Document not found.'

      const now = nowIso()
      setState((s) => ({
        ...s,
        documents: s.documents.map((d) =>
          d.id === id
            ? {
                ...d,
                approvalStatus: 'approved',
                approvedBy: currentUser?.name || 'Approver',
                approvedAt: now,
                approvalComment: comment || 'Approved',
              }
            : d,
        ),
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'user',
            userName: currentUser?.name || 'User',
            userEmail: currentUser?.email || '',
            userRole: currentUser?.role || 'admin',
            action: 'APPROVE',
            entity: 'Document',
            entityId: id,
            documentNumber: doc.number,
            metadata: { type: doc.type, comment },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

    const rejectDocument: StoreApi['rejectDocument'] = (id, comment) => {
      const auth = canUser(currentUser, 'inventory.approve')
      if (!auth.allowed) return auth.reason!

      const doc = state.documents.find((d) => d.id === id)
      if (!doc) return 'Document not found.'

      const now = nowIso()
      setState((s) => ({
        ...s,
        documents: s.documents.map((d) =>
          d.id === id
            ? {
                ...d,
                approvalStatus: 'rejected',
                approvedBy: currentUser?.name || 'Approver',
                approvedAt: now,
                approvalComment: comment || 'Rejected',
              }
            : d,
        ),
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'user',
            userName: currentUser?.name || 'User',
            userEmail: currentUser?.email || '',
            userRole: currentUser?.role || 'admin',
            action: 'REJECT',
            entity: 'Document',
            entityId: id,
            documentNumber: doc.number,
            metadata: { type: doc.type, comment },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

    const saveCompanySettings: StoreApi['saveCompanySettings'] = (settings) => {
      const auth = canUser(currentUser, 'settings.manage')
      if (!auth.allowed) return auth.reason!

      const now = nowIso()
      setState((s) => ({
        ...s,
        companySettings: { ...settings },
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Administrator',
            userEmail: currentUser?.email || 'admin@stocksense.io',
            userRole: currentUser?.role || 'admin',
            action: 'UPDATE',
            entity: 'Settings',
            entityId: 'company',
            oldValue: s.companySettings,
            newValue: settings,
            metadata: { type: 'company_settings' },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

    const saveInventorySettings: StoreApi['saveInventorySettings'] = (settings) => {
      const auth = canUser(currentUser, 'settings.manage')
      if (!auth.allowed) return auth.reason!

      const now = nowIso()
      setState((s) => ({
        ...s,
        inventorySettings: { ...settings },
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Administrator',
            userEmail: currentUser?.email || 'admin@stocksense.io',
            userRole: currentUser?.role || 'admin',
            action: 'UPDATE',
            entity: 'Settings',
            entityId: 'inventory',
            oldValue: s.inventorySettings,
            newValue: settings,
            metadata: { type: 'inventory_settings' },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

    const saveApprovalSettings: StoreApi['saveApprovalSettings'] = (settings) => {
      const auth = canUser(currentUser, 'settings.manage')
      if (!auth.allowed) return auth.reason!

      const now = nowIso()
      setState((s) => ({
        ...s,
        approvalSettings: { ...settings },
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Administrator',
            userEmail: currentUser?.email || 'admin@stocksense.io',
            userRole: currentUser?.role || 'admin',
            action: 'UPDATE',
            entity: 'Settings',
            entityId: 'approval',
            oldValue: s.approvalSettings,
            newValue: settings,
            metadata: { type: 'approval_settings' },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

    const saveAlertRules: StoreApi['saveAlertRules'] = (rules) => {
      const auth = canUser(currentUser, 'settings.manage')
      if (!auth.allowed) return auth.reason!

      const now = nowIso()
      setState((s) => ({
        ...s,
        alertRules: { ...rules },
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Administrator',
            userEmail: currentUser?.email || 'admin@stocksense.io',
            userRole: currentUser?.role || 'admin',
            action: 'UPDATE',
            entity: 'Settings',
            entityId: 'alerts',
            oldValue: s.alertRules,
            newValue: rules,
            metadata: { type: 'alert_rules' },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

    const saveSequences: StoreApi['saveSequences'] = (sequences) => {
      const auth = canUser(currentUser, 'settings.manage')
      if (!auth.allowed) return auth.reason!

      const now = nowIso()
      setState((s) => ({
        ...s,
        sequences: { ...sequences },
        auditLogs: [
          {
            id: uid('aud'),
            timestamp: now,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Administrator',
            userEmail: currentUser?.email || 'admin@stocksense.io',
            userRole: currentUser?.role || 'admin',
            action: 'UPDATE',
            entity: 'Settings',
            entityId: 'sequences',
            newValue: sequences,
            metadata: { type: 'numbering_sequences' },
          },
          ...s.auditLogs,
        ],
      }))
      return null
    }

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
      saveVendor,
      toggleVendorStatus,
      deleteVendor,
      saveCustomer,
      toggleCustomerStatus,
      deleteCustomer,
      savePurchaseOrder,
      sendPurchaseOrder,
      receivePurchaseOrder,
      cancelPurchaseOrder,
      duplicatePurchaseOrder,
      saveSalesOrder,
      confirmSalesOrder,
      reserveSalesOrderStock,
      advanceSalesOrderStatus,
      cancelSalesOrder,
      duplicateSalesOrder,
      saveReturnOrder,
      advanceReturnStatus,
      // Warehouse Operations Addon
      generateBarcode,
      lookupBarcode,
      assignBarcode,
      saveProductExtension,
      saveVariant,
      deleteVariant,
      toggleVariantActive,
      saveLot,
      deleteLot,
      receiveLot,
      saveSerial,
      moveSerial,
      deliverSerial,
      saveZone,
      deleteZone,
      saveLocationExtension,
      savePutawayRule,
      deletePutawayRule,
      suggestPutaway,
      saveCycleCount,
      advanceCycleCount,
      postCycleCount,
      savePickingOrder,
      advancePickingOrder,
      confirmPickingLine,
      savePackage,
      sealPackage,
      saveShipment,
      advanceShipmentStatus,

      // Enterprise Administration Addon
      can,
      saveUser,
      toggleUserStatus,
      resetUserPassword,
      deleteUser,
      logAudit,
      markNotificationRead,
      markAllNotificationsRead,
      clearNotifications,
      triggerAlertEvaluation,
      submitPurchaseOrderForApproval,
      approvePurchaseOrder,
      rejectPurchaseOrder,
      approveDocument,
      rejectDocument,
      saveCompanySettings,
      saveInventorySettings,
      saveApprovalSettings,
      saveAlertRules,
      saveSequences,
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

export function emptyPoLine(): PurchaseOrderLine {
  return {
    id: uid('pol'),
    productId: '',
    orderedQty: 10,
    receivedQty: 0,
    unitCost: 25,
    taxRate: 10,
    subtotal: 250,
    tax: 25,
    total: 275,
  }
}

export function emptySoLine(): SalesOrderLine {
  return {
    id: uid('sol'),
    productId: '',
    qty: 1,
    unitPrice: 50,
    discount: 0,
    taxRate: 8,
    subtotal: 50,
    tax: 4,
    total: 54,
  }
}

export function emptyReturnLine(): ReturnLine {
  return {
    id: uid('retl'),
    productId: '',
    qty: 1,
    reason: 'Damaged or defective',
    destination: 'restock',
  }
}
