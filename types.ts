export type Role = 'inventory_manager' | 'warehouse_staff'
export type DocType = 'receipt' | 'delivery' | 'internal' | 'adjustment'
export type DocStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
export type LocationType = 'internal' | 'vendor' | 'customer' | 'inventory_loss'

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  role: Role
  phone: string
}

export interface Warehouse {
  id: string
  name: string
  code: string
  address: string
}

export interface Location {
  id: string
  warehouseId: string | null
  name: string
  code: string
  type: LocationType
}

export interface Category {
  id: string
  name: string
}

export interface Product {
  id: string
  name: string
  sku: string
  categoryId: string
  uom: string
  description: string
  costPrice?: number
  salesPrice?: number
  primaryVendorId?: string
}

export interface ReorderRule {
  id: string
  productId: string
  locationId: string
  minQty: number
  maxQty: number
}

export interface Quant {
  id: string
  productId: string
  locationId: string
  qty: number
}

export interface DocumentLine {
  id: string
  productId: string
  qty: number
  countedQty?: number
}

export interface Document {
  id: string
  number: string
  type: DocType
  status: DocStatus
  warehouseId: string
  sourceLocationId: string
  destLocationId: string
  partnerName: string
  scheduledDate: string
  notes: string
  lines: DocumentLine[]
  createdAt: string
  validatedAt?: string
  pickDone: boolean
  packDone: boolean
  createdBy: string
}

export interface LedgerEntry {
  id: string
  date: string
  productId: string
  fromLocationId: string | null
  toLocationId: string | null
  qty: number
  type: DocType | 'initial' | 'return'
  documentId: string | null
  documentNumber: string
  note: string
  userId: string
  unitCost?: number
}

export interface PendingOtp {
  email: string
  code: string
  expiresAt: number
}

// ----------------- ADDON DOMAIN TYPES -----------------

export interface Vendor {
  id: string
  code: string
  companyName: string
  contactPerson: string
  email: string
  phone: string
  address: string
  taxNumber: string
  paymentTerms: string
  leadTime: number // in days
  status: 'active' | 'inactive'
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  code: string
  name: string
  email: string
  phone: string
  address: string
  taxNumber: string
  status: 'active' | 'inactive'
  notes: string
  createdAt: string
  updatedAt: string
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'partial' | 'received' | 'canceled'

export interface PurchaseOrderLine {
  id: string
  productId: string
  orderedQty: number
  receivedQty: number
  unitCost: number
  taxRate: number
  subtotal: number
  tax: number
  total: number
}

export interface PurchaseOrder {
  id: string
  number: string
  vendorId: string
  warehouseId: string
  orderDate: string
  expectedDeliveryDate: string
  status: PurchaseOrderStatus
  currency: string
  notes: string
  lines: PurchaseOrderLine[]
  subtotal: number
  tax: number
  total: number
  allowOverReceipt?: boolean
  createdAt: string
  updatedAt: string
  receivedDocIds?: string[]
}

export type SalesOrderStatus =
  | 'draft'
  | 'confirmed'
  | 'reserved'
  | 'picking'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'canceled'

export interface SalesOrderLine {
  id: string
  productId: string
  qty: number
  unitPrice: number
  discount: number
  taxRate: number
  subtotal: number
  tax: number
  total: number
}

export interface SalesOrder {
  id: string
  number: string
  customerId: string
  warehouseId: string
  orderDate: string
  deliveryDate: string
  status: SalesOrderStatus
  currency: string
  notes: string
  lines: SalesOrderLine[]
  subtotal: number
  tax: number
  total: number
  createdAt: string
  updatedAt: string
  deliveryDocId?: string
}

export interface StockReservation {
  id: string
  salesOrderId: string
  productId: string
  warehouseId: string
  qty: number
  createdAt: string
}

export type ReturnType = 'customer' | 'vendor'
export type ReturnDestination = 'restock' | 'damaged' | 'scrap' | 'inventory_loss'

export interface ReturnLine {
  id: string
  productId: string
  qty: number
  reason: string
  destination: ReturnDestination
  inspectedQty?: number
  disposition?: ReturnDestination | 'rejected'
}

export interface ReturnOrder {
  id: string
  number: string
  type: ReturnType
  status: string
  partnerId: string
  partnerName: string
  referenceDocNumber?: string
  warehouseId: string
  lines: ReturnLine[]
  notes: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface AppState {
  users: User[]
  sessionUserId: string | null
  pendingOtp: PendingOtp | null
  warehouses: Warehouse[]
  locations: Location[]
  categories: Category[]
  products: Product[]
  reorderRules: ReorderRule[]
  quants: Quant[]
  documents: Document[]
  ledger: LedgerEntry[]
  sequences: Record<string, number>
  vendors: Vendor[]
  customers: Customer[]
  purchaseOrders: PurchaseOrder[]
  salesOrders: SalesOrder[]
  reservations: StockReservation[]
  returnOrders: ReturnOrder[]

  // Warehouse Operations Addon (v3)
  barcodeRecords: BarcodeRecord[]
  productExtensions: ProductExtension[]
  productVariants: ProductVariant[]
  lots: Lot[]
  serials: SerialNumber[]
  warehouseZones: WarehouseZone[]
  locationExtensions: LocationExtension[]
  putawayRules: PutawayRule[]
  cycleCounts: CycleCount[]
  pickingOrders: PickingOrder[]
  packages: Package[]
  shipments: Shipment[]
}


// ============================================================
// WAREHOUSE OPERATIONS ADDON — DOMAIN TYPES
// ============================================================

// ---------- BARCODE ----------

export type BarcodeFormat = 'CODE128' | 'EAN13' | 'QR'

export interface BarcodeRecord {
  id: string
  barcode: string
  format: BarcodeFormat
  entityType: 'product' | 'variant' | 'warehouse' | 'location' | 'lot' | 'serial' | 'purchaseOrder' | 'salesOrder' | 'delivery' | 'receipt'
  entityId: string
  createdAt: string
}

// ---------- PRODUCT VARIANTS ----------

export interface ProductAttribute {
  id: string
  name: string          // e.g. "Color", "Size"
  values: string[]      // e.g. ["Red", "Blue", "Green"]
}

export type TrackingType = 'none' | 'lot' | 'serial'

export interface ProductVariant {
  id: string
  productId: string
  variantSku: string
  barcode: string
  attributeValues: Record<string, string>   // { Color: "Black", Size: "M" }
  costPrice: number
  salesPrice: number
  active: boolean
  createdAt: string
}

// Extend Product with optional variant support + tracking
// Added as optional fields so existing products continue to work

export interface ProductExtension {
  productId: string
  trackingType: TrackingType
  hasVariants: boolean
  attributes: ProductAttribute[]
  expiryWarningDays: number   // days before expiry to warn
  rotationMethod: 'FIFO' | 'FEFO'  // per-product override
}

// ---------- LOT / BATCH TRACKING ----------

export type LotStatus = 'normal' | 'expiring_soon' | 'expired'

export interface Lot {
  id: string
  lotNumber: string
  productId: string
  variantId?: string
  qty: number
  locationId: string
  warehouseId: string
  manufacturingDate?: string
  expiryDate?: string
  supplierId?: string
  receivedDate: string
  receiptDocId?: string
  notes: string
  createdAt: string
}

// ---------- SERIAL NUMBER TRACKING ----------

export type SerialStatus = 'in_stock' | 'reserved' | 'delivered' | 'returned' | 'scrapped'

export interface SerialNumber {
  id: string
  serial: string
  productId: string
  variantId?: string
  status: SerialStatus
  locationId: string
  warehouseId: string
  receiptDocId?: string
  deliveryDocId?: string
  customerId?: string
  history: SerialMovement[]
  createdAt: string
}

export interface SerialMovement {
  id: string
  date: string
  fromLocationId: string | null
  toLocationId: string | null
  documentId: string | null
  documentNumber: string
  note: string
  userId: string
}

// ---------- WAREHOUSE ZONES ----------

export type ZoneType =
  | 'receiving'
  | 'quality_control'
  | 'storage'
  | 'picking'
  | 'packing'
  | 'shipping'
  | 'returns'
  | 'scrap'

export interface WarehouseZone {
  id: string
  warehouseId: string
  name: string
  code: string
  type: ZoneType
  active: boolean
  notes: string
}

// Extend Location with zone and bin support (optional, backward-compatible)
export interface LocationExtension {
  locationId: string
  zoneId?: string
  capacity?: number       // max units
  binCode?: string        // e.g. "A1-B2"
  active: boolean
}

// ---------- PUTAWAY RULES ----------

export interface PutawayRule {
  id: string
  warehouseId: string
  zoneId?: string
  locationId: string
  productId?: string      // match specific product
  categoryId?: string     // or match category
  priority: number        // lower = higher priority
  active: boolean
  notes: string
  createdAt: string
}

// ---------- CYCLE COUNTS ----------

export type CycleCountStatus = 'draft' | 'assigned' | 'counting' | 'review' | 'approved' | 'posted'

export interface CycleCountLine {
  id: string
  productId: string
  variantId?: string
  lotId?: string
  expected: number
  counted: number | null
  variance: number | null
}

export interface CycleCount {
  id: string
  number: string
  warehouseId: string
  locationId: string
  assignedUserId: string
  scheduledDate: string
  completedDate?: string
  status: CycleCountStatus
  notes: string
  lines: CycleCountLine[]
  adjustmentDocId?: string   // generated adjustment after posting
  createdAt: string
  createdBy: string
}

// ---------- PICKING ----------

export type PickingMethod = 'single' | 'batch' | 'wave'
export type PickingStatus = 'draft' | 'in_progress' | 'done' | 'canceled'

export interface PickingLine {
  id: string
  documentId: string
  productId: string
  variantId?: string
  lotId?: string
  serialId?: string
  qtyTodo: number
  qtyDone: number
  sourceLocationId: string
  suggestedLocationId?: string
  pickerId?: string
  scannedProductBarcode?: string
  scannedLocationBarcode?: string
  confirmed: boolean
}

export interface PickingOrder {
  id: string
  number: string
  method: PickingMethod
  status: PickingStatus
  warehouseId: string
  documentIds: string[]   // linked delivery doc IDs
  lines: PickingLine[]
  assignedUserId: string
  scheduledDate: string
  notes: string
  createdAt: string
  completedAt?: string
}

// ---------- PACKING ----------

export type PackageStatus = 'open' | 'packed' | 'sealed'

export interface Package {
  id: string
  packageNumber: string
  deliveryDocId: string
  type: string            // Box, Pallet, Envelope …
  weight?: number
  length?: number
  width?: number
  height?: number
  status: PackageStatus
  productLines: { productId: string; variantId?: string; lotId?: string; serialId?: string; qty: number }[]
  createdAt: string
  sealedAt?: string
}

// ---------- SHIPPING ----------

export type ShipmentStatus = 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'failed'

export interface Shipment {
  id: string
  number?: string
  deliveryDocId: string
  carrier: string
  trackingNumber: string
  shippingMethod: string
  shippedDate?: string
  estimatedDelivery?: string
  status: ShipmentStatus
  notes: string
  createdAt: string
  updatedAt: string
}

// ---------- EXTENDED APP STATE ADDITIONS (kept for reference) ----------
// All fields are now part of AppState directly above.
