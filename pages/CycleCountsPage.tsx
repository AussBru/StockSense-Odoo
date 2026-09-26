import { useState } from 'react'
import { Plus, ChevronRight, ClipboardList, CheckCheck, BarChart2 } from 'lucide-react'
import { useStore } from '../store'
import { StatusBadge } from '../components/Badges'
import type { CycleCount, CycleCountLine, CycleCountStatus } from '../types'

const WORKFLOW: CycleCountStatus[] = ['draft', 'assigned', 'counting', 'review', 'approved', 'posted']

const NEXT_STATUS: Partial<Record<CycleCountStatus, CycleCountStatus>> = {
  draft: 'assigned',
  assigned: 'counting',
  counting: 'review',
  review: 'approved',
  approved: 'posted',
}

const STATUS_LABEL: Record<CycleCountStatus, string> = {
  draft: 'Draft',
  assigned: 'Assigned',
  counting: 'Counting',
  review: 'Review',
  approved: 'Approved',
  posted: 'Posted',
}

export function CycleCountsPage() {
  const { state, saveCycleCount, advanceCycleCount, postCycleCount } = useStore()
  const [editCC, setEditCC] = useState<Partial<CycleCount> | null>(null)
  const [countingCC, setCountingCC] = useState<CycleCount | null>(null)
  const [countLines, setCountLines] = useState<CycleCountLine[]>([])
  const [filterStatus, setFilterStatus] = useState<CycleCountStatus | 'all'>('all')
  const [error, setError] = useState('')

  const filtered = state.cycleCounts.filter(
    (cc) => filterStatus === 'all' || cc.status === filterStatus,
  )

  function openNew() {
    setEditCC({
      warehouseId: state.warehouses[0]?.id ?? '',
      locationId: state.locations.find((l) => l.type === 'internal')?.id ?? '',
      assignedUserId: state.sessionUserId ?? '',
      scheduledDate: new Date().toISOString().slice(0, 10),
      status: 'draft',
      notes: '',
      lines: [],
    })
  }

  function handleSave() {
    if (!editCC?.warehouseId || !editCC.locationId) return
    saveCycleCount(editCC as Partial<CycleCount> & { warehouseId: string; locationId: string })
    setEditCC(null)
  }

  function handleAdvance(cc: CycleCount, next: CycleCountStatus) {
    setError('')
    if (next === 'posted') {
      const err = postCycleCount(cc.id)
      if (err) setError(err)
      return
    }
    if (next === 'counting') {
      // Open counting UI
      const lines = cc.lines.length > 0 ? cc.lines : state.quants
        .filter((q) => q.locationId === cc.locationId)
        .map((q) => ({
          id: `ccl_${q.productId}`,
          productId: q.productId,
          expected: q.qty,
          counted: null,
          variance: null,
        }))
      setCountLines(lines.map((l) => ({ ...l })))
      setCountingCC({ ...cc, lines })
      advanceCycleCount(cc.id, 'counting', lines)
      return
    }
    const err = advanceCycleCount(cc.id, next)
    if (err) setError(err)
  }

  function saveCountLines() {
    if (!countingCC) return
    const updated = countLines.map((l) => ({
      ...l,
      variance: l.counted !== null ? l.counted - l.expected : null,
    }))
    advanceCycleCount(countingCC.id, 'review', updated)
    setCountingCC(null)
    setCountLines([])
  }

  function whName(id: string) { return state.warehouses.find((w) => w.id === id)?.name ?? '—' }
  function locName(id: string) { return state.locations.find((l) => l.id === id)?.name ?? '—' }
  function prodName(id: string) { return state.products.find((p) => p.id === id)?.name ?? id }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Cycle Counts</h1>
          <p className="text-sm text-fg-muted">Schedule, execute, and post physical inventory counts</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          <Plus size={16} /> New Count
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(['all', ...WORKFLOW] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filterStatus === s ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg-muted hover:bg-surface-2/70'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-line bg-surface p-8 text-center text-fg-subtle">
            No cycle counts found.
          </div>
        )}
        {filtered.map((cc) => {
          const next = NEXT_STATUS[cc.status]
          const variances = cc.lines.filter((l) => l.variance !== null && l.variance !== 0)
          const totalVariance = variances.reduce((s, l) => s + (l.variance ?? 0), 0)

          return (
            <div key={cc.id} className="rounded-xl border border-line bg-surface">
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                <ClipboardList size={18} className="shrink-0 text-fg-muted" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-fg">{cc.number}</span>
                    <StatusBadge status={cc.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-fg-muted">
                    {whName(cc.warehouseId)} · {locName(cc.locationId)} · Scheduled: {cc.scheduledDate}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs text-fg-muted">
                  <span>{cc.lines.length} line{cc.lines.length !== 1 ? 's' : ''}</span>
                  {totalVariance !== 0 && (
                    <span className={totalVariance < 0 ? 'text-rose-500 font-medium' : 'text-emerald-500 font-medium'}>
                      Variance: {totalVariance > 0 ? '+' : ''}{totalVariance}
                    </span>
                  )}
                </div>
                {next && cc.status !== 'posted' && (
                  <button
                    type="button"
                    onClick={() => handleAdvance(cc, next)}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
                  >
                    {next === 'posted' ? <CheckCheck size={13} /> : <ChevronRight size={13} />}
                    {next === 'counting' ? 'Start Count' : next === 'posted' ? 'Post' : `→ ${STATUS_LABEL[next]}`}
                  </button>
                )}
              </div>

              {/* Count lines summary (review / approved) */}
              {(cc.status === 'review' || cc.status === 'approved') && cc.lines.length > 0 && (
                <div className="border-t border-line overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-surface-2 text-fg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Product</th>
                        <th className="px-4 py-2 text-right">Expected</th>
                        <th className="px-4 py-2 text-right">Counted</th>
                        <th className="px-4 py-2 text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {cc.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="px-4 py-2 text-fg">{prodName(l.productId)}</td>
                          <td className="px-4 py-2 text-right text-fg-muted">{l.expected}</td>
                          <td className="px-4 py-2 text-right text-fg">{l.counted ?? '—'}</td>
                          <td className={`px-4 py-2 text-right font-semibold ${
                            l.variance === null ? 'text-fg-muted' : l.variance < 0 ? 'text-rose-500' : l.variance > 0 ? 'text-emerald-600' : 'text-fg-muted'
                          }`}>
                            {l.variance === null ? '—' : l.variance > 0 ? `+${l.variance}` : l.variance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {cc.adjustmentDocId && (
                <div className="border-t border-line px-5 py-2 text-xs text-fg-muted">
                  Adjustment posted: <span className="font-mono font-medium text-fg">{
                    state.documents.find((d) => d.id === cc.adjustmentDocId)?.number ?? cc.adjustmentDocId
                  }</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* New Count modal */}
      {editCC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-fg">New Cycle Count</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Warehouse</label>
                <select
                  value={editCC.warehouseId ?? ''}
                  onChange={(e) => setEditCC((c) => ({ ...c!, warehouseId: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                >
                  {state.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Location</label>
                <select
                  value={editCC.locationId ?? ''}
                  onChange={(e) => setEditCC((c) => ({ ...c!, locationId: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                >
                  {state.locations.filter((l) => l.type === 'internal').map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Assigned To</label>
                <select
                  value={editCC.assignedUserId ?? ''}
                  onChange={(e) => setEditCC((c) => ({ ...c!, assignedUserId: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                >
                  {state.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Scheduled Date</label>
                <input
                  type="date"
                  value={editCC.scheduledDate ?? ''}
                  onChange={(e) => setEditCC((c) => ({ ...c!, scheduledDate: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Notes</label>
                <textarea
                  value={editCC.notes ?? ''}
                  onChange={(e) => setEditCC((c) => ({ ...c!, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditCC(null)} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleSave} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Counting UI modal */}
      {countingCC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-fg">Count — {countingCC.number}</h2>
              <span className="text-xs text-fg-muted">{locName(countingCC.locationId)}</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2 text-xs text-fg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-right">Expected</th>
                    <th className="px-4 py-3 text-right w-32">Counted</th>
                    <th className="px-4 py-3 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {countLines.map((line, i) => {
                    const variance = line.counted !== null ? line.counted - line.expected : null
                    return (
                      <tr key={line.id}>
                        <td className="px-4 py-2 text-fg">{prodName(line.productId)}</td>
                        <td className="px-4 py-2 text-right text-fg-muted">{line.expected}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            value={line.counted ?? ''}
                            onChange={(e) => {
                              const v = e.target.value === '' ? null : Number(e.target.value)
                              setCountLines((ls) => ls.map((l, li) => li === i ? { ...l, counted: v } : l))
                            }}
                            className="h-8 w-24 rounded-lg border border-line bg-surface px-2 text-right text-sm focus:border-accent focus:outline-none ml-auto block"
                            placeholder="—"
                          />
                        </td>
                        <td className={`px-4 py-2 text-right font-semibold ${
                          variance === null ? 'text-fg-muted' : variance < 0 ? 'text-rose-500' : variance > 0 ? 'text-emerald-600' : 'text-fg-muted'
                        }`}>
                          {variance === null ? '—' : variance > 0 ? `+${variance}` : variance}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setCountingCC(null); setCountLines([]) }} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={saveCountLines} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Submit Count → Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
