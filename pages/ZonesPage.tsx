import { useState } from 'react'
import { Plus, Pencil, Trash2, MapPin, ChevronRight, ChevronDown, Layers } from 'lucide-react'
import { useStore } from '../store'
import { locationCapacityPct } from '../lib/inventory'
import type { WarehouseZone, ZoneType, LocationExtension } from '../types'

const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  receiving: 'Receiving',
  quality_control: 'Quality Control',
  storage: 'Storage',
  picking: 'Picking',
  packing: 'Packing',
  shipping: 'Shipping',
  returns: 'Returns',
  scrap: 'Scrap',
}

const ZONE_TYPE_COLORS: Record<ZoneType, string> = {
  receiving: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  quality_control: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  storage: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  picking: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  packing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  shipping: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  returns: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  scrap: 'bg-surface-2 text-fg-muted',
}

export function ZonesPage() {
  const { state, saveZone, deleteZone, saveLocationExtension } = useStore()
  const [expandedWh, setExpandedWh] = useState<string | null>(state.warehouses[0]?.id ?? null)
  const [editZone, setEditZone] = useState<Partial<WarehouseZone> & { warehouseId: string } | null>(null)
  const [editLocExt, setEditLocExt] = useState<LocationExtension | null>(null)

  function extFor(locId: string) { return state.locationExtensions.find((e) => e.locationId === locId) }

  function handleSaveZone() {
    if (!editZone?.name || !editZone.warehouseId) return
    saveZone({
      id: (editZone as WarehouseZone).id,
      warehouseId: editZone.warehouseId,
      name: editZone.name,
      code: editZone.code ?? editZone.name.toUpperCase().replace(/\s+/g, '_'),
      type: (editZone.type ?? 'storage') as ZoneType,
      active: editZone.active ?? true,
      notes: editZone.notes ?? '',
    })
    setEditZone(null)
  }

  function handleSaveLocExt() {
    if (!editLocExt) return
    saveLocationExtension(editLocExt)
    setEditLocExt(null)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Warehouse Zones</h1>
          <p className="text-sm text-fg-muted">Organise your warehouse into zones and assign locations to them</p>
        </div>
      </div>

      {/* Warehouse hierarchy */}
      {state.warehouses.map((wh) => {
        const zones = state.warehouseZones.filter((z) => z.warehouseId === wh.id)
        const isExpanded = expandedWh === wh.id

        return (
          <div key={wh.id} className="rounded-xl border border-line bg-surface">
            {/* Warehouse header */}
            <button
              type="button"
              onClick={() => setExpandedWh(isExpanded ? null : wh.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
              {isExpanded ? <ChevronDown size={16} className="shrink-0 text-fg-muted" /> : <ChevronRight size={16} className="shrink-0 text-fg-muted" />}
              <Layers size={18} className="shrink-0 text-fg-muted" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-fg">{wh.name}</div>
                <div className="text-xs text-fg-muted">{wh.code} · {zones.length} zone{zones.length !== 1 ? 's' : ''} · {wh.address}</div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditZone({ warehouseId: wh.id, active: true }) }}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface-2"
              >
                <Plus size={13} /> Add Zone
              </button>
            </button>

            {isExpanded && (
              <div className="border-t border-line px-5 pb-5 pt-4 space-y-4">
                {zones.length === 0 && <p className="text-sm text-fg-subtle">No zones configured.</p>}
                {zones.map((zone) => {
                  const zoneLocs = state.locationExtensions
                    .filter((le) => le.zoneId === zone.id)
                    .map((le) => state.locations.find((l) => l.id === le.locationId))
                    .filter(Boolean)

                  return (
                    <div key={zone.id} className="rounded-xl border border-line">
                      {/* Zone header */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ZONE_TYPE_COLORS[zone.type]}`}>
                          {ZONE_TYPE_LABELS[zone.type]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-fg">{zone.name}</span>
                          <span className="ml-2 text-xs text-fg-muted font-mono">{zone.code}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setEditZone({ ...zone })} className="rounded p-1 hover:bg-surface-2">
                            <Pencil size={13} className="text-fg-muted" />
                          </button>
                          <button type="button" onClick={() => { if (confirm(`Delete zone "${zone.name}"?`)) deleteZone(zone.id) }}
                            className="rounded p-1 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                            <Trash2 size={13} className="text-rose-500" />
                          </button>
                        </div>
                      </div>

                      {/* Locations in zone */}
                      <div className="p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-fg-muted">Locations</span>
                        </div>
                        {zoneLocs.length === 0 && (
                          <p className="text-xs text-fg-subtle">No locations assigned to this zone.</p>
                        )}
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {zoneLocs.map((loc) => {
                            if (!loc) return null
                            const ext = extFor(loc.id)
                            const capPct = locationCapacityPct(state, loc.id)
                            const onHand = state.quants.filter((q) => q.locationId === loc.id).reduce((s, q) => s + q.qty, 0)
                            return (
                              <div key={loc.id} className="rounded-lg border border-line p-3 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <MapPin size={12} className="shrink-0 text-fg-muted" />
                                    <span className="text-sm font-medium text-fg">{loc.name}</span>
                                  </div>
                                  <button type="button" onClick={() => setEditLocExt(ext ?? { locationId: loc.id, zoneId: zone.id, active: true })}
                                    className="rounded p-0.5 hover:bg-surface-2">
                                    <Pencil size={11} className="text-fg-muted" />
                                  </button>
                                </div>
                                <div className="text-xs text-fg-muted font-mono">{loc.code}</div>
                                {ext?.binCode && <div className="text-xs text-fg-muted">Bin: {ext.binCode}</div>}
                                {ext?.capacity ? (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-fg-muted">
                                      <span>{onHand} / {ext.capacity} units</span>
                                      <span>{capPct}%</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-surface-2">
                                      <div
                                        className={`h-1.5 rounded-full ${capPct >= 90 ? 'bg-rose-500' : capPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${capPct}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-fg-muted">{onHand} units on hand</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {/* Assign unassigned locations */}
                        <div className="mt-2">
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              const locId = e.target.value
                              if (!locId) return
                              const existing = extFor(locId)
                              saveLocationExtension({ locationId: locId, zoneId: zone.id, active: true, capacity: existing?.capacity, binCode: existing?.binCode })
                              e.target.value = ''
                            }}
                            className="h-8 rounded-lg border border-line bg-surface px-2 text-xs focus:border-accent focus:outline-none"
                          >
                            <option value="">+ Assign location to zone…</option>
                            {state.locations
                              .filter((l) => l.type === 'internal' && l.warehouseId === wh.id && (!extFor(l.id) || extFor(l.id)?.zoneId !== zone.id))
                              .map((l) => <option key={l.id} value={l.id}>{l.name}</option>)
                            }
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Zone edit modal */}
      {editZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-fg">{(editZone as WarehouseZone).id ? 'Edit Zone' : 'New Zone'}</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Zone Name</label>
                <input value={editZone.name ?? ''} onChange={(e) => setEditZone((z) => ({ ...z!, name: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Code</label>
                <input value={editZone.code ?? ''} onChange={(e) => setEditZone((z) => ({ ...z!, code: e.target.value }))}
                  placeholder="Auto-generated if blank"
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Type</label>
                <select value={editZone.type ?? 'storage'} onChange={(e) => setEditZone((z) => ({ ...z!, type: e.target.value as ZoneType }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none">
                  {(Object.entries(ZONE_TYPE_LABELS) as [ZoneType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Notes</label>
                <input value={editZone.notes ?? ''} onChange={(e) => setEditZone((z) => ({ ...z!, notes: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditZone(null)} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleSaveZone} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Location extension edit modal */}
      {editLocExt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-fg">Location Settings</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Bin Code</label>
                <input value={editLocExt.binCode ?? ''} onChange={(e) => setEditLocExt((l) => ({ ...l!, binCode: e.target.value }))}
                  placeholder="e.g. A1-B2"
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Capacity (units)</label>
                <input type="number" value={editLocExt.capacity ?? ''} onChange={(e) => setEditLocExt((l) => ({ ...l!, capacity: Number(e.target.value) || undefined }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-fg">
                <input type="checkbox" checked={editLocExt.active} onChange={(e) => setEditLocExt((l) => ({ ...l!, active: e.target.checked }))} className="rounded" />
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditLocExt(null)} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleSaveLocExt} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
