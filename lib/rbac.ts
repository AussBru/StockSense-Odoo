import type { Permission, Role, User } from '../types'

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',
  'inventory.adjust',
  'inventory.approve',
  'warehouse.manage',
  'purchasing.view',
  'purchasing.create',
  'purchasing.approve',
  'sales.view',
  'sales.create',
  'sales.approve',
  'returns.manage',
  'reports.view',
  'reports.export',
  'users.manage',
  'settings.manage',
  'audit.view',
]

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [...ALL_PERMISSIONS],

  inventory_manager: [
    'dashboard.view',
    'products.view',
    'products.create',
    'products.edit',
    'products.delete',
    'inventory.adjust',
    'inventory.approve',
    'warehouse.manage',
    'purchasing.view',
    'sales.view',
    'returns.manage',
    'reports.view',
    'reports.export',
    'audit.view',
  ],

  warehouse_staff: [
    'dashboard.view',
    'products.view',
    'inventory.adjust',
    'purchasing.view',
    'sales.view',
    'returns.manage',
  ],

  purchasing_manager: [
    'dashboard.view',
    'products.view',
    'purchasing.view',
    'purchasing.create',
    'purchasing.approve',
    'returns.manage',
    'reports.view',
    'reports.export',
  ],

  sales_manager: [
    'dashboard.view',
    'products.view',
    'sales.view',
    'sales.create',
    'sales.approve',
    'returns.manage',
    'reports.view',
    'reports.export',
  ],

  auditor: [
    'dashboard.view',
    'products.view',
    'purchasing.view',
    'sales.view',
    'reports.view',
    'reports.export',
    'audit.view',
  ],
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  inventory_manager: 'Inventory Manager',
  warehouse_staff: 'Warehouse Staff',
  purchasing_manager: 'Purchasing Manager',
  sales_manager: 'Sales Manager',
  auditor: 'Auditor & Compliance',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: 'Complete system access: manage users, settings, audit trails, and all business operations.',
  inventory_manager: 'Oversees inventory stock levels, warehouse adjustments, stock valuation, and catalog.',
  warehouse_staff: 'Executes warehouse operational moves: receipts, deliveries, internal transfers, and counts.',
  purchasing_manager: 'Creates and approves purchase orders, manages vendors, and oversees procurement.',
  sales_manager: 'Creates and approves sales orders, manages customer accounts, and coordinates shipments.',
  auditor: 'Read-only access for compliance review, immutable audit trail inspection, and report exports.',
}

export const PERMISSION_LABELS: Record<Permission, { label: string; category: string; description: string }> = {
  'dashboard.view': { label: 'View Dashboard', category: 'Dashboard', description: 'View operational metrics and KPI widgets' },
  'products.view': { label: 'View Products', category: 'Catalog', description: 'Browse products, variants, and stock balances' },
  'products.create': { label: 'Create Products', category: 'Catalog', description: 'Create new SKUs, variants, and barcodes' },
  'products.edit': { label: 'Edit Products', category: 'Catalog', description: 'Update product descriptions, costs, and pricing' },
  'products.delete': { label: 'Delete Products', category: 'Catalog', description: 'Remove products from catalog' },
  'inventory.adjust': { label: 'Create Inventory Adjustments', category: 'Inventory', description: 'Record count differences and stock corrections' },
  'inventory.approve': { label: 'Approve Adjustments', category: 'Inventory', description: 'Authorize high-variance stock write-offs' },
  'warehouse.manage': { label: 'Manage Warehouses', category: 'Warehouse', description: 'Configure warehouses, zones, locations, and putaway rules' },
  'purchasing.view': { label: 'View Purchasing', category: 'Purchasing', description: 'Browse vendors and purchase orders' },
  'purchasing.create': { label: 'Create Purchase Orders', category: 'Purchasing', description: 'Draft and edit purchase order documents' },
  'purchasing.approve': { label: 'Approve Purchase Orders', category: 'Purchasing', description: 'Authorize high-value procurement orders' },
  'sales.view': { label: 'View Sales', category: 'Sales', description: 'Browse customers and sales orders' },
  'sales.create': { label: 'Create Sales Orders', category: 'Sales', description: 'Draft and book sales orders' },
  'sales.approve': { label: 'Approve Sales Orders', category: 'Sales', description: 'Authorize sales orders for fulfillment' },
  'returns.manage': { label: 'Manage Returns', category: 'Returns', description: 'Process customer RMA and vendor returns' },
  'reports.view': { label: 'View Reports', category: 'Reporting', description: 'Access standard and advanced reports' },
  'reports.export': { label: 'Export Reports', category: 'Reporting', description: 'Export report data to CSV and JSON formats' },
  'users.manage': { label: 'Manage Users', category: 'Administration', description: 'Create, update, activate, and assign roles to users' },
  'settings.manage': { label: 'Manage Settings', category: 'Administration', description: 'Configure company profile, approval rules, and alerts' },
  'audit.view': { label: 'View Audit Logs', category: 'Administration', description: 'Inspect immutable system event and compliance logs' },
}

export function hasPermission(user: User | null | undefined, permission: Permission | Permission[]): boolean {
  if (!user) return false
  if (user.active === false) return false
  
  const userPerms = ROLE_PERMISSIONS[user.role] || []
  if (Array.isArray(permission)) {
    return permission.every((p) => userPerms.includes(p))
  }
  return userPerms.includes(permission)
}

export function hasAnyPermission(user: User | null | undefined, permissions: Permission[]): boolean {
  if (!user) return false
  if (user.active === false) return false
  
  const userPerms = ROLE_PERMISSIONS[user.role] || []
  return permissions.some((p) => userPerms.includes(p))
}

export function hasRole(user: User | null | undefined, role: Role | Role[]): boolean {
  if (!user) return false
  if (user.active === false) return false
  
  if (Array.isArray(role)) {
    return role.includes(user.role)
  }
  return user.role === role
}

export function canUser(
  user: User | null | undefined,
  permission: Permission,
): { allowed: boolean; reason?: string } {
  if (!user) {
    return { allowed: false, reason: 'You must be logged in to perform this action.' }
  }
  if (user.active === false) {
    return { allowed: false, reason: 'Your user account is inactive. Please contact an administrator.' }
  }
  if (!hasPermission(user, permission)) {
    const permMeta = PERMISSION_LABELS[permission]
    return {
      allowed: false,
      reason: `Unauthorized: Role '${ROLE_LABELS[user.role] || user.role}' lacks permission '${permMeta?.label || permission}'.`,
    }
  }
  return { allowed: true }
}
