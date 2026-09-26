import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Clock,
  DollarSign,
  Flame,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { getIntelligenceMetrics, getProductUnitCost, totalOnHand } from '../lib/inventory'
import { useStore } from '../store'

export function IntelligencePage() {
  const { state } = useStore()
  const [activeTab, setActiveTab] = useState<'reorder' | 'dead' | 'fast' | 'slow'>('reorder')

  const metrics = useMemo(() => getIntelligenceMetrics(state), [state])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-fg">Inventory Intelligence</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-brand">
              <Sparkles size={12} /> AI Analytics
            </span>
          </div>
          <p className="text-sm text-fg-muted">
            Automated consumption analysis, safety stock calculations, aging analysis, and smart reorder triggers.
          </p>
        </div>
      </div>

      {/* Metrics Row 1: High Level Capital & Health */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Total Stock Valuation</span>
            <DollarSign className="text-brand" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">${metrics.totalInventoryValue.toLocaleString()}</div>
          <div className="mt-1 text-xs text-fg-muted">{metrics.totalUnits} physical units in stock</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Dead Stock Value</span>
            <AlertTriangle className="text-rose-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">${metrics.deadStockValue.toLocaleString()}</div>
          <div className="mt-1 text-xs text-fg-muted">{metrics.deadStockCount} SKUs without recent velocity</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Stock Turnover</span>
            <RefreshCw className="text-emerald-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{metrics.stockTurnover}x / year</div>
          <div className="mt-1 text-xs text-fg-muted">Annualized inventory velocity</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Avg Inventory Age</span>
            <Clock className="text-indigo-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">{metrics.averageInventoryAgeDays} days</div>
          <div className="mt-1 text-xs text-fg-muted">Weighted shelf life since receipt</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab('reorder')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'reorder'
              ? 'border-brand text-brand'
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          <ShoppingBag size={16} />
          <span>Smart Reorder Suggestions ({metrics.reorderSuggestionsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dead')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'dead'
              ? 'border-brand text-brand'
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          <TrendingDown size={16} className="text-rose-500" />
          <span>Dead Stock ({metrics.deadStockCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fast')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'fast'
              ? 'border-brand text-brand'
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          <Flame size={16} className="text-amber-500" />
          <span>Fast-Moving SKUs ({metrics.fastMovingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('slow')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'slow'
              ? 'border-brand text-brand'
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          <TrendingUp size={16} className="text-fg-muted" />
          <span>Slow-Moving SKUs ({metrics.slowMovingCount})</span>
        </button>
      </div>

      {/* TAB 1: Smart Reorder Suggestions */}
      {activeTab === 'reorder' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-fg">Actionable Reorder Recommendations</h2>
              <p className="text-xs text-fg-muted">
                Calculated dynamically based on: Available Qty (On Hand - Reserved), Min Qty, Daily Consumption Rate,
                and Supplier Lead Times.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                  <tr>
                    <th className="px-4 py-3.5">Product / SKU</th>
                    <th className="px-4 py-3.5 text-right">Available (Free)</th>
                    <th className="px-4 py-3.5 text-right">Min Qty</th>
                    <th className="px-4 py-3.5 text-right">Daily Usage</th>
                    <th className="px-4 py-3.5 text-right">Est. Stockout</th>
                    <th className="px-4 py-3.5">Supplier</th>
                    <th className="px-4 py-3.5 text-right font-bold text-brand">Suggested Qty</th>
                    <th className="px-4 py-3.5 text-right">Est. Cost</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {metrics.suggestions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-fg-subtle">
                        All products are currently well-stocked. No immediate reorders required!
                      </td>
                    </tr>
                  ) : (
                    metrics.suggestions.map((item) => (
                      <tr key={item.product.id} className="transition hover:bg-surface-2/70">
                        <td className="px-4 py-3.5">
                          <Link to={`/products/${item.product.id}`} className="font-semibold text-fg hover:underline">
                            {item.product.name}
                          </Link>
                          <div className="font-mono text-xs text-fg-subtle">{item.product.sku}</div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-rose-600">
                          {item.available}{' '}
                          <span className="text-[11px] font-normal text-fg-subtle">
                            (OH: {item.onHand}, Res: {item.reserved})
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-fg-soft">{item.minQty}</td>
                        <td className="px-4 py-3.5 text-right font-medium text-fg">
                          {item.avgDailyConsumption} / day
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-amber-600">
                          {item.estimatedStockoutDays !== null ? `${item.estimatedStockoutDays} days` : 'Immediate'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-fg-soft">
                          {item.primaryVendor ? (
                            <div>
                              <div className="font-medium text-fg">{item.primaryVendor.companyName}</div>
                              <div className="text-fg-subtle">{item.primaryVendor.leadTime} days lead time</div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-brand">
                          +{item.suggestedQty} {item.product.uom}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-fg">
                          ${item.estimatedCost.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            to={`/purchase-orders/new?vendorId=${item.primaryVendor?.id || ''}&productId=${
                              item.product.id
                            }&suggestedQty=${item.suggestedQty}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-accent-fg shadow-sm hover:bg-brand-dark"
                          >
                            <span>Create PO</span>
                            <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Dead Stock */}
      {activeTab === 'dead' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-fg">Dead Stock SKUs (Zero Velocity)</h2>
              <p className="text-xs text-fg-muted">
                Products currently sitting on shelves with no outbound demand in the past 60 days. Trapped working capital:
                <strong className="ml-1 text-rose-600">${metrics.deadStockValue.toLocaleString()}</strong>.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">SKU</th>
                  <th className="px-4 py-3.5 text-right">On Hand Units</th>
                  <th className="px-4 py-3.5 text-right">WAC Cost</th>
                  <th className="px-4 py-3.5 text-right">Trapped Capital</th>
                  <th className="px-4 py-3.5">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {metrics.deadStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-fg-subtle">
                      Great job! No dead stock identified across your catalog.
                    </td>
                  </tr>
                ) : (
                  metrics.deadStockProducts.map((p) => {
                    const onHand = totalOnHand(state, p.id)
                    const cost = getProductUnitCost(p)
                    const value = onHand * cost
                    return (
                      <tr key={p.id} className="transition hover:bg-surface-2/70">
                        <td className="px-4 py-3.5 font-semibold text-fg">
                          <Link to={`/products/${p.id}`} className="hover:underline">
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-fg-muted">{p.sku}</td>
                        <td className="px-4 py-3.5 text-right font-medium">{onHand}</td>
                        <td className="px-4 py-3.5 text-right text-fg-soft">${cost.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-rose-600">${value.toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-xs text-fg-soft">
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
                            Promote, Discount, or Return to Vendor
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Fast-Moving SKUs */}
      {activeTab === 'fast' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-fg">Fast-Moving Inventory (High Velocity)</h2>
              <p className="text-xs text-fg-muted">
                Top consumed and shipped items. Keep a close eye on safety stock to avoid unexpected stockouts.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">SKU</th>
                  <th className="px-4 py-3.5 text-right">Current On Hand</th>
                  <th className="px-4 py-3.5 text-right">Daily Consumption</th>
                  <th className="px-4 py-3.5">Velocity Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {metrics.fastMoving.map((item) => (
                  <tr key={item.product.id} className="transition hover:bg-surface-2/70">
                    <td className="px-4 py-3.5 font-semibold text-fg">
                      <Link to={`/products/${item.product.id}`} className="hover:underline">
                        {item.product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-fg-muted">{item.product.sku}</td>
                    <td className="px-4 py-3.5 text-right font-medium">{item.onHand}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-700">{item.velocity} units / day</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        <Flame size={12} /> High Demand
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Slow-Moving SKUs */}
      {activeTab === 'slow' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-fg">Slow-Moving SKUs</h2>
              <p className="text-xs text-fg-muted">
                Products with low turnover. Consider adjusting max stocking levels to minimize holding costs.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">SKU</th>
                  <th className="px-4 py-3.5 text-right">Current On Hand</th>
                  <th className="px-4 py-3.5 text-right">Daily Consumption</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {metrics.slowMoving.map((item) => (
                  <tr key={item.product.id} className="transition hover:bg-surface-2/70">
                    <td className="px-4 py-3.5 font-semibold text-fg">
                      <Link to={`/products/${item.product.id}`} className="hover:underline">
                        {item.product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-fg-muted">{item.product.sku}</td>
                    <td className="px-4 py-3.5 text-right font-medium">{item.onHand}</td>
                    <td className="px-4 py-3.5 text-right text-fg-soft">{item.velocity} units / day</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg-soft">
                        Low Turnover
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
