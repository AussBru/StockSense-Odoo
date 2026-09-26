import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeftRight, Package, PackageMinus, PackagePlus, Truck } from 'lucide-react'
import { StatusBadge, TypeBadge } from '../components/Badges'
import { inputClass } from '../components/AuthFrame'
import { lowStockItems, matchesFilters, totalOnHand } from '../lib/inventory'
import { useStore } from '../store'
import type { DocStatus, DocType } from '../types'

const kpiCard = 'rounded-2xl border border-line bg-surface p-5 shadow-sm'

export function DashboardPage() {
  const { state } = useStore()
  const [type, setType] = useState<DocType | 'all'>('all')
  const [status, setStatus] = useState<DocStatus | 'all'>('all')
  const [warehouseId, setWarehouseId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [q, setQ] = useState('')

  const productsInStock = state.products.filter((p) => totalOnHand(state, p.id) > 0).length
  const lows = lowStockItems(state)
  const pendingReceipts = state.documents.filter((d) => d.type === 'receipt' && d.status !== 'done' && d.status !== 'canceled').length
  const pendingDeliveries = state.documents.filter((d) => d.type === 'delivery' && d.status !== 'done' && d.status !== 'canceled').length
  const scheduledTransfers = state.documents.filter((d) => d.type === 'internal' && (d.status === 'ready' || d.status === 'waiting' || d.status === 'draft')).length

  const rows = useMemo(
    () =>
      state.documents.filter((doc) =>
        matchesFilters(doc, state, { type, status, warehouseId, categoryId, q }),
      ),
    [state, type, status, warehouseId, categoryId, q],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Inventory Dashboard</h1>
        <p className="text-sm text-fg-muted">Live snapshot of stock, documents, and warehouse movement.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={<Package className="text-brand" size={18} />} label="Total Products in Stock" value={productsInStock} hint={`${state.products.length} SKUs`} />
        <Kpi icon={<AlertTriangle className="text-rose-500" size={18} />} label="Low / Out of Stock" value={lows.length} hint="Reorder alerts" />
        <Kpi icon={<PackagePlus className="text-indigo-500" size={18} />} label="Pending Receipts" value={pendingReceipts} hint="Inbound not done" />
        <Kpi icon={<Truck className="text-fuchsia-500" size={18} />} label="Pending Deliveries" value={pendingDeliveries} hint="Outbound not done" />
        <Kpi icon={<ArrowLeftRight className="text-cyan-600" size={18} />} label="Transfers Scheduled" value={scheduledTransfers} hint="Internal moves" />
      </div>

      {lows.length > 0 ? (
        <div className="rounded-2xl border border-$1-100 dark:border-$1-500/30 bg-rose-50 p-4">
          <div className="mb-2 text-sm font-semibold text-rose-800">Low stock alerts</div>
          <div className="flex flex-wrap gap-2">
            {lows.map((row) => (
              <Link
                key={row.product.id}
                to={`/products/${row.product.id}`}
                className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-$1-200 dark:ring-$1-500/30"
              >
                {row.product.sku} · {row.onHand} {row.product.uom} {row.out ? '(out)' : `(min ${row.min})`}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold">Dynamic filters</div>
        <div className="grid gap-3 md:grid-cols-5">
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as DocType | 'all')}>
            <option value="all">All document types</option>
            <option value="receipt">Receipts</option>
            <option value="delivery">Delivery</option>
            <option value="internal">Internal</option>
            <option value="adjustment">Adjustments</option>
          </select>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as DocStatus | 'all')}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="waiting">Waiting</option>
            <option value="ready">Ready</option>
            <option value="done">Done</option>
            <option value="canceled">Canceled</option>
          </select>
          <select className={inputClass} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">All warehouses</option>
            {state.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {state.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input className={inputClass} placeholder="SKU or reference search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((doc) => {
              const from = state.locations.find((l) => l.id === doc.sourceLocationId)
              const to = state.locations.find((l) => l.id === doc.destLocationId)
              const href =
                doc.type === 'receipt'
                  ? `/receipts/${doc.id}`
                  : doc.type === 'delivery'
                    ? `/deliveries/${doc.id}`
                    : doc.type === 'internal'
                      ? `/transfers/${doc.id}`
                      : `/adjustments/${doc.id}`
              return (
                <tr key={doc.id} className="border-t border-line-soft hover:bg-surface-2">
                  <td className="px-4 py-3 font-medium">
                    <Link className="text-brand hover:underline" to={href}>
                      {doc.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={doc.type} />
                  </td>
                  <td className="px-4 py-3 text-fg-soft">{from?.code ?? '—'}</td>
                  <td className="px-4 py-3 text-fg-soft">{to?.code ?? '—'}</td>
                  <td className="px-4 py-3">{doc.partnerName || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{doc.scheduledDate}</td>
                </tr>
              )
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-fg-subtle">
                  No operations match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <Quick to="/receipts/new" icon={<PackagePlus size={16} />} label="New receipt" />
        <Quick to="/deliveries/new" icon={<PackageMinus size={16} />} label="New delivery" />
        <Quick to="/transfers/new" icon={<ArrowLeftRight size={16} />} label="New transfer" />
        <Quick to="/adjustments/new" icon={<AlertTriangle size={16} />} label="Stock adjustment" />
      </div>
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: number
  hint: string
}) {
  return (
    <div className={kpiCard}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2">{icon}</div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm font-medium text-fg">{label}</div>
      <div className="text-xs text-fg-muted">{hint}</div>
    </div>
  )
}

function Quick({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-brand hover:text-brand"
    >
      {icon}
      {label}
    </Link>
  )
}
