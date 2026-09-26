import { useMemo } from 'react'
import {
  CheckCircle2,
  Clock,
  FileCheck,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Send,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react'
import { useStore } from '../store'
import { formatDate } from '../lib/utils'
import type { AuditLogEntry } from '../types'

interface ActivityTimelineProps {
  entityId: string
  documentNumber?: string
  fallbackDates?: {
    createdAt?: string
    sentAt?: string
    approvedAt?: string
    approvedBy?: string
    validatedAt?: string
    completedAt?: string
    canceledAt?: string
  }
}

export function ActivityTimeline({
  entityId,
  documentNumber,
  fallbackDates,
}: ActivityTimelineProps) {
  const { state } = useStore()

  // Match audit logs for this entity
  const events = useMemo(() => {
    const list = (state.auditLogs || []).filter(
      (entry) =>
        entry.entityId === entityId ||
        (documentNumber && entry.documentNumber === documentNumber),
    )

    // Sort ascending by timestamp
    const sorted = [...list].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )

    // If no audit entries exist yet, build synthesized events from fallback dates
    if (sorted.length === 0 && fallbackDates) {
      const syn: Partial<AuditLogEntry>[] = []
      if (fallbackDates.createdAt) {
        syn.push({
          id: 'syn_created',
          timestamp: fallbackDates.createdAt,
          action: 'CREATE',
          userName: 'Creator',
          metadata: { note: 'Record created' },
        })
      }
      if (fallbackDates.sentAt) {
        syn.push({
          id: 'syn_sent',
          timestamp: fallbackDates.sentAt,
          action: 'UPDATE',
          userName: 'Staff',
          metadata: { note: 'Sent to partner' },
        })
      }
      if (fallbackDates.approvedAt) {
        syn.push({
          id: 'syn_approved',
          timestamp: fallbackDates.approvedAt,
          action: 'APPROVE',
          userName: fallbackDates.approvedBy || 'Manager',
          metadata: { note: 'Authorized & approved' },
        })
      }
      if (fallbackDates.validatedAt || fallbackDates.completedAt) {
        syn.push({
          id: 'syn_done',
          timestamp: fallbackDates.validatedAt || fallbackDates.completedAt,
          action: 'VALIDATE',
          userName: 'Warehouse Team',
          metadata: { note: 'Validated & completed' },
        })
      }
      return syn as AuditLogEntry[]
    }

    return sorted
  }, [state.auditLogs, entityId, documentNumber, fallbackDates])

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return { icon: FileText, color: 'text-sky-500 bg-sky-500/10' }
      case 'UPDATE':
        return { icon: Clock, color: 'text-blue-500 bg-blue-500/10' }
      case 'CONFIRM':
        return { icon: Send, color: 'text-indigo-500 bg-indigo-500/10' }
      case 'APPROVE':
        return { icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-500/10' }
      case 'REJECT':
      case 'CANCEL':
        return { icon: XCircle, color: 'text-rose-500 bg-rose-500/10' }
      case 'VALIDATE':
        return { icon: FileCheck, color: 'text-emerald-600 bg-emerald-500/10' }
      case 'PICK':
        return { icon: FileSpreadsheet, color: 'text-amber-500 bg-amber-500/10' }
      case 'PACK':
        return { icon: CheckCircle2, color: 'text-teal-500 bg-teal-500/10' }
      case 'SHIPPED':
        return { icon: Truck, color: 'text-purple-500 bg-purple-500/10' }
      default:
        return { icon: RotateCcw, color: 'text-fg-muted bg-surface-2' }
    }
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-fg">Activity Timeline</h3>
        <p className="mt-2 text-xs text-fg-muted">No logged actions recorded yet for this document.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h3 className="text-sm font-semibold text-fg">Document Activity Timeline</h3>
        <span className="text-xs text-fg-muted">{events.length} event{events.length === 1 ? '' : 's'}</span>
      </div>

      <div className="relative mt-4 pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
        {events.map((e, idx) => {
          const { icon: Icon, color } = getActionBadge(e.action)
          return (
            <div key={e.id || idx} className="relative group">
              {/* Timeline marker */}
              <div
                className={`absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface shadow-sm ${color}`}
              >
                <Icon size={10} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xs font-semibold text-fg">
                    {e.action}
                  </span>
                  <span className="text-[11px] text-fg-subtle">
                    by {e.userName || 'System'}
                  </span>
                  <span className="text-[10px] text-fg-muted ml-auto">
                    {formatDate(e.timestamp)}
                  </span>
                </div>

                {e.metadata && (
                  <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                    {e.metadata.comment ||
                      e.metadata.note ||
                      (e.metadata.action && `Action: ${e.metadata.action}`) ||
                      (e.metadata.threshold && `Threshold: $${e.metadata.threshold}`) ||
                      JSON.stringify(e.metadata)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
