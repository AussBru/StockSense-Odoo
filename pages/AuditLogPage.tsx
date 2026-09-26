import { useState, useMemo } from 'react'
import {
  FileText,
  Search,
  Download,
  Filter,
  Eye,
  X,
  Shield,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { useStore } from '../store'
import { formatDate } from '../lib/utils'
import { inputClass } from '../components/AuthFrame'
import { exportToCsv } from '../lib/export'
import type { AuditAction, AuditLogEntry } from '../types'

export function AuditLogPage() {
  const { state } = useStore()

  const [q, setQ] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Detail Modal
  const [detailEntry, setDetailEntry] = useState<AuditLogEntry | null>(null)

  const allLogs = state.auditLogs || []

  // Extract unique entities and users for filters
  const entities = useMemo(() => {
    return Array.from(new Set(allLogs.map((l) => l.entity).filter(Boolean))).sort()
  }, [allLogs])

  const users = useMemo(() => {
    return Array.from(new Set(allLogs.map((l) => l.userName).filter(Boolean))).sort()
  }, [allLogs])

  const filteredLogs = useMemo(() => {
    const needle = q.toLowerCase()
    return allLogs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false
      if (entityFilter !== 'all' && log.entity !== entityFilter) return false
      if (userFilter !== 'all' && log.userName !== userFilter) return false
      if (startDate && log.timestamp < `${startDate}T00:00:00.000Z`) return false
      if (endDate && log.timestamp > `${endDate}T23:59:59.999Z`) return false

      if (needle) {
        const text = `${log.action} ${log.entity} ${log.entityId} ${log.documentNumber || ''} ${log.userName} ${log.userEmail}`.toLowerCase()
        if (!text.includes(needle)) return false
      }
      return true
    })
  }, [allLogs, q, actionFilter, entityFilter, userFilter, startDate, endDate])

  const handleExportCsv = () => {
    const headers = [
      'Timestamp',
      'Action',
      'Entity',
      'Entity ID',
      'Document Ref',
      'User Name',
      'User Email',
      'User Role',
      'Old Value',
      'New Value',
      'Metadata',
    ]

    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.action,
      l.entity,
      l.entityId,
      l.documentNumber || '',
      l.userName,
      l.userEmail,
      l.userRole,
      l.oldValue ? JSON.stringify(l.oldValue) : '',
      l.newValue ? JSON.stringify(l.newValue) : '',
      l.metadata ? JSON.stringify(l.metadata) : '',
    ])

    exportToCsv('stocksense_audit_trail', headers, rows)
  }

  const getActionBadgeClass = (action: AuditAction) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
      case 'UPDATE':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
      case 'DELETE':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
      case 'APPROVE':
        return 'bg-teal-500/15 text-teal-700 dark:text-teal-400'
      case 'REJECT':
      case 'CANCEL':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
      case 'VALIDATE':
        return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400'
      case 'LOGIN':
      case 'LOGOUT':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-400'
      case 'CONFIRM':
      case 'PICK':
      case 'PACK':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
      default:
        return 'bg-surface-2 text-fg-muted'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-fg">Immutable Audit Trail</h1>
            <span className="rounded-full bg-accent/10 text-fg px-2.5 py-0.5 text-xs font-semibold">
              Read-Only
            </span>
          </div>
          <p className="text-sm text-fg-muted">
            Tamper-proof compliance log capturing every system operation, authorization, and state change.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-fg shadow-sm hover:bg-surface-2 transition"
        >
          <Download size={16} />
          Export Audit CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase text-fg-subtle">Total Logged Events</div>
          <div className="mt-1 text-2xl font-bold text-fg">{allLogs.length}</div>
          <div className="mt-0.5 text-xs text-fg-muted">Recorded system actions</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase text-fg-subtle">Document Operations</div>
          <div className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {allLogs.filter((l) => ['VALIDATE', 'CONFIRM', 'PICK', 'PACK'].includes(l.action)).length}
          </div>
          <div className="mt-0.5 text-xs text-fg-muted">Warehouse transactions</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase text-fg-subtle">Authorizations</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {allLogs.filter((l) => ['APPROVE', 'REJECT'].includes(l.action)).length}
          </div>
          <div className="mt-0.5 text-xs text-fg-muted">Managerial approval reviews</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase text-fg-subtle">Security & Sessions</div>
          <div className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">
            {allLogs.filter((l) => ['LOGIN', 'LOGOUT'].includes(l.action)).length}
          </div>
          <div className="mt-0.5 text-xs text-fg-muted">Authentication events</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-3 text-fg-subtle" size={16} />
          <input
            className={`${inputClass} pl-10`}
            placeholder="Search action, entity, document #, user..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          className={inputClass}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="all">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="VALIDATE">VALIDATE</option>
          <option value="APPROVE">APPROVE</option>
          <option value="REJECT">REJECT</option>
          <option value="CONFIRM">CONFIRM</option>
          <option value="PICK">PICK</option>
          <option value="PACK">PACK</option>
          <option value="CANCEL">CANCEL</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
        </select>

        <select
          className={inputClass}
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          <option value="all">All Entities</option>
          {entities.map((ent) => (
            <option key={ent} value={ent}>
              {ent}
            </option>
          ))}
        </select>

        <select
          className={inputClass}
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        >
          <option value="all">All Operators</option>
          {users.map((usr) => (
            <option key={usr} value={usr}>
              {usr}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted">From:</span>
          <input
            type="date"
            className={`${inputClass} w-auto`}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted">To:</span>
          <input
            type="date"
            className={`${inputClass} w-auto`}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        {(startDate || endDate || q || actionFilter !== 'all' || entityFilter !== 'all' || userFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setActionFilter('all')
              setEntityFilter('all')
              setUserFilter('all')
              setStartDate('')
              setEndDate('')
            }}
            className="text-xs font-semibold text-fg-muted hover:text-fg underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Operator</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Entity</th>
                <th className="px-5 py-3.5">Document / Ref</th>
                <th className="px-5 py-3.5">Summary / Metadata</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-fg-muted text-sm">
                    No audit records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-2/50 transition">
                    <td className="px-5 py-3.5 text-xs text-fg font-mono">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-fg text-xs">{log.userName}</div>
                      <div className="text-[11px] text-fg-subtle">{log.userEmail}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-fg text-xs">
                      {log.entity}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-fg-muted">
                      {log.documentNumber || log.entityId || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-fg-muted max-w-xs truncate">
                      {log.metadata
                        ? JSON.stringify(log.metadata)
                        : log.newValue
                        ? JSON.stringify(log.newValue)
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailEntry(log)}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg hover:bg-surface-2 transition shadow-sm"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {detailEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailEntry(null)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <button
              type="button"
              onClick={() => setDetailEntry(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-fg-subtle hover:bg-surface-2 hover:text-fg transition"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 border-b border-line pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-fg">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-fg">
                  Audit Entry Details
                </h3>
                <div className="text-xs text-fg-muted">
                  ID: <span className="font-mono">{detailEntry.id}</span>
                </div>
              </div>
            </div>

            <div className="ss-scroll flex-1 overflow-y-auto space-y-4 py-4 text-xs">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-surface-2 p-3.5">
                <div>
                  <span className="text-fg-subtle">Timestamp:</span>
                  <div className="font-semibold text-fg font-mono mt-0.5">{formatDate(detailEntry.timestamp)}</div>
                </div>
                <div>
                  <span className="text-fg-subtle">Action:</span>
                  <div className="mt-0.5">
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${getActionBadgeClass(detailEntry.action)}`}>
                      {detailEntry.action}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-fg-subtle">Operator:</span>
                  <div className="font-semibold text-fg mt-0.5">{detailEntry.userName} ({detailEntry.userEmail})</div>
                </div>
                <div>
                  <span className="text-fg-subtle">Operator Role:</span>
                  <div className="font-semibold text-fg capitalize mt-0.5">{detailEntry.userRole}</div>
                </div>
                <div>
                  <span className="text-fg-subtle">Entity:</span>
                  <div className="font-semibold text-fg mt-0.5">{detailEntry.entity}</div>
                </div>
                <div>
                  <span className="text-fg-subtle">Document / Reference:</span>
                  <div className="font-mono font-semibold text-fg mt-0.5">{detailEntry.documentNumber || detailEntry.entityId || '—'}</div>
                </div>
              </div>

              {detailEntry.metadata && (
                <div>
                  <div className="font-semibold text-fg mb-1">Metadata:</div>
                  <pre className="rounded-xl border border-line bg-surface-2 p-3 font-mono text-[11px] text-fg overflow-x-auto">
                    {JSON.stringify(detailEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {detailEntry.oldValue && (
                <div>
                  <div className="font-semibold text-rose-600 dark:text-rose-400 mb-1">Previous State (Old Value):</div>
                  <pre className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 font-mono text-[11px] text-fg overflow-x-auto">
                    {JSON.stringify(detailEntry.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {detailEntry.newValue && (
                <div>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Updated State (New Value):</div>
                  <pre className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 font-mono text-[11px] text-fg overflow-x-auto">
                    {JSON.stringify(detailEntry.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setDetailEntry(null)}
                className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-fg hover:bg-accent-hover transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
