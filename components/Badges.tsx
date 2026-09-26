import type { DocStatus, DocType } from '../types'
import { DOC_LABEL, STATUS_LABEL, statusClass, typeClass } from '../lib/inventory'

export function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(status)}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export function TypeBadge({ type }: { type: DocType }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeClass(type)}`}>
      {DOC_LABEL[type]}
    </span>
  )
}
