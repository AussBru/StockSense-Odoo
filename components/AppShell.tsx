import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Building2,
  CircleDollarSign,
  ClipboardList,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  LogOut,
  PackageMinus,
  PackagePlus,
  RotateCcw,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  UserRound,
  Users,
  Warehouse,
} from 'lucide-react'
import { useStore } from '../store'
import { lowStockItems } from '../lib/inventory'

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
    <div className="flex min-h-svh bg-[#f4f6fb]">
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-slate-200">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-bold">S</div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-white">StockSense</div>
            <div className="text-[11px] text-slate-400">Inventory OS</div>
          </div>
        </div>
        <nav className="ss-scroll flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {nav.map((item, i) => {
            const active = isNavActive(item.to)
            const showGroup = item.group && nav[i - 1]?.group !== item.group
            return (
              <div key={item.to}>
                {showGroup ? (
                  <div className="mt-4 mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {item.group}
                  </div>
                ) : null}
                <NavLink
                  to={item.to}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                    active ? 'bg-white/10 text-white font-medium shadow-sm' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon size={16} className={active ? 'text-brand-light' : 'text-slate-400'} />
                  <span className="flex-1">{item.label}</span>
                  {item.to === '/products' && alerts > 0 ? (
                    <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{alerts}</span>
                  ) : null}
                </NavLink>
              </div>
            )
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Profile Menu
          </div>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
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
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            <LogOut size={16} />
            Logout
          </button>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {currentUser?.name.slice(0, 1) ?? 'U'}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-white">{currentUser?.name}</div>
              <div className="truncate text-[11px] text-slate-400">{currentUser?.email}</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ClipboardList size={16} />
            <span className="capitalize">
              {location.pathname.split('/').filter(Boolean)[0]?.replace('-', ' ') || 'dashboard'}
            </span>
          </div>
          {alerts > 0 ? (
            <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
              {alerts} low / out of stock alert{alerts === 1 ? '' : 's'}
            </div>
          ) : (
            <div className="text-xs text-slate-400">All stock levels healthy</div>
          )}
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
