import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StatusBadge } from './Badges'
import { Field, inputClass } from './AuthFrame'
import { qtyAt } from '../lib/inventory'
import { emptyLine, useStore } from '../store'
import type { DocType, Document, DocumentLine } from '../types'

const titles: Record<DocType, { list: string; hint: string; partner: string | null; newPath: string }> = {
  receipt: {
    list: 'Receipts',
    hint: 'Incoming goods from vendors. Validate to increase stock.',
    partner: 'Supplier',
    newPath: '/receipts/new',
  },
  delivery: {
    list: 'Delivery Orders',
    hint: 'Pick, pack, then validate to decrease stock.',
    partner: 'Customer',
    newPath: '/deliveries/new',
  },
  internal: {
    list: 'Internal Transfers',
    hint: 'Move stock between locations or warehouses. Total qty stays the same.',
    partner: null,
    newPath: '/transfers/new',
  },
  adjustment: {
    list: 'Inventory Adjustments',
    hint: 'Enter physical count. The system posts the difference to the ledger.',
    partner: null,
    newPath: '/adjustments/new',
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
        if (q && !`${d.number} ${d.partnerName}`.toLowerCase().includes(q.toLowerCase())) return false
        return true
      }),
    [state.documents, type, status, q],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{meta.list}</h1>
          <p className="text-sm text-fg-muted">{meta.hint}</p>
        </div>
        <Link to={meta.newPath} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-accent-fg">
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
          <tbody>
            {rows.map((doc) => {
              const from = state.locations.find((l) => l.id === doc.sourceLocationId)
              const to = state.locations.find((l) => l.id === doc.destLocationId)
              const wh = state.warehouses.find((w) => w.id === doc.warehouseId)
              return (
                <tr key={doc.id} className="border-t border-line-soft">
                  <td className="px-4 py-3 font-medium">
                    <Link className="text-brand hover:underline" to={hrefFor(type, doc.id)}>
                      {doc.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{from?.code}</td>
                  <td className="px-4 py-3">{to?.code}</td>
                  <td className="px-4 py-3">{meta.partner ? doc.partnerName || '—' : wh?.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{doc.scheduledDate}</td>
                </tr>
              )
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-fg-subtle">
                  No documents yet.
                </td>
              </tr>
            ) : null}
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
    saveDocument,
    confirmDocument,
    pickDocument,
    packDocument,
    validateDocument,
    cancelDocument,
    defaultLocations,
  } = useStore()
  const meta = titles[type]
  const existing = id && id !== 'new' ? state.documents.find((d) => d.id === id) : undefined
  const isNew = !existing

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

  return (
    <form onSubmit={onSave} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-fg-subtle">{meta.list}</div>
          <h1 className="text-2xl font-semibold">{isNew ? `New ${meta.list.slice(0, -1)}` : doc?.number}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {doc ? <StatusBadge status={doc.status} /> : null}
          {!locked ? (
            <button type="submit" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium">
              Save draft
            </button>
          ) : null}
          {(!doc || doc.status === 'draft') && (
            <button type="button" className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg" onClick={() => run(confirmDocument)}>
              Confirm
            </button>
          )}
          {type === 'delivery' && doc && (doc.status === 'ready' || doc.status === 'waiting') && !doc.pickDone ? (
            <button type="button" className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => run(pickDocument)}>
              Pick items
            </button>
          ) : null}
          {type === 'delivery' && doc?.pickDone && !doc.packDone ? (
            <button type="button" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => run(packDocument)}>
              Pack items
            </button>
          ) : null}
          {doc && doc.status !== 'done' && doc.status !== 'canceled' && doc.status !== 'draft' ? (
            <button type="button" className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-accent-fg" onClick={() => run(validateDocument)}>
              Validate
            </button>
          ) : null}
          {doc && doc.status !== 'done' && doc.status !== 'canceled' ? (
            <button type="button" className="rounded-lg px-3 py-2 text-sm text-rose-600" onClick={() => run(cancelDocument)}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      {type === 'delivery' && doc ? (
        <div className="flex gap-2 text-xs">
          <Step done={doc.status !== 'draft'} label="Confirm" />
          <Step done={doc.pickDone} label="Pick" />
          <Step done={doc.packDone} label="Pack" />
          <Step done={doc.status === 'done'} label="Validate" />
        </div>
      ) : null}

      {error ? <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

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
            {(type === 'receipt' ? state.locations.filter((l) => l.type === 'vendor') : internals).map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} — {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="To location">
          <select
            className={inputClass}
            disabled={locked || type === 'delivery' || type === 'adjustment'}
            value={destLocationId}
            onChange={(e) => setDest(e.target.value)}
          >
            {(type === 'delivery'
              ? state.locations.filter((l) => l.type === 'customer')
              : type === 'adjustment'
                ? state.locations.filter((l) => l.type === 'inventory_loss')
                : internals
            ).map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} — {l.name}
              </option>
            ))}
          </select>
        </Field>
        {meta.partner ? (
          <Field label="Scheduled date">
            <input className={inputClass} disabled={locked} type="date" value={scheduledDate} onChange={(e) => setDate(e.target.value)} />
          </Field>
        ) : null}
        <div className={meta.partner ? '' : 'md:col-span-2'}>
          <Field label="Notes">
            <input className={inputClass} disabled={locked} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase text-fg-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              {type === 'adjustment' ? <th className="px-4 py-3">Theoretical</th> : null}
              <th className="px-4 py-3">{type === 'adjustment' ? 'Counted qty' : 'Quantity'}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => {
              const p = state.products.find((x) => x.id === line.productId)
              const theoretical = line.productId ? qtyAt(state, line.productId, sourceLocationId) : 0
              return (
                <tr key={line.id} className="border-t border-line-soft">
                  <td className="px-4 py-2">
                    <select
                      className={inputClass}
                      disabled={locked}
                      value={line.productId}
                      onChange={(e) => {
                        const productId = e.target.value
                        setLines((ls) =>
                          ls.map((l, j) =>
                            j === i
                              ? {
                                  ...l,
                                  productId,
                                  countedQty: type === 'adjustment' ? qtyAt(state, productId, sourceLocationId) : l.countedQty,
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
                  {type === 'adjustment' ? <td className="px-4 py-2">{line.productId ? theoretical : '—'}</td> : null}
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
                      <button type="button" className="text-rose-600" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
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
          <button type="button" className="w-full border-t border-line-soft py-2 text-sm text-brand" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
            Add a product
          </button>
        ) : null}
      </div>
    </form>
  )
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 font-semibold ${done ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-surface-2 text-fg-muted'}`}>
      {label}
    </span>
  )
}
