import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, DollarSign, Download, FileText, Layers, Package, Printer, Search } from 'lucide-react'
import { inputClass } from '../components/AuthFrame'
import { exportToCsv } from '../lib/csv'
import {
  getProductUnitCost,
  productValuation,
  qtyAt,
  qtyByWarehouse,
  totalInventoryValuation,
  totalOnHand,
} from '../lib/inventory'
import { useStore } from '../store'

export function ValuationPage() {
  const { state } = useStore()
  const [activeTab, setActiveTab] = useState<'product' | 'warehouse' | 'category'>('product')
  const [q, setQ] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const globalValuation = useMemo(() => totalInventoryValuation(state), [state])

  // 1. By Product
  const productRows = useMemo(() => {
    const needle = q.toLowerCase()
    return state.products
      .filter((p) => {
        if (categoryFilter && p.categoryId !== categoryFilter) return false
        if (needle && !`${p.name} ${p.sku}`.toLowerCase().includes(needle)) return false
        return true
      })
      .map((p) => {
        const cat = state.categories.find((c) => c.id === p.categoryId)
        const onHand = warehouseFilter
          ? qtyByWarehouse(state, p.id, warehouseFilter)
          : totalOnHand(state, p.id)
        const unitCost = getProductUnitCost(p)
        const totalValue = onHand * unitCost
        return {
          product: p,
          categoryName: cat?.name || 'Uncategorized',
          onHand,
          unitCost,
          totalValue,
        }
      })
  }, [state, q, categoryFilter, warehouseFilter])

  // 2. By Warehouse
  const warehouseRows = useMemo(() => {
    return state.warehouses.map((wh) => {
      let totalUnits = 0
      let totalVal = 0
      let skuCount = 0

      for (const p of state.products) {
        const qty = qtyByWarehouse(state, p.id, wh.id)
        if (qty > 0) {
          skuCount++
          totalUnits += qty
          totalVal += qty * getProductUnitCost(p)
        }
      }

      return {
        warehouse: wh,
        skuCount,
        totalUnits,
        totalValue: totalVal,
      }
    })
  }, [state])

  // 3. By Category
  const categoryRows = useMemo(() => {
    return state.categories.map((cat) => {
      const prods = state.products.filter((p) => p.categoryId === cat.id)
      let totalUnits = 0
      let totalVal = 0

      for (const p of prods) {
        const qty = totalOnHand(state, p.id)
        totalUnits += qty
        totalVal += qty * getProductUnitCost(p)
      }

      return {
        category: cat,
        skuCount: prods.length,
        totalUnits,
        totalValue: totalVal,
      }
    })
  }, [state])

  function handleExportCsv() {
    if (activeTab === 'product') {
      const headers = ['Product Name', 'SKU', 'Category', 'On Hand Units', 'WAC Unit Cost ($)', 'Total Valuation ($)']
      const rows = productRows.map((r) => [
        r.product.name,
        r.product.sku,
        r.categoryName,
        r.onHand,
        r.unitCost.toFixed(2),
        r.totalValue.toFixed(2),
      ])
      exportToCsv('Stock_Valuation_By_Product', headers, rows)
    } else if (activeTab === 'warehouse') {
      const headers = ['Warehouse Name', 'Code', 'Address', 'Active SKUs', 'Total Physical Units', 'Total Valuation ($)']
      const rows = warehouseRows.map((r) => [
        r.warehouse.name,
        r.warehouse.code,
        r.warehouse.address,
        r.skuCount,
        r.totalUnits,
        r.totalValue.toFixed(2),
      ])
      exportToCsv('Stock_Valuation_By_Warehouse', headers, rows)
    } else {
      const headers = ['Category Name', 'Total SKUs', 'Total Physical Units', 'Total Valuation ($)']
      const rows = categoryRows.map((r) => [
        r.category.name,
        r.skuCount,
        r.totalUnits,
        r.totalValue.toFixed(2),
      ])
      exportToCsv('Stock_Valuation_By_Category', headers, rows)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Inventory Valuation</h1>
          <p className="text-sm text-muted">
            Asset accounting based on Weighted Average Cost (WAC). Global, warehouse, and category breakdowns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Printer size={15} />
            Print
          </button>
        </div>
      </div>

      {/* Global Valuation KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total Stock Valuation</span>
            <DollarSign className="text-emerald-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">
            ${globalValuation.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-500">Total inventory asset value (WAC)</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total Quantity on Hand</span>
            <Package className="text-brand" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{globalValuation.totalUnits.toLocaleString()} units</div>
          <div className="mt-1 text-xs text-slate-500">Across {state.warehouses.length} storage facilities</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Avg Unit Valuation</span>
            <Layers className="text-indigo-600" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800">
            $
            {globalValuation.totalUnits > 0
              ? (globalValuation.totalValue / globalValuation.totalUnits).toFixed(2)
              : '0.00'}
          </div>
          <div className="mt-1 text-xs text-slate-500">Blended cost per physical unit</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('product')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'product'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package size={16} />
          <span>By Product / SKU ({productRows.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('warehouse')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'warehouse'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 size={16} />
          <span>By Warehouse ({warehouseRows.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('category')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'category'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={16} />
          <span>By Category ({categoryRows.length})</span>
        </button>
      </div>

      {/* TAB 1: By Product */}
      {activeTab === 'product' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input
                className={`${inputClass} pl-9`}
                placeholder="Search SKU or product..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <select className={inputClass} value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
              <option value="">All Warehouses</option>
              {state.warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>

            <select className={inputClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {state.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3.5">Product Name</th>
                    <th className="px-4 py-3.5">SKU</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5 text-right">On Hand Units</th>
                    <th className="px-4 py-3.5 text-right">WAC Unit Cost ($)</th>
                    <th className="px-4 py-3.5 text-right font-bold text-slate-900">Total Valuation ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productRows.map((r) => (
                    <tr key={r.product.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        <Link to={`/products/${r.product.id}`} className="hover:underline">
                          {r.product.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{r.product.sku}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{r.categoryName}</td>
                      <td className="px-4 py-3.5 text-right font-medium">{r.onHand}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700">${r.unitCost.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                        ${r.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold text-slate-800">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right">
                      Totals:
                    </td>
                    <td className="px-4 py-3 text-right">
                      {productRows.reduce((s, r) => s + r.onHand, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">—</td>
                    <td className="px-4 py-3 text-right text-emerald-800">
                      $
                      {productRows
                        .reduce((s, r) => s + r.totalValue, 0)
                        .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: By Warehouse */}
      {activeTab === 'warehouse' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Warehouse</th>
                <th className="px-4 py-3.5">Code</th>
                <th className="px-4 py-3.5">Address</th>
                <th className="px-4 py-3.5 text-right">Stocked SKUs</th>
                <th className="px-4 py-3.5 text-right">Total Units</th>
                <th className="px-4 py-3.5 text-right font-bold text-slate-900">Total Valuation ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {warehouseRows.map((r) => (
                <tr key={r.warehouse.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{r.warehouse.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{r.warehouse.code}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{r.warehouse.address || '—'}</td>
                  <td className="px-4 py-3.5 text-right font-medium">{r.skuCount} SKUs</td>
                  <td className="px-4 py-3.5 text-right font-medium">{r.totalUnits.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                    ${r.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold text-slate-800">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right">
                  Total Valuation Across Warehouses:
                </td>
                <td className="px-4 py-3 text-right">
                  {warehouseRows.reduce((s, r) => s + r.totalUnits, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-emerald-800">
                  $
                  {warehouseRows
                    .reduce((s, r) => s + r.totalValue, 0)
                    .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* TAB 3: By Category */}
      {activeTab === 'category' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Product Category</th>
                <th className="px-4 py-3.5 text-right">Total Catalog SKUs</th>
                <th className="px-4 py-3.5 text-right">Units on Hand</th>
                <th className="px-4 py-3.5 text-right font-bold text-slate-900">Total Asset Value ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryRows.map((r) => (
                <tr key={r.category.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{r.category.name}</td>
                  <td className="px-4 py-3.5 text-right font-medium">{r.skuCount} SKUs</td>
                  <td className="px-4 py-3.5 text-right font-medium">{r.totalUnits.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                    ${r.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold text-slate-800">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right">
                  Total Category Valuation:
                </td>
                <td className="px-4 py-3 text-right">
                  {categoryRows.reduce((s, r) => s + r.totalUnits, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-emerald-800">
                  $
                  {categoryRows
                    .reduce((s, r) => s + r.totalValue, 0)
                    .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
