import { useState } from 'react'
import {
  PackagePlus, PackageMinus, ScanLine, Package2, Truck, ClipboardList,
  AlertTriangle, Clock, BarChart3, Layers, ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { warehouseDashboardMetrics, expiringLots, getLotStatus } from '../lib/inventory'

const ZONE_TYPE_COLORS: Record<string, string> = {
  receiving: 'bg-sky-500',
  quality_control: 'bg-amber-500',
  storage: 'bg-emerald-500',
  picking: 'bg-violet-500',
  packing: 'bg-indigo-500',
  shipping: 'bg-orange-500',
  returns: 'bg-rose-500',
  scrap: 'bg-fg-subtle',
}

export function WarehouseDashboardPage() {
  const { state } = useStore()
  const [selectedWh, setSelectedWh] = useState(state.warehouses[0]?.id ?? '')

  const metrics = warehouseDashboardMetrics(state, selectedWh)
  const expiring = expiringLots(state, 30).filter((e) => e.lot.warehouseId === selectedWh)

  const statCards = [
    { label: 'Inbound Today', value: metrics.inboundToday, icon: PackagePlus, link: '/receipts', color: 'text-sky-600' },
    { label: 'Outbound Today', value: metrics.outboundToday, icon: PackageMinus, link: '/deliveries', color: 'text-orange-600' },
    { label: 'Pending Receiving', value: metrics.pendingReceiving, icon: PackagePlus, link: '/receipts', color: 'text-fg' },
    { label: 'Pending Picking', value: metrics.pendingPicking, icon: ScanLine, link: '/picking', color: 'text-violet-600' },
    { label: 'Pending Packing', value: metrics.pendingPacking, icon: Package2, link: '/packing', color: 'text-indigo-600' },
    { label: 'Pending Shipping', value: metrics.pendingShipping, icon: Truck, link: '/shipping', color: 'text-amber-600' },
    { label: 'Active Counts', value: metrics.activeCycleCounts, icon: ClipboardList, link: '/cycle-counts', color: 'text-fg' },
    { label: 'Expiring Lots', value: metrics.expiringLotsCount, icon: AlertTriangle, link: '/lots', color: metrics.expiringLotsCount > 0 ? 'text-rose-600' : 'text-fg' },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Warehouse Dashboard</h1>
          <p className="text-sm text-fg-muted">Real-time operational overview</p>
        </div>
        <select
          value={selectedWh}
          onChange={(e) => setSelectedWh(e.target.value)}
          className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
        >
          {state.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, link, color }) => (
          <Link
            key={label}
            to={link}
            className="group rounded-xl border border-line bg-surface p-4 transition hover:border-accent hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <Icon size={16} className={`${color} opacity-80`} />
              <ArrowRight size={13} className="text-fg-subtle opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="mt-1 text-xs text-fg-muted">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Stock by Zone */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Layers size={16} className="text-fg-muted" />
            <h2 className="text-sm font-semibold text-fg">Stock by Zone</h2>
          </div>
          {metrics.stockByZone.length === 0 ? (
            <p className="text-sm text-fg-subtle">No zones configured.</p>
          ) : (
            <div className="space-y-3">
              {metrics.stockByZone.map(({ zone, qty }) => {
                const maxQty = Math.max(...metrics.stockByZone.map((s) => s.qty), 1)
                const pct = Math.round((qty / maxQty) * 100)
                return (
                  <div key={zone.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-fg">
                        <span className={`h-2 w-2 rounded-full ${ZONE_TYPE_COLORS[zone.type] ?? 'bg-fg-subtle'}`} />
                        {zone.name}
                      </span>
                      <span className="text-fg-muted">{qty} units</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-2">
                      <div
                        className={`h-2 rounded-full transition-all ${ZONE_TYPE_COLORS[zone.type] ?? 'bg-fg-subtle'}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Expiring Lots */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-fg-muted" />
              <h2 className="text-sm font-semibold text-fg">Expiring Lots</h2>
            </div>
            <Link to="/lots" className="text-xs text-accent hover:underline">View all</Link>
          </div>
          {expiring.length === 0 ? (
            <p className="text-sm text-fg-subtle">No lots expiring soon.</p>
          ) : (
            <div className="space-y-2">
              {expiring.slice(0, 6).map(({ lot, status }) => {
                const product = state.products.find((p) => p.id === lot.productId)
                const location = state.locations.find((l) => l.id === lot.locationId)
                const isExpired = status === 'expired'
                return (
                  <div key={lot.id} className={`flex items-center gap-3 rounded-lg border p-3 ${isExpired ? 'border-rose-200 bg-rose-50/50 dark:border-rose-500/20 dark:bg-rose-500/5' : 'border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5'}`}>
                    {isExpired ? <AlertTriangle size={14} className="shrink-0 text-rose-500" /> : <Clock size={14} className="shrink-0 text-amber-500" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-fg truncate">{product?.name ?? '?'}</div>
                      <div className="text-xs text-fg-muted">{lot.lotNumber} · {location?.name ?? '?'}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-semibold ${isExpired ? 'text-rose-600' : 'text-amber-600'}`}>
                        {isExpired ? 'Expired' : 'Exp. soon'}
                      </div>
                      <div className="text-xs text-fg-muted">{lot.expiryDate}</div>
                    </div>
                  </div>
                )
              })}
              {expiring.length > 6 && (
                <Link to="/lots" className="block text-center text-xs text-accent hover:underline">
                  +{expiring.length - 6} more
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent picking & packing activity */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent Picking */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine size={16} className="text-fg-muted" />
              <h2 className="text-sm font-semibold text-fg">Recent Picking</h2>
            </div>
            <Link to="/picking" className="text-xs text-accent hover:underline">View all</Link>
          </div>
          {state.pickingOrders.length === 0 ? (
            <p className="text-sm text-fg-subtle">No picking orders.</p>
          ) : (
            <div className="space-y-2">
              {state.pickingOrders
                .filter((p) => p.warehouseId === selectedWh)
                .slice(0, 4)
                .map((pick) => (
                  <div key={pick.id} className="flex items-center gap-3 rounded-lg border border-line p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-fg">{pick.number}</div>
                      <div className="text-xs text-fg-muted">{pick.lines.filter((l) => l.confirmed).length}/{pick.lines.length} confirmed</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pick.status === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : pick.status === 'in_progress' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' : 'bg-surface-2 text-fg-muted'}`}>
                      {pick.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Shipments */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-fg-muted" />
              <h2 className="text-sm font-semibold text-fg">Recent Shipments</h2>
            </div>
            <Link to="/shipping" className="text-xs text-accent hover:underline">View all</Link>
          </div>
          {state.shipments.length === 0 ? (
            <p className="text-sm text-fg-subtle">No shipments.</p>
          ) : (
            <div className="space-y-2">
              {state.shipments.slice(0, 4).map((sh) => (
                <div key={sh.id} className="flex items-center gap-3 rounded-lg border border-line p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-fg">{sh.number}</div>
                    <div className="text-xs text-fg-muted font-mono">{sh.trackingNumber} · {sh.carrier}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${sh.status === 'delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : sh.status === 'in_transit' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' : sh.status === 'failed' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                    {sh.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Capacity utilisation */}
      {metrics.zones.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-fg-muted" />
            <h2 className="text-sm font-semibold text-fg">Capacity Utilisation</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.locations
              .filter((l) => l.type === 'internal' && l.warehouseId === selectedWh)
              .map((loc) => {
                const ext = state.locationExtensions.find((e) => e.locationId === loc.id)
                if (!ext?.capacity) return null
                const onHand = state.quants.filter((q) => q.locationId === loc.id).reduce((s, q) => s + q.qty, 0)
                const pct = Math.min(100, Math.round((onHand / ext.capacity) * 100))
                return (
                  <div key={loc.id} className="rounded-lg border border-line p-3">
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="font-medium text-fg">{loc.name}</span>
                      <span className={`font-semibold ${pct >= 90 ? 'text-rose-600' : pct >= 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-2">
                      <div
                        className={`h-2 rounded-full transition-all ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-fg-muted">{onHand} / {ext.capacity} units</div>
                  </div>
                )
              }).filter(Boolean)}
          </div>
        </div>
      )}
    </div>
  )
}
