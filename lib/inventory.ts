import type { AppState, Document, DocStatus, DocType, Location, Product, Vendor, Lot, LotStatus, SerialNumber } from '../types'

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
      return 'bg-surface-2 text-fg'
    case 'waiting':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
    case 'ready':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300'
    case 'done':
    case 'received':
    case 'delivered':
    case 'active':
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
    case 'canceled':
    case 'inactive':
    case 'rejected':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
    case 'sent':
    case 'confirmed':
    case 'reserved':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300'
    case 'partial':
    case 'picking':
    case 'packed':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300'
    case 'shipped':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
    default:
      return 'bg-surface-2 text-fg'
  }
}

export function typeClass(type: DocType | string): string {
  switch (type) {
    case 'receipt':
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
    case 'delivery':
      return 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300'
    case 'internal':
      return 'bg-cyan-50 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300'
    case 'adjustment':
      return 'bg-orange-50 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300'
    case 'return':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'
    default:
      return 'bg-surface-2 text-fg'
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

// ============================================================
// WAREHOUSE OPERATIONS ADDON — LOT / SERIAL / FIFO / FEFO
// ============================================================

// Re-export AppState alias to avoid re-import in callers
type S = AppState

// ---------- LOT HELPERS ----------

export function getLotStatus(lot: Lot, warningDays = 30): LotStatus {
  if (!lot.expiryDate) return 'normal'
  const now = Date.now()
  const expiry = new Date(lot.expiryDate).getTime()
  const warning = warningDays * 24 * 60 * 60 * 1000
  if (now >= expiry) return 'expired'
  if (expiry - now <= warning) return 'expiring_soon'
  return 'normal'
}

export function lotStatusClass(status: LotStatus): string {
  switch (status) {
    case 'expired': return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
    case 'expiring_soon': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
    default: return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
  }
}

export function lotStatusLabel(status: LotStatus): string {
  switch (status) {
    case 'expired': return 'Expired'
    case 'expiring_soon': return 'Expiring Soon'
    default: return 'Normal'
  }
}

/** All lots for a product, optionally filtered by location */
export function lotsForProduct(state: S, productId: string, locationId?: string): Lot[] {
  return state.lots.filter(
    (l) => l.productId === productId && (!locationId || l.locationId === locationId),
  )
}

/** Total qty across lots for a product/location */
export function lotQtyTotal(state: S, productId: string, locationId?: string): number {
  return lotsForProduct(state, productId, locationId).reduce((sum, l) => sum + l.qty, 0)
}

/** Expiring lots across all products (within warningDays) */
export function expiringLots(state: S, warningDays = 30): Array<{ lot: Lot; status: LotStatus }> {
  return state.lots
    .map((lot) => ({ lot, status: getLotStatus(lot, warningDays) }))
    .filter(({ status }) => status !== 'normal')
    .sort((a, b) => {
      const aExp = a.lot.expiryDate ? new Date(a.lot.expiryDate).getTime() : Infinity
      const bExp = b.lot.expiryDate ? new Date(b.lot.expiryDate).getTime() : Infinity
      return aExp - bExp
    })
}

// ---------- FIFO ----------

/**
 * FIFO: Returns lots sorted by receivedDate ascending (oldest first).
 * Use the first lot(s) until qty is filled.
 */
export function fifoLots(state: S, productId: string, locationId?: string): Lot[] {
  return lotsForProduct(state, productId, locationId)
    .filter((l) => l.qty > 0)
    .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime())
}

/** FIFO picking plan: returns list of { lot, qtyToUse } to fulfil requiredQty */
export function fifoPickPlan(
  state: S,
  productId: string,
  requiredQty: number,
  locationId?: string,
): Array<{ lot: Lot; qtyToUse: number }> {
  const sorted = fifoLots(state, productId, locationId)
  const plan: Array<{ lot: Lot; qtyToUse: number }> = []
  let remaining = requiredQty
  for (const lot of sorted) {
    if (remaining <= 0) break
    const use = Math.min(lot.qty, remaining)
    plan.push({ lot, qtyToUse: use })
    remaining -= use
  }
  return plan
}

// ---------- FEFO ----------

/**
 * FEFO: Returns lots sorted by expiryDate ascending (nearest expiry first).
 * Lots with no expiry date are pushed to the end.
 */
export function fefoLots(state: S, productId: string, locationId?: string): Lot[] {
  return lotsForProduct(state, productId, locationId)
    .filter((l) => l.qty > 0)
    .sort((a, b) => {
      const aExp = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity
      const bExp = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity
      return aExp - bExp
    })
}

/** FEFO picking plan */
export function fefoPickPlan(
  state: S,
  productId: string,
  requiredQty: number,
  locationId?: string,
): Array<{ lot: Lot; qtyToUse: number }> {
  const sorted = fefoLots(state, productId, locationId)
  const plan: Array<{ lot: Lot; qtyToUse: number }> = []
  let remaining = requiredQty
  for (const lot of sorted) {
    if (remaining <= 0) break
    const use = Math.min(lot.qty, remaining)
    plan.push({ lot, qtyToUse: use })
    remaining -= use
  }
  return plan
}

/**
 * Returns the best picking plan based on a product's configured rotation method.
 * Falls back to FIFO if no extension configured.
 */
export function getPickPlan(
  state: S,
  productId: string,
  requiredQty: number,
  locationId?: string,
): Array<{ lot: Lot; qtyToUse: number }> {
  const ext = state.productExtensions.find((e) => e.productId === productId)
  const method = ext?.rotationMethod ?? 'FIFO'
  return method === 'FEFO'
    ? fefoPickPlan(state, productId, requiredQty, locationId)
    : fifoPickPlan(state, productId, requiredQty, locationId)
}

// ---------- SERIAL HELPERS ----------

export function serialsForProduct(state: S, productId: string): SerialNumber[] {
  return state.serials.filter((sn) => sn.productId === productId)
}

export function availableSerials(state: S, productId: string, locationId?: string): SerialNumber[] {
  return state.serials.filter(
    (sn) =>
      sn.productId === productId &&
      (sn.status === 'in_stock' || sn.status === 'reserved') &&
      (!locationId || sn.locationId === locationId),
  )
}

export function serialByNumber(state: S, serial: string): SerialNumber | undefined {
  return state.serials.find((sn) => sn.serial === serial)
}

// ---------- ZONE / LOCATION HELPERS ----------

export function zonesForWarehouse(state: S, warehouseId: string) {
  return state.warehouseZones.filter((z) => z.warehouseId === warehouseId && z.active)
}

export function locationsForZone(state: S, zoneId: string) {
  return state.locationExtensions
    .filter((le) => le.zoneId === zoneId)
    .map((le) => state.locations.find((l) => l.id === le.locationId))
    .filter(Boolean)
}

/** Capacity utilisation % for a location */
export function locationCapacityPct(state: S, locationId: string): number {
  const ext = state.locationExtensions.find((e) => e.locationId === locationId)
  if (!ext?.capacity || ext.capacity === 0) return 0
  const onHand = state.quants
    .filter((q) => q.locationId === locationId)
    .reduce((sum, q) => sum + q.qty, 0)
  return Math.min(100, Math.round((onHand / ext.capacity) * 100))
}

// ---------- CYCLE COUNT HELPERS ----------

export function cycleCountSummary(state: S) {
  const total = state.cycleCounts.length
  const byStatus = state.cycleCounts.reduce(
    (acc, cc) => { acc[cc.status] = (acc[cc.status] ?? 0) + 1; return acc },
    {} as Record<string, number>,
  )
  return { total, byStatus }
}

// ---------- WAREHOUSE DASHBOARD METRICS ----------

export function warehouseDashboardMetrics(state: S, warehouseId: string) {
  const today = new Date().toISOString().slice(0, 10)

  const whDocs = state.documents.filter((d) => d.warehouseId === warehouseId)

  const inboundToday = whDocs.filter(
    (d) => d.type === 'receipt' && d.scheduledDate === today && d.status !== 'canceled',
  ).length

  const outboundToday = whDocs.filter(
    (d) => d.type === 'delivery' && d.scheduledDate === today && d.status !== 'canceled',
  ).length

  const pendingReceiving = whDocs.filter(
    (d) => d.type === 'receipt' && (d.status === 'draft' || d.status === 'ready' || d.status === 'waiting'),
  ).length

  const pendingPicking = state.pickingOrders.filter(
    (p) => p.warehouseId === warehouseId && (p.status === 'draft' || p.status === 'in_progress'),
  ).length

  const pendingPacking = state.packages.filter((pkg) => {
    const doc = state.documents.find((d) => d.id === pkg.deliveryDocId)
    return doc?.warehouseId === warehouseId && pkg.status !== 'sealed'
  }).length

  const pendingShipping = state.shipments.filter((sh) => {
    const doc = state.documents.find((d) => d.id === sh.deliveryDocId)
    return doc?.warehouseId === warehouseId && sh.status === 'pending'
  }).length

  const activeCycleCounts = state.cycleCounts.filter(
    (cc) => cc.warehouseId === warehouseId && cc.status !== 'posted' && cc.status !== 'draft',
  ).length

  const zones = state.warehouseZones.filter((z) => z.warehouseId === warehouseId && z.active)

  const expiring = expiringLots(state, 30).filter((e) => e.lot.warehouseId === warehouseId)

  // Stock by zone
  const stockByZone = zones.map((zone) => {
    const zoneLocs = state.locationExtensions
      .filter((le) => le.zoneId === zone.id)
      .map((le) => le.locationId)
    const qty = state.quants
      .filter((q) => zoneLocs.includes(q.locationId))
      .reduce((sum, q) => sum + q.qty, 0)
    return { zone, qty }
  })

  return {
    inboundToday,
    outboundToday,
    pendingReceiving,
    pendingPicking,
    pendingPacking,
    pendingShipping,
    activeCycleCounts,
    expiringLotsCount: expiring.length,
    stockByZone,
    zones,
  }
}
