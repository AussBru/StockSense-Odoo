import type { AppNotification, AppState } from '../types'
import { availableStock, totalOnHand } from './inventory'
import { nowIso, uid } from './utils'

export function evaluateSystemNotifications(state: AppState): AppNotification[] {
  const existingUnreadKeys = new Set(
    (state.notifications || []).filter((n) => !n.read).map((n) => n.dedupKey),
  )

  const newNotifications: AppNotification[] = []
  const today = new Date().toISOString().slice(0, 10)
  const now = nowIso()

  // 1. Low stock & Out of stock & Stockout risk
  for (const p of state.products) {
    const onHand = totalOnHand(state, p.id)
    const avail = availableStock(state, p.id)

    if (onHand === 0) {
      const dedupKey = `out-of-stock-${p.id}`
      if (!existingUnreadKeys.has(dedupKey)) {
        newNotifications.push({
          id: uid('notif'),
          type: 'OUT_OF_STOCK',
          title: 'Out of Stock Alert',
          message: `${p.name} (${p.sku}) is completely out of stock (0 on hand).`,
          severity: 'error',
          read: false,
          timestamp: now,
          entityType: 'product',
          entityId: p.id,
          link: `/products/${p.id}`,
          dedupKey,
        })
        existingUnreadKeys.add(dedupKey)
      }
    } else {
      const rule = state.reorderRules.find((r) => r.productId === p.id)
      const minQty = rule?.minQty ?? 10
      if (avail <= minQty) {
        const dedupKey = `low-stock-${p.id}`
        if (!existingUnreadKeys.has(dedupKey)) {
          newNotifications.push({
            id: uid('notif'),
            type: 'LOW_STOCK',
            title: 'Low Stock Warning',
            message: `${p.name} available stock (${avail} ${p.uom}) is at or below minimum threshold (${minQty}).`,
            severity: 'warning',
            read: false,
            timestamp: now,
            entityType: 'product',
            entityId: p.id,
            link: `/products/${p.id}`,
            dedupKey,
          })
          existingUnreadKeys.add(dedupKey)
        }
      }
    }
  }

  // 2. Overdue Purchase Orders
  for (const po of state.purchaseOrders) {
    if (
      po.status !== 'received' &&
      po.status !== 'canceled' &&
      po.expectedDeliveryDate &&
      po.expectedDeliveryDate < today
    ) {
      const dedupKey = `po-overdue-${po.id}`
      if (!existingUnreadKeys.has(dedupKey)) {
        newNotifications.push({
          id: uid('notif'),
          type: 'PO_OVERDUE',
          title: 'Overdue Purchase Order',
          message: `PO ${po.number} expected on ${po.expectedDeliveryDate} has not been received.`,
          severity: 'warning',
          read: false,
          timestamp: now,
          entityType: 'purchaseOrder',
          entityId: po.id,
          link: `/purchase-orders/${po.id}`,
          dedupKey,
        })
        existingUnreadKeys.add(dedupKey)
      }
    }
  }

  // 3. Delayed Delivery Orders
  for (const doc of state.documents) {
    if (
      doc.type === 'delivery' &&
      doc.status !== 'done' &&
      doc.status !== 'canceled' &&
      doc.scheduledDate &&
      doc.scheduledDate < today
    ) {
      const dedupKey = `delivery-delay-${doc.id}`
      if (!existingUnreadKeys.has(dedupKey)) {
        newNotifications.push({
          id: uid('notif'),
          type: 'DELIVERY_DELAY',
          title: 'Delayed Delivery Order',
          message: `Delivery ${doc.number} for ${doc.partnerName || 'Customer'} is past its scheduled date (${doc.scheduledDate}).`,
          severity: 'warning',
          read: false,
          timestamp: now,
          entityType: 'document',
          entityId: doc.id,
          link: `/deliveries/${doc.id}`,
          dedupKey,
        })
        existingUnreadKeys.add(dedupKey)
      }
    }
  }

  // 4. Pending Approval Required
  const approvalThreshold = state.approvalSettings?.poThreshold ?? 5000
  for (const po of state.purchaseOrders) {
    if (po.approvalStatus === 'pending' || (po.status === 'draft' && po.total >= approvalThreshold && !po.approvalStatus)) {
      const dedupKey = `approval-po-${po.id}`
      if (!existingUnreadKeys.has(dedupKey)) {
        newNotifications.push({
          id: uid('notif'),
          type: 'APPROVAL_REQUIRED',
          title: 'PO Approval Required',
          message: `Purchase Order ${po.number} total ($${po.total.toLocaleString()}) exceeds the approval threshold and requires authorization.`,
          severity: 'info',
          read: false,
          timestamp: now,
          entityType: 'purchaseOrder',
          entityId: po.id,
          link: `/purchase-orders/${po.id}`,
          dedupKey,
        })
        existingUnreadKeys.add(dedupKey)
      }
    }
  }

  // 5. Lot Expiry Warnings
  const alertDays = state.inventorySettings?.expiryAlertDays ?? 30
  const futureAlertDate = new Date(Date.now() + alertDays * 86400000).toISOString().slice(0, 10)
  for (const lot of state.lots || []) {
    if (lot.expiryDate && lot.qty > 0 && lot.expiryDate <= futureAlertDate) {
      const isExpired = lot.expiryDate < today
      const dedupKey = `lot-expiry-${lot.id}-${isExpired ? 'expired' : 'soon'}`
      if (!existingUnreadKeys.has(dedupKey)) {
        const prod = state.products.find((p) => p.id === lot.productId)
        newNotifications.push({
          id: uid('notif'),
          type: 'EXPIRY_WARNING',
          title: isExpired ? 'Lot Expired' : 'Lot Expiring Soon',
          message: `Lot ${lot.lotNumber} (${prod?.name || 'Product'}) ${
            isExpired ? 'expired on' : 'will expire on'
          } ${lot.expiryDate}. Current balance: ${lot.qty}.`,
          severity: isExpired ? 'error' : 'warning',
          read: false,
          timestamp: now,
          entityType: 'lot',
          entityId: lot.id,
          link: `/lots`,
          dedupKey,
        })
        existingUnreadKeys.add(dedupKey)
      }
    }
  }

  // 6. Customer Returns pending inspection
  for (const ret of state.returnOrders || []) {
    if (ret.type === 'customer' && (ret.status === 'return_requested' || ret.status === 'received')) {
      const dedupKey = `return-inspect-${ret.id}`
      if (!existingUnreadKeys.has(dedupKey)) {
        newNotifications.push({
          id: uid('notif'),
          type: 'RETURN_REQUIRED',
          title: 'Return Inspection Required',
          message: `Customer RMA ${ret.number} from ${ret.partnerName} requires inspection & restocking.`,
          severity: 'info',
          read: false,
          timestamp: now,
          entityType: 'returnOrder',
          entityId: ret.id,
          link: `/returns/${ret.id}`,
          dedupKey,
        })
        existingUnreadKeys.add(dedupKey)
      }
    }
  }

  return newNotifications
}
