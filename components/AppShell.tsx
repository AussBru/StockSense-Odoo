import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Building2,
  CircleDollarSign,
  ClipboardList,
  FileSpreadsheet,
  FlaskConical,
  Hash,
  History,
  LayoutDashboard,
  Layers,
  LogOut,
  PackageMinus,
  PackagePlus,
  Package2,
  RotateCcw,
  ScanLine,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Truck,
  Undo2,
  UserRound,
  Users,
  Warehouse,
} from 'lucide-react'
import { useStore } from '../store'
import { lowStockItems } from '../lib/inventory'
import { ThemeToggle } from './ThemeToggle'
import BranchedMenu, { type BranchedMenuItem } from './BranchedMenu'

// gsap is ~200 kB. Loaded lazily so it stays out of the main chunk and the
// login page never pays for it.
const AutoBentoSurfaces = lazy(() =>
  import('./AutoBentoSurfaces').then((m) => ({ default: m.AutoBentoSurfaces })),
)

interface NavItem {
  to: string
  label: string
  icon: any
  group?: NavGroup
}

const nav: NavItem[] = [
  // INVENTORY
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Inventory' },
  { to: '/products', label: 'Products', icon: Boxes, group: 'Inventory' },
  { to: '/receipts', label: 'Receipts', icon: PackagePlus, group: 'Inventory' },
  { to: '/deliveries', label: 'Delivery Orders', icon: PackageMinus, group: 'Inventory' },
  { to: '/transfers', label: 'Internal Transfers', icon: ArrowLeftRight, group: 'Inventory' },
  { to: '/adjustments', label: 'Inventory Adjustment', icon: SlidersHorizontal, group: 'Inventory' },
  { to: '/history', label: 'Move History', icon: History, group: 'Inventory' },
  { to: '/intelligence', label: 'Intelligence', icon: Sparkles, group: 'Inventory' },
  { to: '/valuation', label: 'Stock Valuation', icon: CircleDollarSign, group: 'Inventory' },

  // WAREHOUSE OPERATIONS
  { to: '/warehouse-dashboard', label: 'WH Dashboard', icon: LayoutDashboard, group: 'Warehouse Ops' },
  { to: '/variants', label: 'Product Variants', icon: Tag, group: 'Warehouse Ops' },
  { to: '/lots', label: 'Lots & Batches', icon: FlaskConical, group: 'Warehouse Ops' },
  { to: '/serials', label: 'Serial Numbers', icon: Hash, group: 'Warehouse Ops' },
  { to: '/picking', label: 'Picking', icon: ScanLine, group: 'Warehouse Ops' },
  { to: '/packing', label: 'Packing', icon: Package2, group: 'Warehouse Ops' },
  { to: '/shipping', label: 'Shipping', icon: Truck, group: 'Warehouse Ops' },
  { to: '/cycle-counts', label: 'Cycle Counts', icon: ClipboardList, group: 'Warehouse Ops' },
  { to: '/zones', label: 'Zones & Locations', icon: Layers, group: 'Warehouse Ops' },
  { to: '/putaway', label: 'Putaway Rules', icon: ArrowLeftRight, group: 'Warehouse Ops' },

  // SALES
  { to: '/customers', label: 'Customers', icon: Users, group: 'Sales' },
  { to: '/sales-orders', label: 'Sales Orders', icon: ShoppingBag, group: 'Sales' },
  { to: '/returns?type=customer', label: 'Customer Returns', icon: RotateCcw, group: 'Sales' },

  // PURCHASING
  { to: '/vendors', label: 'Vendors', icon: Building2, group: 'Purchasing' },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: FileSpreadsheet, group: 'Purchasing' },
  { to: '/returns?type=vendor', label: 'Vendor Returns', icon: Undo2, group: 'Purchasing' },

  // REPORTS
  { to: '/reports?type=inventory', label: 'Inventory Reports', icon: BarChart3, group: 'Reports' },
  { to: '/reports?type=sales', label: 'Sales Reports', icon: BarChart3, group: 'Reports' },
  { to: '/reports?type=purchasing', label: 'Purchasing Reports', icon: BarChart3, group: 'Reports' },
  { to: '/reports?type=valuation', label: 'Valuation Reports', icon: BarChart3, group: 'Reports' },

  // SETTING
  { to: '/settings/warehouses', label: 'Warehouse', icon: Warehouse, group: 'Setting' },
]

/** Sidebar sections, in render order. */
const GROUP_ORDER = ['Inventory', 'Warehouse Ops', 'Sales', 'Purchasing', 'Reports', 'Setting'] as const

type NavGroup = (typeof GROUP_ORDER)[number]

const GROUP_INDEX = new Map<NavGroup, number>(GROUP_ORDER.map((g, i) => [g, i]))

export function AppShell() {
  const { currentUser, logout, state } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const alerts = lowStockItems(state).length

  const isNavActive = (to: string) => {
    const [toPath, toQuery] = to.split('?')
    // Sub-routes count as their section, so `/returns/new` still lights up
    // `/returns`. Query-carrying entries previously required an exact path
    // match, which left them unhighlighted on any nested route.
    const pathMatches =
      location.pathname === toPath || location.pathname.startsWith(`${toPath}/`)
    if (toQuery) {
      return pathMatches && location.search.includes(toQuery)
    }
    if (toPath === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return pathMatches
  }

  const activeRoute = useMemo(
    () => nav.find((item) => isNavActive(item.to))?.to ?? '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.pathname, location.search],
  )

  const activeGroup = useMemo(
    () => nav.find((item) => item.to === activeRoute)?.group,
    [activeRoute],
  )

  const [openGroups, setOpenGroups] = useState<NavGroup[]>(() => [...GROUP_ORDER])

  // Keep the group owning the current route unfolded so the active row is
  // always visible, including on browser back/forward and direct URL loads.
  useEffect(() => {
    if (!activeGroup) return
    setOpenGroups((prev) => (prev.includes(activeGroup) ? prev : [...prev, activeGroup]))
  }, [activeGroup])

  const menuItems = useMemo<BranchedMenuItem[]>(() => {
    const iconFor = (item: NavItem) => {
      const Icon = item.icon
      return <Icon size={16} strokeWidth={1.8} />
    }

    return GROUP_ORDER.map((group) => ({
      label: group,
      children: nav
        .filter((item) => item.group === group)
        .map((item) => ({
          value: item.to,
          label: item.label,
          icon: iconFor(item),
          badge:
            item.to === '/products' && alerts > 0 ? (
              <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                {alerts}
              </span>
            ) : undefined,
        })),
    })).filter((section) => section.children && section.children.length > 0)
  }, [alerts])

  return (
    <div className="flex min-h-svh bg-canvas">
      {/* Adds the MagicBento hover treatment to every standard surface panel. */}
      <Suspense fallback={null}>
        <AutoBentoSurfaces />
      </Suspense>
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-on-sidebar">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-on-sidebar text-sidebar font-bold">
            S
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-on-sidebar">StockSense</div>
            <div className="text-[11px] text-on-sidebar/50">Inventory OS</div>
          </div>
        </div>
        <nav className="ss-scroll flex-1 overflow-y-auto pb-4">
          <BranchedMenu
            items={menuItems}
            className="branched-menu--fill"
            active={activeRoute}
            open={openGroups.map((g) => GROUP_INDEX.get(g) ?? -1).filter((i) => i >= 0)}
            onToggle={(index, isOpen) => {
              const group = GROUP_ORDER[index]
              if (!group) return
              setOpenGroups((prev) =>
                isOpen ? (prev.includes(group) ? prev : [...prev, group]) : prev.filter((g) => g !== group),
              )
            }}
            onSelect={(value) => navigate(value)}
            width={256}
            rowHeight={34}
            indent={38}
            trunk={12}
            radius={9}
            fontSize={13}
          />
        </nav>
        <div className="border-t border-on-sidebar/10 p-3">
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-sidebar/40">
            Profile Menu
          </div>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                isActive
                  ? 'bg-on-sidebar/10 text-on-sidebar'
                  : 'text-on-sidebar/60 hover:bg-on-sidebar/5'
              }`
            }
          >
            <UserRound size={16} />
            My Profile
          </NavLink>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-on-sidebar/60 hover:bg-on-sidebar/5"
          >
            <LogOut size={16} />
            Logout
          </button>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-on-sidebar/5 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-on-sidebar text-xs font-bold text-sidebar">
              {currentUser?.name.slice(0, 1) ?? 'U'}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-on-sidebar">{currentUser?.name}</div>
              <div className="truncate text-[11px] text-on-sidebar/50">{currentUser?.email}</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-6">
          <div className="flex min-w-0 items-center gap-2 text-sm text-fg-muted">
            <ClipboardList size={16} className="shrink-0" />
            <span className="truncate capitalize">
              {location.pathname.split('/').filter(Boolean)[0]?.replace('-', ' ') || 'dashboard'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {alerts > 0 ? (
              <div className="whitespace-nowrap rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                {alerts} low / out of stock alert{alerts === 1 ? '' : 's'}
              </div>
            ) : (
              <div className="whitespace-nowrap text-xs text-fg-subtle">All stock levels healthy</div>
            )}
            <ThemeToggle />
          </div>
        </header>
        <main className="ss-scroll flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function RequireAuth() {
  const { currentUser } = useStore()
  const location = useLocation()
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <AppShell />
}

export function GuestOnly() {
  const { currentUser } = useStore()
  if (currentUser) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
