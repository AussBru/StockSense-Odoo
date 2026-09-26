import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, DollarSign, Package, Plus, Search, ShoppingCart, Truck } from 'lucide-react'
import { StatusBadge } from '../components/Badges'
import { inputClass } from '../components/AuthFrame'
import { useStore } from '../store'
import type { SalesOrderStatus } from '../types'

export function SalesOrdersPage() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<SalesOrderStatus | 'all'>('all')
  const [customerId, setCustomerId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')

  const filtered = useMemo(() => {
    const needle = q.toLowerCase()
    return state.salesOrders.filter((so) => {
      if (status !== 'all' && so.status !== status) return false
      if (customerId && so.customerId !== customerId) return false
      if (warehouseId && so.warehouseId !== warehouseId) return false

      const customer = state.customers.find((c) => c.id === so.customerId)
      if (
        needle &&
        !`${so.number} ${customer?.name || ''} ${so.notes}`.toLowerCase().includes(needle)
      ) {
        return false
      }
      return true
    })
  }, [state.salesOrders, state.customers, q, status, customerId, warehouseId])

  const totalOrders = state.salesOrders.length
  const totalRevenue = state.salesOrders
    .filter((s) => s.status !== 'canceled')
    .reduce((sum, s) => sum + s.total, 0)
  const inFulfillment = state.salesOrders.filter(
    (s) => s.status === 'confirmed' || s.status === 'reserved' || s.status === 'picking' || s.status === 'packed',
  )
  const deliveredOrders = state.salesOrders.filter((s) => s.status === 'delivered')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Sales Orders</h1>
          <p className="text-sm text-muted">
            Manage customer demands, reserve real inventory stock, and track dispatch fulfillment.
          </p>
        </div>
        <Link
          to="/sales-orders/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <Plus size={16} />
          New Sales Order
        </Link>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total Sales Orders</span>
            <ShoppingCart className="text-brand" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{totalOrders}</div>
          <div className="mt-1 text-xs text-slate-500">${totalRevenue.toLocaleString()} pipeline value</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">In Fulfillment</span>
            <Package className="text-amber-500" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{inFulfillment.length}</div>
          <div className="mt-1 text-xs text-slate-500">Reserved, picking, or packing</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">In Transit / Shipped</span>
            <Truck className="text-blue-500" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600">
            {state.salesOrders.filter((s) => s.status === 'shipped').length}
          </div>
          <div className="mt-1 text-xs text-slate-500">Dispatched from dock</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Delivered</span>
            <CheckCircle2 className="text-emerald-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{deliveredOrders.length}</div>
          <div className="mt-1 text-xs text-slate-500">Fulfilled customer orders</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search by SO number, customer name, notes..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          className={inputClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as SalesOrderStatus | 'all')}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="reserved">Stock Reserved</option>
          <option value="picking">Picking</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="canceled">Cancelled</option>
        </select>

        <select className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">All Customers</option>
          {state.customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sales Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3.5">SO Number</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Warehouse</th>
                <th className="px-4 py-3.5">Order Date</th>
                <th className="px-4 py-3.5">Delivery Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Items</th>
                <th className="px-4 py-3.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    No sales orders found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((so) => {
                  const customer = state.customers.find((c) => c.id === so.customerId)
                  const warehouse = state.warehouses.find((w) => w.id === so.warehouseId)
                  const totalUnits = so.lines.reduce((s, l) => s + l.qty, 0)

                  return (
                    <tr key={so.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-semibold">
                        <Link to={`/sales-orders/${so.id}`} className="text-brand hover:underline">
                          {so.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">{customer?.name || 'Unknown'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{warehouse?.name || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{so.orderDate}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{so.deliveryDate}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={so.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {so.lines.length} SKU{so.lines.length === 1 ? '' : 's'} · {totalUnits} units
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                        ${so.total.toLocaleString()}
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
