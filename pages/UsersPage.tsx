import { useState, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  UserCheck,
  UserX,
  Shield,
  Edit2,
  Trash2,
  X,
} from 'lucide-react'
import { useStore } from '../store'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '../lib/rbac'
import type { Role, User } from '../types'
import { formatDate } from '../lib/utils'
import { inputClass } from '../components/AuthFrame'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function UsersPage() {
  const { state, currentUser, saveUser, toggleUserStatus, resetUserPassword, deleteUser } = useStore()
  const toast = useToast()

  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<Role>('warehouse_staff')
  const [password, setPassword] = useState('')
  const [active, setActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  // Password reset modal state
  const [pwdModalOpen, setPwdModalOpen] = useState(false)
  const [pwdUser, setPwdUser] = useState<User | null>(null)
  const [newPwd, setNewPwd] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)

  // Confirm delete dialog state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const filteredUsers = useMemo(() => {
    const needle = q.toLowerCase()
    return state.users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter === 'active' && u.active === false) return false
      if (statusFilter === 'inactive' && u.active !== false) return false
      if (
        needle &&
        !`${u.name} ${u.email} ${u.phone} ${ROLE_LABELS[u.role] || u.role}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false
      }
      return true
    })
  }, [state.users, q, roleFilter, statusFilter])

  const openCreateModal = () => {
    setEditingUser(null)
    setName('')
    setEmail('')
    setPhone('')
    setRole('warehouse_staff')
    setPassword('')
    setActive(true)
    setFormError(null)
    setUserModalOpen(true)
  }

  const openEditModal = (u: User) => {
    setEditingUser(u)
    setName(u.name)
    setEmail(u.email)
    setPhone(u.phone || '')
    setRole(u.role)
    setPassword('')
    setActive(u.active !== false)
    setFormError(null)
    setUserModalOpen(true)
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const err = await saveUser({
      id: editingUser?.id,
      name,
      email,
      phone,
      role,
      active,
      password: password || undefined,
    })

    if (err) {
      setFormError(err)
      return
    }

    toast.success(
      editingUser
        ? `User ${name} updated successfully.`
        : `User ${name} created successfully.`,
    )
    setUserModalOpen(false)
  }

  const handleToggleStatus = (u: User) => {
    const err = toggleUserStatus(u.id)
    if (err) {
      toast.error(err)
    } else {
      toast.info(
        `User ${u.name} is now ${u.active === false ? 'Active' : 'Deactivated'}.`,
      )
    }
  }

  const openResetPwd = (u: User) => {
    setPwdUser(u)
    setNewPwd('')
    setPwdError(null)
    setPwdModalOpen(true)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwdUser) return
    setPwdError(null)

    const err = await resetUserPassword(pwdUser.id, newPwd)
    if (err) {
      setPwdError(err)
      return
    }

    toast.success(`Password for ${pwdUser.name} has been reset.`)
    setPwdModalOpen(false)
  }

  const confirmDelete = (u: User) => {
    setDeleteTargetId(u.id)
    setConfirmDeleteOpen(true)
  }

  const handleDelete = () => {
    if (!deleteTargetId) return
    const err = deleteUser(deleteTargetId)
    if (err) {
      toast.error(err)
    } else {
      toast.success('User deleted successfully.')
    }
    setDeleteTargetId(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">User Management</h1>
          <p className="text-sm text-fg-muted">
            Manage system operators, assign permission roles, and oversee account access.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg shadow-sm transition hover:bg-accent-hover"
        >
          <UserPlus size={16} />
          Create New User
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase text-fg-subtle">Total Users</div>
          <div className="mt-1 text-2xl font-bold text-fg">{state.users.length}</div>
          <div className="mt-0.5 text-xs text-fg-muted">Configured operator accounts</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase text-fg-subtle">Active Accounts</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {state.users.filter((u) => u.active !== false).length}
          </div>
          <div className="mt-0.5 text-xs text-fg-muted">With active system access</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase text-fg-subtle">Administrators</div>
          <div className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {state.users.filter((u) => u.role === 'admin').length}
          </div>
          <div className="mt-0.5 text-xs text-fg-muted">Full administrative clearance</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase text-fg-subtle">Deactivated</div>
          <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {state.users.filter((u) => u.active === false).length}
          </div>
          <div className="mt-0.5 text-xs text-fg-muted">Suspended credentials</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-fg-subtle" size={16} />
          <input
            className={`${inputClass} pl-10`}
            placeholder="Search users by name, email, phone, role..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          className={`${inputClass} sm:w-56`}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="admin">Administrator</option>
          <option value="inventory_manager">Inventory Manager</option>
          <option value="warehouse_staff">Warehouse Staff</option>
          <option value="purchasing_manager">Purchasing Manager</option>
          <option value="sales_manager">Sales Manager</option>
          <option value="auditor">Auditor & Compliance</option>
        </select>

        <select
          className={`${inputClass} sm:w-44`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Assigned Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Last Login</th>
                <th className="px-5 py-3.5">Created Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-fg-muted text-sm">
                    No users found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isActive = u.active !== false
                  const isSelf = u.id === currentUser?.id

                  let roleBadgeColor = 'bg-slate-500/10 text-slate-700 dark:text-slate-300'
                  if (u.role === 'admin') roleBadgeColor = 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                  else if (u.role === 'inventory_manager') roleBadgeColor = 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                  else if (u.role === 'warehouse_staff') roleBadgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  else if (u.role === 'purchasing_manager') roleBadgeColor = 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                  else if (u.role === 'sales_manager') roleBadgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  else if (u.role === 'auditor') roleBadgeColor = 'bg-teal-500/15 text-teal-700 dark:text-teal-300'

                  return (
                    <tr key={u.id} className="hover:bg-surface-2/50 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg font-bold text-xs shadow-sm">
                            {u.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-fg flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="rounded-md bg-accent/10 text-fg px-1.5 py-0.2 text-[10px] font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-fg-muted">{u.email}</div>
                            {u.phone && <div className="text-[11px] text-fg-subtle">{u.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeColor}`}>
                          <Shield size={12} />
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                        <div className="mt-1 text-[11px] text-fg-subtle max-w-xs truncate">
                          {ROLE_DESCRIPTIONS[u.role]}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-fg-muted">
                        {u.lastLogin ? formatDate(u.lastLogin) : 'Never'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-fg-muted">
                        {u.createdAt ? formatDate(u.createdAt) : 'Initial Seed'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg transition"
                            title="Edit User"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openResetPwd(u)}
                            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg transition"
                            title="Reset Password"
                          >
                            <KeyRound size={15} />
                          </button>
                          {!isSelf && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                className={`rounded-lg p-1.5 transition ${
                                  isActive
                                    ? 'text-amber-600 hover:bg-amber-500/10'
                                    : 'text-emerald-600 hover:bg-emerald-500/10'
                                }`}
                                title={isActive ? 'Deactivate User' : 'Activate User'}
                              >
                                {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDelete(u)}
                                className="rounded-lg p-1.5 text-fg-muted hover:bg-rose-500/10 hover:text-rose-600 transition"
                                title="Delete User"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUserModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-fg-subtle hover:bg-surface-2 hover:text-fg transition"
            >
              <X size={16} />
            </button>

            <h2 className="text-lg font-bold text-fg">
              {editingUser ? 'Edit User Account' : 'Create New User Account'}
            </h2>
            <p className="mt-1 text-xs text-fg-muted">
              Configure credentials, contact info, and role permissions.
            </p>

            {formError && (
              <div className="mt-3 rounded-xl bg-rose-500/15 p-3 text-xs text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fg">Full Name *</label>
                <input
                  required
                  className={`${inputClass} mt-1`}
                  placeholder="e.g. Elena Rostova"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fg">Email Address *</label>
                  <input
                    required
                    type="email"
                    className={`${inputClass} mt-1`}
                    placeholder="operator@stocksense.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fg">Phone Number</label>
                  <input
                    className={`${inputClass} mt-1`}
                    placeholder="+1 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg">Assigned RBAC Role *</label>
                <select
                  className={`${inputClass} mt-1`}
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <option value="admin">Administrator (Complete Clearance)</option>
                  <option value="inventory_manager">Inventory Manager (Stock, Adjustments, Valuation)</option>
                  <option value="warehouse_staff">Warehouse Staff (Pick, Pack, Ship, Receive)</option>
                  <option value="purchasing_manager">Purchasing Manager (Vendors & POs)</option>
                  <option value="sales_manager">Sales Manager (Customers & SOs)</option>
                  <option value="auditor">Auditor (Compliance & Immutable Logs)</option>
                </select>
                <p className="mt-1 text-[11px] text-fg-subtle leading-normal">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  className={`${inputClass} mt-1`}
                  placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="user-active-toggle"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-line text-accent focus:ring-accent"
                />
                <label htmlFor="user-active-toggle" className="text-xs font-medium text-fg cursor-pointer">
                  Account is Active (permitted to authenticate)
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-fg hover:bg-surface-2 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-fg shadow-sm hover:bg-accent-hover transition"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {pwdModalOpen && pwdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPwdModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setPwdModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-fg-subtle hover:bg-surface-2 hover:text-fg transition"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-fg">Reset User Password</h3>
                <p className="text-xs text-fg-muted">{pwdUser.name} ({pwdUser.email})</p>
              </div>
            </div>

            {pwdError && (
              <div className="mt-3 rounded-xl bg-rose-500/15 p-3 text-xs text-rose-700 dark:text-rose-300">
                {pwdError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fg">New Password *</label>
                <input
                  type="password"
                  required
                  autoFocus
                  className={`${inputClass} mt-1`}
                  placeholder="At least 6 characters"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPwdModalOpen(false)}
                  className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-fg hover:bg-surface-2 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-fg shadow-sm hover:bg-accent-hover transition"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete User Account"
        message="Are you sure you want to permanently delete this user account? This action will be logged in the immutable audit trail."
        confirmLabel="Delete User"
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmDeleteOpen(false)
          setDeleteTargetId(null)
        }}
      />
    </div>
  )
}
