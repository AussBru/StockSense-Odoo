import type { DocStatus, DocType } from '../types'
import { DOC_LABEL, STATUS_LABEL, statusClass, typeClass } from '../lib/inventory'

const LABELS: Record<string, string> = {
  ...STATUS_LABEL,
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partially Received',
  received: 'Received',
  confirmed: 'Confirmed',
  reserved: 'Stock Reserved',
  picking: 'Picking',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  canceled: 'Cancelled',
  active: 'Active',
  inactive: 'Inactive',
  completed: 'Completed',
  approved: 'Approved',
  return_requested: 'Return Requested',
  inspected: 'Inspected',
  restocked: 'Restocked',
  rejected: 'Rejected',
  damaged: 'Damaged',
  scrap: 'Scrapped',
  inventory_loss: 'Inventory Loss',
}

export function StatusBadge({ status }: { status: DocStatus | string }) {
  const label = LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusClass(
        status,
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  )
}

export function TypeBadge({ type }: { type: DocType | string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeClass(type)}`}>
      {DOC_LABEL[type] || type}
    </span>
  )
}
