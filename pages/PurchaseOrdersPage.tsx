import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, Search, ShoppingBag, Truck, CheckCircle, Clock } from 'lucide-react'
import { StatusBadge } from '../components/Badges'
import { inputClass } from '../components/AuthFrame'
import { useStore } from '../store'
import type { PurchaseOrderStatus } from '../types'

export function PurchaseOrdersPage() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<PurchaseOrderStatus | 'all'>('all')
  const [vendorId, setVendorId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')

  const filtered = useMemo(() => {
    const needle = q.toLowerCase()
    return state.purchaseOrders.filter((po) => {
      if (status !== 'all' && po.status !== status) return false
      if (vendorId && po.vendorId !== vendorId) return false
      if (warehouseId && po.warehouseId !== warehouseId) return false

      const vendor = state.vendors.find((v) => v.id === po.vendorId)
      if (
        needle &&
        !`${po.number} ${vendor?.companyName || ''} ${po.notes}`.toLowerCase().includes(needle)
      ) {
        return false
      }
      return true
    })
  }, [state.purchaseOrders, state.vendors, q, status, vendorId, warehouseId])

  const totalOrders = state.purchaseOrders.length
  const totalValue = state.purchaseOrders.reduce((sum, p) => sum + p.total, 0)
  const openOrders = state.purchaseOrders.filter((p) => p.status === 'sent' || p.status === 'partial')
  const openValue = openOrders.reduce((sum, p) => sum + p.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Purchase Orders</h1>
          <p className="text-sm text-muted">
            Manage procurement workflows, track vendor shipments, and receive goods into warehouse stock.
          </p>
        </div>
        <Link
          to="/purchase-orders/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <Plus size={16} />
          New Purchase Order
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total POs</span>
            <FileText className="text-brand" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{totalOrders}</div>
          <div className="mt-1 text-xs text-slate-500">${totalValue.toLocaleString()} total committed</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Open / In-Transit</span>
            <Truck className="text-amber-500" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{openOrders.length}</div>
          <div className="mt-1 text-xs text-slate-500">${openValue.toLocaleString()} pending arrival</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Fully Received</span>
            <CheckCircle className="text-emerald-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">
            {state.purchaseOrders.filter((p) => p.status === 'received').length}
          </div>
          <div className="mt-1 text-xs text-slate-500">Fulfilled & stocked</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Draft Orders</span>
            <Clock className="text-slate-500" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-700">
            {state.purchaseOrders.filter((p) => p.status === 'draft').length}
          </div>
          <div className="mt-1 text-xs text-slate-500">Awaiting vendor transmission</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search by PO number, vendor, or notes..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className={inputClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus | 'all')}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partial">Partially Received</option>
          <option value="received">Received</option>
          <option value="canceled">Cancelled</option>
        </select>
        <select className={inputClass} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
          <option value="">All Vendors</option>
          {state.vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.companyName}
            </option>
          ))}
        </select>
      </div>

      {/* PO Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3.5">PO Number</th>
                <th className="px-4 py-3.5">Vendor</th>
                <th className="px-4 py-3.5">Warehouse</th>
                <th className="px-4 py-3.5">Order Date</th>
                <th className="px-4 py-3.5">Expected Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Lines / Items</th>
                <th className="px-4 py-3.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    No purchase orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((po) => {
                  const vendor = state.vendors.find((v) => v.id === po.vendorId)
                  const warehouse = state.warehouses.find((w) => w.id === po.warehouseId)
                  const totalUnitsOrdered = po.lines.reduce((s, l) => s + l.orderedQty, 0)
                  const totalUnitsReceived = po.lines.reduce((s, l) => s + l.receivedQty, 0)

                  return (
                    <tr key={po.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-semibold">
                        <Link to={`/purchase-orders/${po.id}`} className="text-brand hover:underline">
                          {po.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        {vendor ? (
                          <Link to={`/vendors/${vendor.id}`} className="hover:underline">
                            {vendor.companyName}
                          </Link>
                        ) : (
                          'Unknown Vendor'
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{warehouse?.name || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{po.orderDate}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{po.expectedDeliveryDate}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={po.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <div>
                          {po.lines.length} SKU{po.lines.length === 1 ? '' : 's'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {totalUnitsReceived} / {totalUnitsOrdered} units
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                        ${po.total.toLocaleString()}
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
