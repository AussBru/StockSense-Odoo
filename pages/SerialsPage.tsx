import { useState } from 'react'
import { Plus, Pencil, Hash, MapPin, Truck, RotateCcw, Archive } from 'lucide-react'
import { useStore } from '../store'
import { BarcodeDisplay } from '../components/BarcodeScanner'
import { barcodeForEntity, generateBarcodeString } from '../lib/barcode'
import type { SerialNumber, SerialStatus } from '../types'

const STATUS_COLORS: Record<SerialStatus, string> = {
  in_stock: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  reserved: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  delivered: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  returned: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  scrapped: 'bg-surface-2 text-fg-muted',
}

const STATUS_LABEL: Record<SerialStatus, string> = {
  in_stock: 'In Stock',
  reserved: 'Reserved',
  delivered: 'Delivered',
  returned: 'Returned',
  scrapped: 'Scrapped',
}

export function SerialsPage() {
  const { state, saveSerial, assignBarcode } = useStore()
  const [search, setSearch] = useState('')
  const [filterProductId, setFilterProductId] = useState('')
  const [filterStatus, setFilterStatus] = useState<SerialStatus | 'all'>('all')
  const [editSerial, setEditSerial] = useState<Partial<SerialNumber> | null>(null)
  const [viewSerial, setViewSerial] = useState<SerialNumber | null>(null)
  const [saveError, setSaveError] = useState('')

  const enriched = state.serials.map((sn) => ({
    sn,
    product: state.products.find((p) => p.id === sn.productId),
    location: state.locations.find((l) => l.id === sn.locationId),
    customer: state.customers.find((c) => c.id === sn.customerId),
    barcode: barcodeForEntity(state, 'serial', sn.id),
  }))

  const filtered = enriched.filter(({ sn, product }) => {
    if (filterProductId && sn.productId !== filterProductId) return false
    if (filterStatus !== 'all' && sn.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!sn.serial.toLowerCase().includes(q) && !product?.name.toLowerCase().includes(q)) return false
    }
    return true
  })

  const counts = {
    in_stock: state.serials.filter((s) => s.status === 'in_stock').length,
    reserved: state.serials.filter((s) => s.status === 'reserved').length,
    delivered: state.serials.filter((s) => s.status === 'delivered').length,
  }

  function openNew() {
    setEditSerial({
      serial: '',
      productId: state.products[0]?.id ?? '',
      status: 'in_stock',
      locationId: state.locations.find((l) => l.type === 'internal')?.id ?? '',
      warehouseId: state.warehouses[0]?.id ?? '',
    })
    setSaveError('')
  }

  async function handleSave() {
    if (!editSerial?.serial?.trim() || !editSerial.productId) {
      setSaveError('Serial number and product are required.')
      return
    }
    const result = saveSerial({
      id: (editSerial as SerialNumber).id,
      serial: editSerial.serial.trim(),
      productId: editSerial.productId!,
      variantId: editSerial.variantId,
      status: editSerial.status as SerialStatus ?? 'in_stock',
      locationId: editSerial.locationId!,
      warehouseId: editSerial.warehouseId!,
      receiptDocId: editSerial.receiptDocId,
      deliveryDocId: editSerial.deliveryDocId,
      customerId: editSerial.customerId,
    })
    if (typeof result === 'object' && 'error' in result) {
      setSaveError(result.error)
      return
    }
    // Auto-generate and assign barcode for new serial
    if (!(editSerial as SerialNumber).id) {
      const bc = generateBarcodeString('serial', result as string)
      assignBarcode('serial', result as string, bc)
    }
    setEditSerial(null)
    setSaveError('')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Serial Number Tracking</h1>
          <p className="text-sm text-fg-muted">Track individual units by unique serial number</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          <Plus size={16} /> New Serial
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'In Stock', value: counts.in_stock, color: 'text-emerald-600' },
          { label: 'Reserved', value: counts.reserved, color: 'text-violet-600' },
          { label: 'Delivered', value: counts.delivered, color: 'text-sky-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-line bg-surface p-4">
            <div className="text-xs text-fg-muted mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search serial or product…"
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
          onChange={(e) => setFilterStatus(e.target.value as SerialStatus | 'all')}
          className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
        >
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABEL) as SerialStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-2 text-xs text-fg-muted">
            <tr>
              <th className="px-4 py-3 text-left">Serial</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Barcode</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-fg-subtle">No serial numbers found.</td></tr>
            )}
            {filtered.map(({ sn, product, location, customer, barcode }) => (
              <tr key={sn.id} className="hover:bg-surface-2/40">
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-semibold text-fg">{sn.serial}</span>
                </td>
                <td className="px-4 py-3 text-fg">{product?.name ?? '—'}<span className="ml-1.5 text-xs text-fg-muted">{product?.sku}</span></td>
                <td className="px-4 py-3 text-fg-muted text-xs">{location?.name ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[sn.status]}`}>
                    {STATUS_LABEL[sn.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-fg-muted text-xs">{customer?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  {barcode ? <span className="font-mono text-xs text-fg-subtle">{barcode}</span> : <span className="text-xs text-fg-subtle">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setViewSerial(sn)}
                      className="rounded p-1 hover:bg-surface-2 text-xs text-fg-muted"
                    >
                      History
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditSerial({ ...sn }); setSaveError('') }}
                      className="rounded p-1 hover:bg-surface-2"
                    >
                      <Pencil size={13} className="text-fg-muted" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New/Edit modal */}
      {editSerial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-fg">
              {(editSerial as SerialNumber).id ? 'Edit Serial' : 'New Serial Number'}
            </h2>
            {saveError && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{saveError}</p>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Serial Number *</label>
                <input
                  value={editSerial.serial ?? ''}
                  onChange={(e) => setEditSerial((s) => ({ ...s!, serial: e.target.value }))}
                  placeholder="Unique serial number"
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Product *</label>
                <select
                  value={editSerial.productId ?? ''}
                  onChange={(e) => setEditSerial((s) => ({ ...s!, productId: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                >
                  {state.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">Location</label>
                  <select
                    value={editSerial.locationId ?? ''}
                    onChange={(e) => setEditSerial((s) => ({ ...s!, locationId: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                  >
                    {state.locations.filter((l) => l.type === 'internal').map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">Status</label>
                  <select
                    value={editSerial.status ?? 'in_stock'}
                    onChange={(e) => setEditSerial((s) => ({ ...s!, status: e.target.value as SerialStatus }))}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                  >
                    {(Object.keys(STATUS_LABEL) as SerialStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setEditSerial(null); setSaveError('') }} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleSave} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Movement history modal */}
      {viewSerial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-fg">Serial History — {viewSerial.serial}</h2>
              <button type="button" onClick={() => setViewSerial(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs">Close</button>
            </div>
            {viewSerial.history.length === 0 ? (
              <p className="text-sm text-fg-subtle">No movement history.</p>
            ) : (
              <div className="space-y-2">
                {viewSerial.history.map((m) => {
                  const from = state.locations.find((l) => l.id === m.fromLocationId)
                  const to = state.locations.find((l) => l.id === m.toLocationId)
                  return (
                    <div key={m.id} className="rounded-lg border border-line p-3">
                      <div className="flex items-center gap-2 text-xs text-fg-muted mb-1">
                        <span>{new Date(m.date).toLocaleString()}</span>
                        <span>·</span>
                        <span>{m.documentNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-fg">
                        <MapPin size={13} className="shrink-0 text-fg-muted" />
                        {from?.name ?? 'External'} → {to?.name ?? 'External'}
                      </div>
                      {m.note && <p className="mt-1 text-xs text-fg-muted">{m.note}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
