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
}
