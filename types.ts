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
  type: DocType | 'initial'
  documentId: string | null
  documentNumber: string
  note: string
  userId: string
}

export interface PendingOtp {
  email: string
  code: string
  expiresAt: number
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
  sequences: Record<DocType, number>
}
