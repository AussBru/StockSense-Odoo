import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Plus, Search, ShieldCheck, ShieldX, Clock, Phone, Mail, FileText } from 'lucide-react'
import { StatusBadge } from '../components/Badges'
import { inputClass } from '../components/AuthFrame'
import { useStore } from '../store'

export function VendorsPage() {
  const { state, toggleVendorStatus } = useStore()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const filtered = useMemo(() => {
    const needle = q.toLowerCase()
    return state.vendors.filter((v) => {
      if (status !== 'all' && v.status !== status) return false
      if (
        needle &&
        !`${v.companyName} ${v.code} ${v.contactPerson} ${v.email}`.toLowerCase().includes(needle)
      )
        return false
      return true
    })
  }, [state.vendors, q, status])

  const totalVendors = state.vendors.length
  const activeVendors = state.vendors.filter((v) => v.status === 'active').length
  const totalPoSpend = state.purchaseOrders
    .filter((p) => p.status === 'received' || p.status === 'partial')
    .reduce((sum, p) => sum + p.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Vendor Management</h1>
          <p className="text-sm text-fg-muted">
            Manage your suppliers, lead times, contact profiles, and track purchase performance.
          </p>
        </div>
        <Link
          to="/vendors/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-accent-fg shadow-sm transition hover:bg-brand-dark"
        >
          <Plus size={16} />
          New Vendor
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Total Vendors</span>
            <Building2 className="text-brand" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">{totalVendors}</div>
          <div className="mt-1 text-xs text-fg-muted">{activeVendors} active suppliers</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Total PO Spend</span>
            <FileText className="text-emerald-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">${totalPoSpend.toLocaleString()}</div>
          <div className="mt-1 text-xs text-fg-muted">Across received purchase orders</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Avg Lead Time</span>
            <Clock className="text-indigo-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">
            {totalVendors > 0
              ? Math.round(state.vendors.reduce((s, v) => s + v.leadTime, 0) / totalVendors)
              : 0}{' '}
            days
          </div>
          <div className="mt-1 text-xs text-fg-muted">Average fulfillment window</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="relative sm:col-span-2 md:col-span-3">
          <Search className="absolute left-3 top-3 text-fg-subtle" size={16} />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search by company name, code, contact person, or email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className={inputClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as 'all' | 'active' | 'inactive')}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Vendors Table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
              <tr>
                <th className="px-4 py-3.5">Vendor</th>
                <th className="px-4 py-3.5">Code</th>
                <th className="px-4 py-3.5">Contact Person</th>
                <th className="px-4 py-3.5">Contact Details</th>
                <th className="px-4 py-3.5">Lead Time</th>
                <th className="px-4 py-3.5">Terms</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-fg-subtle">
                    No vendors found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const poCount = state.purchaseOrders.filter((p) => p.vendorId === v.id).length
                  return (
                    <tr key={v.id} className="transition hover:bg-surface-2/70">
                      <td className="px-4 py-3.5">
                        <Link to={`/vendors/${v.id}`} className="font-semibold text-brand hover:underline">
                          {v.companyName}
                        </Link>
                        <div className="text-xs text-fg-subtle">{poCount} purchase orders</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-fg-soft">{v.code}</td>
                      <td className="px-4 py-3.5 font-medium text-fg">{v.contactPerson || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-fg-soft">
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-fg-subtle" />
                          <span>{v.email}</span>
                        </div>
                        {v.phone ? (
                          <div className="mt-0.5 flex items-center gap-1.5 text-fg-subtle">
                            <Phone size={12} />
                            <span>{v.phone}</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-fg">{v.leadTime} days</td>
                      <td className="px-4 py-3.5 text-xs text-fg-soft">{v.paymentTerms || 'Net 30'}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/vendors/${v.id}`}
                            className="rounded px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10"
                          >
                            View
                          </Link>
                          <Link
                            to={`/vendors/${v.id}/edit`}
                            className="rounded px-2 py-1 text-xs font-medium text-fg-soft hover:bg-surface-2"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleVendorStatus(v.id)}
                            title={v.status === 'active' ? 'Deactivate vendor' : 'Activate vendor'}
                            className={`rounded px-2 py-1 text-xs font-medium transition ${
                              v.status === 'active'
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {v.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
