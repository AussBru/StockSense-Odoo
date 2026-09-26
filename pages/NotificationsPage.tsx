import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  Trash2,
  RefreshCw,
  Search,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ExternalLink,
  Check,
} from 'lucide-react'
import { useStore } from '../store'
import { formatDate } from '../lib/utils'
import { inputClass } from '../components/AuthFrame'
import { useToast } from '../components/Toast'
import type { NotificationSeverity, NotificationType } from '../types'

export function NotificationsPage() {
  const { state, markNotificationRead, markAllNotificationsRead, clearNotifications, triggerAlertEvaluation } =
    useStore()
  const navigate = useNavigate()
  const toast = useToast()

  const [q, setQ] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const notifications = state.notifications || []

  const filteredNotifs = useMemo(() => {
    const needle = q.toLowerCase()
    return notifications.filter((n) => {
      if (severityFilter !== 'all' && n.severity !== severityFilter) return false
      if (typeFilter !== 'all' && n.type !== typeFilter) return false
      if (statusFilter === 'unread' && n.read) return false
      if (statusFilter === 'read' && !n.read) return false
      if (needle && !`${n.title} ${n.message} ${n.type}`.toLowerCase().includes(needle)) {
        return false
      }
      return true
    })
  }, [notifications, q, severityFilter, typeFilter, statusFilter])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleRunScan = () => {
    triggerAlertEvaluation()
    toast.info('System rules evaluated. Any newly triggered alerts have been populated.')
  }

  const getSeverityBadge = (sev: NotificationSeverity) => {
    switch (sev) {
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
            <AlertCircle size={12} />
            Critical
          </span>
        )
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle size={12} />
            Warning
          </span>
        )
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={12} />
            Resolved
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-400">
            <Info size={12} />
            Notice
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-fg">Notification Center</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-fg-muted">
            Real-time automated alerts for inventory shortages, overdue procurement, delivery delays, and approvals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunScan}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg hover:bg-surface-2 transition shadow-sm"
          >
            <RefreshCw size={14} />
            Evaluate Alerts Now
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllNotificationsRead()}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg hover:bg-surface-2 transition shadow-sm"
            >
              <CheckCheck size={14} />
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => clearNotifications()}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition shadow-sm"
            >
              <Trash2 size={14} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3.5 top-3 text-fg-subtle" size={16} />
          <input
            className={`${inputClass} pl-10`}
            placeholder="Search alerts by title or keyword..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          className={inputClass}
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="all">All Severities</option>
          <option value="error">Critical (Errors)</option>
          <option value="warning">Warnings</option>
          <option value="info">Informational</option>
        </select>

        <select
          className={inputClass}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Alert Types</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
          <option value="PO_OVERDUE">Overdue PO</option>
          <option value="DELIVERY_DELAY">Delivery Delay</option>
          <option value="EXPIRY_WARNING">Lot Expiry Warning</option>
          <option value="APPROVAL_REQUIRED">Approval Required</option>
          <option value="RETURN_REQUIRED">Return Required</option>
        </select>

        <select
          className={inputClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="unread">Unread Only</option>
          <option value="read">Read Only</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-12 text-center shadow-sm">
            <Bell size={36} className="mx-auto text-fg-subtle opacity-50" />
            <h3 className="mt-3 text-base font-semibold text-fg">No Notifications Found</h3>
            <p className="mt-1 text-xs text-fg-muted max-w-sm mx-auto">
              There are no alerts matching your criteria. System health is optimal!
            </p>
          </div>
        ) : (
          filteredNotifs.map((n) => (
            <div
              key={n.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm transition ${
                n.read
                  ? 'border-line bg-surface opacity-80'
                  : 'border-accent/30 bg-surface-2/60 shadow-md ring-1 ring-accent/10'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="mt-1">{getSeverityBadge(n.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-bold text-fg">{n.title}</span>
                    <span className="rounded bg-surface-2 border border-line px-1.5 py-0.2 text-[10px] font-mono text-fg-subtle">
                      {n.type}
                    </span>
                    <span className="text-xs text-fg-subtle ml-auto sm:ml-0">
                      {formatDate(n.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted leading-relaxed max-w-3xl">
                    {n.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {n.link && (
                  <button
                    type="button"
                    onClick={() => {
                      markNotificationRead(n.id)
                      navigate(n.link!)
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg shadow-sm hover:bg-accent-hover transition"
                  >
                    <span>View Record</span>
                    <ExternalLink size={12} />
                  </button>
                )}
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(n.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg hover:bg-surface-2 transition"
                    title="Mark as read"
                  >
                    <Check size={13} />
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
