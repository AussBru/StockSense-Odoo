import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Boxes,
  Building2,
  FileSpreadsheet,
  FileText,
  PackageMinus,
  PackagePlus,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Users,
  Warehouse,
  X,
  ArrowRight,
  Command,
} from 'lucide-react'
import { useStore } from '../store'

interface SearchResult {
  id: string
  title: string
  subtitle: string
  category: 'Products' | 'Purchase Orders' | 'Sales Orders' | 'Operations' | 'Vendors' | 'Customers' | 'Warehouses'
  url: string
  icon: any
}

export function GlobalSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const list: SearchResult[] = []

    // 1. Products
    for (const p of state.products) {
      if (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      ) {
        list.push({
          id: p.id,
          title: p.name,
          subtitle: `SKU: ${p.sku} • Cost: $${p.costPrice ?? 0} • Price: $${p.salesPrice ?? 0}`,
          category: 'Products',
          url: `/products/${p.id}`,
          icon: Boxes,
        })
      }
    }

    // 2. Purchase Orders
    for (const po of state.purchaseOrders) {
      const v = state.vendors.find((item) => item.id === po.vendorId)
      if (
        po.number.toLowerCase().includes(q) ||
        (v && v.companyName.toLowerCase().includes(q)) ||
        (po.notes && po.notes.toLowerCase().includes(q))
      ) {
        list.push({
          id: po.id,
          title: `PO ${po.number}`,
          subtitle: `${v?.companyName || 'Vendor'} • Total: $${po.total.toLocaleString()} • Status: ${po.status}`,
          category: 'Purchase Orders',
          url: `/purchase-orders/${po.id}`,
          icon: FileSpreadsheet,
        })
      }
    }

    // 3. Sales Orders
    for (const so of state.salesOrders) {
      const c = state.customers.find((item) => item.id === so.customerId)
      if (
        so.number.toLowerCase().includes(q) ||
        (c && c.name.toLowerCase().includes(q)) ||
        (so.notes && so.notes.toLowerCase().includes(q))
      ) {
        list.push({
          id: so.id,
          title: `SO ${so.number}`,
          subtitle: `${c?.name || 'Customer'} • Total: $${so.total.toLocaleString()} • Status: ${so.status}`,
          category: 'Sales Orders',
          url: `/sales-orders/${so.id}`,
          icon: ShoppingBag,
        })
      }
    }

    // 4. Operations (Receipts, Deliveries, Transfers, Adjustments)
    for (const doc of state.documents) {
      if (
        doc.number.toLowerCase().includes(q) ||
        (doc.partnerName && doc.partnerName.toLowerCase().includes(q)) ||
        (doc.notes && doc.notes.toLowerCase().includes(q))
      ) {
        let icon = FileText
        let url = `/receipts/${doc.id}`
        if (doc.type === 'receipt') {
          icon = PackagePlus
          url = `/receipts/${doc.id}`
        } else if (doc.type === 'delivery') {
          icon = PackageMinus
          url = `/deliveries/${doc.id}`
        } else if (doc.type === 'internal') {
          icon = RotateCcw
          url = `/transfers/${doc.id}`
        } else if (doc.type === 'adjustment') {
          icon = SlidersHorizontal
          url = `/adjustments/${doc.id}`
        }

        list.push({
          id: doc.id,
          title: `${doc.type.toUpperCase()}: ${doc.number}`,
          subtitle: `${doc.partnerName || 'Partner'} • Scheduled: ${doc.scheduledDate || '—'} • ${doc.status}`,
          category: 'Operations',
          url,
          icon,
        })
      }
    }

    // 5. Vendors
    for (const v of state.vendors) {
      if (
        v.companyName.toLowerCase().includes(q) ||
        v.code.toLowerCase().includes(q) ||
        v.contactPerson.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q)
      ) {
        list.push({
          id: v.id,
          title: v.companyName,
          subtitle: `Vendor Code: ${v.code} • Contact: ${v.contactPerson} (${v.email})`,
          category: 'Vendors',
          url: `/vendors/${v.id}`,
          icon: Building2,
        })
      }
    }

    // 6. Customers
    for (const c of state.customers) {
      if (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      ) {
        list.push({
          id: c.id,
          title: c.name,
          subtitle: `Customer Code: ${c.code} • Email: ${c.email}`,
          category: 'Customers',
          url: `/customers`,
          icon: Users,
        })
      }
    }

    // 7. Warehouses & Locations
    for (const wh of state.warehouses) {
      if (wh.name.toLowerCase().includes(q) || wh.code.toLowerCase().includes(q)) {
        list.push({
          id: wh.id,
          title: `Warehouse: ${wh.name} (${wh.code})`,
          subtitle: wh.address || 'Warehouse Facility',
          category: 'Warehouses',
          url: `/settings/warehouses`,
          icon: Warehouse,
        })
      }
    }

    return list.slice(0, 25)
  }, [query, state])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selectedIndex]) {
          navigate(results[selectedIndex].url)
          onClose()
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, results, selectedIndex, navigate, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-20">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Search size={20} className="shrink-0 text-fg-subtle" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-base font-medium text-fg outline-none placeholder:text-fg-subtle"
            placeholder="Search products, SKUs, POs, SOs, operations, customers..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-lg p-1 text-fg-subtle hover:bg-surface-2 hover:text-fg"
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono font-medium text-fg-muted">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="ss-scroll max-h-96 overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="p-8 text-center">
              <Command size={32} className="mx-auto text-fg-subtle opacity-60" />
              <div className="mt-2 text-sm font-semibold text-fg">Global Search</div>
              <div className="mt-1 text-xs text-fg-muted">
                Type keywords to find inventory items, purchase & sales documents, operations, partners, or locations.
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px] text-fg-muted">
                <span className="rounded-md bg-surface-2 px-2 py-0.5">Steel Sheet</span>
                <span className="rounded-md bg-surface-2 px-2 py-0.5">PO-2026</span>
                <span className="rounded-md bg-surface-2 px-2 py-0.5">WH/IN/00001</span>
                <span className="rounded-md bg-surface-2 px-2 py-0.5">MetalsPlus</span>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-sm text-fg-muted">
              No matching records found for "<span className="font-semibold text-fg">{query}</span>"
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const Icon = item.icon
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={`${item.category}-${item.id}`}
                    type="button"
                    onClick={() => {
                      navigate(item.url)
                      onClose()
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition ${
                      isSelected
                        ? 'bg-surface-2 text-fg shadow-sm'
                        : 'text-fg-soft hover:bg-surface-2/60 hover:text-fg'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg-muted'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-fg">{item.title}</span>
                        <span className="rounded-md bg-surface-2 border border-line px-1.5 py-0.2 text-[10px] font-medium text-fg-subtle">
                          {item.category}
                        </span>
                      </div>
                      <div className="truncate text-xs text-fg-muted">{item.subtitle}</div>
                    </div>
                    {isSelected && <ArrowRight size={14} className="shrink-0 text-fg-muted" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-line bg-surface-2/50 px-4 py-2.5 text-[11px] text-fg-muted">
          <div className="flex items-center gap-2">
            <span>Navigate:</span>
            <kbd className="rounded border border-line bg-surface px-1 text-[10px]">↑</kbd>
            <kbd className="rounded border border-line bg-surface px-1 text-[10px]">↓</kbd>
            <span>Open:</span>
            <kbd className="rounded border border-line bg-surface px-1 text-[10px]">↵</kbd>
          </div>
          <div>{results.length} result{results.length === 1 ? '' : 's'}</div>
        </div>
      </div>
    </div>
  )
}
