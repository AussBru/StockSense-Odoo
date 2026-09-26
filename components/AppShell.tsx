import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
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
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Truck,
  Undo2,
  UserCheck,
  UserCog,
  UserRound,
  Users,
  Warehouse,
  Command,
} from 'lucide-react'
import { useStore } from '../store'
import { lowStockItems } from '../lib/inventory'
import { hasPermission, ROLE_LABELS } from '../lib/rbac'
import type { Permission } from '../types'
import { ThemeToggle } from './ThemeToggle'
import { NotificationBell } from './NotificationBell'
import { GlobalSearchModal } from './GlobalSearchModal'
import BranchedMenu, { type BranchedMenuItem } from './BranchedMenu'

// gsap is ~200 kB. Loaded lazily so it stays out of the main chunk and the
// login page never pays for it.
const AutoBentoSurfaces = lazy(() =>
  import('./AutoBentoSurfaces').then((m) => ({ default: m.AutoBentoSurfaces })),
)

/** Sidebar sections, in render order. */
const GROUP_ORDER = [
  'Inventory',
  'Warehouse Ops',
  'Sales',
  'Purchasing',
  'Reports',
  'Communications',
  'Administration',
  'Setting',
] as const

type NavGroup = (typeof GROUP_ORDER)[number]

const GROUP_INDEX = new Map<NavGroup, number>(GROUP_ORDER.map((g, i) => [g, i]))

interface NavItem {
  to: string
  label: string
  icon: any
  group: NavGroup
  permission?: Permission
}

const nav: NavItem[] = [
  // INVENTORY
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Inventory', permission: 'dashboard.view' },
  { to: '/products', label: 'Products', icon: Boxes, group: 'Inventory', permission: 'products.view' },
  { to: '/receipts', label: 'Receipts', icon: PackagePlus, group: 'Inventory', permission: 'inventory.adjust' },
  { to: '/deliveries', label: 'Delivery Orders', icon: PackageMinus, group: 'Inventory', permission: 'inventory.adjust' },
  { to: '/transfers', label: 'Internal Transfers', icon: ArrowLeftRight, group: 'Inventory', permission: 'inventory.adjust' },
  { to: '/adjustments', label: 'Inventory Adjustment', icon: SlidersHorizontal, group: 'Inventory', permission: 'inventory.adjust' },
  { to: '/history', label: 'Move History', icon: History, group: 'Inventory', permission: 'inventory.adjust' },
  { to: '/intelligence', label: 'Intelligence', icon: Sparkles, group: 'Inventory', permission: 'dashboard.view' },
  { to: '/valuation', label: 'Stock Valuation', icon: CircleDollarSign, group: 'Inventory', permission: 'reports.view' },

  // WAREHOUSE OPERATIONS
  { to: '/warehouse-dashboard', label: 'WH Dashboard', icon: LayoutDashboard, group: 'Warehouse Ops', permission: 'warehouse.manage' },
  { to: '/variants', label: 'Product Variants', icon: Tag, group: 'Warehouse Ops', permission: 'warehouse.manage' },
  { to: '/lots', label: 'Lots & Batches', icon: FlaskConical, group: 'Warehouse Ops', permission: 'warehouse.manage' },
  { to: '/serials', label: 'Serial Numbers', icon: Hash, group: 'Warehouse Ops', permission: 'warehouse.manage' },
  { to: '/picking', label: 'Picking', icon: ScanLine, group: 'Warehouse Ops', permission: 'warehouse.manage' },
  { to: '/packing', label: 'Packing', icon: Package2, group: 'Warehouse Ops', permission: 'warehouse.manage' },
  { to: '/shipping', label: 'Shipping', icon: Truck, group: 'Warehouse Ops', permission: 'warehouse.manage' },
  { to: '/cycle-counts', label: 'Cycle Counts', icon: ClipboardList, group: 'Warehouse Ops', permission: 'warehouse.manage' },
  { to: '/zones', label: 'Zones & Locations', icon: Layers, group: 'Warehouse Ops', permission: 'warehouse.manage' },
  { to: '/putaway', label: 'Putaway Rules', icon: ArrowLeftRight, group: 'Warehouse Ops', permission: 'warehouse.manage' },

  // SALES
  { to: '/customers', label: 'Customers', icon: Users, group: 'Sales', permission: 'sales.view' },
  { to: '/sales-orders', label: 'Sales Orders', icon: ShoppingBag, group: 'Sales', permission: 'sales.view' },
  { to: '/returns?type=customer', label: 'Customer Returns', icon: RotateCcw, group: 'Sales', permission: 'returns.manage' },

  // PURCHASING
  { to: '/vendors', label: 'Vendors', icon: Building2, group: 'Purchasing', permission: 'purchasing.view' },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: FileSpreadsheet, group: 'Purchasing', permission: 'purchasing.view' },
  { to: '/returns?type=vendor', label: 'Vendor Returns', icon: Undo2, group: 'Purchasing', permission: 'returns.manage' },

  // REPORTS
  { to: '/reports?type=inventory', label: 'Inventory Reports', icon: BarChart3, group: 'Reports', permission: 'reports.view' },
  { to: '/reports?type=sales', label: 'Sales Reports', icon: BarChart3, group: 'Reports', permission: 'reports.view' },
  { to: '/reports?type=purchasing', label: 'Purchasing Reports', icon: BarChart3, group: 'Reports', permission: 'reports.view' },
  { to: '/reports?type=warehouse', label: 'Warehouse Reports', icon: BarChart3, group: 'Reports', permission: 'reports.view' },

  // NOTIFICATIONS
  { to: '/notifications', label: 'Notification Center', icon: Bell, group: 'Communications' },

  // ADMINISTRATION
  { to: '/settings/users', label: 'Users & Roles', icon: UserCog, group: 'Administration', permission: 'users.manage' },
  { to: '/audit-log', label: 'Audit Trail', icon: ShieldCheck, group: 'Administration', permission: 'audit.view' },
  { to: '/settings', label: 'System Settings', icon: Settings, group: 'Administration', permission: 'settings.manage' },
  { to: '/settings/warehouses', label: 'Warehouses', icon: Warehouse, group: 'Administration', permission: 'warehouse.manage' },
]

export function AppShell() {
  const { currentUser, logout, state } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const alerts = lowStockItems(state).length

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchModalOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const isNavActive = (to: string) => {
    const [toPath, toQuery] = to.split('?')
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

  // Filter nav items by user permissions
  const accessibleNav = useMemo(() => {
    return nav.filter((item) => {
      if (!item.permission) return true
      return hasPermission(currentUser, item.permission)
    })
  }, [currentUser])

  const activeRoute = useMemo(
    () => accessibleNav.find((item) => isNavActive(item.to))?.to ?? '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.pathname, location.search, accessibleNav],
  )

  const activeGroup = useMemo(
    () => accessibleNav.find((item) => item.to === activeRoute)?.group,
    [activeRoute, accessibleNav],
  )

  const [openGroups, setOpenGroups] = useState<NavGroup[]>(() => [...GROUP_ORDER])

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
      children: accessibleNav
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
  }, [accessibleNav, alerts])

  return (
    <div className="flex min-h-svh bg-canvas">
      {/* Adds the MagicBento hover treatment to every standard surface panel */}
      <Suspense fallback={null}>
        <AutoBentoSurfaces />
      </Suspense>

      {/* Global Search Modal */}
      <GlobalSearchModal open={searchModalOpen} onClose={() => setSearchModalOpen(false)} />

      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-on-sidebar">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-on-sidebar/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-fg font-bold shadow-sm">
            S
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-on-sidebar">StockSense</div>
            <div className="text-[11px] text-on-sidebar/50">Enterprise Edition</div>
          </div>
        </div>

        {/* Tree-structured Branched Menu */}
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

        {/* User profile footer */}
        <div className="border-t border-on-sidebar/10 p-3">
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-sidebar/40">
            Account & Session
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
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-on-sidebar/60 hover:bg-on-sidebar/5 transition"
          >
            <LogOut size={16} />
            Logout
          </button>

          {/* Current user card with Role */}
          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-on-sidebar/5 p-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-fg">
              {currentUser?.name?.slice(0, 1) ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-on-sidebar">{currentUser?.name}</div>
              <div className="truncate text-[10px] font-semibold text-accent/90">
                {currentUser?.role ? ROLE_LABELS[currentUser.role] : 'Member'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main app body */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-6">
          {/* Breadcrumb / Path indicator */}
          <div className="flex min-w-0 items-center gap-2 text-sm text-fg-muted">
            <ClipboardList size={16} className="shrink-0 text-accent" />
            <span className="truncate capitalize font-medium text-fg">
              {location.pathname.split('/').filter(Boolean)[0]?.replace('-', ' ') || 'Dashboard'}
            </span>
          </div>

          {/* Global Search Bar (Ctrl+K trigger) */}
          <div className="hidden sm:flex flex-1 max-w-md mx-4">
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/60 px-3.5 py-1.5 text-xs text-fg-muted transition hover:border-line-strong hover:bg-surface-2 hover:text-fg shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Search size={14} className="text-fg-subtle" />
                <span>Quick search products, orders, records...</span>
              </div>
              <kbd className="inline-flex items-center gap-0.5 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-mono text-fg-muted shadow-xs">
                <Command size={10} /> K
              </kbd>
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Mobile search button */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex sm:hidden h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg"
              title="Search"
            >
              <Search size={16} />
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Dark / Light Mode Switch */}
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content Viewport */}
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
