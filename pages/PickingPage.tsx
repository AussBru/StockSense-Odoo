import { useState } from 'react'
import { Plus, ScanLine, CheckCircle2, Circle, Truck, Layers, Waves, ChevronDown, ChevronRight } from 'lucide-react'
import { useStore } from '../store'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { resolveScan } from '../lib/barcode'
import { StatusBadge } from '../components/Badges'
import type { PickingMethod, PickingOrder, PickingStatus } from '../types'

const METHOD_ICON = {
  single: Truck,
  batch: Layers,
  wave: Waves,
}

const METHOD_LABEL: Record<PickingMethod, string> = {
  single: 'Single Order',
  batch: 'Batch',
  wave: 'Wave',
}

const STATUS_NEXT: Partial<Record<PickingStatus, PickingStatus>> = {
  draft: 'in_progress',
  in_progress: 'done',
}

export function PickingPage() {
  const { state, savePickingOrder, advancePickingOrder, confirmPickingLine } = useStore()
  const [filterStatus, setFilterStatus] = useState<PickingStatus | 'all'>('all')
  const [filterMethod, setFilterMethod] = useState<PickingMethod | 'all'>('all')
  const [newOpen, setNewOpen] = useState(false)
  const [newDocIds, setNewDocIds] = useState<string[]>([])
  const [newMethod, setNewMethod] = useState<PickingMethod>('single')
  const [activePick, setActivePick] = useState<PickingOrder | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanLineId, setScanLineId] = useState<string | null>(null)
  const [scanError, setScanError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState('')

  const filtered = state.pickingOrders.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    if (filterMethod !== 'all' && p.method !== filterMethod) return false
    return true
  })

  const readyDocs = state.documents.filter(
    (d) => d.type === 'delivery' && (d.status === 'ready' || d.status === 'waiting'),
  )

  function createPicking() {
    if (!newDocIds.length) { setError('Select at least one delivery order.'); return }
    const wh = state.documents.find((d) => d.id === newDocIds[0])?.warehouseId ?? state.warehouses[0]?.id ?? ''
    savePickingOrder({ warehouseId: wh, documentIds: newDocIds, method: newMethod })
    setNewOpen(false)
    setNewDocIds([])
    setError('')
  }

  function handleAdvance(pick: PickingOrder) {
    const next = STATUS_NEXT[pick.status]
    if (!next) return
    const err = advancePickingOrder(pick.id, next)
    if (err) setError(err)
  }

  function handleScan(barcode: string) {
    setScanError('')
    if (!activePick || !scanLineId) return
    const result = resolveScan(state, barcode)
    const line = activePick.lines.find((l) => l.id === scanLineId)
    if (!line) return

    if (!result) { setScanError(`Barcode "${barcode}" not found.`); return }

    // Verify it's the right product
    if (result.record.entityType === 'product' && result.record.entityId !== line.productId) {
      setScanError('Wrong product scanned. Expected: ' + state.products.find((p) => p.id === line.productId)?.name)
      return
    }
    // Verify location
    if (result.record.entityType === 'location' && result.record.entityId !== line.sourceLocationId) {
      setScanError('Wrong location scanned.')
      return
    }

    const err = confirmPickingLine(activePick.id, scanLineId, line.qtyTodo)
    if (err) setScanError(err)
    else setScanOpen(false)
  }

  function manualConfirm(pickId: string, lineId: string, qty: number) {
    const err = confirmPickingLine(pickId, lineId, qty)
    if (err) setError(err)
  }

  function prodName(id: string) { return state.products.find((p) => p.id === id)?.name ?? id }
  function locName(id: string) { return state.locations.find((l) => l.id === id)?.name ?? id }

  // Refresh activePick from state when it changes
  const liveActivePick = activePick ? state.pickingOrders.find((p) => p.id === activePick.id) ?? activePick : null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Picking</h1>
          <p className="text-sm text-fg-muted">Pick items for delivery orders — single, batch, or wave</p>
        </div>
        <button
          type="button"
          onClick={() => { setNewOpen(true); setError('') }}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          <Plus size={16} /> New Pick
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'draft', 'in_progress', 'done', 'canceled'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setFilterStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${filterStatus === s ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg-muted hover:bg-surface-2/70'}`}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
        <span className="text-fg-subtle">·</span>
        {(['all', 'single', 'batch', 'wave'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setFilterMethod(m)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${filterMethod === m ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg-muted hover:bg-surface-2/70'}`}>
            {m === 'all' ? 'All methods' : METHOD_LABEL[m]}
          </button>
        ))}
      </div>

      {/* Picking orders */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-line bg-surface p-8 text-center text-fg-subtle">No picking orders found.</div>
        )}
        {filtered.map((pick) => {
          const MethodIcon = METHOD_ICON[pick.method]
          const doneLines = pick.lines.filter((l) => l.confirmed).length
          const isExpanded = expanded === pick.id
          const next = STATUS_NEXT[pick.status]

          return (
            <div key={pick.id} className="rounded-xl border border-line bg-surface">
              <button type="button" onClick={() => setExpanded(isExpanded ? null : pick.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left">
                {isExpanded ? <ChevronDown size={16} className="shrink-0 text-fg-muted" /> : <ChevronRight size={16} className="shrink-0 text-fg-muted" />}
                <MethodIcon size={18} className="shrink-0 text-fg-muted" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-fg">{pick.number}</span>
                    <StatusBadge status={pick.status} />
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted">{METHOD_LABEL[pick.method]}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-fg-muted">
                    {pick.scheduledDate} · {doneLines}/{pick.lines.length} lines confirmed
                  </div>
                </div>
                {pick.status !== 'done' && pick.status !== 'canceled' && (
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setActivePick(pick) }}
                      className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-surface-2">
                      <ScanLine size={13} /> Pick
                    </button>
                    {next && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleAdvance(pick) }}
                        className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg">
                        → {next === 'done' ? 'Complete' : 'Start'}
                      </button>
                    )}
                  </div>
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-line overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-surface-2 text-fg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Product</th>
                        <th className="px-4 py-2 text-left">From</th>
                        <th className="px-4 py-2 text-right">Qty</th>
                        <th className="px-4 py-2 text-center">Done</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pick.lines.map((line) => (
                        <tr key={line.id} className={line.confirmed ? 'opacity-60' : ''}>
                          <td className="px-4 py-2 text-fg">{prodName(line.productId)}</td>
                          <td className="px-4 py-2 text-fg-muted">{locName(line.sourceLocationId)}</td>
                          <td className="px-4 py-2 text-right text-fg">{line.qtyTodo}</td>
                          <td className="px-4 py-2 text-center">
                            {line.confirmed
                              ? <CheckCircle2 size={16} className="mx-auto text-emerald-500" />
                              : <Circle size={16} className="mx-auto text-fg-subtle" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* New picking order modal */}
      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-fg">New Picking Order</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Picking Method</label>
                <div className="flex gap-2">
                  {(['single', 'batch', 'wave'] as PickingMethod[]).map((m) => {
                    const Icon = METHOD_ICON[m]
                    return (
                      <button key={m} type="button" onClick={() => setNewMethod(m)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium ${newMethod === m ? 'border-accent bg-accent/5 text-fg' : 'border-line text-fg-muted hover:bg-surface-2'}`}>
                        <Icon size={14} /> {METHOD_LABEL[m]}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Delivery Orders</label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-line divide-y divide-line">
                  {readyDocs.length === 0 && (
                    <div className="px-3 py-2 text-xs text-fg-subtle">No ready delivery orders.</div>
                  )}
                  {readyDocs.map((doc) => (
                    <label key={doc.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={newDocIds.includes(doc.id)}
                        onChange={(e) => setNewDocIds(e.target.checked ? [...newDocIds, doc.id] : newDocIds.filter((id) => id !== doc.id))}
                        className="h-4 w-4 rounded border-line"
                      />
                      <span className="text-sm text-fg">{doc.number}</span>
                      <span className="text-xs text-fg-muted ml-auto">{doc.partnerName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setNewOpen(false); setError('') }} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={createPicking} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Active picking UI */}
      {liveActivePick && !scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-fg">Picking — {liveActivePick.number}</h2>
              <button type="button" onClick={() => setActivePick(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs">Close</button>
            </div>
            <div className="space-y-2">
              {liveActivePick.lines.map((line) => (
                <div key={line.id} className={`flex items-center gap-3 rounded-xl border p-4 ${line.confirmed ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5' : 'border-line bg-surface'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-fg">{prodName(line.productId)}</div>
                    <div className="text-xs text-fg-muted mt-0.5">{locName(line.sourceLocationId)} · Qty: {line.qtyTodo}</div>
                  </div>
                  {line.confirmed ? (
                    <CheckCircle2 size={22} className="shrink-0 text-emerald-500" />
                  ) : (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => { setScanLineId(line.id); setScanOpen(true); setScanError('') }}
                        className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface-2"
                      >
                        <ScanLine size={13} /> Scan
                      </button>
                      <button
                        type="button"
                        onClick={() => manualConfirm(liveActivePick.id, line.id, line.qtyTodo)}
                        className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
                      >
                        <CheckCircle2 size={13} /> Confirm
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {liveActivePick.lines.every((l) => l.confirmed) && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                ✓ All lines confirmed. You can now complete this picking order.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan modal */}
      {scanOpen && liveActivePick && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-3 text-base font-semibold text-fg">Scan to Confirm</h2>
            <p className="mb-3 text-xs text-fg-muted">Scan the product barcode or location barcode to confirm this line.</p>
            {scanError && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{scanError}</p>}
            <BarcodeScanner
              onScan={handleScan}
              onClose={() => { setScanOpen(false); setScanError('') }}
              placeholder="Scan barcode…"
            />
          </div>
        </div>
      )}
    </div>
  )
}
