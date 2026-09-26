import { useState } from 'react'
import { Plus, Truck, Package2, CheckCheck, AlertCircle } from 'lucide-react'
import { useStore } from '../store'
import type { Shipment, ShipmentStatus } from '../types'

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  shipped: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  in_transit: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
}

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  shipped: 'Shipped',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  failed: 'Failed Delivery',
}

const CARRIERS = ['FedEx', 'UPS', 'DHL', 'USPS', 'Amazon Logistics', 'Other']
const METHODS = ['Ground', 'Express', 'Overnight', 'Economy', 'Freight']

const NEXT_STATUS: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  pending: 'shipped',
  shipped: 'in_transit',
  in_transit: 'delivered',
}

export function ShippingPage() {
  const { state, saveShipment, advanceShipmentStatus } = useStore()
  const [filterStatus, setFilterStatus] = useState<ShipmentStatus | 'all'>('all')
  const [newShipment, setNewShipment] = useState<Partial<Shipment> | null>(null)
  const [error, setError] = useState('')

  const filtered = state.shipments.filter((s) => filterStatus === 'all' || s.status === filterStatus)

  const deliveryDocs = state.documents.filter((d) => d.type === 'delivery')

  function openNew() {
    setNewShipment({
      deliveryDocId: deliveryDocs[0]?.id ?? '',
      carrier: 'FedEx',
      trackingNumber: '',
      shippingMethod: 'Ground',
      status: 'pending',
      notes: '',
    })
    setError('')
  }

  function handleSave() {
    if (!newShipment?.deliveryDocId) { setError('Select a delivery order.'); return }
    if (!newShipment.trackingNumber?.trim()) { setError('Enter a tracking number.'); return }
    saveShipment({
      id: (newShipment as Shipment).id,
      deliveryDocId: newShipment.deliveryDocId!,
      carrier: newShipment.carrier ?? 'Other',
      trackingNumber: newShipment.trackingNumber!.trim(),
      shippingMethod: newShipment.shippingMethod ?? 'Ground',
      shippedDate: newShipment.shippedDate,
      estimatedDelivery: newShipment.estimatedDelivery,
      status: newShipment.status as ShipmentStatus ?? 'pending',
      notes: newShipment.notes ?? '',
    })
    setNewShipment(null)
    setError('')
  }

  function advance(id: string, next: ShipmentStatus) {
    const err = advanceShipmentStatus(id, next)
    if (err) setError(err)
  }

  function fail(id: string) {
    advanceShipmentStatus(id, 'failed')
  }

  function docLabel(id: string) {
    const doc = state.documents.find((d) => d.id === id)
    return doc ? `${doc.number} — ${doc.partnerName}` : id
  }

  const counts = {
    pending: state.shipments.filter((s) => s.status === 'pending').length,
    shipped: state.shipments.filter((s) => s.status === 'shipped').length,
    in_transit: state.shipments.filter((s) => s.status === 'in_transit').length,
    delivered: state.shipments.filter((s) => s.status === 'delivered').length,
    failed: state.shipments.filter((s) => s.status === 'failed').length,
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Shipping</h1>
          <p className="text-sm text-fg-muted">Manage carriers, tracking, and delivery status for outbound shipments</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          <Plus size={16} /> New Shipment
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(counts) as [ShipmentStatus, number][]).map(([status, count]) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
            className={`rounded-xl border px-4 py-2.5 text-center transition ${filterStatus === status ? 'border-accent bg-accent/5' : 'border-line bg-surface hover:bg-surface-2'}`}
          >
            <div className={`text-xl font-bold ${filterStatus === status ? 'text-fg' : 'text-fg-soft'}`}>{count}</div>
            <div className="text-xs text-fg-muted">{STATUS_LABEL[status]}</div>
          </button>
        ))}
      </div>

      {/* Shipments list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-line bg-surface p-8 text-center text-fg-subtle">No shipments found.</div>
        )}
        {filtered.map((shipment) => {
          const next = NEXT_STATUS[shipment.status]
          return (
            <div key={shipment.id} className="rounded-xl border border-line bg-surface">
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                <Truck size={18} className="shrink-0 text-fg-muted" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-semibold text-fg">{shipment.number}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[shipment.status]}`}>
                      {STATUS_LABEL[shipment.status]}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-fg-muted truncate">{docLabel(shipment.deliveryDocId)}</div>
                </div>
                <div className="hidden md:flex flex-col items-end text-xs text-fg-muted gap-0.5">
                  <span>{shipment.carrier} · {shipment.shippingMethod}</span>
                  <span className="font-mono">{shipment.trackingNumber}</span>
                </div>
                <div className="flex shrink-0 gap-2">
                  {next && (
                    <button type="button" onClick={() => advance(shipment.id, next)}
                      className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg">
                      <CheckCheck size={13} /> → {STATUS_LABEL[next]}
                    </button>
                  )}
                  {shipment.status !== 'delivered' && shipment.status !== 'failed' && (
                    <button type="button" onClick={() => fail(shipment.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10">
                      <AlertCircle size={13} /> Failed
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-line px-5 py-3 md:grid-cols-4">
                <div>
                  <div className="text-xs text-fg-muted">Carrier</div>
                  <div className="text-sm text-fg">{shipment.carrier}</div>
                </div>
                <div>
                  <div className="text-xs text-fg-muted">Method</div>
                  <div className="text-sm text-fg">{shipment.shippingMethod}</div>
                </div>
                <div>
                  <div className="text-xs text-fg-muted">Shipped</div>
                  <div className="text-sm text-fg">{shipment.shippedDate ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-fg-muted">Est. Delivery</div>
                  <div className="text-sm text-fg">{shipment.estimatedDelivery ?? '—'}</div>
                </div>
                {shipment.trackingNumber && (
                  <div className="col-span-2 md:col-span-4">
                    <div className="text-xs text-fg-muted">Tracking</div>
                    <div className="font-mono text-sm text-fg">{shipment.trackingNumber}</div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* New Shipment modal */}
      {newShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-fg">New Shipment</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-fg-muted">Delivery Order</label>
                <select value={newShipment.deliveryDocId ?? ''} onChange={(e) => setNewShipment((s) => ({ ...s!, deliveryDocId: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none">
                  {deliveryDocs.map((d) => <option key={d.id} value={d.id}>{d.number} — {d.partnerName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Carrier</label>
                <select value={newShipment.carrier ?? ''} onChange={(e) => setNewShipment((s) => ({ ...s!, carrier: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none">
                  {CARRIERS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Method</label>
                <select value={newShipment.shippingMethod ?? ''} onChange={(e) => setNewShipment((s) => ({ ...s!, shippingMethod: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none">
                  {METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-fg-muted">Tracking Number *</label>
                <input value={newShipment.trackingNumber ?? ''} onChange={(e) => setNewShipment((s) => ({ ...s!, trackingNumber: e.target.value }))}
                  placeholder="e.g. FX-9841023847"
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Ship Date</label>
                <input type="date" value={newShipment.shippedDate ?? ''} onChange={(e) => setNewShipment((s) => ({ ...s!, shippedDate: e.target.value || undefined }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Est. Delivery</label>
                <input type="date" value={newShipment.estimatedDelivery ?? ''} onChange={(e) => setNewShipment((s) => ({ ...s!, estimatedDelivery: e.target.value || undefined }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-fg-muted">Notes</label>
                <textarea value={newShipment.notes ?? ''} onChange={(e) => setNewShipment((s) => ({ ...s!, notes: e.target.value }))}
                  rows={2} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none resize-none" />
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setNewShipment(null); setError('') }} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleSave} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
