import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Clock, CheckCircle2, FlaskConical } from 'lucide-react'
import { useStore } from '../store'
import { getLotStatus, lotStatusLabel, lotsForProduct } from '../lib/inventory'
import { formatDate } from '../lib/utils'
import type { Lot } from '../types'

export function LotsPage() {
  const { state, saveLot, deleteLot } = useStore()
  const [search, setSearch] = useState('')
  const [filterProductId, setFilterProductId] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'expiring_soon' | 'expired'>('all')
  const [editLot, setEditLot] = useState<Partial<Lot> | null>(null)

  const warningDays = 30

  const allLots = state.lots.map((lot) => ({
    lot,
    product: state.products.find((p) => p.id === lot.productId),
    location: state.locations.find((l) => l.id === lot.locationId),
    status: getLotStatus(lot, warningDays),
  }))

  const filtered = allLots.filter(({ lot, product, status }) => {
    if (filterProductId && lot.productId !== filterProductId) return false
    if (filterStatus !== 'all' && status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!lot.lotNumber.toLowerCase().includes(q) && !product?.name.toLowerCase().includes(q)) return false
    }
    return true
  })

  function openNew() {
    setEditLot({
      lotNumber: '',
      productId: state.products[0]?.id ?? '',
      qty: 0,
      locationId: state.locations.find((l) => l.type === 'internal')?.id ?? '',
      warehouseId: state.warehouses[0]?.id ?? '',
      receivedDate: new Date().toISOString().slice(0, 10),
      notes: '',
    })
  }

  function handleSave() {
    if (!editLot?.lotNumber || !editLot.productId) return
    saveLot({
      id: (editLot as Lot).id,
      lotNumber: editLot.lotNumber!,
      productId: editLot.productId!,
      qty: Number(editLot.qty ?? 0),
      locationId: editLot.locationId!,
      warehouseId: editLot.warehouseId!,
      receivedDate: editLot.receivedDate!,
      manufacturingDate: editLot.manufacturingDate,
      expiryDate: editLot.expiryDate || undefined,
      supplierId: editLot.supplierId,
      receiptDocId: editLot.receiptDocId,
      notes: editLot.notes ?? '',
    })
    setEditLot(null)
  }

  const statusIcon = (status: ReturnType<typeof getLotStatus>) => {
    switch (status) {
      case 'expired': return <AlertTriangle size={14} className="text-rose-500" />
      case 'expiring_soon': return <Clock size={14} className="text-amber-500" />
      default: return <CheckCircle2 size={14} className="text-emerald-500" />
    }
  }

  const statusBadge = (status: ReturnType<typeof getLotStatus>) => {
    const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold'
    switch (status) {
      case 'expired': return `${base} bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300`
      case 'expiring_soon': return `${base} bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300`
      default: return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300`
    }
  }

  const counts = {
    total: allLots.length,
    expired: allLots.filter((r) => r.status === 'expired').length,
    expiring: allLots.filter((r) => r.status === 'expiring_soon').length,
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Lot / Batch Tracking</h1>
          <p className="text-sm text-fg-muted">Track inventory by lot with manufacturing and expiry dates</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          <Plus size={16} /> New Lot
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Lots', value: counts.total, icon: FlaskConical, color: 'text-fg' },
          { label: 'Expiring Soon', value: counts.expiring, icon: Clock, color: 'text-amber-500' },
          { label: 'Expired', value: counts.expired, icon: AlertTriangle, color: 'text-rose-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2 text-fg-muted text-xs mb-1">
              <Icon size={14} className={color} />
              {label}
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lot number or product…"
          className="h-9 w-56 rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
        />
        <select
          value={filterProductId}
          onChange={(e) => setFilterProductId(e.target.value)}
          className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">All products</option>
          {state.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="normal">Normal</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-2 text-xs text-fg-muted">
            <tr>
              <th className="px-4 py-3 text-left">Lot Number</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Received</th>
              <th className="px-4 py-3 text-left">Expiry</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-fg-subtle">No lots found.</td></tr>
            )}
            {filtered.map(({ lot, product, location, status }) => (
              <tr key={lot.id} className="hover:bg-surface-2/40">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-fg">{lot.lotNumber}</td>
                <td className="px-4 py-3 text-fg">{product?.name ?? '—'}<span className="ml-1.5 text-xs text-fg-muted">{product?.sku}</span></td>
                <td className="px-4 py-3 text-right font-medium text-fg">{lot.qty}</td>
                <td className="px-4 py-3 text-fg-muted">{location?.name ?? '—'}</td>
                <td className="px-4 py-3 text-fg-muted">{lot.receivedDate}</td>
                <td className="px-4 py-3 text-fg-muted">
                  {lot.expiryDate ? (
                    <span className={status === 'expired' ? 'text-rose-600 font-medium' : status === 'expiring_soon' ? 'text-amber-600 font-medium' : ''}>
                      {lot.expiryDate}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={statusBadge(status)}>
                    {statusIcon(status)}
                    {lotStatusLabel(status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => setEditLot({ ...lot })} className="rounded p-1 hover:bg-surface-2">
                      <Pencil size={13} className="text-fg-muted" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (confirm(`Delete lot ${lot.lotNumber}?`)) deleteLot(lot.id) }}
                      className="rounded p-1 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 size={13} className="text-rose-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit / New modal */}
      {editLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-fg">{(editLot as Lot).id ? 'Edit Lot' : 'New Lot'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-fg-muted">Lot Number *</label>
                <input
                  value={editLot.lotNumber ?? ''}
                  onChange={(e) => setEditLot((l) => ({ ...l!, lotNumber: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-fg-muted">Product *</label>
                <select
                  value={editLot.productId ?? ''}
                  onChange={(e) => setEditLot((l) => ({ ...l!, productId: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                >
                  {state.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Quantity</label>
                <input
                  type="number"
                  value={editLot.qty ?? ''}
                  onChange={(e) => setEditLot((l) => ({ ...l!, qty: Number(e.target.value) }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Location</label>
                <select
                  value={editLot.locationId ?? ''}
                  onChange={(e) => setEditLot((l) => ({ ...l!, locationId: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                >
                  {state.locations.filter((l) => l.type === 'internal').map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Received Date</label>
                <input
                  type="date"
                  value={editLot.receivedDate ?? ''}
                  onChange={(e) => setEditLot((l) => ({ ...l!, receivedDate: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Mfg. Date</label>
                <input
                  type="date"
                  value={editLot.manufacturingDate ?? ''}
                  onChange={(e) => setEditLot((l) => ({ ...l!, manufacturingDate: e.target.value || undefined }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-fg-muted">Expiry Date</label>
                <input
                  type="date"
                  value={editLot.expiryDate ?? ''}
                  onChange={(e) => setEditLot((l) => ({ ...l!, expiryDate: e.target.value || undefined }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-fg-muted">Notes</label>
                <textarea
                  value={editLot.notes ?? ''}
                  onChange={(e) => setEditLot((l) => ({ ...l!, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditLot(null)} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleSave} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
