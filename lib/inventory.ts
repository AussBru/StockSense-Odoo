import type { AppState, Document, DocStatus, DocType, Location, Product, Vendor } from '../types'

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

// ----------------- STOCK RESERVATION -----------------

export function totalReserved(state: AppState, productId: string, warehouseId?: string): number {
  if (!state.reservations) return 0
  return state.reservations
    .filter((r) => r.productId === productId && (!warehouseId || r.warehouseId === warehouseId))
    .reduce((sum, r) => sum + r.qty, 0)
}

export function availableStock(state: AppState, productId: string, warehouseId?: string): number {
  const onHand = warehouseId ? qtyByWarehouse(state, productId, warehouseId) : totalOnHand(state, productId)
  const reserved = totalReserved(state, productId, warehouseId)
  return Math.max(0, onHand - reserved)
}

// ----------------- INVENTORY VALUATION (Weighted Average Cost) -----------------

export function getProductUnitCost(product: Product): number {
  return product.costPrice && product.costPrice > 0 ? product.costPrice : 45.0
}

export function getProductSalesPrice(product: Product): number {
  return product.salesPrice && product.salesPrice > 0 ? product.salesPrice : getProductUnitCost(product) * 1.5
}

export function productValuation(state: AppState, productId: string, warehouseId?: string) {
  const product = productById(state, productId)
  const onHand = warehouseId ? qtyByWarehouse(state, productId, warehouseId) : (product ? totalOnHand(state, product.id) : 0)
  const unitCost = product ? getProductUnitCost(product) : 0
  const totalValue = onHand * unitCost
  return {
    onHand,
    unitCost,
    totalValue,
  }
}

export function totalInventoryValuation(state: AppState) {
  let totalUnits = 0
  let totalValue = 0

  for (const p of state.products) {
    const val = productValuation(state, p.id)
    totalUnits += val.onHand
    totalValue += val.totalValue
  }

  return { totalUnits, totalValue }
}

// ----------------- INVENTORY INTELLIGENCE -----------------

export interface ReorderSuggestionItem {
  product: Product
  primaryVendor?: Vendor
  onHand: number
  reserved: number
  available: number
  minQty: number
  maxQty: number
  avgDailyConsumption: number
  leadTimeDays: number
  estimatedStockoutDays: number | null
  suggestedQty: number
  estimatedCost: number
}

export function calculateProductDailyConsumption(state: AppState, productId: string, days = 30): number {
  // Look at outbound ledger moves (deliveries and customer shipments) over the window
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const customerLocIds = new Set(state.locations.filter((l) => l.type === 'customer' || l.type === 'inventory_loss').map((l) => l.id))
  
  const outboundQty = state.ledger
    .filter((entry) => {
      if (entry.productId !== productId) return false
      if (entry.date < cutoff) return false
      // To customer or loss, or delivery document
      return (
        entry.type === 'delivery' ||
        (entry.toLocationId && customerLocIds.has(entry.toLocationId))
      )
    })
    .reduce((sum, e) => sum + Math.abs(e.qty), 0)

  // Default baseline daily consumption if history is fresh
  const calculated = outboundQty / days
  return calculated > 0 ? Math.round(calculated * 100) / 100 : 0.5
}

export function getReorderSuggestions(state: AppState): ReorderSuggestionItem[] {
  const suggestions: ReorderSuggestionItem[] = []

  for (const product of state.products) {
    const onHand = totalOnHand(state, product.id)
    const reserved = totalReserved(state, product.id)
    const available = Math.max(0, onHand - reserved)

    const rules = state.reorderRules.filter((r) => r.productId === product.id)
    const minQty = rules.length ? Math.min(...rules.map((r) => r.minQty)) : 15
    const maxQty = rules.length ? Math.max(...rules.map((r) => r.maxQty)) : 100

    const avgDailyConsumption = calculateProductDailyConsumption(state, product.id, 30)
    const primaryVendor = state.vendors.find((v) => v.id === product.primaryVendorId) || state.vendors[0]
    const leadTimeDays = primaryVendor ? primaryVendor.leadTime : 7

    // Safety stock: consumption during lead time + minQty
    const leadTimeDemand = avgDailyConsumption * leadTimeDays
    const reorderPoint = minQty + Math.ceil(leadTimeDemand)

    const estimatedStockoutDays = avgDailyConsumption > 0 ? Math.floor(available / avgDailyConsumption) : null

    if (available <= reorderPoint || available <= minQty) {
      // Shortfall to reach maxQty
      const suggestedQty = Math.max(10, Math.ceil(maxQty - available))
      const unitCost = getProductUnitCost(product)
      const estimatedCost = suggestedQty * unitCost

      suggestions.push({
        product,
        primaryVendor,
        onHand,
        reserved,
        available,
        minQty,
        maxQty,
        avgDailyConsumption,
        leadTimeDays,
        estimatedStockoutDays,
        suggestedQty,
        estimatedCost,
      })
    }
  }

  return suggestions
}

export function getIntelligenceMetrics(state: AppState) {
  const valuation = totalInventoryValuation(state)
  const suggestions = getReorderSuggestions(state)

  // Dead stock: products with onHand > 0 and 0 outbound moves in last 60 days
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const movingProductIds = new Set(
    state.ledger
      .filter((e) => (e.type === 'delivery' || e.type === 'return') && e.date >= sixtyDaysAgo)
      .map((e) => e.productId),
  )

  const deadStockProducts = state.products.filter(
    (p) => totalOnHand(state, p.id) > 0 && !movingProductIds.has(p.id),
  )

  const deadStockValue = deadStockProducts.reduce((sum, p) => {
    return sum + totalOnHand(state, p.id) * getProductUnitCost(p)
  }, 0)

  // Fast vs slow moving SKUs based on 30-day velocity
  const productVelocities = state.products.map((p) => ({
    product: p,
    velocity: calculateProductDailyConsumption(state, p.id, 30),
    onHand: totalOnHand(state, p.id),
  }))

  const fastMoving = productVelocities.filter((p) => p.velocity >= 1.5)
  const slowMoving = productVelocities.filter((p) => p.velocity < 1.5 && p.onHand > 0)

  // Average inventory age estimation (weighted days since receipt)
  const now = Date.now()
  let weightedDaysSum = 0
  let totalReceiptUnits = 0

  for (const entry of state.ledger) {
    if (entry.type === 'receipt' && entry.qty > 0) {
      const daysOld = Math.max(1, Math.round((now - new Date(entry.date).getTime()) / (24 * 60 * 60 * 1000)))
      weightedDaysSum += daysOld * entry.qty
      totalReceiptUnits += entry.qty
    }
  }

  const averageInventoryAgeDays = totalReceiptUnits > 0 ? Math.round(weightedDaysSum / totalReceiptUnits) : 18

  // Stock turnover ratio (Annualized Outbound / Avg Stock)
  const totalOutbound = state.ledger
    .filter((e) => e.type === 'delivery')
    .reduce((sum, e) => sum + Math.abs(e.qty), 0)
  const stockTurnover = valuation.totalUnits > 0 ? (totalOutbound * 12) / Math.max(1, valuation.totalUnits) : 3.2

  return {
    totalInventoryValue: valuation.totalValue,
    totalUnits: valuation.totalUnits,
    deadStockValue,
    deadStockCount: deadStockProducts.length,
    fastMovingCount: fastMoving.length,
    slowMovingCount: slowMoving.length,
    averageInventoryAgeDays,
    stockTurnover: Math.round(stockTurnover * 10) / 10,
    reorderSuggestionsCount: suggestions.length,
    suggestions,
    deadStockProducts,
    fastMoving,
    slowMoving,
  }
}

// ----------------- LABELS & BADGES -----------------

export const DOC_LABEL: Record<string, string> = {
  receipt: 'Receipt',
  delivery: 'Delivery',
  internal: 'Internal Transfer',
  adjustment: 'Adjustment',
  return: 'Return',
  initial: 'Opening',
}

export const STATUS_LABEL: Record<DocStatus, string> = {
  draft: 'Draft',
  waiting: 'Waiting',
  ready: 'Ready',
  done: 'Done',
  canceled: 'Canceled',
}

export function statusClass(status: DocStatus | string): string {
  switch (status) {
    case 'draft':
      return 'bg-slate-100 text-slate-700'
    case 'waiting':
      return 'bg-amber-100 text-amber-800'
    case 'ready':
      return 'bg-sky-100 text-sky-800'
    case 'done':
    case 'received':
    case 'delivered':
    case 'active':
    case 'completed':
      return 'bg-emerald-100 text-emerald-800'
    case 'canceled':
    case 'inactive':
    case 'rejected':
      return 'bg-rose-100 text-rose-800'
    case 'sent':
    case 'confirmed':
    case 'reserved':
      return 'bg-indigo-100 text-indigo-800'
    case 'partial':
    case 'picking':
    case 'packed':
      return 'bg-purple-100 text-purple-800'
    case 'shipped':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function typeClass(type: DocType | string): string {
  switch (type) {
    case 'receipt':
      return 'bg-indigo-50 text-indigo-700'
    case 'delivery':
      return 'bg-fuchsia-50 text-fuchsia-700'
    case 'internal':
      return 'bg-cyan-50 text-cyan-800'
    case 'adjustment':
      return 'bg-orange-50 text-orange-800'
    case 'return':
      return 'bg-purple-50 text-purple-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function lowStockItems(state: AppState) {
  return state.products
    .map((product) => {
      const onHand = totalOnHand(state, product.id)
      const rules = state.reorderRules.filter((r) => r.productId === product.id)
      const min = rules.length ? Math.min(...rules.map((r) => r.minQty)) : 10
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
    const text = `${doc.number} ${doc.partnerName} ${doc.notes}`.toLowerCase()
    if (!text.includes(needle) && !skuHit) return false
  }
  return true
}

export const UOMS = ['Units', 'kg', 'g', 'm', 'Box', 'Pallet']
