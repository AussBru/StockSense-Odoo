import { useState } from 'react'
import { Plus, Pencil, Trash2, ArrowDownToLine, ToggleLeft, ToggleRight } from 'lucide-react'
import { useStore } from '../store'
import type { PutawayRule } from '../types'

export function PutawayPage() {
  const { state, savePutawayRule, deletePutawayRule, suggestPutaway } = useStore()
  const [editRule, setEditRule] = useState<Partial<PutawayRule> | null>(null)
  const [testProductId, setTestProductId] = useState(state.products[0]?.id ?? '')
  const [testWarehouseId, setTestWarehouseId] = useState(state.warehouses[0]?.id ?? '')
  const [testResult, setTestResult] = useState<string | null>(null)

  function handleSave() {
    if (!editRule?.warehouseId || !editRule.locationId) return
    savePutawayRule({
      id: (editRule as PutawayRule).id,
      warehouseId: editRule.warehouseId!,
      zoneId: editRule.zoneId || undefined,
      locationId: editRule.locationId!,
      productId: editRule.productId || undefined,
      categoryId: editRule.categoryId || undefined,
      priority: Number(editRule.priority ?? 10),
      active: editRule.active ?? true,
      notes: editRule.notes ?? '',
    })
    setEditRule(null)
  }

  function toggleActive(rule: PutawayRule) {
    savePutawayRule({ ...rule, active: !rule.active })
  }

  function runTest() {
    const prod = state.products.find((p) => p.id === testProductId)
    const locId = suggestPutaway(testProductId, testWarehouseId, prod?.categoryId)
    if (locId) {
      const loc = state.locations.find((l) => l.id === locId)
      setTestResult(loc ? `${loc.name} (${loc.code})` : locId)
    } else {
      setTestResult('No putaway rule matched.')
    }
  }

  const sortedRules = [...state.putawayRules].sort((a, b) => a.priority - b.priority)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Putaway Rules</h1>
          <p className="text-sm text-fg-muted">Define where received goods should be placed based on product or category</p>
        </div>
        <button
          type="button"
          onClick={() => setEditRule({ warehouseId: state.warehouses[0]?.id ?? '', priority: 10, active: true })}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          <Plus size={16} /> New Rule
        </button>
      </div>

      {/* Test panel */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-fg">
          <ArrowDownToLine size={15} className="text-fg-muted" />
          Test Putaway Suggestion
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Product</label>
            <select value={testProductId} onChange={(e) => { setTestProductId(e.target.value); setTestResult(null) }}
              className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none">
              {state.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Warehouse</label>
            <select value={testWarehouseId} onChange={(e) => { setTestWarehouseId(e.target.value); setTestResult(null) }}
              className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none">
              {state.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <button type="button" onClick={runTest}
            className="h-9 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg">
            Suggest
          </button>
          {testResult && (
            <div className={`rounded-lg px-3 py-1.5 text-sm font-medium ${testResult.includes('No') ? 'bg-surface-2 text-fg-muted' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
              → {testResult}
            </div>
          )}
        </div>
      </div>

      {/* Rules table */}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-2 text-xs text-fg-muted">
            <tr>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Warehouse</th>
              <th className="px-4 py-3 text-left">Match</th>
              <th className="px-4 py-3 text-left">Destination</th>
              <th className="px-4 py-3 text-left">Zone</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sortedRules.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-fg-subtle">No putaway rules defined.</td></tr>
            )}
            {sortedRules.map((rule) => {
              const wh = state.warehouses.find((w) => w.id === rule.warehouseId)
              const loc = state.locations.find((l) => l.id === rule.locationId)
              const zone = state.warehouseZones.find((z) => z.id === rule.zoneId)
              const product = state.products.find((p) => p.id === rule.productId)
              const category = state.categories.find((c) => c.id === rule.categoryId)

              return (
                <tr key={rule.id} className={`hover:bg-surface-2/40 ${!rule.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-fg">{rule.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-fg">{wh?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-fg">
                    {product ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                        Product: {product.name}
                      </span>
                    ) : category ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                        Category: {category.name}
                      </span>
                    ) : (
                      <span className="text-fg-muted text-xs">All products</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg">{loc?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-fg-muted text-xs">{zone?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button type="button" onClick={() => toggleActive(rule)}>
                      {rule.active
                        ? <ToggleRight size={18} className="text-emerald-500" />
                        : <ToggleLeft size={18} className="text-fg-subtle" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => setEditRule({ ...rule })} className="rounded p-1 hover:bg-surface-2">
                        <Pencil size={13} className="text-fg-muted" />
                      </button>
                      <button type="button" onClick={() => { if (confirm('Delete this rule?')) deletePutawayRule(rule.id) }}
                        className="rounded p-1 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                        <Trash2 size={13} className="text-rose-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-fg">{(editRule as PutawayRule).id ? 'Edit Rule' : 'New Putaway Rule'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">Warehouse *</label>
                  <select value={editRule.warehouseId ?? ''} onChange={(e) => setEditRule((r) => ({ ...r!, warehouseId: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none">
                    {state.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">Priority (lower = first)</label>
                  <input type="number" value={editRule.priority ?? 10} onChange={(e) => setEditRule((r) => ({ ...r!, priority: Number(e.target.value) }))}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Match Product (optional)</label>
                <select value={editRule.productId ?? ''} onChange={(e) => setEditRule((r) => ({ ...r!, productId: e.target.value || undefined }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none">
                  <option value="">Any product</option>
                  {state.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Match Category (optional)</label>
                <select value={editRule.categoryId ?? ''} onChange={(e) => setEditRule((r) => ({ ...r!, categoryId: e.target.value || undefined }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none">
                  <option value="">Any category</option>
                  {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Destination Location *</label>
                <select value={editRule.locationId ?? ''} onChange={(e) => setEditRule((r) => ({ ...r!, locationId: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none">
                  <option value="">Select location…</option>
                  {state.locations.filter((l) => l.type === 'internal').map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Zone (optional)</label>
                <select value={editRule.zoneId ?? ''} onChange={(e) => setEditRule((r) => ({ ...r!, zoneId: e.target.value || undefined }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none">
                  <option value="">No zone</option>
                  {state.warehouseZones.filter((z) => z.warehouseId === editRule.warehouseId).map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Notes</label>
                <input value={editRule.notes ?? ''} onChange={(e) => setEditRule((r) => ({ ...r!, notes: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-fg">
                <input type="checkbox" checked={editRule.active ?? true} onChange={(e) => setEditRule((r) => ({ ...r!, active: e.target.checked }))} className="rounded" />
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditRule(null)} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleSave} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
