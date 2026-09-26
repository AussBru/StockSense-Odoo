import type { AppState, Document, DocStatus, DocType, Location, Product } from '../types'

export function isOnHand(location: Location | undefined): boolean {
  return location?.type === 'internal'
}

export function qtyAt(
  state: AppState,
  productId: string,
  locationId: string,
): number {
  return state.quants.find((q) => q.productId === productId && q.locationId === locationId)?.qty ?? 0
}

export function totalOnHand(state: AppState, productId: string): number {
  return state.quants.reduce((sum, q) => {
    const loc = state.locations.find((l) => l.id === q.locationId)
    if (q.productId !== productId || !isOnHand(loc)) return sum
    return sum + q.qty
  }, 0)
}

export function qtyByWarehouse(
  state: AppState,
  productId: string,
  warehouseId: string,
): number {
  return state.quants.reduce((sum, q) => {
    const loc = state.locations.find((l) => l.id === q.locationId)
    if (q.productId !== productId || loc?.warehouseId !== warehouseId || !isOnHand(loc)) return sum
    return sum + q.qty
  }, 0)
}

export function stockByLocation(state: AppState, productId: string) {
  return state.locations
    .filter((l) => l.type === 'internal')
    .map((l) => ({
      location: l,
      qty: qtyAt(state, productId, l.id),
    }))
    .filter((row) => row.qty !== 0)
}

export function productById(state: AppState, id: string): Product | undefined {
  return state.products.find((p) => p.id === id)
}

export const DOC_LABEL: Record<DocType, string> = {
  receipt: 'Receipt',
  delivery: 'Delivery',
  internal: 'Internal Transfer',
  adjustment: 'Adjustment',
}

export const STATUS_LABEL: Record<DocStatus, string> = {
  draft: 'Draft',
  waiting: 'Waiting',
  ready: 'Ready',
  done: 'Done',
  canceled: 'Canceled',
}

export function statusClass(status: DocStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-slate-100 text-slate-700'
    case 'waiting':
      return 'bg-amber-100 text-amber-800'
    case 'ready':
      return 'bg-sky-100 text-sky-800'
    case 'done':
      return 'bg-emerald-100 text-emerald-800'
    case 'canceled':
      return 'bg-rose-100 text-rose-800'
  }
}

export function typeClass(type: DocType): string {
  switch (type) {
    case 'receipt':
      return 'bg-indigo-50 text-indigo-700'
    case 'delivery':
      return 'bg-fuchsia-50 text-fuchsia-700'
    case 'internal':
      return 'bg-cyan-50 text-cyan-800'
    case 'adjustment':
      return 'bg-orange-50 text-orange-800'
  }
}

export function lowStockItems(state: AppState) {
  return state.products
    .map((product) => {
      const onHand = totalOnHand(state, product.id)
      const rules = state.reorderRules.filter((r) => r.productId === product.id)
      const min = rules.length
        ? Math.min(...rules.map((r) => r.minQty))
        : 10
      const out = onHand <= 0
      const low = !out && onHand <= min
      return { product, onHand, min, out, low }
    })
    .filter((row) => row.low || row.out)
}

export function matchesFilters(
  doc: Document,
  state: AppState,
  filters: {
    type: DocType | 'all'
    status: DocStatus | 'all'
    warehouseId: string
    categoryId: string
    q: string
  },
): boolean {
  if (filters.type !== 'all' && doc.type !== filters.type) return false
  if (filters.status !== 'all' && doc.status !== filters.status) return false
  if (filters.warehouseId && doc.warehouseId !== filters.warehouseId) return false
  if (filters.categoryId) {
    const hit = doc.lines.some((line) => {
      const p = productById(state, line.productId)
      return p?.categoryId === filters.categoryId
    })
    if (!hit) return false
  }
  if (filters.q) {
    const needle = filters.q.toLowerCase()
    const skuHit = doc.lines.some((line) => {
      const p = productById(state, line.productId)
      return (
        p?.sku.toLowerCase().includes(needle) ||
        p?.name.toLowerCase().includes(needle)
      )
    })
    const text =
      `${doc.number} ${doc.partnerName} ${doc.notes}`.toLowerCase()
    if (!text.includes(needle) && !skuHit) return false
  }
  return true
}

export const UOMS = ['Units', 'kg', 'g', 'm', 'Box', 'Pallet']
