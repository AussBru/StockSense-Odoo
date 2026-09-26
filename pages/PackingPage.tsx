import { useState } from 'react'
import { Plus, Package2, Lock, PackageOpen, Boxes } from 'lucide-react'
import { useStore } from '../store'
import { StatusBadge } from '../components/Badges'
import type { Package, PackageStatus } from '../types'

const PKG_TYPES = ['Box', 'Pallet', 'Envelope', 'Tube', 'Crate', 'Bag']

const STATUS_COLORS: Record<PackageStatus, string> = {
  open: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  packed: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  sealed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
}

export function PackingPage() {
  const { state, savePackage, sealPackage } = useStore()
  const [filterDelivery, setFilterDelivery] = useState('')
  const [newPkg, setNewPkg] = useState<Partial<Package> | null>(null)
  const [newLine, setNewLine] = useState({ productId: '', qty: 1 })
  const [error, setError] = useState('')

  const deliveryDocs = state.documents.filter((d) => d.type === 'delivery')

  const filtered = state.packages.filter((p) => !filterDelivery || p.deliveryDocId === filterDelivery)

  function openNew() {
    setNewPkg({
      packageNumber: `PKG-${String(state.packages.length + 1).padStart(4, '0')}`,
      deliveryDocId: deliveryDocs[0]?.id ?? '',
      type: 'Box',
      status: 'open',
      productLines: [],
    })
    setNewLine({ productId: state.products[0]?.id ?? '', qty: 1 })
    setError('')
  }

  function addLine() {
    if (!newLine.productId) return
    setNewPkg((p) => ({
      ...p!,
      productLines: [...(p!.productLines ?? []), { productId: newLine.productId, qty: newLine.qty }],
    }))
  }

  function handleSave() {
    if (!newPkg?.deliveryDocId) { setError('Select a delivery order.'); return }
    if (!newPkg.productLines?.length) { setError('Add at least one product line.'); return }
    savePackage({
      id: (newPkg as Package).id,
      packageNumber: newPkg.packageNumber!,
      deliveryDocId: newPkg.deliveryDocId!,
      type: newPkg.type ?? 'Box',
      weight: newPkg.weight,
      length: newPkg.length,
      width: newPkg.width,
      height: newPkg.height,
      status: newPkg.status as PackageStatus ?? 'open',
      productLines: newPkg.productLines ?? [],
    })
    setNewPkg(null)
    setError('')
  }

  function handleSeal(id: string) {
    const err = sealPackage(id)
    if (err) setError(err)
  }

  function docLabel(id: string) {
    const doc = state.documents.find((d) => d.id === id)
    return doc ? `${doc.number} — ${doc.partnerName}` : id
  }

  function prodName(id: string) { return state.products.find((p) => p.id === id)?.name ?? id }

  const summary = {
    total: state.packages.length,
    open: state.packages.filter((p) => p.status === 'open').length,
    packed: state.packages.filter((p) => p.status === 'packed').length,
    sealed: state.packages.filter((p) => p.status === 'sealed').length,
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Packing</h1>
          <p className="text-sm text-fg-muted">Create packages for deliveries, add products, and seal them for dispatch</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          <Plus size={16} /> New Package
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: summary.total, color: 'text-fg' },
          { label: 'Open', value: summary.open, color: 'text-amber-600' },
          { label: 'Packed', value: summary.packed, color: 'text-sky-600' },
          { label: 'Sealed', value: summary.sealed, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-line bg-surface p-4">
            <div className="text-xs text-fg-muted mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select
          value={filterDelivery}
          onChange={(e) => setFilterDelivery(e.target.value)}
          className="h-9 w-72 rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">All delivery orders</option>
          {deliveryDocs.map((d) => <option key={d.id} value={d.id}>{d.number} — {d.partnerName}</option>)}
        </select>
      </div>

      {/* Package cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.length === 0 && (
          <div className="col-span-2 rounded-xl border border-line bg-surface p-8 text-center text-fg-subtle">No packages found.</div>
        )}
        {filtered.map((pkg) => (
          <div key={pkg.id} className="rounded-xl border border-line bg-surface">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
              <Package2 size={18} className="shrink-0 text-fg-muted" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-fg">{pkg.packageNumber}</div>
                <div className="text-xs text-fg-muted truncate">{docLabel(pkg.deliveryDocId)}</div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[pkg.status]}`}>
                {pkg.status.charAt(0).toUpperCase() + pkg.status.slice(1)}
              </span>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                <span>{pkg.type}</span>
                {pkg.weight && <span>{pkg.weight} kg</span>}
                {pkg.length && pkg.width && pkg.height && (
                  <span>{pkg.length}×{pkg.width}×{pkg.height} cm</span>
                )}
              </div>
              <div className="space-y-1">
                {pkg.productLines.map((line, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-fg">{prodName(line.productId)}</span>
                    <span className="text-fg-muted">×{line.qty}</span>
                  </div>
                ))}
              </div>
              {pkg.status !== 'sealed' && (
                <button
                  type="button"
                  onClick={() => handleSeal(pkg.id)}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-xs font-medium hover:bg-surface-2"
                >
                  <Lock size={12} /> Seal Package
                </button>
              )}
              {pkg.sealedAt && (
                <div className="text-xs text-fg-subtle">Sealed: {new Date(pkg.sealedAt).toLocaleString()}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Package modal */}
      {newPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-fg">New Package</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Package Number</label>
                <input
                  value={newPkg.packageNumber ?? ''}
                  onChange={(e) => setNewPkg((p) => ({ ...p!, packageNumber: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Type</label>
                <select
                  value={newPkg.type ?? 'Box'}
                  onChange={(e) => setNewPkg((p) => ({ ...p!, type: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                >
                  {PKG_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-fg-muted">Delivery Order</label>
                <select
                  value={newPkg.deliveryDocId ?? ''}
                  onChange={(e) => setNewPkg((p) => ({ ...p!, deliveryDocId: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                >
                  {deliveryDocs.map((d) => <option key={d.id} value={d.id}>{d.number} — {d.partnerName}</option>)}
                </select>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-fg-muted">Weight (kg)</label>
                <input type="number" value={newPkg.weight ?? ''} onChange={(e) => setNewPkg((p) => ({ ...p!, weight: Number(e.target.value) || undefined }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none" /></div>
              <div><label className="mb-1 block text-xs font-medium text-fg-muted">L × W × H (cm)</label>
                <div className="flex gap-1">
                  {(['length', 'width', 'height'] as const).map((dim) => (
                    <input key={dim} type="number" placeholder={dim[0].toUpperCase()} value={(newPkg as any)[dim] ?? ''}
                      onChange={(e) => setNewPkg((p) => ({ ...p!, [dim]: Number(e.target.value) || undefined }))}
                      className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm focus:border-accent focus:outline-none" />
                  ))}
                </div>
              </div>
              {/* Product lines */}
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-fg-muted">Products</label>
                <div className="space-y-1.5">
                  {(newPkg.productLines ?? []).map((line, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 text-fg">{prodName(line.productId)}</span>
                      <span className="text-fg-muted">×{line.qty}</span>
                      <button type="button" onClick={() => setNewPkg((p) => ({ ...p!, productLines: p!.productLines!.filter((_, li) => li !== i) }))}
                        className="text-xs text-rose-500 hover:underline">Remove</button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <select value={newLine.productId} onChange={(e) => setNewLine((l) => ({ ...l, productId: e.target.value }))}
                      className="h-8 flex-1 rounded-lg border border-line bg-surface px-2 text-sm focus:border-accent focus:outline-none">
                      {state.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" min={1} value={newLine.qty} onChange={(e) => setNewLine((l) => ({ ...l, qty: Number(e.target.value) }))}
                      className="h-8 w-16 rounded-lg border border-line bg-surface px-2 text-sm focus:border-accent focus:outline-none" />
                    <button type="button" onClick={addLine} className="rounded-lg border border-line px-3 text-xs hover:bg-surface-2">Add</button>
                  </div>
                </div>
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setNewPkg(null); setError('') }} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleSave} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
