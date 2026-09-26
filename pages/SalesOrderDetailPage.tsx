import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Copy,
  Edit,
  Package,
  PackageCheck,
  Printer,
  ShieldAlert,
  Truck,
  XCircle,
} from 'lucide-react'
import { StatusBadge } from '../components/Badges'
import { availableStock, qtyByWarehouse, totalOnHand, totalReserved } from '../lib/inventory'
import { useStore } from '../store'
import type { SalesOrderStatus } from '../types'

export function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    state,
    confirmSalesOrder,
    reserveSalesOrderStock,
    advanceSalesOrderStatus,
    cancelSalesOrder,
    duplicateSalesOrder,
  } = useStore()

  const [actionError, setActionError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const so = useMemo(() => state.salesOrders.find((s) => s.id === id), [state.salesOrders, id])
  const customer = useMemo(() => state.customers.find((c) => c.id === so?.customerId), [state.customers, so])
  const warehouse = useMemo(() => state.warehouses.find((w) => w.id === so?.warehouseId), [state.warehouses, so])

  if (!so) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Sales Order not found</h2>
        <p className="mt-1 text-sm text-muted">The requested SO could not be located.</p>
        <Link to="/sales-orders" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Back to Sales Orders
        </Link>
      </div>
    )
  }

  function handleConfirm() {
    if (!so) return
    setActionError(null)
    const err = confirmSalesOrder(so.id)
    if (err) setActionError(err)
    else setSuccessMsg(`Sales order ${so.number} is confirmed. Ready for inventory reservation.`)
  }

  function handleReserve() {
    if (!so) return
    setActionError(null)
    const err = reserveSalesOrderStock(so.id)
    if (err) {
      setActionError(err)
    } else {
      setSuccessMsg(`Inventory stock successfully reserved for ${so.number}! Available stock updated.`)
    }
  }

  function handleAdvance(nextStatus: SalesOrderStatus, label: string) {
    if (!so) return
    setActionError(null)
    const err = advanceSalesOrderStatus(so.id, nextStatus)
    if (err) {
      setActionError(err)
    } else {
      setSuccessMsg(`Order status advanced to ${label}.`)
    }
  }

  function handleCancel() {
    if (!so) return
    if (confirm(`Are you sure you want to cancel sales order ${so.number}? Any reserved stock will be released.`)) {
      setActionError(null)
      const err = cancelSalesOrder(so.id)
      if (err) setActionError(err)
      else setSuccessMsg('Sales order cancelled and reserved stock released.')
    }
  }

  function handleDuplicate() {
    if (!so) return
    const newId = duplicateSalesOrder(so.id)
    navigate(`/sales-orders/${newId}/edit`)
  }

  // Lifecycle steps
  const steps: { key: SalesOrderStatus; label: string }[] = [
    { key: 'draft', label: '1. Draft' },
    { key: 'confirmed', label: '2. Confirmed' },
    { key: 'reserved', label: '3. Reserved' },
    { key: 'picking', label: '4. Picking' },
    { key: 'packed', label: '5. Packed' },
    { key: 'shipped', label: '6. Shipped' },
    { key: 'delivered', label: '7. Delivered' },
  ]

  const statusOrder: SalesOrderStatus[] = [
    'draft',
    'confirmed',
    'reserved',
    'picking',
    'packed',
    'shipped',
    'delivered',
  ]
  const currentStepIdx = statusOrder.indexOf(so.status)

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/sales-orders')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-ink">{so.number}</h1>
              <StatusBadge status={so.status} />
            </div>
            <div className="text-xs text-slate-400">Created: {new Date(so.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {so.status === 'draft' && (
            <>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
              >
                <CheckCircle2 size={16} />
                Confirm Order
              </button>
              <Link
                to={`/sales-orders/${so.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Edit size={16} />
                Edit
              </Link>
            </>
          )}

          {so.status === 'confirmed' && (
            <button
              type="button"
              onClick={handleReserve}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Boxes size={16} />
              Reserve Stock
            </button>
          )}

          {so.status === 'reserved' && (
            <button
              type="button"
              onClick={() => handleAdvance('picking', 'Picking')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
            >
              <Package size={16} />
              Start Picking
            </button>
          )}

          {so.status === 'picking' && (
            <button
              type="button"
              onClick={() => handleAdvance('packed', 'Packed')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
            >
              <PackageCheck size={16} />
              Mark Packed
            </button>
          )}

          {so.status === 'packed' && (
            <button
              type="button"
              onClick={() => handleAdvance('shipped', 'Shipped')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Truck size={16} />
              Ship Order (Stock Out)
            </button>
          )}

          {so.status === 'shipped' && (
            <button
              type="button"
              onClick={() => handleAdvance('delivered', 'Delivered')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <CheckCircle2 size={16} />
              Mark Delivered
            </button>
          )}

          <button
            type="button"
            onClick={handleDuplicate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Copy size={16} />
            Duplicate
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer size={16} />
            Print
          </button>

          {so.status !== 'delivered' && so.status !== 'canceled' && (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <XCircle size={16} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {actionError ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          <ShieldAlert size={18} className="shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      ) : null}

      {successMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {successMsg}
        </div>
      ) : null}

      {/* Lifecycle Progress Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Order & Fulfillment Lifecycle</div>
        {so.status === 'canceled' ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">
            <XCircle size={16} />
            This sales order was cancelled.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {steps.map((s, idx) => {
              const isDone = currentStepIdx >= idx
              const isCurrent = currentStepIdx === idx
              return (
                <div
                  key={s.key}
                  className={`rounded-lg border p-2 text-center text-xs font-semibold transition ${
                    isCurrent
                      ? 'border-brand bg-brand/10 text-brand shadow-sm'
                      : isDone
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  <div>{s.label}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Customer & Fulfillment Info */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Customer Information</h2>
          <div className="mt-2 text-base font-bold text-ink">{customer?.name || 'Unknown'}</div>
          <div className="mt-1 text-xs text-slate-500">Email: {customer?.email || '—'}</div>
          <div className="mt-0.5 text-xs text-slate-500">Phone: {customer?.phone || '—'}</div>
          <div className="mt-0.5 text-xs text-slate-500">Billing: {customer?.address || '—'}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Fulfillment Warehouse</h2>
          <div className="mt-2 text-base font-bold text-ink">{warehouse?.name || 'Main Warehouse'}</div>
          <div className="mt-1 text-xs text-slate-500">Warehouse Code: {warehouse?.code || 'WH1'}</div>
          <div className="mt-0.5 text-xs text-slate-500">{warehouse?.address || '—'}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Timeline & Terms</h2>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-slate-500">Order Date:</span>
            <span className="font-semibold text-slate-800">{so.orderDate}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-slate-500">Expected Delivery:</span>
            <span className="font-semibold text-indigo-700">{so.deliveryDate}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-slate-500">Tax Registration:</span>
            <span className="font-semibold text-slate-800">{customer?.taxNumber || '—'}</span>
          </div>
        </div>
      </div>

      {/* Product Line Items & Stock Availability Matrix */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink">Products & Stock Reservation Matrix</h2>
            <p className="text-xs text-slate-400">
              Formula: Available = On Hand - Reserved. Stock is verified during reservation.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{so.lines.length} Line Items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Order Qty</th>
                <th className="px-4 py-3 text-right text-slate-600">On Hand</th>
                <th className="px-4 py-3 text-right text-purple-700">Reserved</th>
                <th className="px-4 py-3 text-right text-emerald-700">Available</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {so.lines.map((line) => {
                const prod = state.products.find((p) => p.id === line.productId)
                const onHand = prod ? (so.warehouseId ? qtyByWarehouse(state, prod.id, so.warehouseId) : totalOnHand(state, prod.id)) : 0
                const reserved = prod ? totalReserved(state, prod.id, so.warehouseId) : 0
                const available = prod ? availableStock(state, prod.id, so.warehouseId) : 0
                const isShortage = available < line.qty && so.status === 'confirmed'

                return (
                  <tr key={line.id} className={`hover:bg-slate-50/50 ${isShortage ? 'bg-rose-50/50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {prod ? (
                        <Link to={`/products/${prod.id}`} className="hover:underline">
                          {prod.name}
                        </Link>
                      ) : (
                        'Custom Product'
                      )}
                      {isShortage ? (
                        <div className="text-[11px] font-semibold text-rose-600">Shortage for reservation!</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{prod?.sku || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{line.qty}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">{onHand}</td>
                    <td className="px-4 py-3 text-right font-medium text-purple-700">{reserved}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{available}</td>
                    <td className="px-4 py-3 text-right text-slate-700">${line.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{line.discount}%</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">${line.total.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex flex-col items-end gap-1.5 border-t border-slate-100 pt-4 text-sm">
          <div className="flex w-64 justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-semibold text-slate-800">${so.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex w-64 justify-between text-slate-600">
            <span>Tax:</span>
            <span className="font-semibold text-slate-800">${so.tax.toFixed(2)}</span>
          </div>
          <div className="flex w-64 justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-ink">
            <span>Order Total:</span>
            <span className="text-emerald-700">${so.total.toFixed(2)}</span>
          </div>
        </div>

        {so.notes ? (
          <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Special Instructions: </span>
            {so.notes}
          </div>
        ) : null}
      </div>

      {/* Linked Delivery Document */}
      {so.deliveryDocId ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold text-ink">Linked Outbound Delivery Document</h2>
          <Link
            to={`/deliveries/${so.deliveryDocId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-brand hover:bg-slate-100"
          >
            <Truck size={16} />
            <span>
              View Delivery Order:{' '}
              {state.documents.find((d) => d.id === so.deliveryDocId)?.number || so.deliveryDocId}
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  )
}
