import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { hasPermission, hasRole, ROLE_LABELS, PERMISSION_LABELS } from '../lib/rbac'
import { useStore } from '../store'
import type { Permission, Role } from '../types'

interface RequirePermissionProps {
  permission: Permission | Permission[]
  children: ReactNode
  fallback?: ReactNode
}

export function RequirePermission({ permission, children, fallback }: RequirePermissionProps) {
  const { currentUser } = useStore()

  if (!hasPermission(currentUser, permission)) {
    if (fallback !== undefined) return <>{fallback}</>

    const perms = Array.isArray(permission) ? permission : [permission]
    const needed = perms.map((p) => PERMISSION_LABELS[p]?.label || p).join(', ')

    return (
      <div className="mx-auto my-12 max-w-lg rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <ShieldAlert size={28} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-fg">Access Restricted</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Your current role (<span className="font-semibold text-fg">{currentUser ? ROLE_LABELS[currentUser.role] : 'Guest'}</span>) does not have permission to access this resource.
        </p>
        <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs font-mono text-fg-muted">
          Required: {needed}
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/dashboard"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-sm transition hover:bg-accent-hover"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

interface RequireRoleProps {
  role: Role | Role[]
  children: ReactNode
  fallback?: ReactNode
}

export function RequireRole({ role, children, fallback }: RequireRoleProps) {
  const { currentUser } = useStore()

  if (!hasRole(currentUser, role)) {
    if (fallback !== undefined) return <>{fallback}</>

    const roles = Array.isArray(role) ? role : [role]
    const needed = roles.map((r) => ROLE_LABELS[r] || r).join(' or ')

    return (
      <div className="mx-auto my-12 max-w-lg rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <ShieldAlert size={28} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-fg">Role Clearance Required</h2>
        <p className="mt-2 text-sm text-fg-muted">
          This area requires <span className="font-semibold text-fg">{needed}</span> role clearance.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/dashboard"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-sm transition hover:bg-accent-hover"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function usePermission(permission: Permission | Permission[]): boolean {
  const { currentUser } = useStore()
  return hasPermission(currentUser, permission)
}

export function useRole(role: Role | Role[]): boolean {
  const { currentUser } = useStore()
  return hasRole(currentUser, role)
}
