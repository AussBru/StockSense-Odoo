import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, CheckCircle2, Plus, RotateCcw, Search, ShieldAlert, Truck } from 'lucide-react'
import { StatusBadge } from '../components/Badges'
import { inputClass } from '../components/AuthFrame'
import { useStore } from '../store'
import type { ReturnType } from '../types'

export function ReturnsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { state } = useStore()

  const defaultType = (searchParams.get('type') as ReturnType) || 'all'
  const [activeType, setActiveType] = useState<ReturnType | 'all'>(defaultType)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('all')

  const filtered = useMemo(() => {
    const needle = q.toLowerCase()
    return state.returnOrders.filter((ret) => {
      if (activeType !== 'all' && ret.type !== activeType) return false
      if (status !== 'all' && ret.status !== status) return false
      if (
        needle &&
        !`${ret.number} ${ret.partnerName} ${ret.referenceDocNumber || ''} ${ret.notes}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false
      }
      return true
    })
  }, [state.returnOrders, activeType, status, q])

  const customerReturns = state.returnOrders.filter((r) => r.type === 'customer')
  const vendorReturns = state.returnOrders.filter((r) => r.type === 'vendor')
  const completedReturns = state.returnOrders.filter((r) => r.status === 'completed' || r.status === 'restocked')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Returns Management</h1>
          <p className="text-sm text-muted">
            Process customer RMA returns and vendor defect returns with automated inventory inspection and restocking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/returns/new?type=customer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RotateCcw size={15} className="text-indigo-600" />
            + Customer Return
          </Link>
          <Link
            to="/returns/new?type=vendor"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            <Plus size={16} />
            + Vendor Return
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Customer Returns</span>
            <RotateCcw className="text-indigo-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{customerReturns.length}</div>
          <div className="mt-1 text-xs text-slate-500">Inbound RMA requests</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Vendor Returns</span>
            <Truck className="text-brand" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{vendorReturns.length}</div>
          <div className="mt-1 text-xs text-slate-500">Outbound vendor returns</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Completed & Disposed</span>
            <CheckCircle2 className="text-emerald-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{completedReturns.length}</div>
          <div className="mt-1 text-xs text-slate-500">Restocked or written off</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Pending Action</span>
            <ShieldAlert className="text-amber-500" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {state.returnOrders.filter((r) => r.status !== 'completed').length}
          </div>
          <div className="mt-1 text-xs text-slate-500">Awaiting inspection or shipment</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setActiveType('all')
            setSearchParams({})
          }}
          className={`border-b-2 px-5 py-2.5 text-sm font-semibold transition ${
            activeType === 'all'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All Returns ({state.returnOrders.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveType('customer')
            setSearchParams({ type: 'customer' })
          }}
          className={`border-b-2 px-5 py-2.5 text-sm font-semibold transition ${
            activeType === 'customer'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Customer Returns ({customerReturns.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveType('vendor')
            setSearchParams({ type: 'vendor' })
          }}
          className={`border-b-2 px-5 py-2.5 text-sm font-semibold transition ${
            activeType === 'vendor'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Vendor Returns ({vendorReturns.length})
        </button>
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search by RMA number, customer, vendor, or reference document..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="delivered">Delivered / Requested</option>
          <option value="return_requested">Return Requested</option>
          <option value="received">Received / Awaiting Inspection</option>
          <option value="inspected">Inspected</option>
          <option value="approved">Approved</option>
          <option value="shipped">Shipped</option>
          <option value="completed">Completed / Restocked</option>
        </select>
      </div>

      {/* Returns Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Return #</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Partner</th>
                <th className="px-4 py-3.5">Ref Order</th>
                <th className="px-4 py-3.5">Warehouse</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Items</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                    No returns found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((ret) => {
                  const wh = state.warehouses.find((w) => w.id === ret.warehouseId)
                  const totalUnits = ret.lines.reduce((s, l) => s + l.qty, 0)

                  return (
                    <tr key={ret.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-semibold">
                        <Link to={`/returns/${ret.id}`} className="text-brand hover:underline">
                          {ret.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            ret.type === 'customer'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {ret.type === 'customer' ? 'Customer RMA' : 'Vendor Return'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">{ret.partnerName}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                        {ret.referenceDocNumber || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{wh?.name || '—'}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={ret.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {ret.lines.length} SKU{ret.lines.length === 1 ? '' : 's'} · {totalUnits} units
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(ret.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/returns/${ret.id}`}
                          className="rounded px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
                        >
                          View & Process →
                        </Link>
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
