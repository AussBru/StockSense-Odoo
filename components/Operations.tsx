import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Printer, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react'
import { StatusBadge } from './Badges'
import { Field, inputClass } from './AuthFrame'
import { getProductUnitCost, qtyAt } from '../lib/inventory'
import { emptyLine, useStore } from '../store'
import type { DocType, Document, DocumentLine } from '../types'
import { PrintableDocument } from './PrintableDocument'
import { ActivityTimeline } from './ActivityTimeline'
import { hasPermission } from '../lib/rbac'
import { formatMoney } from '../lib/utils'

const titles: Record<DocType, { list: string; hint: string; partner: string | null; newPath: string; printTitle: string }> = {
  receipt: {
    list: 'Receipts',
    hint: 'Incoming goods from vendors. Validate to increase stock.',
    partner: 'Supplier',
    newPath: '/receipts/new',
    printTitle: 'GOODS RECEIPT NOTE',
  },
  delivery: {
    list: 'Delivery Orders',
    hint: 'Pick, pack, then validate to decrease stock.',
    partner: 'Customer',
    newPath: '/deliveries/new',
    printTitle: 'DELIVERY ORDER SLIP',
  },
  internal: {
    list: 'Internal Transfers',
    hint: 'Move stock between locations or warehouses. Total qty stays the same.',
    partner: null,
    newPath: '/transfers/new',
    printTitle: 'INTERNAL STOCK TRANSFER',
  },
  adjustment: {
    list: 'Inventory Adjustments',
    hint: 'Enter physical count. The system posts the difference to the ledger.',
    partner: null,
    newPath: '/adjustments/new',
    printTitle: 'INVENTORY ADJUSTMENT VOUCHER',
  },
}

function hrefFor(type: DocType, id: string) {
  if (type === 'receipt') return `/receipts/${id}`
  if (type === 'delivery') return `/deliveries/${id}`
  if (type === 'internal') return `/transfers/${id}`
  return `/adjustments/${id}`
}

export function OperationList({ type }: { type: DocType }) {
  const { state } = useStore()
  const meta = titles[type]
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const rows = useMemo(
    () =>
      state.documents.filter((d) => {
        if (d.type !== type) return false
        if (status !== 'all' && d.status !== status) return false
        if (q && !`${d.number} ${d.partnerName || ''}`.toLowerCase().includes(q.toLowerCase())) return false
        return true
      }),
    [state.documents, type, status, q],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">{meta.list}</h1>
          <p className="text-sm text-fg-muted">{meta.hint}</p>
        </div>
        <Link to={meta.newPath} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg">
          New
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input className={inputClass} placeholder="Search reference" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="waiting">Waiting</option>
          <option value="ready">Ready</option>
          <option value="done">Done</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-fg-muted">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">{meta.partner ?? 'Warehouse'}</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((doc) => {
              const from = state.locations.find((l) => l.id === doc.sourceLocationId)
              const to = state.locations.find((l) => l.id === doc.destLocationId)
              const wh = state.warehouses.find((w) => w.id === doc.warehouseId)
              return (
                <tr key={doc.id} className="hover:bg-surface-2/40 transition">
                  <td className="px-4 py-3 font-medium">
                    <Link to={hrefFor(type, doc.id)} className="text-accent hover:underline">
                      {doc.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{from?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-fg-muted">{to?.name ?? '—'}</td>
                  <td className="px-4 py-3">{doc.partnerName || wh?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{doc.scheduledDate}</td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-fg-muted">
                  No {meta.list.toLowerCase()} found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function OperationForm({ type }: { type: DocType }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    state,
    currentUser,
    saveDocument,
    confirmDocument,
    pickDocument,
    packDocument,
    validateDocument,
    cancelDocument,
    approveDocument,
    rejectDocument,
    defaultLocations,
  } = useStore()
  const meta = titles[type]
  const existing = id && id !== 'new' ? state.documents.find((d) => d.id === id) : undefined
  const isNew = !existing

  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [warehouseId, setWarehouseId] = useState(existing?.warehouseId ?? state.warehouses[0]?.id ?? '')
  const defaults = defaultLocations(type, warehouseId)
  const [sourceLocationId, setSource] = useState(existing?.sourceLocationId ?? defaults.source)
  const [destLocationId, setDest] = useState(existing?.destLocationId ?? defaults.dest)
  const [partnerName, setPartner] = useState(existing?.partnerName ?? '')
  const [scheduledDate, setDate] = useState(existing?.scheduledDate ?? new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [lines, setLines] = useState<DocumentLine[]>(existing?.lines?.length ? existing.lines : [emptyLine()])
  const [error, setError] = useState<string | null>(null)
  const locked = existing ? existing.status !== 'draft' : false

  const internals = state.locations.filter((l) => l.type === 'internal')

  function applyWarehouse(wid: string) {
    setWarehouseId(wid)
    const d = defaultLocations(type, wid)
    if (type === 'receipt') setDest(d.dest)
    if (type === 'delivery') setSource(d.source)
    if (type === 'adjustment') setSource(d.source)
  }

  function persistDraft(): string {
    return saveDocument({
      id: existing?.id,
      type,
      warehouseId,
      sourceLocationId,
      destLocationId,
      partnerName,
      scheduledDate,
      notes,
      lines: lines.filter((l) => l.productId),
    })
  }

  function onSave(e: FormEvent) {
    e.preventDefault()
    const docId = persistDraft()
    navigate(hrefFor(type, docId))
  }

  function run(action: (docId: string) => string | null) {
    setError(null)
    const docId = existing?.id ?? persistDraft()
    const err = action(docId)
    if (err) setError(err)
    if (!existing) navigate(hrefFor(type, docId))
  }

  const doc: Document | undefined = existing ?? state.documents.find((d) => d.id === id)
  const wh = state.warehouses.find((w) => w.id === warehouseId)
  const srcLoc = state.locations.find((l) => l.id === sourceLocationId)
  const dstLoc = state.locations.find((l) => l.id === destLocationId)

  // Adjustment approval check
  const canApproveAdjustment = hasPermission(currentUser, 'inventory.approve')

  // Printable line mappings
  const printableLines = (doc?.lines || lines).map((l) => {
    const prod = state.products.find((p) => p.id === l.productId)
    const cost = prod ? getProductUnitCost(prod) : 0
    const theo = l.productId ? qtyAt(state, l.productId, sourceLocationId) : 0
    return {
      sku: prod?.sku || '—',
      name: prod?.name || 'Product',
      qty: l.qty,
      countedQty: l.countedQty,
      difference: l.countedQty !== undefined ? l.countedQty - theo : undefined,
      uom: prod?.uom || 'Units',
      unitPrice: cost,
      total: l.qty * cost,
    }
  })

  return (
    <form onSubmit={onSave} className="space-y-6">
      {/* Printable Document Modal */}
      {doc && (
        <PrintableDocument
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          docTypeTitle={meta.printTitle}
          documentNumber={doc.number}
          status={doc.status.toUpperCase()}
          date={doc.scheduledDate || new Date().toISOString().slice(0, 10)}
          partyTitle={meta.partner || 'Location Partner'}
          partyName={doc.partnerName}
          warehouseName={wh?.name}
          sourceLocationName={srcLoc?.name}
          destLocationName={dstLoc?.name}
          lines={printableLines}
          notes={doc.notes}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-fg-subtle">{meta.list}</div>
          <h1 className="text-2xl font-semibold text-fg">{isNew ? `New ${meta.list.slice(0, -1)}` : doc?.number}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {doc ? <StatusBadge status={doc.status} /> : null}

          {/* Adjustment approval badges */}
          {type === 'adjustment' && doc?.approvalStatus && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                doc.approvalStatus === 'approved'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : doc.approvalStatus === 'pending'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse'
                  : doc.approvalStatus === 'rejected'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-surface-2 text-fg-muted'
              }`}
            >
              {doc.approvalStatus === 'pending'
                ? 'Pending Manager Approval'
                : doc.approvalStatus === 'approved'
                ? 'Manager Approved'
                : doc.approvalStatus === 'rejected'
                ? 'Rejected'
                : 'Standard'}
            </span>
          )}

          {!locked ? (
            <button type="submit" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2">
              Save draft
            </button>
          ) : null}

          {(!doc || doc.status === 'draft') && (
            <button type="button" className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover" onClick={() => run(confirmDocument)}>
              Confirm
            </button>
          )}

          {/* Adjustment Approval Actions */}
          {type === 'adjustment' && doc?.approvalStatus === 'pending' && canApproveAdjustment && (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                onClick={() => run((dId) => approveDocument(dId))}
              >
                <ShieldCheck size={16} />
                Approve Adjustment
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-surface px-3.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                onClick={() => run((dId) => rejectDocument(dId))}
              >
                <XCircle size={16} />
                Reject
              </button>
            </>
          )}

          {type === 'delivery' && doc && (doc.status === 'ready' || doc.status === 'waiting') && !doc.pickDone ? (
            <button type="button" className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700" onClick={() => run(pickDocument)}>
              Pick items
            </button>
          ) : null}

          {type === 'delivery' && doc?.pickDone && !doc.packDone ? (
            <button type="button" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700" onClick={() => run(packDocument)}>
              Pack items
            </button>
          ) : null}

          {doc && doc.status !== 'done' && doc.status !== 'canceled' && doc.status !== 'draft' && (!doc.approvalStatus || doc.approvalStatus === 'approved' || doc.approvalStatus === 'not_required') ? (
            <button type="button" className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover" onClick={() => run(validateDocument)}>
              Validate & Post
            </button>
          ) : null}

          {doc && (
            <button
              type="button"
              onClick={() => setPrintModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-fg hover:bg-surface-2"
            >
              <Printer size={15} />
              Print
            </button>
          )}

          {doc && doc.status !== 'done' && doc.status !== 'canceled' ? (
            <button type="button" className="rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50" onClick={() => run(cancelDocument)}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      {type === 'delivery' && doc ? (
        <div className="flex gap-2 text-xs">
          <Step done={doc.status !== 'draft'} label="Confirm" />
          <Step done={Boolean(doc.pickDone)} label="Pick" />
          <Step done={Boolean(doc.packDone)} label="Pack" />
          <Step done={doc.status === 'done'} label="Validate" />
        </div>
      ) : null}

      {error ? <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">{error}</div> : null}

      <div className="grid gap-4 rounded-2xl border border-line bg-surface p-5 md:grid-cols-2">
        <Field label="Warehouse">
          <select className={inputClass} disabled={locked} value={warehouseId} onChange={(e) => applyWarehouse(e.target.value)}>
            {state.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        {meta.partner ? (
          <Field label={meta.partner}>
            <input className={inputClass} disabled={locked} value={partnerName} onChange={(e) => setPartner(e.target.value)} required={type !== 'internal'} />
          </Field>
        ) : (
          <Field label="Scheduled date">
            <input className={inputClass} disabled={locked} type="date" value={scheduledDate} onChange={(e) => setDate(e.target.value)} />
          </Field>
        )}
        <Field label="From location">
          <select className={inputClass} disabled={locked || type === 'receipt'} value={sourceLocationId} onChange={(e) => setSource(e.target.value)}>
            {state.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.type})
              </option>
            ))}
          </select>
        </Field>
        <Field label="To location">
          <select className={inputClass} disabled={locked || type === 'delivery'} value={destLocationId} onChange={(e) => setDest(e.target.value)}>
            {state.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.type})
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Main Grid: Line Items on Left, Timeline on Right */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-fg-muted">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                {type === 'adjustment' ? <th className="px-4 py-3">Theoretical</th> : null}
                <th className="px-4 py-3">{type === 'adjustment' ? 'Counted' : 'Quantity'}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.map((line, i) => {
                const p = state.products.find((prod) => prod.id === line.productId)
                const theoretical = line.productId ? qtyAt(state, line.productId, sourceLocationId) : 0
                return (
                  <tr key={i} className="hover:bg-surface-2/30">
                    <td className="px-4 py-2">
                      <select
                        className={inputClass}
                        disabled={locked}
                        value={line.productId}
                        onChange={(e) => {
                          const pid = e.target.value
                          const theo = pid ? qtyAt(state, pid, sourceLocationId) : 0
                          setLines((ls) =>
                            ls.map((l, j) =>
                              j === i
                                ? {
                                    ...l,
                                    productId: pid,
                                    countedQty: type === 'adjustment' ? theo : undefined,
                                    qty: type === 'adjustment' ? 0 : l.qty || 1,
                                  }
                                : l,
                            ),
                          )
                        }}
                      >
                        <option value="">Select product</option>
                        {state.products.map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{p?.sku ?? '—'}</td>
                    {type === 'adjustment' ? <td className="px-4 py-2 font-medium">{line.productId ? theoretical : '—'}</td> : null}
                    <td className="px-4 py-2">
                      {type === 'adjustment' ? (
                        <input
                          className={inputClass}
                          disabled={locked}
                          type="number"
                          min={0}
                          value={line.countedQty ?? ''}
                          onChange={(e) => {
                            const countedQty = Number(e.target.value)
                            setLines((ls) =>
                              ls.map((l, j) =>
                                j === i
                                  ? { ...l, countedQty, qty: Math.abs(countedQty - theoretical) }
                                  : l,
                              ),
                            )
                          }}
                        />
                      ) : (
                        <input
                          className={inputClass}
                          disabled={locked}
                          type="number"
                          min={0}
                          value={line.qty}
                          onChange={(e) =>
                            setLines((ls) => ls.map((l, j) => (j === i ? { ...l, qty: Number(e.target.value) } : l)))
                          }
                        />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {!locked ? (
                        <button type="button" className="text-rose-600 hover:underline" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!locked ? (
            <button type="button" className="w-full border-t border-line py-2.5 text-sm font-medium text-accent hover:bg-surface-2 transition" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
              + Add a product
            </button>
          ) : null}
        </div>

        {/* Activity Timeline Column */}
        {doc ? (
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-4">
            <ActivityTimeline
              entityId={doc.id}
              documentNumber={doc.number}
              fallbackDates={{
                createdAt: doc.scheduledDate,
                validatedAt: doc.status === 'done' ? doc.scheduledDate : undefined,
                approvedAt: doc.approvedAt,
                approvedBy: doc.approvedBy,
              }}
            />
          </div>
        ) : null}
      </div>
    </form>
  )
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 font-semibold ${done ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-surface-2 text-fg-muted'}`}>
      {label}
    </span>
  )
}
