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

interface NavItem {
  to: string
  label: string
  icon: any
  group?: string
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

export function AppShell() {
  const { currentUser, logout, state } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const alerts = lowStockItems(state).length

  const isNavActive = (to: string) => {
    const [toPath, toQuery] = to.split('?')
    if (toQuery) {
      return location.pathname === toPath && location.search.includes(toQuery)
    }
    if (toPath === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname === toPath || location.pathname.startsWith(`${toPath}/`)
  }

  return (
    <div className="flex min-h-svh bg-canvas">
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
        <nav className="ss-scroll flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {nav.map((item, i) => {
            const active = isNavActive(item.to)
            const showGroup = item.group && nav[i - 1]?.group !== item.group
            return (
              <div key={item.to}>
                {showGroup ? (
                  <div className="mt-4 mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-sidebar/40">
                    {item.group}
                  </div>
                ) : null}
                <NavLink
                  to={item.to}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-on-sidebar/10 text-on-sidebar font-medium shadow-sm'
                      : 'text-on-sidebar/60 hover:bg-on-sidebar/5 hover:text-on-sidebar'
                  }`}
                >
                  <item.icon size={16} className={active ? 'text-on-sidebar' : 'text-on-sidebar/40'} />
                  <span className="flex-1">{item.label}</span>
                  {item.to === '/products' && alerts > 0 ? (
                    <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                      {alerts}
                    </span>
                  ) : null}
                </NavLink>
              </div>
            )
          })}
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
