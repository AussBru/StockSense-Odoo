import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  Building2,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RotateCcw,
  Search,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { inputClass } from '../components/AuthFrame'
import { StatusBadge } from '../components/Badges'
import { exportToCsv } from '../lib/csv'
import {
  getIntelligenceMetrics,
  getProductUnitCost,
  totalInventoryValuation,
  totalOnHand,
} from '../lib/inventory'
import { useStore } from '../store'

type ReportType =
  | 'po'
  | 'so'
  | 'vendor'
  | 'customer'
  | 'valuation'
  | 'dead'
  | 'movement'
  | 'reorder'

export function ReportsPage() {
  const { state } = useStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const paramType = searchParams.get('type') || searchParams.get('tab')
  
  const resolveInitialReport = (): ReportType => {
    if (paramType === 'inventory' || paramType === 'movement') return 'movement'
    if (paramType === 'sales' || paramType === 'so') return 'so'
    if (paramType === 'purchasing' || paramType === 'po') return 'po'
    if (paramType === 'valuation') return 'valuation'
    if (paramType === 'dead') return 'dead'
    if (paramType === 'reorder') return 'reorder'
    if (paramType === 'vendor') return 'vendor'
    if (paramType === 'customer') return 'customer'
    return 'po'
  }

  const [activeReport, setActiveReport] = useState<ReportType>(resolveInitialReport)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (paramType) {
      if (paramType === 'inventory' || paramType === 'movement') setActiveReport('movement')
      else if (paramType === 'sales' || paramType === 'so') setActiveReport('so')
      else if (paramType === 'purchasing' || paramType === 'po') setActiveReport('po')
      else if (paramType === 'valuation') setActiveReport('valuation')
      else if (paramType === 'dead') setActiveReport('dead')
      else if (paramType === 'reorder') setActiveReport('reorder')
      else if (paramType === 'vendor') setActiveReport('vendor')
      else if (paramType === 'customer') setActiveReport('customer')
    }
  }, [paramType])

  const intMetrics = useMemo(() => getIntelligenceMetrics(state), [state])
  const globalValuation = useMemo(() => totalInventoryValuation(state), [state])

  // 1. PO Report Data
  const poData = useMemo(() => {
    const needle = q.toLowerCase()
    return state.purchaseOrders.filter((po) => {
      if (statusFilter !== 'all' && po.status !== statusFilter) return false
      if (startDate && po.orderDate < startDate) return false
      if (endDate && po.orderDate > endDate) return false
      const v = state.vendors.find((item) => item.id === po.vendorId)
      if (needle && !`${po.number} ${v?.companyName || ''}`.toLowerCase().includes(needle)) {
        return false
      }
      return true
    })
  }, [state.purchaseOrders, state.vendors, q, statusFilter, startDate, endDate])

  // 2. SO Report Data
  const soData = useMemo(() => {
    const needle = q.toLowerCase()
    return state.salesOrders.filter((so) => {
      if (statusFilter !== 'all' && so.status !== statusFilter) return false
      if (startDate && so.orderDate < startDate) return false
      if (endDate && so.orderDate > endDate) return false
      const c = state.customers.find((item) => item.id === so.customerId)
      if (needle && !`${so.number} ${c?.name || ''}`.toLowerCase().includes(needle)) {
        return false
      }
      return true
    })
  }, [state.salesOrders, state.customers, q, statusFilter, startDate, endDate])

  // 3. Vendor Report Data
  const vendorData = useMemo(() => {
    const needle = q.toLowerCase()
    return state.vendors.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (needle && !`${v.companyName} ${v.code} ${v.contactPerson}`.toLowerCase().includes(needle)) {
        return false
      }
      return true
    })
  }, [state.vendors, q, statusFilter])

  // 4. Customer Report Data
  const customerData = useMemo(() => {
    const needle = q.toLowerCase()
    return state.customers.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (needle && !`${c.name} ${c.code} ${c.email}`.toLowerCase().includes(needle)) {
        return false
      }
      return true
    })
  }, [state.customers, q, statusFilter])

  // 5. Valuation Report Data
  const valuationData = useMemo(() => {
    const needle = q.toLowerCase()
    return state.products
      .filter((p) => !needle || `${p.name} ${p.sku}`.toLowerCase().includes(needle))
      .map((p) => {
        const cat = state.categories.find((c) => c.id === p.categoryId)
        const onHand = totalOnHand(state, p.id)
        const unitCost = getProductUnitCost(p)
        const total = onHand * unitCost
        return { product: p, category: cat?.name || 'Uncategorized', onHand, unitCost, total }
      })
  }, [state, q])

  // 6. Dead Stock Report Data
  const deadStockData = useMemo(() => {
    const needle = q.toLowerCase()
    return intMetrics.deadStockProducts.filter(
      (p) => !needle || `${p.name} ${p.sku}`.toLowerCase().includes(needle),
    )
  }, [intMetrics.deadStockProducts, q])

  // 7. Stock Movement Report (Ledger)
  const movementData = useMemo(() => {
    const needle = q.toLowerCase()
    return state.ledger.filter((entry) => {
      if (startDate && entry.date.slice(0, 10) < startDate) return false
      if (endDate && entry.date.slice(0, 10) > endDate) return false
      const prod = state.products.find((p) => p.id === entry.productId)
      if (
        needle &&
        !`${entry.documentNumber} ${entry.type} ${prod?.name || ''} ${prod?.sku || ''} ${entry.note}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false
      }
      return true
    })
  }, [state.ledger, state.products, q, startDate, endDate])

  // 8. Reorder Report Data
  const reorderData = useMemo(() => {
    const needle = q.toLowerCase()
    return intMetrics.suggestions.filter(
      (s) =>
        !needle ||
        `${s.product.name} ${s.product.sku} ${s.primaryVendor?.companyName || ''}`
          .toLowerCase()
          .includes(needle),
    )
  }, [intMetrics.suggestions, q])

  function handleExportCsv() {
    switch (activeReport) {
      case 'po': {
        const headers = ['PO Number', 'Vendor', 'Order Date', 'Expected Date', 'Status', 'Subtotal', 'Tax', 'Total']
        const rows = poData.map((po) => {
          const v = state.vendors.find((item) => item.id === po.vendorId)
          return [po.number, v?.companyName || '', po.orderDate, po.expectedDeliveryDate, po.status, po.subtotal, po.tax, po.total]
        })
        exportToCsv('Purchase_Order_Report', headers, rows)
        break
      }
      case 'so': {
        const headers = ['SO Number', 'Customer', 'Order Date', 'Delivery Date', 'Status', 'Subtotal', 'Tax', 'Total']
        const rows = soData.map((so) => {
          const c = state.customers.find((item) => item.id === so.customerId)
          return [so.number, c?.name || '', so.orderDate, so.deliveryDate, so.status, so.subtotal, so.tax, so.total]
        })
        exportToCsv('Sales_Order_Report', headers, rows)
        break
      }
      case 'vendor': {
        const headers = ['Vendor Name', 'Code', 'Contact', 'Email', 'Lead Time (Days)', 'Payment Terms', 'Status']
        const rows = vendorData.map((v) => [v.companyName, v.code, v.contactPerson, v.email, v.leadTime, v.paymentTerms, v.status])
        exportToCsv('Vendor_Report', headers, rows)
        break
      }
      case 'customer': {
        const headers = ['Customer Name', 'Code', 'Email', 'Phone', 'Address', 'Status']
        const rows = customerData.map((c) => [c.name, c.code, c.email, c.phone, c.address, c.status])
        exportToCsv('Customer_Report', headers, rows)
        break
      }
      case 'valuation': {
        const headers = ['Product', 'SKU', 'Category', 'Units On Hand', 'Unit Cost ($)', 'Total Value ($)']
        const rows = valuationData.map((r) => [r.product.name, r.product.sku, r.category, r.onHand, r.unitCost, r.total])
        exportToCsv('Inventory_Valuation_Report', headers, rows)
        break
      }
      case 'dead': {
        const headers = ['Product', 'SKU', 'Units On Hand', 'Unit Cost ($)', 'Trapped Value ($)']
        const rows = deadStockData.map((p) => {
          const onHand = totalOnHand(state, p.id)
          const cost = getProductUnitCost(p)
          return [p.name, p.sku, onHand, cost, onHand * cost]
        })
        exportToCsv('Dead_Stock_Report', headers, rows)
        break
      }
      case 'movement': {
        const headers = ['Date', 'Document #', 'Type', 'Product', 'Qty Delta', 'Unit Cost', 'Notes']
        const rows = movementData.map((e) => {
          const p = state.products.find((item) => item.id === e.productId)
          return [e.date.slice(0, 16), e.documentNumber, e.type, p?.name || '', e.qty, e.unitCost || 0, e.note]
        })
        exportToCsv('Stock_Movement_Audit_Report', headers, rows)
        break
      }
      case 'reorder': {
        const headers = ['Product', 'SKU', 'Available Qty', 'Min Qty', 'Max Qty', 'Suggested Reorder Qty', 'Supplier', 'Est Cost']
        const rows = reorderData.map((r) => [
          r.product.name,
          r.product.sku,
          r.available,
          r.minQty,
          r.maxQty,
          r.suggestedQty,
          r.primaryVendor?.companyName || '',
          r.estimatedCost,
        ])
        exportToCsv('Reorder_Report', headers, rows)
        break
      }
    }
  }

  const reportsList: { key: ReportType; label: string; icon: any }[] = [
    { key: 'po', label: 'Purchase Orders', icon: FileText },
    { key: 'so', label: 'Sales Orders', icon: ShoppingCart },
    { key: 'vendor', label: 'Vendors', icon: Building2 },
    { key: 'customer', label: 'Customers', icon: Users },
    { key: 'valuation', label: 'Stock Valuation', icon: DollarSign },
    { key: 'dead', label: 'Dead Stock', icon: AlertTriangle },
    { key: 'movement', label: 'Stock Movement', icon: ArrowLeftRight },
    { key: 'reorder', label: 'Reorder Needs', icon: Boxes },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Enterprise Reports Suite</h1>
          <p className="text-sm text-fg-muted">
            Audit-ready reporting with multi-dimensional filtering, totals summation, and instant CSV export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg shadow-sm hover:bg-surface-2"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg shadow-sm hover:bg-surface-2"
          >
            <Printer size={15} />
            Print Report
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm">
        {reportsList.map((r) => {
          const Icon = r.icon
          const isActive = activeReport === r.key
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                setActiveReport(r.key)
                setStatusFilter('all')
              }}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-brand text-accent-fg shadow-sm'
                  : 'bg-transparent text-fg-soft hover:bg-surface-2 hover:text-fg'
              }`}
            >
              <Icon size={14} />
              <span>{r.label}</span>
            </button>
          )
        })}
      </div>

      {/* Filter Row */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-fg-subtle" size={16} />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search report records..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <input
          className={inputClass}
          type="date"
          placeholder="Start date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <input
          className={inputClass}
          type="date"
          placeholder="End date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {activeReport === 'po' && (
            <>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partial">Partially Received</option>
              <option value="received">Received</option>
              <option value="canceled">Cancelled</option>
            </>
          )}
          {activeReport === 'so' && (
            <>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="reserved">Reserved</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="canceled">Cancelled</option>
            </>
          )}
          {(activeReport === 'vendor' || activeReport === 'customer') && (
            <>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </>
          )}
        </select>
      </div>

      {/* Report Tables Container */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="overflow-x-auto">
          {/* 1. PURCHASE ORDER REPORT */}
          {activeReport === 'po' && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3.5">PO Number</th>
                  <th className="px-4 py-3.5">Vendor</th>
                  <th className="px-4 py-3.5">Order Date</th>
                  <th className="px-4 py-3.5">Expected Delivery</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Subtotal</th>
                  <th className="px-4 py-3.5 text-right">Tax</th>
                  <th className="px-4 py-3.5 text-right font-bold text-fg">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {poData.map((po) => {
                  const v = state.vendors.find((item) => item.id === po.vendorId)
                  return (
                    <tr key={po.id} className="hover:bg-surface-2/70">
                      <td className="px-4 py-3.5 font-semibold text-brand">{po.number}</td>
                      <td className="px-4 py-3.5 font-medium text-fg">{v?.companyName || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-fg-soft">{po.orderDate}</td>
                      <td className="px-4 py-3.5 text-xs text-fg-soft">{po.expectedDeliveryDate}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={po.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">${po.subtotal.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right">${po.tax.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-fg">${po.total.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2 border-line bg-surface-2/80 font-bold text-fg">
                <tr>
                  <td colSpan={5} className="px-4 py-3.5 text-right">
                    Report Totals ({poData.length} Orders):
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    ${poData.reduce((s, p) => s + p.subtotal, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    ${poData.reduce((s, p) => s + p.tax, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-right text-emerald-800">
                    ${poData.reduce((s, p) => s + p.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 2. SALES ORDER REPORT */}
          {activeReport === 'so' && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3.5">SO Number</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Order Date</th>
                  <th className="px-4 py-3.5">Delivery Date</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Subtotal</th>
                  <th className="px-4 py-3.5 text-right">Tax</th>
                  <th className="px-4 py-3.5 text-right font-bold text-fg">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {soData.map((so) => {
                  const c = state.customers.find((item) => item.id === so.customerId)
                  return (
                    <tr key={so.id} className="hover:bg-surface-2/70">
                      <td className="px-4 py-3.5 font-semibold text-brand">{so.number}</td>
                      <td className="px-4 py-3.5 font-medium text-fg">{c?.name || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-fg-soft">{so.orderDate}</td>
                      <td className="px-4 py-3.5 text-xs text-fg-soft">{so.deliveryDate}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={so.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">${so.subtotal.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right">${so.tax.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-fg">${so.total.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2 border-line bg-surface-2/80 font-bold text-fg">
                <tr>
                  <td colSpan={5} className="px-4 py-3.5 text-right">
                    Report Totals ({soData.length} Orders):
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    ${soData.reduce((s, o) => s + o.subtotal, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    ${soData.reduce((s, o) => s + o.tax, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-right text-emerald-800">
                    ${soData.reduce((s, o) => s + o.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 3. VENDOR REPORT */}
          {activeReport === 'vendor' && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3.5">Vendor Name</th>
                  <th className="px-4 py-3.5">Code</th>
                  <th className="px-4 py-3.5">Contact Person</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Lead Time</th>
                  <th className="px-4 py-3.5">Payment Terms</th>
                  <th className="px-4 py-3.5">Total POs</th>
                  <th className="px-4 py-3.5 text-right font-bold text-fg">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {vendorData.map((v) => {
                  const pos = state.purchaseOrders.filter((p) => p.vendorId === v.id)
                  const spend = pos
                    .filter((p) => p.status === 'received' || p.status === 'partial')
                    .reduce((sum, p) => sum + p.total, 0)
                  return (
                    <tr key={v.id} className="hover:bg-surface-2/70">
                      <td className="px-4 py-3.5 font-semibold text-fg">{v.companyName}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-fg-soft">{v.code}</td>
                      <td className="px-4 py-3.5 text-fg">{v.contactPerson || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-fg-soft">{v.email}</td>
                      <td className="px-4 py-3.5 font-medium">{v.leadTime} days</td>
                      <td className="px-4 py-3.5 text-xs text-fg-soft">{v.paymentTerms}</td>
                      <td className="px-4 py-3.5 font-medium">{pos.length}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-700">${spend.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* 4. CUSTOMER REPORT */}
          {activeReport === 'customer' && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3.5">Customer Name</th>
                  <th className="px-4 py-3.5">Code</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Phone</th>
                  <th className="px-4 py-3.5">Total Sales Orders</th>
                  <th className="px-4 py-3.5 text-right font-bold text-fg">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {customerData.map((c) => {
                  const orders = state.salesOrders.filter((s) => s.customerId === c.id)
                  const revenue = orders
                    .filter((s) => s.status === 'shipped' || s.status === 'delivered')
                    .reduce((sum, s) => sum + s.total, 0)
                  return (
                    <tr key={c.id} className="hover:bg-surface-2/70">
                      <td className="px-4 py-3.5 font-semibold text-fg">{c.name}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-fg-soft">{c.code}</td>
                      <td className="px-4 py-3.5 text-xs text-fg-soft">{c.email}</td>
                      <td className="px-4 py-3.5 text-xs text-fg-soft">{c.phone || '—'}</td>
                      <td className="px-4 py-3.5 font-medium">{orders.length}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-700">${revenue.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* 5. INVENTORY VALUATION REPORT */}
          {activeReport === 'valuation' && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">SKU</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5 text-right">Physical Units On Hand</th>
                  <th className="px-4 py-3.5 text-right">WAC Cost</th>
                  <th className="px-4 py-3.5 text-right font-bold text-fg">Total Asset Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {valuationData.map((r) => (
                  <tr key={r.product.id} className="hover:bg-surface-2/70">
                    <td className="px-4 py-3.5 font-semibold text-fg">{r.product.name}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-fg-muted">{r.product.sku}</td>
                    <td className="px-4 py-3.5 text-xs text-fg-soft">{r.category}</td>
                    <td className="px-4 py-3.5 text-right font-medium">{r.onHand}</td>
                    <td className="px-4 py-3.5 text-right text-fg">${r.unitCost.toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-700">${r.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-line bg-surface-2/80 font-bold text-fg">
                <tr>
                  <td colSpan={3} className="px-4 py-3.5 text-right">
                    Total Valuation Across All SKUs:
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {valuationData.reduce((s, r) => s + r.onHand, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right">—</td>
                  <td className="px-4 py-3.5 text-right text-emerald-800">
                    ${valuationData.reduce((s, r) => s + r.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 6. DEAD STOCK REPORT */}
          {activeReport === 'dead' && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3.5">Product Name</th>
                  <th className="px-4 py-3.5">SKU</th>
                  <th className="px-4 py-3.5 text-right">Units Sitting</th>
                  <th className="px-4 py-3.5 text-right">Unit Cost</th>
                  <th className="px-4 py-3.5 text-right font-bold text-rose-600">Trapped Capital ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {deadStockData.map((p) => {
                  const onHand = totalOnHand(state, p.id)
                  const cost = getProductUnitCost(p)
                  const total = onHand * cost
                  return (
                    <tr key={p.id} className="hover:bg-surface-2/70">
                      <td className="px-4 py-3.5 font-semibold text-fg">{p.name}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-fg-muted">{p.sku}</td>
                      <td className="px-4 py-3.5 text-right font-medium">{onHand}</td>
                      <td className="px-4 py-3.5 text-right text-fg">${cost.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-rose-600">${total.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2 border-line bg-surface-2/80 font-bold text-fg">
                <tr>
                  <td colSpan={2} className="px-4 py-3.5 text-right">
                    Total Dead Stock Capital Trapped:
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {deadStockData.reduce((s, p) => s + totalOnHand(state, p.id), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right">—</td>
                  <td className="px-4 py-3.5 text-right text-rose-700">
                    ${intMetrics.deadStockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 7. STOCK MOVEMENT REPORT */}
          {activeReport === 'movement' && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Document #</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5 text-right">Qty Moved</th>
                  <th className="px-4 py-3.5">Movement Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {movementData.map((e) => {
                  const p = state.products.find((prod) => prod.id === e.productId)
                  return (
                    <tr key={e.id} className="hover:bg-surface-2/70">
                      <td className="px-4 py-3.5 text-xs text-fg-soft">{new Date(e.date).toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-brand">
                        {e.documentNumber || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold uppercase text-fg">
                          {e.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-fg">
                        {p?.name || 'Product'} <span className="font-mono text-xs text-fg-subtle">({p?.sku})</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-fg">{e.qty}</td>
                      <td className="px-4 py-3.5 text-xs text-fg-soft">{e.note || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* 8. REORDER REPORT */}
          {activeReport === 'reorder' && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">SKU</th>
                  <th className="px-4 py-3.5 text-right">Free Available</th>
                  <th className="px-4 py-3.5 text-right">Min Buffer</th>
                  <th className="px-4 py-3.5 text-right font-bold text-brand">Suggested Order</th>
                  <th className="px-4 py-3.5">Primary Supplier</th>
                  <th className="px-4 py-3.5 text-right font-bold text-fg">Estimated Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {reorderData.map((r) => (
                  <tr key={r.product.id} className="hover:bg-surface-2/70">
                    <td className="px-4 py-3.5 font-semibold text-fg">{r.product.name}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-fg-muted">{r.product.sku}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-rose-600">{r.available}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-fg-soft">{r.minQty}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-brand">
                      +{r.suggestedQty} {r.product.uom}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-fg">{r.primaryVendor?.companyName || '—'}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-fg">${r.estimatedCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-line bg-surface-2/80 font-bold text-fg">
                <tr>
                  <td colSpan={4} className="px-4 py-3.5 text-right">
                    Total Estimated Procurement Cost:
                  </td>
                  <td className="px-4 py-3.5 text-right text-brand">
                    {reorderData.reduce((s, r) => s + r.suggestedQty, 0).toLocaleString()} units
                  </td>
                  <td className="px-4 py-3.5 text-right">—</td>
                  <td className="px-4 py-3.5 text-right text-emerald-800">
                    ${reorderData.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
