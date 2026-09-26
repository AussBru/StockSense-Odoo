import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, Search, Mail, Phone, ShoppingCart, DollarSign } from 'lucide-react'
import { StatusBadge } from '../components/Badges'
import { inputClass } from '../components/AuthFrame'
import { useStore } from '../store'

export function CustomersPage() {
  const { state, toggleCustomerStatus } = useStore()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const filtered = useMemo(() => {
    const needle = q.toLowerCase()
    return state.customers.filter((c) => {
      if (status !== 'all' && c.status !== status) return false
      if (needle && !`${c.name} ${c.code} ${c.email} ${c.phone}`.toLowerCase().includes(needle)) {
        return false
      }
      return true
    })
  }, [state.customers, q, status])

  const totalCustomers = state.customers.length
  const totalRevenue = state.salesOrders
    .filter((s) => s.status === 'shipped' || s.status === 'delivered')
    .reduce((sum, s) => sum + s.total, 0)
  const openOrdersCount = state.salesOrders.filter((s) => s.status !== 'delivered' && s.status !== 'canceled').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Customers</h1>
          <p className="text-sm text-muted">Manage customer accounts, sales histories, and billing information.</p>
        </div>
        <Link
          to="/customers/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <Plus size={16} />
          New Customer
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total Accounts</span>
            <Users className="text-brand" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{totalCustomers}</div>
          <div className="mt-1 text-xs text-slate-500">
            {state.customers.filter((c) => c.status === 'active').length} active clients
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Fulfilled Revenue</span>
            <DollarSign className="text-emerald-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">${totalRevenue.toLocaleString()}</div>
          <div className="mt-1 text-xs text-slate-500">From delivered and shipped orders</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Active Pipeline</span>
            <ShoppingCart className="text-indigo-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-700">{openOrdersCount}</div>
          <div className="mt-1 text-xs text-slate-500">Sales orders in progress</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="relative sm:col-span-2 md:col-span-3">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search by customer name, code, email, or phone..."
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

      {/* Customers Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Customer Name</th>
                <th className="px-4 py-3.5">Code</th>
                <th className="px-4 py-3.5">Contact Details</th>
                <th className="px-4 py-3.5">Address</th>
                <th className="px-4 py-3.5">Tax / GST</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const orders = state.salesOrders.filter((s) => s.customerId === c.id)
                  const totalSpent = orders
                    .filter((s) => s.status === 'shipped' || s.status === 'delivered')
                    .reduce((sum, s) => sum + s.total, 0)

                  return (
                    <tr key={c.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{c.name}</div>
                        <div className="text-xs text-slate-400">
                          {orders.length} order{orders.length === 1 ? '' : 's'} · ${totalSpent.toLocaleString()} spent
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{c.code}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                        {c.phone ? (
                          <div className="mt-0.5 flex items-center gap-1.5 text-slate-400">
                            <Phone size={12} />
                            <span>{c.phone}</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate">{c.address || '—'}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{c.taxNumber || '—'}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/sales-orders/new?customerId=${c.id}`}
                            className="rounded px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
                          >
                            + Order
                          </Link>
                          <Link
                            to={`/customers/${c.id}/edit`}
                            className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleCustomerStatus(c.id)}
                            className={`rounded px-2 py-1 text-xs font-medium transition ${
                              c.status === 'active'
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {c.status === 'active' ? 'Deactivate' : 'Activate'}
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
