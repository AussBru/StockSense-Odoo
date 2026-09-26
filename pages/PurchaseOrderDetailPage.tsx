import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Edit,
  FileDown,
  PackageCheck,
  Printer,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { StatusBadge } from '../components/Badges'
import { inputClass } from '../components/AuthFrame'
import { useStore } from '../store'
import { PrintableDocument } from '../components/PrintableDocument'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { hasPermission } from '../lib/rbac'
import { formatMoney } from '../lib/utils'

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    state,
    currentUser,
    sendPurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
    duplicatePurchaseOrder,
    submitPurchaseOrderForApproval,
    approvePurchaseOrder,
    rejectPurchaseOrder,
  } = useStore()

  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [approvalModalOpen, setApprovalModalOpen] = useState<'approve' | 'reject' | null>(null)
  const [approvalComment, setApprovalComment] = useState('')
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({})
  const [allowOverReceipt, setAllowOverReceipt] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const po = useMemo(() => state.purchaseOrders.find((p) => p.id === id), [state.purchaseOrders, id])
  const vendor = useMemo(() => state.vendors.find((v) => v.id === po?.vendorId), [state.vendors, po])
  const warehouse = useMemo(() => state.warehouses.find((w) => w.id === po?.warehouseId), [state.warehouses, po])

  if (!po) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-fg">Purchase Order not found</h2>
        <p className="mt-1 text-sm text-fg-muted">The requested PO could not be located.</p>
        <Link to="/purchase-orders" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Back to Purchase Orders
        </Link>
      </div>
    )
  }

  // Approval requirements check
  const approvalConfig = state.approvalSettings
  const needsApproval =
    Boolean(approvalConfig?.enabled) && (po.total >= (approvalConfig?.poThreshold ?? 5000))
  const canApprove = hasPermission(currentUser, 'purchasing.approve')

  function handleSend() {
    if (!po) return
    setActionError(null)
    const err = sendPurchaseOrder(po.id)
    if (err) setActionError(err)
    else setSuccessMsg(`Purchase order ${po.number} marked as Sent to ${vendor?.companyName || 'vendor'}.`)
  }

  function handleCancel() {
    if (!po) return
    if (confirm(`Are you sure you want to cancel purchase order ${po.number}?`)) {
      setActionError(null)
      const err = cancelPurchaseOrder(po.id)
      if (err) setActionError(err)
    }
  }

  function handleDuplicate() {
    if (!po) return
    const newId = duplicatePurchaseOrder(po.id)
    navigate(`/purchase-orders/${newId}/edit`)
  }

  function handleSubmitApproval() {
    if (!po) return
    setActionError(null)
    const err = submitPurchaseOrderForApproval(po.id)
    if (err) setActionError(err)
    else setSuccessMsg(`Purchase order ${po.number} submitted for manager approval.`)
  }

  function handleConfirmApprovalAction() {
    if (!po || !approvalModalOpen) return
    setActionError(null)
    let err: string | null = null
    if (approvalModalOpen === 'approve') {
      err = approvePurchaseOrder(po.id, approvalComment)
    } else {
      err = rejectPurchaseOrder(po.id, approvalComment)
    }

    if (err) {
      setActionError(err)
    } else {
      setSuccessMsg(
        approvalModalOpen === 'approve'
          ? `Purchase Order ${po.number} approved successfully!`
          : `Purchase Order ${po.number} has been rejected.`,
      )
      setApprovalModalOpen(null)
      setApprovalComment('')
    }
  }

  function openReceiveModal() {
    if (!po) return
    setActionError(null)
    const initial: Record<string, number> = {}
    for (const line of po.lines) {
      const remaining = Math.max(0, line.orderedQty - line.receivedQty)
      initial[line.productId] = remaining
    }
    setReceiveQtys(initial)
    setAllowOverReceipt(Boolean(po.allowOverReceipt))
    setReceiveModalOpen(true)
  }

  function handleConfirmReceive() {
    if (!po) return
    setActionError(null)
    const linesToReceive = Object.entries(receiveQtys).map(([productId, qty]) => ({
      productId,
      qty: Number(qty) || 0,
    }))

    const err = receivePurchaseOrder(po.id, linesToReceive, allowOverReceipt)
    if (err) {
      setActionError(err)
      return
    }
    setReceiveModalOpen(false)
    setSuccessMsg('Goods successfully received and added to inventory stock!')
  }

  // Lifecycle steps
  const steps: { key: string; label: string }[] = [
    { key: 'draft', label: '1. Draft' },
    { key: 'sent', label: '2. Sent to Vendor' },
    { key: 'partial', label: '3. Partially Received' },
    { key: 'received', label: '4. Fully Received' },
  ]

  const currentStepIdx =
    po.status === 'canceled'
      ? -1
      : po.status === 'draft'
      ? 0
      : po.status === 'sent'
      ? 1
      : po.status === 'partial'
      ? 2
      : 3

  // Map printable lines
  const printableLines = po.lines.map((line) => {
    const prod = state.products.find((p) => p.id === line.productId)
    return {
      sku: prod?.sku || '—',
      name: prod?.name || 'Product',
      qty: line.orderedQty,
      uom: prod?.uom || 'Units',
      unitPrice: line.unitCost,
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
        docTypeTitle="PURCHASE ORDER"
        documentNumber={po.number}
        status={po.status.toUpperCase()}
        date={po.orderDate}
        dueDate={po.expectedDeliveryDate}
        partyTitle="Vendor / Supplier"
        partyName={vendor?.companyName}
        partyAddress={vendor?.address}
        partyContact={`${vendor?.contactPerson || ''} (${vendor?.phone || ''})`}
        partyTaxNumber={vendor?.taxNumber}
        warehouseName={warehouse?.name}
        lines={printableLines}
        subtotal={po.subtotal}
        tax={po.tax}
        total={po.total}
        currency={po.currency || 'USD'}
        notes={po.notes}
      />

      {/* Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/purchase-orders')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted hover:bg-surface-2"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-fg">{po.number}</h1>
              <StatusBadge status={po.status} />
              {po.approvalStatus && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    po.approvalStatus === 'approved'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : po.approvalStatus === 'pending'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse'
                      : po.approvalStatus === 'rejected'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'bg-surface-2 text-fg-muted'
                  }`}
                >
                  {po.approvalStatus === 'pending'
                    ? 'Pending Approval'
                    : po.approvalStatus === 'approved'
                    ? 'Approved'
                    : po.approvalStatus === 'rejected'
                    ? 'Rejected'
                    : 'Standard'}
                </span>
              )}
            </div>
            <div className="text-xs text-fg-subtle">Created: {new Date(po.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Approval Action Buttons */}
          {needsApproval && po.approvalStatus === 'pending' && canApprove && (
            <>
              <button
                type="button"
                onClick={() => setApprovalModalOpen('approve')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <ShieldCheck size={16} />
                Approve PO
              </button>
              <button
                type="button"
                onClick={() => setApprovalModalOpen('reject')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-surface px-3.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                <XCircle size={16} />
                Reject PO
              </button>
            </>
          )}

          {/* Submit for approval button */}
          {needsApproval && (po.approvalStatus === 'not_required' || !po.approvalStatus) && po.status === 'draft' && (
            <button
              type="button"
              onClick={handleSubmitApproval}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
            >
              <ShieldAlert size={16} />
              Submit for Approval
            </button>
          )}

          {/* Send to Vendor */}
          {po.status === 'draft' && (!needsApproval || po.approvalStatus === 'approved') && (
            <button
              type="button"
              onClick={handleSend}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-fg shadow-sm hover:bg-accent-hover"
            >
              <Send size={15} />
              Send to Vendor
            </button>
          )}

          {po.status === 'draft' && (
            <Link
              to={`/purchase-orders/${po.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg hover:bg-surface-2"
            >
              <Edit size={15} />
              Edit
            </Link>
          )}

          {(po.status === 'sent' || po.status === 'partial') && (
            <button
              type="button"
              onClick={openReceiveModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <PackageCheck size={16} />
              Receive Goods
            </button>
          )}

          <button
            type="button"
            onClick={handleDuplicate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-fg hover:bg-surface-2"
          >
            <Copy size={15} />
            Duplicate
          </button>

          <button
            type="button"
            onClick={() => setPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-fg hover:bg-surface-2"
          >
            <Printer size={15} />
            Print Layout
          </button>

          {po.status !== 'received' && po.status !== 'canceled' && (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-surface px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <XCircle size={15} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {actionError ? (
        <div className="rounded-lg bg-rose-50 p-3.5 text-sm font-medium text-rose-800 dark:bg-rose-500/10 dark:text-rose-400">
          {actionError}
        </div>
      ) : null}

      {successMsg ? (
        <div className="rounded-lg bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
          {successMsg}
        </div>
      ) : null}

      {/* Approval Status Banner */}
      {po.approvalStatus === 'approved' && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
            <div>
              <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Order Approved by Management
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300">
                Approver: <strong>{po.approvedBy || 'Manager'}</strong> {po.approvedAt ? `on ${new Date(po.approvedAt).toLocaleString()}` : ''}
                {po.approvalComment ? ` · Note: "${po.approvalComment}"` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {po.approvalStatus === 'rejected' && (
        <div className="flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50/70 p-4 dark:border-rose-800 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <XCircle size={22} className="text-rose-600 dark:text-rose-400" />
            <div>
              <div className="text-sm font-bold text-rose-900 dark:text-rose-200">Order Rejected</div>
              <div className="text-xs text-rose-700 dark:text-rose-300">
                By: <strong>{po.approvedBy || 'Approver'}</strong>
                {po.approvalComment ? ` · Reason: "${po.approvalComment}"` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lifecycle Progress Bar */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Order Lifecycle</div>
        {po.status === 'canceled' ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
            <XCircle size={16} />
            This purchase order was cancelled.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {steps.map((s, idx) => {
              const isDone = currentStepIdx >= idx
              const isCurrent = currentStepIdx === idx
              return (
                <div
                  key={s.key}
                  className={`rounded-lg border p-2.5 text-xs font-semibold transition ${
                    isCurrent
                      ? 'border-accent bg-accent/10 text-accent'
                      : isDone
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'border-line bg-surface-2 text-fg-subtle'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isDone ? <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" /> : null}
                    <span>{s.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Header Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Vendor Details</h2>
          <div className="mt-2 text-base font-bold text-fg">{vendor?.companyName || 'Unknown'}</div>
          <div className="mt-1 text-xs text-fg-muted">Contact: {vendor?.contactPerson || '—'}</div>
          <div className="mt-0.5 text-xs text-fg-muted">Email: {vendor?.email || '—'}</div>
          <div className="mt-0.5 text-xs text-fg-muted">Phone: {vendor?.phone || '—'}</div>
          {vendor ? (
            <Link to={`/vendors/${vendor.id}`} className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
              View vendor profile →
            </Link>
          ) : null}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Destination Warehouse</h2>
          <div className="mt-2 text-base font-bold text-fg">{warehouse?.name || 'Main Warehouse'}</div>
          <div className="mt-1 text-xs text-fg-muted">Code: {warehouse?.code || 'WH1'}</div>
          <div className="mt-0.5 text-xs text-fg-muted">Address: {warehouse?.address || '—'}</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Order Schedule</h2>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-fg-muted">Order Date:</span>
            <span className="font-semibold text-fg">{po.orderDate}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-fg-muted">Expected Delivery:</span>
            <span className="font-semibold text-accent">{po.expectedDeliveryDate}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-fg-muted">Payment Terms:</span>
            <span className="font-semibold text-fg">{vendor?.paymentTerms || 'Net 30'}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-fg-muted">Over-Receipt:</span>
            <span className="font-semibold text-fg">
              {po.allowOverReceipt ? 'Allowed' : 'Strict (Blocked)'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Lines on Left, Activity Timeline on Right */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product Lines Table */}
        <div className="lg:col-span-2 space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-fg">Ordered Products & Line Items</h2>
            <span className="text-xs text-fg-subtle">{po.lines.length} SKU line items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right">Ordered</th>
                  <th className="px-4 py-3 text-right">Received</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {po.lines.map((line) => {
                  const prod = state.products.find((p) => p.id === line.productId)
                  const remaining = Math.max(0, line.orderedQty - line.receivedQty)
                  return (
                    <tr key={line.id} className="hover:bg-surface-2/40 transition">
                      <td className="px-4 py-3 font-medium text-fg">{prod?.name || 'Unknown Product'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-fg-muted">{prod?.sku || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-fg">{line.orderedQty}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {line.receivedQty}
                      </td>
                      <td className="px-4 py-3 text-right text-fg-muted">{remaining}</td>
                      <td className="px-4 py-3 text-right font-mono text-fg">{formatMoney(line.unitCost)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-fg">{formatMoney(line.subtotal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end border-t border-line pt-4">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-fg-muted">Subtotal:</span>
                <span className="font-semibold text-fg">{formatMoney(po.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-muted">Tax (10% standard):</span>
                <span className="font-semibold text-fg">{formatMoney(po.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-sm font-bold">
                <span className="text-fg">Grand Total:</span>
                <span className="text-accent">{formatMoney(po.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline Column */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-4">
          <ActivityTimeline
            entityId={po.id}
            documentNumber={po.number}
            fallbackDates={{
              createdAt: po.createdAt,
              sentAt: po.status !== 'draft' ? po.orderDate : undefined,
              approvedAt: po.approvedAt,
              approvedBy: po.approvedBy,
            }}
          />
        </div>
      </div>

      {/* Linked Receipts Section */}
      {po.receivedDocIds && po.receivedDocIds.length > 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-fg">Linked Goods Receipts</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {po.receivedDocIds.map((docId) => {
              const doc = state.documents.find((d) => d.id === docId)
              return (
                <Link
                  key={docId}
                  to={`/receipts/${docId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-surface-2/80"
                >
                  <PackageCheck size={14} />
                  <span>{doc?.number || docId}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Receive Goods Modal */}
      {receiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <PackageCheck className="text-emerald-600 dark:text-emerald-400" size={20} />
                <h3 className="text-lg font-bold text-fg">Receive Goods for {po.number}</h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiveModalOpen(false)}
                className="text-fg-subtle hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs text-fg-muted">
              Specify the quantities received in this shipment. Destination warehouse stock and ledger
              entries will be updated automatically.
            </p>

            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {po.lines.map((line) => {
                const prod = state.products.find((p) => p.id === line.productId)
                const remaining = Math.max(0, line.orderedQty - line.receivedQty)
                return (
                  <div key={line.id} className="flex items-center justify-between rounded-xl border border-line p-3">
                    <div>
                      <div className="font-semibold text-fg">{prod?.name || 'Product'}</div>
                      <div className="font-mono text-xs text-fg-muted">
                        SKU: {prod?.sku || '—'} · Ordered: {line.orderedQty} · Recv: {line.receivedQty} · Rem:{' '}
                        {remaining}
                      </div>
                    </div>
                    <div className="w-28">
                      <input
                        className={inputClass}
                        type="number"
                        min={0}
                        max={allowOverReceipt ? undefined : remaining}
                        value={receiveQtys[line.productId] ?? remaining}
                        onChange={(e) =>
                          setReceiveQtys({ ...receiveQtys, [line.productId]: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-fg">
              <input
                type="checkbox"
                id="allowOverReceipt"
                checked={allowOverReceipt}
                onChange={(e) => setAllowOverReceipt(e.target.checked)}
                className="rounded border-line text-accent"
              />
              <label htmlFor="allowOverReceipt">Allow receiving more than ordered quantity</label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setReceiveModalOpen(false)}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Confirm & Stock In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Confirmation Modal */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-bold text-fg">
              {approvalModalOpen === 'approve' ? 'Approve Purchase Order' : 'Reject Purchase Order'}
            </h3>
            <p className="mt-1 text-xs text-fg-muted">
              {approvalModalOpen === 'approve'
                ? `Authorizing ${po.number} with a total value of ${formatMoney(po.total)}.`
                : `Rejecting ${po.number}. Please specify reasons for compliance review.`}
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold text-fg">Comment / Compliance Note</label>
              <textarea
                className={`mt-1 ${inputClass} min-h-[80px] text-xs`}
                placeholder="Optional notes or condition justification..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setApprovalModalOpen(null)}
                className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-fg hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprovalAction}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm ${
                  approvalModalOpen === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {approvalModalOpen === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
