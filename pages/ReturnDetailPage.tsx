import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Package,
  RotateCcw,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react'
import { StatusBadge } from '../components/Badges'
import { inputClass } from '../components/AuthFrame'
import { useStore } from '../store'
import type { ReturnDestination } from '../types'

export function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, advanceReturnStatus } = useStore()

  const [dispositions, setDispositions] = useState<Record<string, ReturnDestination>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const ret = useMemo(() => state.returnOrders.find((r) => r.id === id), [state.returnOrders, id])
  const warehouse = useMemo(() => state.warehouses.find((w) => w.id === ret?.warehouseId), [state.warehouses, ret])

  if (!ret) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Return order not found</h2>
        <p className="mt-1 text-sm text-muted">The requested return record could not be found.</p>
        <Link to="/returns" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Back to Returns
        </Link>
      </div>
    )
  }

  function handleAdvance(nextStatus: string, label: string) {
    if (!ret) return
    setActionError(null)
    const err = advanceReturnStatus(ret.id, nextStatus, dispositions)
    if (err) {
      setActionError(err)
    } else {
      setSuccessMsg(`Return order advanced to ${label}. Inventory adjustments and ledger updated.`)
    }
  }

  // Customer Return Flow: delivered -> return_requested -> received -> inspected -> completed
  const customerSteps = [
    { key: 'delivered', label: '1. Delivered' },
    { key: 'return_requested', label: '2. Return Requested' },
    { key: 'received', label: '3. Inbound Received' },
    { key: 'inspected', label: '4. Inspected' },
    { key: 'completed', label: '5. Restocked / Disposed' },
  ]

  // Vendor Return Flow: received -> return_requested -> approved -> shipped -> completed
  const vendorSteps = [
    { key: 'received', label: '1. Received' },
    { key: 'return_requested', label: '2. Return Requested' },
    { key: 'approved', label: '3. Approved' },
    { key: 'shipped', label: '4. Shipped to Vendor' },
    { key: 'completed', label: '5. Completed' },
  ]

  const steps = ret.type === 'customer' ? customerSteps : vendorSteps
  const currentStepIdx = steps.findIndex((s) => s.key === ret.status)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/returns')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-ink">{ret.number}</h1>
              <StatusBadge status={ret.status} />
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  ret.type === 'customer' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-800'
                }`}
              >
                {ret.type === 'customer' ? 'Customer RMA' : 'Vendor Return'}
              </span>
            </div>
            <div className="text-xs text-slate-400">Created: {new Date(ret.createdAt).toLocaleString()}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {ret.type === 'customer' && (
            <>
              {ret.status === 'delivered' && (
                <button
                  type="button"
                  onClick={() => handleAdvance('return_requested', 'Return Requested')}
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Confirm Request
                </button>
              )}
              {ret.status === 'return_requested' && (
                <button
                  type="button"
                  onClick={() => handleAdvance('received', 'Received')}
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Receive at Dock
                </button>
              )}
              {ret.status === 'received' && (
                <button
                  type="button"
                  onClick={() => handleAdvance('inspected', 'Inspected')}
                  className="rounded-lg bg-purple-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
                >
                  Mark Inspected
                </button>
              )}
              {ret.status === 'inspected' && (
                <button
                  type="button"
                  onClick={() => handleAdvance('completed', 'Completed')}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Execute Restock / Disposition
                </button>
              )}
            </>
          )}

          {ret.type === 'vendor' && (
            <>
              {ret.status === 'received' && (
                <button
                  type="button"
                  onClick={() => handleAdvance('return_requested', 'Return Requested')}
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Request Vendor RMA
                </button>
              )}
              {ret.status === 'return_requested' && (
                <button
                  type="button"
                  onClick={() => handleAdvance('approved', 'Approved')}
                  className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
                >
                  Approve Vendor Return
                </button>
              )}
              {ret.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => handleAdvance('shipped', 'Shipped to Vendor')}
                  className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Ship Items to Vendor
                </button>
              )}
              {ret.status === 'shipped' && (
                <button
                  type="button"
                  onClick={() => handleAdvance('completed', 'Completed')}
                  className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Complete RMA
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {actionError ? (
        <div className="rounded-lg bg-rose-50 p-3.5 text-sm font-medium text-rose-800">{actionError}</div>
      ) : null}

      {successMsg ? (
        <div className="rounded-lg bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800">{successMsg}</div>
      ) : null}

      {/* Lifecycle Progress Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Return Flow Pipeline</div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {steps.map((s, idx) => {
            const isDone = currentStepIdx >= idx
            const isCurrent = currentStepIdx === idx
            return (
              <div
                key={s.key}
                className={`rounded-lg border p-2 text-center text-xs font-semibold transition ${
                  isCurrent
                    ? 'border-brand bg-brand/10 text-brand'
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
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {ret.type === 'customer' ? 'Customer Account' : 'Supplier Account'}
          </h2>
          <div className="mt-2 text-base font-bold text-ink">{ret.partnerName}</div>
          <div className="mt-1 text-xs text-slate-500">Partner ID: {ret.partnerId || '—'}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Warehouse Location</h2>
          <div className="mt-2 text-base font-bold text-ink">{warehouse?.name || 'Main Warehouse'}</div>
          <div className="mt-1 text-xs text-slate-500">Code: {warehouse?.code || 'WH1'}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Reference & Reason</h2>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-slate-500">Reference Order:</span>
            <span className="font-mono font-semibold text-slate-800">{ret.referenceDocNumber || '—'}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-slate-500">Completed Date:</span>
            <span className="font-semibold text-slate-800">
              {ret.completedAt ? new Date(ret.completedAt).toLocaleDateString() : 'In Progress'}
            </span>
          </div>
        </div>
      </div>

      {/* Returned Line Items & Inspection Disposition */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink">Returned Products & Inspection Disposition</h2>
            <p className="text-xs text-slate-400">
              Select product destination: Restock increases salable inventory; Damaged / Scrap / Loss routes to virtual
              loss with full ledger traceability.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Return Qty</th>
                <th className="px-4 py-3">Reported Reason</th>
                <th className="px-4 py-3">Inspection Destination</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ret.lines.map((line) => {
                const prod = state.products.find((p) => p.id === line.productId)
                const currentDest = dispositions[line.id] || line.disposition || line.destination || 'restock'

                return (
                  <tr key={line.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {prod ? (
                        <Link to={`/products/${prod.id}`} className="hover:underline">
                          {prod.name}
                        </Link>
                      ) : (
                        'Product'
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{prod?.sku || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{line.qty}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{line.reason || 'General return'}</td>
                    <td className="px-4 py-3">
                      {ret.status === 'completed' ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">
                          {line.disposition || line.destination}
                        </span>
                      ) : (
                        <select
                          className={`${inputClass} py-1 text-xs font-medium`}
                          value={currentDest}
                          onChange={(e) =>
                            setDispositions({
                              ...dispositions,
                              [line.id]: e.target.value as ReturnDestination,
                            })
                          }
                        >
                          <option value="restock">Restock to Inventory (Good Condition)</option>
                          <option value="damaged">Damaged Goods (Defective)</option>
                          <option value="scrap">Scrap (Dispose)</option>
                          <option value="inventory_loss">Inventory Loss (Virtual Write-off)</option>
                        </select>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {ret.notes ? (
          <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">RMA Notes: </span>
            {ret.notes}
          </div>
        ) : null}
      </div>
    </div>
  )
}
