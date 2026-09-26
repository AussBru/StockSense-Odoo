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
import { PrintableDocument } from '../components/PrintableDocument'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { formatMoney } from '../lib/utils'

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

  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const so = useMemo(() => state.salesOrders.find((s) => s.id === id), [state.salesOrders, id])
  const customer = useMemo(() => state.customers.find((c) => c.id === so?.customerId), [state.customers, so])
  const warehouse = useMemo(() => state.warehouses.find((w) => w.id === so?.warehouseId), [state.warehouses, so])

  if (!so) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-fg">Sales Order not found</h2>
        <p className="mt-1 text-sm text-fg-muted">The requested SO could not be located.</p>
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

  // Map printable lines
  const printableLines = so.lines.map((line) => {
    const prod = state.products.find((p) => p.id === line.productId)
    return {
      sku: prod?.sku || '—',
      name: prod?.name || 'Item',
      qty: line.qty,
      uom: prod?.uom || 'Units',
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      subtotal: line.subtotal,
      tax: line.tax,
      total: line.total,
    }
  })

  return (
    <div className="space-y-6">
      {/* Printable Document Modal */}
      <PrintableDocument
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        docTypeTitle="SALES ORDER"
        documentNumber={so.number}
        status={so.status.toUpperCase()}
        date={so.orderDate}
        dueDate={so.deliveryDate}
        partyTitle="Customer"
        partyName={customer?.name}
        partyAddress={customer?.address}
        partyContact={`${customer?.email || ''} (${customer?.phone || ''})`}
        partyTaxNumber={customer?.taxNumber}
        warehouseName={warehouse?.name}
        lines={printableLines}
        subtotal={so.subtotal}
        tax={so.tax}
        total={so.total}
        currency={so.currency || 'USD'}
        notes={so.notes}
      />

      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/sales-orders')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted hover:bg-surface-2"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-fg">{so.number}</h1>
              <StatusBadge status={so.status} />
            </div>
            <div className="text-xs text-fg-subtle">Created: {new Date(so.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {so.status === 'draft' && (
            <>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-fg shadow-sm hover:bg-accent-hover"
              >
                <CheckCircle2 size={16} />
                Confirm Order
              </button>
              <Link
                to={`/sales-orders/${so.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg hover:bg-surface-2"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg hover:bg-surface-2"
          >
            <Copy size={16} />
            Duplicate
          </button>

          <button
            type="button"
            onClick={() => setPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg hover:bg-surface-2"
          >
            <Printer size={16} />
            Print Layout
          </button>

          {so.status !== 'delivered' && so.status !== 'canceled' && (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-surface px-3.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <XCircle size={16} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {actionError ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 dark:bg-rose-500/10 dark:text-rose-400">
          <ShieldAlert size={18} className="shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      ) : null}

      {successMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
          {successMsg}
        </div>
      ) : null}

      {/* Lifecycle Progress Bar */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Order & Fulfillment Lifecycle</div>
        {so.status === 'canceled' ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
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
                      ? 'border-accent bg-accent/10 text-accent shadow-sm'
                      : isDone
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'border-line bg-surface-2 text-fg-subtle'
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
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Customer Information</h2>
          <div className="mt-2 text-base font-bold text-fg">{customer?.name || 'Unknown'}</div>
          <div className="mt-1 text-xs text-fg-muted">Email: {customer?.email || '—'}</div>
          <div className="mt-0.5 text-xs text-fg-muted">Phone: {customer?.phone || '—'}</div>
          <div className="mt-0.5 text-xs text-fg-muted">Billing: {customer?.address || '—'}</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Fulfillment Warehouse</h2>
          <div className="mt-2 text-base font-bold text-fg">{warehouse?.name || 'Main Warehouse'}</div>
          <div className="mt-1 text-xs text-fg-muted">Warehouse Code: {warehouse?.code || 'WH1'}</div>
          <div className="mt-0.5 text-xs text-fg-muted">{warehouse?.address || '—'}</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Timeline & Terms</h2>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-fg-muted">Order Date:</span>
            <span className="font-semibold text-fg">{so.orderDate}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-fg-muted">Expected Delivery:</span>
            <span className="font-semibold text-accent">{so.deliveryDate}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-fg-muted">Tax Registration:</span>
            <span className="font-semibold text-fg">{customer?.taxNumber || '—'}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Lines on Left, Activity Timeline on Right */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product Line Items & Stock Availability Matrix */}
        <div className="lg:col-span-2 space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-fg">Products & Stock Reservation Matrix</h2>
              <p className="text-xs text-fg-subtle">
                Formula: Available = On Hand - Reserved. Stock is verified during reservation.
              </p>
            </div>
            <span className="text-xs font-semibold text-fg-muted">{so.lines.length} Line Items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right">Order Qty</th>
                  <th className="px-4 py-3 text-right text-fg-muted">On Hand</th>
                  <th className="px-4 py-3 text-right text-purple-600 dark:text-purple-400">Reserved</th>
                  <th className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">Available</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {so.lines.map((line) => {
                  const prod = state.products.find((p) => p.id === line.productId)
                  const onHand = prod ? (so.warehouseId ? qtyByWarehouse(state, prod.id, so.warehouseId) : totalOnHand(state, prod.id)) : 0
                  const reserved = prod ? totalReserved(state, prod.id, so.warehouseId) : 0
                  const available = prod ? availableStock(state, prod.id, so.warehouseId) : 0
                  const isShortage = available < line.qty && so.status === 'confirmed'

                  return (
                    <tr key={line.id} className={`hover:bg-surface-2/40 ${isShortage ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}`}>
                      <td className="px-4 py-3 font-medium text-fg">
                        {prod ? (
                          <Link to={`/products/${prod.id}`} className="hover:underline">
                            {prod.name}
                          </Link>
                        ) : (
                          'Custom Product'
                        )}
                        {isShortage ? (
                          <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Shortage for reservation!</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-fg-muted">{prod?.sku || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-fg">{line.qty}</td>
                      <td className="px-4 py-3 text-right font-medium text-fg-muted">{onHand}</td>
                      <td className="px-4 py-3 text-right font-medium text-purple-600 dark:text-purple-400">{reserved}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{available}</td>
                      <td className="px-4 py-3 text-right text-fg">{formatMoney(line.unitPrice)}</td>
                      <td className="px-4 py-3 text-right text-fg-muted">{line.discount}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-fg">{formatMoney(line.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col items-end gap-1.5 border-t border-line pt-4 text-sm">
            <div className="flex w-64 justify-between text-fg-muted">
              <span>Subtotal:</span>
              <span className="font-semibold text-fg">{formatMoney(so.subtotal)}</span>
            </div>
            <div className="flex w-64 justify-between text-fg-muted">
              <span>Tax:</span>
              <span className="font-semibold text-fg">{formatMoney(so.tax)}</span>
            </div>
            <div className="flex w-64 justify-between border-t border-line pt-1.5 text-base font-bold text-fg">
              <span>Order Total:</span>
              <span className="text-accent">{formatMoney(so.total)}</span>
            </div>
          </div>

          {so.notes ? (
            <div className="border-t border-line pt-3 text-xs text-fg-muted">
              <span className="font-semibold text-fg">Special Instructions: </span>
              {so.notes}
            </div>
          ) : null}
        </div>

        {/* Activity Timeline */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-4">
          <ActivityTimeline
            entityId={so.id}
            documentNumber={so.number}
            fallbackDates={{
              createdAt: so.createdAt,
              sentAt: so.status !== 'draft' ? so.orderDate : undefined,
            }}
          />
        </div>
      </div>

      {/* Linked Delivery Document */}
      {so.deliveryDocId ? (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="mb-2 font-semibold text-fg">Linked Outbound Delivery Document</h2>
          <Link
            to={`/deliveries/${so.deliveryDocId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3.5 py-2 text-xs font-semibold text-accent hover:bg-surface-2/80"
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
