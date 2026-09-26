import type { AppState } from '../types'
import { uid } from './utils'

const DEMO_HASH =
  'ff96673205dc722320598ebf8f88325b2ac56922d5a2164b5765868274bc0d73'

export function createSeed(): AppState {
  const userId = 'usr_demo'
  const catRaw = 'cat_raw'
  const catFin = 'cat_fin'
  const catComp = 'cat_comp'

  const wh1 = 'wh_main'
  const wh2 = 'wh_two'

  const locMain = 'loc_main_stock'
  const locProd = 'loc_prod'
  const locIn = 'loc_in'
  const locOut = 'loc_out'
  const locWh2 = 'loc_wh2_stock'
  const locVendor = 'loc_vendor'
  const locCustomer = 'loc_customer'
  const locLoss = 'loc_loss'

  const pSteel = 'prd_steel'
  const pRod = 'prd_rod'
  const pChair = 'prd_chair'
  const pFrame = 'prd_frame'

  const rec1 = 'doc_rec_1'
  const int1 = 'doc_int_1'
  const del1 = 'doc_del_1'
  const adj1 = 'doc_adj_1'

  return {
    users: [
      {
        id: userId,
        name: 'Alex Morgan',
        email: 'demo@stocksense.app',
        passwordHash: DEMO_HASH,
        role: 'inventory_manager',
        phone: '+1 415 555 0148',
      },
    ],
    sessionUserId: null,
    pendingOtp: null,
    warehouses: [
      {
        id: wh1,
        name: 'Main Warehouse',
        code: 'WH1',
        address: '120 Industrial Ave',
      },
      {
        id: wh2,
        name: 'Warehouse 2',
        code: 'WH2',
        address: '44 Harbor Road',
      },
    ],
    locations: [
      { id: locMain, warehouseId: wh1, name: 'Main Store', code: 'WH1/Stock', type: 'internal' },
      { id: locProd, warehouseId: wh1, name: 'Production Rack', code: 'WH1/Production', type: 'internal' },
      { id: locIn, warehouseId: wh1, name: 'Receiving', code: 'WH1/Input', type: 'internal' },
      { id: locOut, warehouseId: wh1, name: 'Shipping Dock', code: 'WH1/Output', type: 'internal' },
      { id: locWh2, warehouseId: wh2, name: 'WH2 Stock', code: 'WH2/Stock', type: 'internal' },
      { id: locVendor, warehouseId: null, name: 'Vendors', code: 'Partner/Vendors', type: 'vendor' },
      { id: locCustomer, warehouseId: null, name: 'Customers', code: 'Partner/Customers', type: 'customer' },
      { id: locLoss, warehouseId: null, name: 'Inventory Loss', code: 'Virtual/Loss', type: 'inventory_loss' },
    ],
    categories: [
      { id: catRaw, name: 'Raw Materials' },
      { id: catFin, name: 'Finished Goods' },
      { id: catComp, name: 'Components' },
    ],
    products: [
      { id: pSteel, name: 'Steel', sku: 'ST-KG-001', categoryId: catRaw, uom: 'kg', description: 'Bulk steel for production' },
      { id: pRod, name: 'Steel Rods', sku: 'ST-ROD-050', categoryId: catRaw, uom: 'Units', description: '10mm steel rods' },
      { id: pChair, name: 'Office Chair', sku: 'FG-CH-010', categoryId: catFin, uom: 'Units', description: 'Ergonomic office chair' },
      { id: pFrame, name: 'Steel Frame', sku: 'CP-FR-020', categoryId: catComp, uom: 'Units', description: 'Welded steel frame' },
    ],
    reorderRules: [
      { id: uid('rr'), productId: pSteel, locationId: locProd, minQty: 20, maxQty: 200 },
      { id: uid('rr'), productId: pChair, locationId: locMain, minQty: 5, maxQty: 40 },
      { id: uid('rr'), productId: pRod, locationId: locMain, minQty: 15, maxQty: 100 },
    ],
    quants: [
      { id: uid('q'), productId: pSteel, locationId: locProd, qty: 77 },
      { id: uid('q'), productId: pRod, locationId: locMain, qty: 12 },
      { id: uid('q'), productId: pChair, locationId: locMain, qty: 8 },
      { id: uid('q'), productId: pFrame, locationId: locMain, qty: 30 },
    ],
    documents: [
      {
        id: rec1,
        number: 'WH/IN/00001',
        type: 'receipt',
        status: 'done',
        warehouseId: wh1,
        sourceLocationId: locVendor,
        destLocationId: locMain,
        partnerName: 'MetalsPlus Vendor',
        scheduledDate: '2026-09-20',
        notes: 'Receive 100 kg Steel',
        lines: [{ id: uid('ln'), productId: pSteel, qty: 100 }],
        createdAt: '2026-09-20T09:00:00.000Z',
        validatedAt: '2026-09-20T09:12:00.000Z',
        pickDone: false,
        packDone: false,
        createdBy: userId,
      },
      {
        id: int1,
        number: 'WH/INT/00001',
        type: 'internal',
        status: 'done',
        warehouseId: wh1,
        sourceLocationId: locMain,
        destLocationId: locProd,
        partnerName: '',
        scheduledDate: '2026-09-21',
        notes: 'Main Store → Production Rack',
        lines: [{ id: uid('ln'), productId: pSteel, qty: 100 }],
        createdAt: '2026-09-21T10:00:00.000Z',
        validatedAt: '2026-09-21T10:20:00.000Z',
        pickDone: false,
        packDone: false,
        createdBy: userId,
      },
      {
        id: del1,
        number: 'WH/OUT/00001',
        type: 'delivery',
        status: 'done',
        warehouseId: wh1,
        sourceLocationId: locProd,
        destLocationId: locCustomer,
        partnerName: 'Northwind Manufacturing',
        scheduledDate: '2026-09-22',
        notes: 'Deliver 20 kg steel',
        lines: [{ id: uid('ln'), productId: pSteel, qty: 20 }],
        createdAt: '2026-09-22T11:00:00.000Z',
        validatedAt: '2026-09-22T14:00:00.000Z',
        pickDone: true,
        packDone: true,
        createdBy: userId,
      },
      {
        id: adj1,
        number: 'WH/ADJ/00001',
        type: 'adjustment',
        status: 'done',
        warehouseId: wh1,
        sourceLocationId: locProd,
        destLocationId: locLoss,
        partnerName: '',
        scheduledDate: '2026-09-23',
        notes: '3 kg steel damaged',
        lines: [{ id: uid('ln'), productId: pSteel, qty: 3, countedQty: 77 }],
        createdAt: '2026-09-23T16:00:00.000Z',
        validatedAt: '2026-09-23T16:10:00.000Z',
        pickDone: false,
        packDone: false,
        createdBy: userId,
      },
      {
        id: uid('doc'),
        number: 'WH/IN/00002',
        type: 'receipt',
        status: 'ready',
        warehouseId: wh1,
        sourceLocationId: locVendor,
        destLocationId: locIn,
        partnerName: 'RodWorks Co.',
        scheduledDate: '2026-09-26',
        notes: 'Pending inbound rods',
        lines: [{ id: uid('ln'), productId: pRod, qty: 50 }],
        createdAt: '2026-09-25T08:00:00.000Z',
        pickDone: false,
        packDone: false,
        createdBy: userId,
      },
      {
        id: uid('doc'),
        number: 'WH/OUT/00002',
        type: 'delivery',
        status: 'waiting',
        warehouseId: wh1,
        sourceLocationId: locMain,
        destLocationId: locCustomer,
        partnerName: 'City Office Fitouts',
        scheduledDate: '2026-09-27',
        notes: 'Waiting on chair availability',
        lines: [{ id: uid('ln'), productId: pChair, qty: 12 }],
        createdAt: '2026-09-25T09:30:00.000Z',
        pickDone: false,
        packDone: false,
        createdBy: userId,
      },
      {
        id: uid('doc'),
        number: 'WH/INT/00002',
        type: 'internal',
        status: 'ready',
        warehouseId: wh1,
        sourceLocationId: locMain,
        destLocationId: locWh2,
        partnerName: '',
        scheduledDate: '2026-09-26',
        notes: 'Warehouse 1 → Warehouse 2',
        lines: [{ id: uid('ln'), productId: pFrame, qty: 10 }],
        createdAt: '2026-09-25T12:00:00.000Z',
        pickDone: false,
        packDone: false,
        createdBy: userId,
      },
    ],
    ledger: [
      {
        id: uid('led'),
        date: '2026-09-20T09:12:00.000Z',
        productId: pSteel,
        fromLocationId: locVendor,
        toLocationId: locMain,
        qty: 100,
        type: 'receipt',
        documentId: rec1,
        documentNumber: 'WH/IN/00001',
        note: 'Receive 100 kg Steel',
        userId,
      },
      {
        id: uid('led'),
        date: '2026-09-21T10:20:00.000Z',
        productId: pSteel,
        fromLocationId: locMain,
        toLocationId: locProd,
        qty: 100,
        type: 'internal',
        documentId: int1,
        documentNumber: 'WH/INT/00001',
        note: 'Main Store → Production Rack',
        userId,
      },
      {
        id: uid('led'),
        date: '2026-09-22T14:00:00.000Z',
        productId: pSteel,
        fromLocationId: locProd,
        toLocationId: locCustomer,
        qty: 20,
        type: 'delivery',
        documentId: del1,
        documentNumber: 'WH/OUT/00001',
        note: 'Deliver 20 kg steel',
        userId,
      },
      {
        id: uid('led'),
        date: '2026-09-23T16:10:00.000Z',
        productId: pSteel,
        fromLocationId: locProd,
        toLocationId: locLoss,
        qty: 3,
        type: 'adjustment',
        documentId: adj1,
        documentNumber: 'WH/ADJ/00001',
        note: '3 kg steel damaged',
        userId,
      },
    ],
    sequences: { receipt: 2, delivery: 2, internal: 2, adjustment: 1 },
  }
}
