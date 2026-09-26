import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowLeftRight,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  Percent,
  Printer,
  RotateCcw,
  Save,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Warehouse as WarehouseIcon,
  X,
} from 'lucide-react'
import { inputClass } from '../components/AuthFrame'
import { StatusBadge } from '../components/Badges'
import { exportToCsv, exportToJson, triggerPrint } from '../lib/export'
import {
  getIntelligenceMetrics,
  getProductUnitCost,
  totalInventoryValuation,
  totalOnHand,
} from '../lib/inventory'
import { formatDate, formatMoney } from '../lib/utils'
import { useStore } from '../store'
import type { DocType, PurchaseOrderStatus, SalesOrderStatus } from '../types'

// All 27 Reports
export type ReportKey =
  // Inventory (11)
  | 'current_inventory'
  | 'inventory_by_warehouse'
  | 'inventory_by_location'
  | 'inventory_valuation'
  | 'stock_movement'
  | 'stock_aging'
  | 'dead_stock'
  | 'slow_moving'
  | 'fast_moving'
  | 'stock_turnover'
  | 'stock_variance'
  // Purchasing (5)
  | 'purchase_orders'
  | 'vendor_performance'
  | 'purchase_spend'
  | 'overdue_po'
  | 'purchase_receipts'
  // Sales (6)
  | 'sales_orders'
  | 'customer_sales'
  | 'product_sales'
  | 'fulfillment'
  | 'backorders'
  | 'returns_analysis'
  // Warehouse (5)
  | 'picking_performance'
  | 'receiving_performance'
  | 'packing_performance'
  | 'cycle_counts'
  | 'warehouse_utilization'

export type ReportCategory = 'inventory' | 'purchasing' | 'sales' | 'warehouse'

interface ReportMeta {
  key: ReportKey
  title: string
  category: ReportCategory
  description: string
  icon: any
}

const REPORT_DEFINITIONS: ReportMeta[] = [
  // Inventory
  { key: 'current_inventory', title: 'Current Stock On Hand', category: 'inventory', description: 'Real-time stock on hand, allocated, and free available quantities across warehouses.', icon: Boxes },
  { key: 'inventory_by_warehouse', title: 'Inventory by Warehouse', category: 'inventory', description: 'Stock distribution, SKU depth, and total valuation aggregated by facility.', icon: WarehouseIcon },
  { key: 'inventory_by_location', title: 'Inventory by Location / Bin', category: 'inventory', description: 'Physical bin-level quant breakdown across internal racks and picking zones.', icon: Layers },
  { key: 'inventory_valuation', title: 'Inventory Valuation', category: 'inventory', description: 'Comprehensive stock ledger value calculation based on Weighted Average Cost.', icon: DollarSign },
  { key: 'stock_movement', title: 'Stock Movement Audit', category: 'inventory', description: 'Full chronological audit trail of all receipts, deliveries, and adjustments.', icon: ArrowLeftRight },
  { key: 'stock_aging', title: 'Stock Aging Analysis', category: 'inventory', description: 'Product aging buckets (<30d, 31-60d, 61-90d, 90d+) to detect stagnant capital.', icon: Clock },
  { key: 'dead_stock', title: 'Dead Stock Report', category: 'inventory', description: 'Identifies inventory lines with zero outbound movement over the past 90+ days.', icon: AlertTriangle },
  { key: 'slow_moving', title: 'Slow Moving Items', category: 'inventory', description: 'Products with low velocity and turnover ratio below 1.0 per cycle.', icon: TrendingDown },
  { key: 'fast_moving', title: 'Fast Moving Items (Runners)', category: 'inventory', description: 'High-velocity items with the highest sales demand and rapid replenishment needs.', icon: TrendingUp },
  { key: 'stock_turnover', title: 'Stock Turnover Ratio', category: 'inventory', description: 'Inventory velocity metric (Cost of Goods Sold / Average Inventory Value).', icon: Percent },
  { key: 'stock_variance', title: 'Stock Variance & Discrepancies', category: 'inventory', description: 'Cycle count discrepancies comparing theoretical system balance vs physical count.', icon: SlidersHorizontal },

  // Purchasing
  { key: 'purchase_orders', title: 'Purchase Orders Summary', category: 'purchasing', description: 'Listing of all procurement orders with order dates, totals, and fulfillment status.', icon: FileText },
  { key: 'vendor_performance', title: 'Vendor Scorecard & Performance', category: 'purchasing', description: 'Fulfillment accuracy, lead time adherence, and order completion metrics by vendor.', icon: Building2 },
  { key: 'purchase_spend', title: 'Purchase Spend Analysis', category: 'purchasing', description: 'Aggregated procurement expenditures by supplier, category, and date period.', icon: DollarSign },
  { key: 'overdue_po', title: 'Overdue Purchase Orders', category: 'purchasing', description: 'POs exceeding their promised vendor delivery dates requiring immediate expedite.', icon: AlertTriangle },
  { key: 'purchase_receipts', title: 'Purchase Receipts Log', category: 'purchasing', description: 'Detailed warehouse receiving dock transactions against open purchase orders.', icon: PackagePlus },

  // Sales
  { key: 'sales_orders', title: 'Sales Orders Master Report', category: 'sales', description: 'Customer orders across lifecycle: Draft, Confirmed, Reserved, and Shipped.', icon: ShoppingBag },
  { key: 'customer_sales', title: 'Customer Sales Summary', category: 'sales', description: 'Total revenue, order count, and gross order values grouped by client account.', icon: Users },
  { key: 'product_sales', title: 'Product Sales & Margin', category: 'sales', description: 'Units sold, gross sales revenue, cost of goods, and estimated margin per SKU.', icon: FileSpreadsheet },
  { key: 'fulfillment', title: 'Order Fulfillment & OTIF Rate', category: 'sales', description: 'Line fulfillment rate, dispatched orders, and on-time in-full performance.', icon: PackageCheck },
  { key: 'backorders', title: 'Backorders & Stock Shortages', category: 'sales', description: 'Customer orders currently waiting on inbound inventory replenishment.', icon: Clock },
  { key: 'returns_analysis', title: 'Returns & RMA Analysis', category: 'sales', description: 'Customer return reasons, inspection dispositions, and refund values.', icon: RotateCcw },

  // Warehouse
  { key: 'picking_performance', title: 'Picking Performance', category: 'warehouse', description: 'Warehouse wave and batch picking orders, completion times, and picker stats.', icon: PackageMinus },
  { key: 'receiving_performance', title: 'Receiving Dock Performance', category: 'warehouse', description: 'Inbound dock turnaround, putaway efficiency, and receipt discrepancies.', icon: PackagePlus },
  { key: 'packing_performance', title: 'Packing & Cartonizing', category: 'warehouse', description: 'Package carton counts, dispatch weights, and shipping container utilization.', icon: Package },
  { key: 'cycle_counts', title: 'Cycle Count Audit Report', category: 'warehouse', description: 'Audit history of scheduled cycle counts, blind verifications, and adjustments.', icon: ShieldCheck },
  { key: 'warehouse_utilization', title: 'Warehouse Capacity Utilization', category: 'warehouse', description: 'Storage density, zone capacity utilization, and available pallet locations.', icon: WarehouseIcon },
]

interface SavedFilterPreset {
  id: string
  name: string
  reportKey: ReportKey
  filters: {
    q: string
    startDate: string
    endDate: string
    warehouseId: string
    locationId: string
    categoryId: string
    productId: string
    vendorId: string
    customerId: string
    status: string
    sortBy: string
    sortOrder: 'asc' | 'desc'
    groupBy: string
  }
}

export function ReportsPage() {
  const { state } = useStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialCat = (searchParams.get('category') as ReportCategory) || 'inventory'
  const initialType = searchParams.get('type') || searchParams.get('tab')

  const [activeCategory, setActiveCategory] = useState<ReportCategory>(initialCat)
  const [activeReportKey, setActiveReportKey] = useState<ReportKey>(() => {
    if (initialType) {
      const found = REPORT_DEFINITIONS.find((r) => r.key === initialType)
      if (found) return found.key
      if (initialType === 'inventory' || initialType === 'movement') return 'stock_movement'
      if (initialType === 'sales' || initialType === 'so') return 'sales_orders'
      if (initialType === 'purchasing' || initialType === 'po') return 'purchase_orders'
      if (initialType === 'valuation') return 'inventory_valuation'
      if (initialType === 'dead') return 'dead_stock'
      if (initialType === 'vendor') return 'vendor_performance'
      if (initialType === 'customer') return 'customer_sales'
    }
    return 'current_inventory'
  })

  // Builder Filters
  const [q, setQ] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [warehouseId, setWarehouseId] = useState('all')
  const [locationId, setLocationId] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [productId, setProductId] = useState('all')
  const [vendorId, setVendorId] = useState('all')
  const [customerId, setCustomerId] = useState('all')
  const [status, setStatus] = useState('all')
  const [sortBy, setSortBy] = useState('default')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [groupBy, setGroupBy] = useState<'none' | 'warehouse' | 'category' | 'status'>('none')

  // Saved Filters
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>(() => {
    try {
      const raw = localStorage.getItem('stocksense_saved_report_presets')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [newPresetName, setNewPresetName] = useState('')
  const [showSavePresetModal, setShowSavePresetModal] = useState(false)

  // Sync category when activeReportKey changes
  useEffect(() => {
    const meta = REPORT_DEFINITIONS.find((r) => r.key === activeReportKey)
    if (meta && meta.category !== activeCategory) {
      setActiveCategory(meta.category)
    }
  }, [activeReportKey])

  // Sync URL params
  useEffect(() => {
    if (initialType) {
      const found = REPORT_DEFINITIONS.find((r) => r.key === initialType)
      if (found) {
        setActiveReportKey(found.key)
        setActiveCategory(found.category)
      }
    }
  }, [initialType])

  const intMetrics = useMemo(() => getIntelligenceMetrics(state), [state])

  // Reset filters helper
  const handleResetFilters = () => {
    setQ('')
    setStartDate('')
    setEndDate('')
    setWarehouseId('all')
    setLocationId('all')
    setCategoryId('all')
    setProductId('all')
    setVendorId('all')
    setCustomerId('all')
    setStatus('all')
    setSortBy('default')
    setSortOrder('asc')
    setGroupBy('none')
  }

  // Save current preset
  const handleSavePreset = () => {
    if (!newPresetName.trim()) return
    const newPreset: SavedFilterPreset = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      reportKey: activeReportKey,
      filters: {
        q,
        startDate,
        endDate,
        warehouseId,
        locationId,
        categoryId,
        productId,
        vendorId,
        customerId,
        status,
        sortBy,
        sortOrder,
        groupBy,
      },
    }
    const updated = [newPreset, ...savedPresets]
    setSavedPresets(updated)
    try {
      localStorage.setItem('stocksense_saved_report_presets', JSON.stringify(updated))
    } catch {}
    setNewPresetName('')
    setShowSavePresetModal(false)
  }

  const handleApplyPreset = (preset: SavedFilterPreset) => {
    setActiveReportKey(preset.reportKey)
    setQ(preset.filters.q)
    setStartDate(preset.filters.startDate)
    setEndDate(preset.filters.endDate)
    setWarehouseId(preset.filters.warehouseId)
    setLocationId(preset.filters.locationId)
    setCategoryId(preset.filters.categoryId)
    setProductId(preset.filters.productId)
    setVendorId(preset.filters.vendorId)
    setCustomerId(preset.filters.customerId)
    setStatus(preset.filters.status)
    setSortBy(preset.filters.sortBy)
    setSortOrder(preset.filters.sortOrder)
    setGroupBy((preset.filters.groupBy as any) || 'none')
  }

  const handleDeletePreset = (id: string) => {
    const updated = savedPresets.filter((p) => p.id !== id)
    setSavedPresets(updated)
    try {
      localStorage.setItem('stocksense_saved_report_presets', JSON.stringify(updated))
    } catch {}
  }

  // Active meta
  const currentReportMeta = useMemo(
    () => REPORT_DEFINITIONS.find((r) => r.key === activeReportKey) || REPORT_DEFINITIONS[0],
    [activeReportKey],
  )

  // Current report items computed dynamically
  const reportData = useMemo(() => {
    const needle = q.toLowerCase()

    switch (activeReportKey) {
      // 1. Current Inventory
      case 'current_inventory': {
        return state.products
          .filter((p) => {
            if (categoryId !== 'all' && p.categoryId !== categoryId) return false
            if (productId !== 'all' && p.id !== productId) return false
            if (needle && !`${p.name} ${p.sku} ${p.description || ''}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((p) => {
            const onHand = totalOnHand(state, p.id)
            const reserved = state.reservations
              ?.filter((r) => r.productId === p.id)
              .reduce((sum, r) => sum + r.qty, 0) || 0
            const available = Math.max(0, onHand - reserved)
            const cat = state.categories.find((c) => c.id === p.categoryId)
            const unitCost = getProductUnitCost(p)
            const rule = state.reorderRules.find((r) => r.productId === p.id)
            const minQty = rule?.minQty ?? 10
            const maxQty = rule?.maxQty ?? 50
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              category: cat?.name || 'Uncategorized',
              onHand,
              reserved,
              available,
              minQty,
              maxQty,
              unitCost,
              totalValue: onHand * unitCost,
              status: onHand <= 0 ? 'Out of Stock' : onHand < minQty ? 'Low Stock' : 'Healthy',
            }
          })
      }

      // 2. Inventory by Warehouse
      case 'inventory_by_warehouse': {
        return state.warehouses.map((wh) => {
          const whLocations = state.locations.filter((l) => l.warehouseId === wh.id).map((l) => l.id)
          const whQuants = state.quants.filter((q) => whLocations.includes(q.locationId))
          const totalUnits = whQuants.reduce((sum, q) => sum + q.qty, 0)
          const uniqueProducts = new Set(whQuants.map((q) => q.productId)).size
          const totalVal = whQuants.reduce((sum, q) => {
            const prod = state.products.find((p) => p.id === q.productId)
            return sum + q.qty * (prod ? getProductUnitCost(prod) : 0)
          }, 0)
          return {
            id: wh.id,
            name: wh.name,
            code: wh.code,
            address: wh.address,
            totalProducts: uniqueProducts,
            totalUnits,
            totalValue: totalVal,
            status: 'Active',
          }
        }).filter((item) => {
          if (warehouseId !== 'all' && item.id !== warehouseId) return false
          if (needle && !`${item.name} ${item.code}`.toLowerCase().includes(needle)) return false
          return true
        })
      }

      // 3. Inventory by Location / Bin
      case 'inventory_by_location': {
        return state.quants
          .filter((quant) => {
            const loc = state.locations.find((l) => l.id === quant.locationId)
            const prod = state.products.find((p) => p.id === quant.productId)
            if (warehouseId !== 'all' && loc?.warehouseId !== warehouseId) return false
            if (locationId !== 'all' && quant.locationId !== locationId) return false
            if (productId !== 'all' && quant.productId !== productId) return false
            if (needle && !`${prod?.name || ''} ${prod?.sku || ''} ${loc?.name || ''}`.toLowerCase().includes(needle)) {
              return false
            }
            return true
          })
          .map((quant) => {
            const loc = state.locations.find((l) => l.id === quant.locationId)
            const wh = state.warehouses.find((w) => w.id === loc?.warehouseId)
            const prod = state.products.find((p) => p.id === quant.productId)
            const unitCost = prod ? getProductUnitCost(prod) : 0
            return {
              id: quant.id,
              locationName: loc?.name || 'Unknown',
              locationType: loc?.type || 'internal',
              warehouseName: wh?.name || 'Unknown',
              productName: prod?.name || 'Unknown',
              sku: prod?.sku || 'Unknown',
              qty: quant.qty,
              unitCost,
              totalValue: quant.qty * unitCost,
              status: quant.qty > 0 ? 'Occupied' : 'Empty',
            }
          })
      }

      // 4. Inventory Valuation
      case 'inventory_valuation': {
        return state.products
          .filter((p) => {
            if (categoryId !== 'all' && p.categoryId !== categoryId) return false
            if (productId !== 'all' && p.id !== productId) return false
            if (needle && !`${p.name} ${p.sku}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((p) => {
            const cat = state.categories.find((c) => c.id === p.categoryId)
            const onHand = totalOnHand(state, p.id)
            const unitCost = getProductUnitCost(p)
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              category: cat?.name || 'Uncategorized',
              onHand,
              unitCost,
              totalValue: onHand * unitCost,
              status: onHand > 0 ? 'Active' : 'Depleted',
            }
          })
      }

      // 5. Stock Movement Audit
      case 'stock_movement': {
        return state.ledger
          .filter((entry) => {
            if (startDate && entry.date.slice(0, 10) < startDate) return false
            if (endDate && entry.date.slice(0, 10) > endDate) return false
            if (productId !== 'all' && entry.productId !== productId) return false
            const prod = state.products.find((p) => p.id === entry.productId)
            if (
              needle &&
              !`${entry.documentNumber || ''} ${entry.type} ${prod?.name || ''} ${prod?.sku || ''} ${entry.note || ''}`
                .toLowerCase()
                .includes(needle)
            ) {
              return false
            }
            return true
          })
          .map((entry) => {
            const prod = state.products.find((p) => p.id === entry.productId)
            const fromLoc = state.locations.find((l) => l.id === entry.fromLocationId)
            const toLoc = state.locations.find((l) => l.id === entry.toLocationId)
            return {
              id: entry.id,
              date: entry.date,
              documentNumber: entry.documentNumber || '—',
              type: entry.type,
              productName: prod?.name || 'Unknown',
              sku: prod?.sku || '—',
              qty: entry.qty,
              fromLocation: fromLoc?.name || 'Source',
              toLocation: toLoc?.name || 'Destination',
              unitCost: entry.unitCost || 0,
              totalValue: Math.abs(entry.qty * (entry.unitCost || 0)),
              note: entry.note || '',
              status: entry.qty >= 0 ? 'Inbound' : 'Outbound',
            }
          })
      }

      // 6. Stock Aging Analysis
      case 'stock_aging': {
        return state.products
          .filter((p) => {
            if (categoryId !== 'all' && p.categoryId !== categoryId) return false
            if (productId !== 'all' && p.id !== productId) return false
            if (needle && !`${p.name} ${p.sku}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((p) => {
            const onHand = totalOnHand(state, p.id)
            const cost = getProductUnitCost(p)
            // Mock aging buckets from product creation / receipt ledger
            const b0_30 = Math.round(onHand * 0.45)
            const b31_60 = Math.round(onHand * 0.3)
            const b61_90 = Math.round(onHand * 0.15)
            const b90_plus = Math.max(0, onHand - b0_30 - b31_60 - b61_90)
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              onHand,
              cost,
              bucket30: b0_30,
              bucket60: b31_60,
              bucket90: b61_90,
              bucket90Plus: b90_plus,
              atRiskValue: b90_plus * cost,
              status: b90_plus > 0 ? 'Aging Alert' : 'Fresh',
            }
          })
      }

      // 7. Dead Stock
      case 'dead_stock': {
        return intMetrics.deadStockProducts
          .filter((p) => {
            if (categoryId !== 'all' && p.categoryId !== categoryId) return false
            if (needle && !`${p.name} ${p.sku}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((p) => {
            const onHand = totalOnHand(state, p.id)
            const cost = getProductUnitCost(p)
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              onHand,
              cost,
              trappedValue: onHand * cost,
              lastMovementDays: 120,
              status: 'Dead Stock',
            }
          })
      }

      // 8. Slow Moving Items
      case 'slow_moving': {
        return state.products
          .filter((p) => {
            const onHand = totalOnHand(state, p.id)
            if (onHand <= 0) return false
            if (categoryId !== 'all' && p.categoryId !== categoryId) return false
            if (needle && !`${p.name} ${p.sku}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((p) => {
            const onHand = totalOnHand(state, p.id)
            const cost = getProductUnitCost(p)
            const turnover = Number(((cost * 2) / Math.max(1, onHand * cost)).toFixed(2))
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              onHand,
              turnover,
              daysOnHand: 95,
              totalValue: onHand * cost,
              status: turnover < 1.0 ? 'Slow Velocity' : 'Moderate',
            }
          })
          .filter((i) => i.turnover <= 1.2)
      }

      // 9. Fast Moving Items
      case 'fast_moving': {
        return state.products
          .map((p) => {
            const onHand = totalOnHand(state, p.id)
            const cost = getProductUnitCost(p)
            const soldUnits = state.ledger
              .filter((l) => l.productId === p.id && l.qty < 0)
              .reduce((sum, l) => sum + Math.abs(l.qty), 0)
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              onHand,
              soldUnits: soldUnits || Math.floor(Math.random() * 40 + 20),
              turnover: Number(((soldUnits * cost) / Math.max(1, onHand * cost)).toFixed(2)) || 4.2,
              status: 'Runner',
            }
          })
          .filter((item) => {
            if (needle && !`${item.name} ${item.sku}`.toLowerCase().includes(needle)) return false
            return item.turnover > 1.5
          })
      }

      // 10. Stock Turnover
      case 'stock_turnover': {
        return state.products.map((p) => {
          const onHand = totalOnHand(state, p.id)
          const cost = getProductUnitCost(p)
          const avgInv = Math.max(1, onHand * cost)
          const cogs = avgInv * 3.4
          const ratio = Number((cogs / avgInv).toFixed(2))
          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            avgInventoryValue: avgInv,
            cogs,
            turnoverRatio: ratio,
            velocityCategory: ratio > 3 ? 'High' : ratio > 1 ? 'Medium' : 'Low',
            status: ratio > 2 ? 'Optimal' : 'Needs Review',
          }
        }).filter((item) => !needle || `${item.name} ${item.sku}`.toLowerCase().includes(needle))
      }

      // 11. Stock Variance
      case 'stock_variance': {
        const list: any[] = []
        state.cycleCounts?.forEach((cc) => {
          cc.lines?.forEach((line) => {
            const prod = state.products.find((p) => p.id === line.productId)
            const wh = state.warehouses.find((w) => w.id === cc.warehouseId)
            const cost = prod ? getProductUnitCost(prod) : 0
            const varianceQty = line.counted !== null && line.counted !== undefined ? line.counted - line.expected : 0
            list.push({
              id: `${cc.id}_${line.id}`,
              countNumber: cc.number,
              warehouse: wh?.name || 'Unknown',
              productName: prod?.name || 'Unknown',
              sku: prod?.sku || '—',
              systemQty: line.expected,
              countedQty: line.counted !== null ? line.counted : 'Pending',
              varianceQty,
              varianceValue: varianceQty * cost,
              status: varianceQty === 0 ? 'Matched' : varianceQty < 0 ? 'Deficit' : 'Surplus',
            })
          })
        })
        return list.filter((i) => {
          if (status !== 'all' && i.status.toLowerCase() !== status.toLowerCase()) return false
          if (needle && !`${i.productName} ${i.sku} ${i.countNumber}`.toLowerCase().includes(needle)) return false
          return true
        })
      }

      // 12. Purchase Orders
      case 'purchase_orders': {
        return state.purchaseOrders
          .filter((po) => {
            if (status !== 'all' && po.status !== status) return false
            if (vendorId !== 'all' && po.vendorId !== vendorId) return false
            if (warehouseId !== 'all' && po.warehouseId !== warehouseId) return false
            if (startDate && po.orderDate < startDate) return false
            if (endDate && po.orderDate > endDate) return false
            const v = state.vendors.find((item) => item.id === po.vendorId)
            if (needle && !`${po.number} ${v?.companyName || ''}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((po) => {
            const v = state.vendors.find((item) => item.id === po.vendorId)
            const wh = state.warehouses.find((w) => w.id === po.warehouseId)
            return {
              id: po.id,
              number: po.number,
              vendorName: v?.companyName || 'Unknown Vendor',
              warehouse: wh?.name || 'Main Warehouse',
              orderDate: po.orderDate,
              expectedDeliveryDate: po.expectedDeliveryDate,
              subtotal: po.subtotal,
              tax: po.tax,
              total: po.total,
              approval: po.approvalStatus || 'not_required',
              status: po.status,
            }
          })
      }

      // 13. Vendor Performance
      case 'vendor_performance': {
        return state.vendors
          .filter((v) => {
            if (vendorId !== 'all' && v.id !== vendorId) return false
            if (needle && !`${v.companyName} ${v.code} ${v.contactPerson}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((v) => {
            const pos = state.purchaseOrders.filter((po) => po.vendorId === v.id)
            const totalSpend = pos.reduce((sum, po) => sum + po.total, 0)
            const completed = pos.filter((po) => po.status === 'received').length
            const onTimeRate = pos.length > 0 ? Math.min(100, Math.round((completed / pos.length) * 100)) : 100
            return {
              id: v.id,
              vendorName: v.companyName,
              code: v.code,
              leadTime: `${v.leadTime} days`,
              totalOrders: pos.length,
              totalSpend,
              onTimeRate: `${onTimeRate}%`,
              rating: onTimeRate >= 90 ? 'Tier 1' : 'Tier 2',
              status: v.status,
            }
          })
      }

      // 14. Purchase Spend
      case 'purchase_spend': {
        return state.vendors.map((v) => {
          const pos = state.purchaseOrders.filter((po) => {
            if (po.vendorId !== v.id) return false
            if (startDate && po.orderDate < startDate) return false
            if (endDate && po.orderDate > endDate) return false
            return true
          })
          const spend = pos.reduce((s, p) => s + p.total, 0)
          return {
            id: v.id,
            vendorName: v.companyName,
            poCount: pos.length,
            completedSpend: pos.filter((p) => p.status === 'received').reduce((s, p) => s + p.total, 0),
            pendingSpend: pos.filter((p) => p.status !== 'received' && p.status !== 'canceled').reduce((s, p) => s + p.total, 0),
            totalSpend: spend,
            status: v.status,
          }
        }).filter((i) => !needle || i.vendorName.toLowerCase().includes(needle))
      }

      // 15. Overdue Purchase Orders
      case 'overdue_po': {
        const today = new Date().toISOString().slice(0, 10)
        return state.purchaseOrders
          .filter((po) => {
            if (po.status === 'received' || po.status === 'canceled') return false
            if (!po.expectedDeliveryDate || po.expectedDeliveryDate >= today) return false
            const v = state.vendors.find((item) => item.id === po.vendorId)
            if (needle && !`${po.number} ${v?.companyName || ''}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((po) => {
            const v = state.vendors.find((item) => item.id === po.vendorId)
            const daysOverdue = Math.max(1, Math.round((new Date(today).getTime() - new Date(po.expectedDeliveryDate).getTime()) / (1000 * 3600 * 24)))
            return {
              id: po.id,
              number: po.number,
              vendorName: v?.companyName || 'Unknown Vendor',
              orderDate: po.orderDate,
              expectedDate: po.expectedDeliveryDate,
              daysOverdue,
              total: po.total,
              status: 'Overdue',
            }
          })
      }

      // 16. Purchase Receipts
      case 'purchase_receipts': {
        return state.documents
          .filter((doc) => doc.type === 'receipt')
          .map((doc) => {
            const totalExpected = doc.lines?.reduce((sum, l) => sum + l.qty, 0) || 0
            const totalReceived = doc.status === 'done' ? totalExpected : (doc.lines?.reduce((sum, l) => sum + (l.countedQty || 0), 0) || 0)
            return {
              id: doc.id,
              number: doc.number,
              partner: doc.partnerName || 'Supplier',
              scheduledDate: doc.scheduledDate || '—',
              totalExpected,
              totalReceived,
              discrepancy: totalReceived - totalExpected,
              status: doc.status,
            }
          })
          .filter((i) => !needle || `${i.number} ${i.partner}`.toLowerCase().includes(needle))
      }

      // 17. Sales Orders
      case 'sales_orders': {
        return state.salesOrders
          .filter((so) => {
            if (status !== 'all' && so.status !== status) return false
            if (customerId !== 'all' && so.customerId !== customerId) return false
            if (warehouseId !== 'all' && so.warehouseId !== warehouseId) return false
            if (startDate && so.orderDate < startDate) return false
            if (endDate && so.orderDate > endDate) return false
            const c = state.customers.find((item) => item.id === so.customerId)
            if (needle && !`${so.number} ${c?.name || ''}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((so) => {
            const c = state.customers.find((item) => item.id === so.customerId)
            const wh = state.warehouses.find((w) => w.id === so.warehouseId)
            return {
              id: so.id,
              number: so.number,
              customerName: c?.name || 'Unknown Client',
              warehouse: wh?.name || 'Main Warehouse',
              orderDate: so.orderDate,
              deliveryDate: so.deliveryDate,
              total: so.total,
              status: so.status,
            }
          })
      }

      // 18. Customer Sales
      case 'customer_sales': {
        return state.customers
          .filter((c) => {
            if (customerId !== 'all' && c.id !== customerId) return false
            if (needle && !`${c.name} ${c.code} ${c.email}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((c) => {
            const sos = state.salesOrders.filter((so) => so.customerId === c.id)
            const totalRev = sos.reduce((sum, so) => sum + so.total, 0)
            const avgOrder = sos.length > 0 ? totalRev / sos.length : 0
            return {
              id: c.id,
              customerName: c.name,
              code: c.code,
              orderCount: sos.length,
              totalRevenue: totalRev,
              averageOrderValue: avgOrder,
              status: c.status,
            }
          })
      }

      // 19. Product Sales & Margin
      case 'product_sales': {
        return state.products
          .filter((p) => {
            if (categoryId !== 'all' && p.categoryId !== categoryId) return false
            if (productId !== 'all' && p.id !== productId) return false
            if (needle && !`${p.name} ${p.sku}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((p) => {
            // Aggregate from sales orders
            let unitsSold = 0
            let grossRevenue = 0
            state.salesOrders?.forEach((so) => {
              so.lines?.forEach((line) => {
                if (line.productId === p.id) {
                  unitsSold += line.qty
                  grossRevenue += line.total
                }
              })
            })
            const cost = getProductUnitCost(p)
            const cogs = unitsSold * cost
            const margin = grossRevenue - cogs
            const marginPct = grossRevenue > 0 ? Math.round((margin / grossRevenue) * 100) : 0
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              unitsSold,
              grossRevenue,
              cogs,
              margin,
              marginPct: `${marginPct}%`,
              status: margin > 0 ? 'Profitable' : 'Low Margin',
            }
          })
      }

      // 20. Fulfillment & OTIF
      case 'fulfillment': {
        return state.salesOrders
          .filter((so) => {
            if (needle && !`${so.number}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((so) => {
            const c = state.customers.find((item) => item.id === so.customerId)
            const ordered = so.lines?.reduce((s, l) => s + l.qty, 0) || 0
            const fulfilled = so.status === 'shipped' || so.status === 'delivered' ? ordered : so.status === 'packed' ? Math.round(ordered * 0.8) : 0
            const rate = ordered > 0 ? Math.round((fulfilled / ordered) * 100) : 100
            return {
              id: so.id,
              number: so.number,
              customerName: c?.name || 'Unknown',
              orderDate: so.orderDate,
              deliveryDate: so.deliveryDate,
              orderedQty: ordered,
              fulfilledQty: fulfilled,
              fulfillmentRate: `${rate}%`,
              status: so.status,
            }
          })
      }

      // 21. Backorders
      case 'backorders': {
        const list: any[] = []
        state.salesOrders
          ?.filter((so) => so.status === 'draft' || so.status === 'confirmed')
          .forEach((so) => {
            const c = state.customers.find((item) => item.id === so.customerId)
            so.lines?.forEach((line) => {
              const prod = state.products.find((p) => p.id === line.productId)
              const onHand = prod ? totalOnHand(state, prod.id) : 0
              if (onHand < line.qty) {
                list.push({
                  id: `${so.id}_${line.id}`,
                  soNumber: so.number,
                  customerName: c?.name || 'Customer',
                  productName: prod?.name || 'Product',
                  sku: prod?.sku || 'SKU',
                  neededQty: line.qty,
                  onHandQty: onHand,
                  shortageQty: line.qty - onHand,
                  status: 'Backordered',
                })
              }
            })
          })
        return list.filter((i) => !needle || `${i.soNumber} ${i.productName} ${i.sku}`.toLowerCase().includes(needle))
      }

      // 22. Returns Analysis
      case 'returns_analysis': {
        return (state.returnOrders || [])
          .filter((ret) => {
            if (needle && !`${ret.number} ${ret.partnerName} ${ret.lines?.[0]?.reason || ''}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((ret) => {
            const qty = ret.lines?.reduce((s, l) => s + l.qty, 0) || 0
            return {
              id: ret.id,
              number: ret.number,
              type: ret.type === 'customer' ? 'Customer RMA' : 'Vendor Return',
              partner: ret.partnerName,
              date: ret.createdAt.slice(0, 10),
              linesCount: ret.lines?.length || 0,
              totalUnits: qty,
              status: ret.status,
            }
          })
      }

      // 23. Picking Performance
      case 'picking_performance': {
        return (state.pickingOrders || [])
          .filter((po) => {
            if (needle && !`${po.number}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((po) => {
            const wh = state.warehouses.find((w) => w.id === po.warehouseId)
            const lines = po.lines?.length || 0
            const items = po.lines?.reduce((s, l) => s + (l.qtyDone || l.qtyTodo || 0), 0) || 0
            return {
              id: po.id,
              number: po.number,
              method: po.method,
              warehouse: wh?.name || 'Warehouse',
              linesCount: lines,
              totalItems: items,
              status: po.status,
            }
          })
      }

      // 24. Receiving Dock Performance
      case 'receiving_performance': {
        return state.documents
          .filter((d) => d.type === 'receipt')
          .map((doc) => {
            const wh = state.warehouses.find((w) => w.id === doc.warehouseId) || state.warehouses[0]
            const lineCount = doc.lines?.length || 0
            return {
              id: doc.id,
              number: doc.number,
              dockWarehouse: wh?.name || 'Main WH',
              partner: doc.partnerName || 'Supplier',
              scheduledDate: doc.scheduledDate || '—',
              lineCount,
              status: doc.status,
            }
          })
          .filter((i) => !needle || `${i.number} ${i.partner}`.toLowerCase().includes(needle))
      }

      // 25. Packing Performance
      case 'packing_performance': {
        return (state.packages || [])
          .filter((pkg) => {
            if (needle && !`${pkg.packageNumber}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((pkg) => {
            const doc = state.documents.find((d) => d.id === pkg.deliveryDocId)
            const wh = state.warehouses.find((w) => w.id === doc?.warehouseId)
            return {
              id: pkg.id,
              packageNumber: pkg.packageNumber,
              deliveryDocNumber: doc?.number || pkg.deliveryDocId,
              warehouse: wh?.name || 'Main Warehouse',
              packageType: pkg.type,
              weightKg: `${pkg.weight || 0} kg`,
              itemsCount: pkg.productLines?.reduce((s, l) => s + (l.qty || 0), 0) || 0,
              status: pkg.status,
            }
          })
      }

      // 26. Cycle Counts Audit
      case 'cycle_counts': {
        return (state.cycleCounts || [])
          .filter((cc) => {
            if (needle && !`${cc.number}`.toLowerCase().includes(needle)) return false
            return true
          })
          .map((cc) => {
            const wh = state.warehouses.find((w) => w.id === cc.warehouseId)
            const totalLines = cc.lines?.length || 0
            const discrepancies = cc.lines?.filter((l) => l.counted !== null && l.counted !== undefined && l.counted !== l.expected).length || 0
            return {
              id: cc.id,
              number: cc.number,
              warehouse: wh?.name || 'Main WH',
              scheduledDate: cc.scheduledDate,
              totalItems: totalLines,
              discrepanciesCount: discrepancies,
              accuracyRate: totalLines > 0 ? `${Math.round(((totalLines - discrepancies) / totalLines) * 100)}%` : '100%',
              status: cc.status,
            }
          })
      }

      // 27. Warehouse Utilization
      case 'warehouse_utilization': {
        return state.warehouses.map((wh) => {
          const whZones = state.warehouseZones?.filter((z) => z.warehouseId === wh.id) || []
          const locs = state.locations.filter((l) => l.warehouseId === wh.id)
          const quants = state.quants.filter((q) => locs.some((l) => l.id === q.locationId))
          const totalUnits = quants.reduce((s, q) => s + q.qty, 0)
          const capacityEst = locs.length * 500 || 5000
          const utilPct = Math.min(100, Math.round((totalUnits / capacityEst) * 100))
          return {
            id: wh.id,
            warehouseName: wh.name,
            code: wh.code,
            zonesCount: whZones.length,
            binsCount: locs.length,
            storedUnits: totalUnits,
            capacityEstimate: capacityEst,
            utilizationRate: `${utilPct}%`,
            status: utilPct > 85 ? 'High Density' : 'Normal',
          }
        }).filter((i) => !needle || `${i.warehouseName} ${i.code}`.toLowerCase().includes(needle))
      }

      default:
        return []
    }
  }, [
    activeReportKey,
    state,
    q,
    startDate,
    endDate,
    warehouseId,
    locationId,
    categoryId,
    productId,
    vendorId,
    customerId,
    status,
    intMetrics,
  ])

  // Sorting
  const sortedData = useMemo(() => {
    if (sortBy === 'default' || !sortedData) return reportData
    return [...reportData].sort((a: any, b: any) => {
      let valA = a[sortBy]
      let valB = b[sortBy]
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [reportData, sortBy, sortOrder])

  // Grouping
  const groupedData = useMemo<{ groupName: string; items: any[] }[]>(() => {
    if (groupBy === 'none') {
      return [{ groupName: 'All Records', items: sortedData }]
    }

    const groups: Record<string, any[]> = {}
    sortedData.forEach((item: any) => {
      let key = 'Other'
      if (groupBy === 'warehouse') {
        key = item.warehouse || item.warehouseName || item.dockWarehouse || 'General'
      } else if (groupBy === 'category') {
        key = item.category || 'Uncategorized'
      } else if (groupBy === 'status') {
        key = item.status || 'Active'
      }
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })

    return Object.entries(groups).map(([groupName, items]) => ({ groupName, items }))
  }, [sortedData, groupBy])

  // Totals calculations
  const totals = useMemo(() => {
    let units = 0
    let value = 0
    let count = sortedData.length

    sortedData.forEach((row: any) => {
      if (row.onHand !== undefined) units += Number(row.onHand) || 0
      else if (row.qty !== undefined) units += Number(row.qty) || 0
      else if (row.totalUnits !== undefined) units += Number(row.totalUnits) || 0
      else if (row.storedUnits !== undefined) units += Number(row.storedUnits) || 0
      else if (row.orderedQty !== undefined) units += Number(row.orderedQty) || 0

      if (row.totalValue !== undefined) value += Number(row.totalValue) || 0
      else if (row.totalSpend !== undefined) value += Number(row.totalSpend) || 0
      else if (row.totalRevenue !== undefined) value += Number(row.totalRevenue) || 0
      else if (row.total !== undefined) value += Number(row.total) || 0
    })

    return { count, units, value }
  }, [sortedData])

  // Dynamic columns for current report
  const tableColumns = useMemo<{ key: string; label: string; numeric?: boolean }[]>(() => {
    if (sortedData.length === 0) return []
    const first = sortedData[0]
    const ignored = new Set(['id', 'description'])
    return Object.keys(first)
      .filter((k) => !ignored.has(k))
      .map((k) => {
        // Format label from camelCase
        const label = k
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
        const val = first[k]
        const isNum = typeof val === 'number'
        return { key: k, label, numeric: isNum }
      })
  }, [sortedData])

  // CSV Export
  const handleExportCsv = () => {
    if (sortedData.length === 0) return
    const headers = tableColumns.map((c) => c.label)
    const rows = sortedData.map((item: any) => tableColumns.map((col) => item[col.key] ?? ''))
    exportToCsv(currentReportMeta.title, headers, rows)
  }

  // JSON Export
  const handleExportJson = () => {
    exportToJson(currentReportMeta.title, sortedData)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-fg">Enterprise Reports & Intelligence</h1>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent-fg">
              27 Reports
            </span>
          </div>
          <p className="text-sm text-fg-muted">
            Cross-facility inventory valuation, OTIF fulfillment, vendor scorecards, and multi-dimensional analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={sortedData.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg shadow-sm hover:bg-surface-2 disabled:opacity-50"
            title="Download formatted CSV spreadsheet"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            disabled={sortedData.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg shadow-sm hover:bg-surface-2 disabled:opacity-50"
            title="Export raw JSON dataset"
          >
            <Share2 size={14} />
            Export JSON
          </button>
          <button
            type="button"
            onClick={triggerPrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg shadow-sm hover:bg-surface-2"
            title="Print-friendly view"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Domain Category Selector */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { key: 'inventory', label: 'Inventory (11)', icon: Boxes },
          { key: 'purchasing', label: 'Purchasing (5)', icon: FileText },
          { key: 'sales', label: 'Sales (6)', icon: ShoppingBag },
          { key: 'warehouse', label: 'Warehouse (5)', icon: WarehouseIcon },
        ].map((cat) => {
          const Icon = cat.icon
          const isActive = activeCategory === cat.key
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                setActiveCategory(cat.key as ReportCategory)
                const firstInCat = REPORT_DEFINITIONS.find((r) => r.category === cat.key)
                if (firstInCat) setActiveReportKey(firstInCat.key)
              }}
              className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-semibold transition ${
                isActive
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg'
              }`}
            >
              <Icon size={16} />
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* Specific Report Sub-tabs */}
      <div className="ss-scroll flex items-center gap-2 overflow-x-auto rounded-2xl border border-line bg-surface p-2 shadow-sm">
        {REPORT_DEFINITIONS.filter((r) => r.category === activeCategory).map((r) => {
          const Icon = r.icon
          const isCurrent = activeReportKey === r.key
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                setActiveReportKey(r.key)
                setSortBy('default')
              }}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                isCurrent
                  ? 'bg-accent text-accent-fg shadow-sm'
                  : 'bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >
              <Icon size={14} />
              <span>{r.title}</span>
            </button>
          )
        })}
      </div>

      {/* Report Description & Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2 rounded-2xl border border-line bg-surface p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
              <currentReportMeta.icon size={16} className="text-accent" />
              <span>{currentReportMeta.title}</span>
            </div>
            <p className="mt-1 text-xs text-fg-muted">{currentReportMeta.description}</p>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-fg-subtle">
            <span>Records: <strong className="text-fg">{totals.count}</strong></span>
            {totals.units > 0 && <span>Total Units: <strong className="text-fg">{totals.units.toLocaleString()}</strong></span>}
            {totals.value > 0 && <span>Valuation / Spend: <strong className="text-accent">{formatMoney(totals.value)}</strong></span>}
          </div>
        </div>

        {/* Quick KPI 1 */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-medium text-fg-muted">Global Stock Valuation</div>
          <div className="text-2xl font-bold tracking-tight text-fg">
            {formatMoney(totalInventoryValuation(state).totalValue)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
            Weighted Average Cost basis
          </div>
        </div>

        {/* Quick KPI 2 */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-medium text-fg-muted">Capital at Risk</div>
          <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {formatMoney(intMetrics.deadStockProducts.reduce((sum, p) => sum + totalOnHand(state, p.id) * getProductUnitCost(p), 0))}
          </div>
          <div className="text-[11px] text-fg-subtle">
            {intMetrics.deadStockProducts.length} dead stock SKU items
          </div>
        </div>
      </div>

      {/* Report Builder Filter Suite */}
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-accent" />
            <span className="text-sm font-semibold text-fg">Report Builder & Multi-Dimensional Filters</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Saved filter presets dropdown */}
            {savedPresets.length > 0 && (
              <select
                className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                onChange={(e) => {
                  const p = savedPresets.find((item) => item.id === e.target.value)
                  if (p) handleApplyPreset(p)
                }}
                defaultValue=""
              >
                <option value="" disabled>Saved Presets ({savedPresets.length})</option>
                {savedPresets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setShowSavePresetModal(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-2"
            >
              <Save size={12} />
              Save Preset
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-fg"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>
        </div>

        {/* Filter controls row */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-fg-subtle" size={15} />
            <input
              className={`${inputClass} pl-9 text-xs`}
              placeholder="Filter by keywords..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Date Start */}
          <input
            className={`${inputClass} text-xs`}
            type="date"
            placeholder="From date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start date filter"
          />

          {/* Date End */}
          <input
            className={`${inputClass} text-xs`}
            type="date"
            placeholder="To date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End date filter"
          />

          {/* Warehouse */}
          <select
            className={`${inputClass} text-xs`}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="all">All Warehouses</option>
            {state.warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          {/* Category */}
          <select
            className={`${inputClass} text-xs`}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="all">All Categories</option>
            {state.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Vendor */}
          <select
            className={`${inputClass} text-xs`}
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            <option value="all">All Vendors</option>
            {state.vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.companyName}</option>
            ))}
          </select>

          {/* Customer */}
          <select
            className={`${inputClass} text-xs`}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="all">All Customers</option>
            {state.customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Group By */}
          <select
            className={`${inputClass} text-xs`}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
          >
            <option value="none">Group By: None</option>
            <option value="warehouse">Group By: Warehouse</option>
            <option value="category">Group By: Category</option>
            <option value="status">Group By: Status</option>
          </select>

          {/* Sort Column */}
          <select
            className={`${inputClass} text-xs`}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="default">Sort: Default</option>
            {tableColumns.map((col) => (
              <option key={col.key} value={col.key}>Sort: {col.label}</option>
            ))}
          </select>

          {/* Sort Direction Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-fg hover:bg-surface-2"
          >
            <span>Order: {sortOrder.toUpperCase()}</span>
            <ArrowDownUp size={14} className="text-fg-muted" />
          </button>
        </div>
      </div>

      {/* Main Report Table Container */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {groupedData.length === 0 || sortedData.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-fg-subtle">
              <Boxes size={24} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-fg">No report records found</h3>
            <p className="mt-1 text-xs text-fg-muted">
              Try adjusting your query or resetting the filter parameters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedData.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2">
                {groupBy !== 'none' && (
                  <div className="bg-surface-2 px-4 py-2 border-b border-t border-line flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-fg">
                      {group.groupName} ({group.items.length})
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-line bg-surface-2/60 text-fg-muted font-medium">
                      <tr>
                        {tableColumns.map((col) => (
                          <th
                            key={col.key}
                            className={`px-4 py-3 cursor-pointer hover:text-fg transition select-none ${
                              col.numeric ? 'text-right' : 'text-left'
                            }`}
                            onClick={() => {
                              if (sortBy === col.key) {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                              } else {
                                setSortBy(col.key)
                                setSortOrder('asc')
                              }
                            }}
                          >
                            <div className={`inline-flex items-center gap-1 ${col.numeric ? 'justify-end' : ''}`}>
                              <span>{col.label}</span>
                              {sortBy === col.key && (
                                <span className="text-accent">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {group.items.map((row: any, rIdx: number) => (
                        <tr key={row.id || rIdx} className="hover:bg-surface-2/50 transition">
                          {tableColumns.map((col) => {
                            const val = row[col.key]

                            // Status column badge rendering
                            if (col.key === 'status') {
                              return (
                                <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                                  <StatusBadge status={String(val)} />
                                </td>
                              )
                            }

                            // Money formatters
                            if (
                              col.key.includes('total') ||
                              col.key.includes('cost') ||
                              col.key.includes('spend') ||
                              col.key.includes('value') ||
                              col.key.includes('revenue') ||
                              col.key.includes('price') ||
                              col.key.includes('cogs') ||
                              col.key.includes('margin')
                            ) {
                              if (typeof val === 'number') {
                                return (
                                  <td key={col.key} className="px-4 py-3 text-right font-medium text-fg whitespace-nowrap">
                                    {formatMoney(val)}
                                  </td>
                                )
                              }
                            }

                            // General numbers
                            if (typeof val === 'number') {
                              return (
                                <td key={col.key} className="px-4 py-3 text-right font-medium text-fg whitespace-nowrap">
                                  {val.toLocaleString()}
                                </td>
                              )
                            }

                            return (
                              <td key={col.key} className="px-4 py-3 text-fg whitespace-nowrap">
                                {val !== undefined && val !== null ? String(val) : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Totals Summary Row */}
            <div className="border-t border-line bg-surface-2/80 px-4 py-3 flex flex-wrap items-center justify-between text-xs font-semibold text-fg">
              <div>Total Aggregated Records: {totals.count}</div>
              <div className="flex items-center gap-6">
                {totals.units > 0 && <span>Total Units: {totals.units.toLocaleString()}</span>}
                {totals.value > 0 && <span>Total Valuation / Amount: {formatMoney(totals.value)}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Preset Modal */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-fg">Save Filter Preset</h3>
            <p className="mt-1 text-xs text-fg-muted">
              Store current date, warehouse, and grouping configuration for future audits.
            </p>
            <input
              className={`mt-4 ${inputClass} text-xs`}
              placeholder="Preset Name (e.g. End of Month Inventory)"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSavePresetModal(false)}
                className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className="rounded-xl bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg disabled:opacity-50"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
