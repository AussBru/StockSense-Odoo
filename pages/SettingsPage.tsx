import { useState } from 'react'
import {
  Building2,
  Boxes,
  Hash,
  ShieldCheck,
  BellRing,
  Calculator,
  Save,
  CheckCircle2,
  Warehouse,
} from 'lucide-react'
import { useStore } from '../store'
import { inputClass } from '../components/AuthFrame'
import { useToast } from '../components/Toast'
import type {
  AlertRulesConfig,
  ApprovalSettings,
  CompanySettings,
  InventorySettings,
} from '../types'

type SettingsTab =
  | 'company'
  | 'inventory'
  | 'sequences'
  | 'approvals'
  | 'alerts'
  | 'warehouses'
  | 'valuation'

export function SettingsPage() {
  const {
    state,
    saveCompanySettings,
    saveInventorySettings,
    saveApprovalSettings,
    saveAlertRules,
    saveSequences,
  } = useStore()

  const toast = useToast()
  const [activeTab, setActiveTab] = useState<SettingsTab>('company')

  // Form states
  const [company, setCompany] = useState<CompanySettings>(
    state.companySettings || {
      name: 'StockSense Enterprise Ltd.',
      legalName: 'StockSense Logistics & Inventory Corp.',
      taxNumber: 'US-EIN-984120491',
      email: 'operations@stocksense.io',
      phone: '+1 (555) 839-2041',
      address: '100 Innovation Blvd, Suite 400, Austin, TX 78701',
      currency: '$',
      website: 'https://stocksense.io',
    },
  )

  const [inventory, setInventory] = useState<InventorySettings>(
    state.inventorySettings || {
      defaultWarehouseId: state.warehouses[0]?.id || '',
      negativeStockPolicy: 'disallow',
      enableLotTracking: true,
      enableSerialTracking: true,
      expiryAlertDays: 30,
      valuationMethod: 'wac',
    },
  )

  const [approvals, setApprovals] = useState<ApprovalSettings>(
    state.approvalSettings || {
      enabled: true,
      poThreshold: 5000,
      adjustmentValueThreshold: 1000,
      returnThreshold: 2000,
    },
  )

  const [alerts, setAlerts] = useState<AlertRulesConfig>(
    state.alertRules || {
      lowStockThresholdDays: 14,
      expiryWarningDays: 30,
      poOverdueNotice: true,
      deliveryDelayNotice: true,
      varianceThresholdValue: 500,
      maxInventoryValueAlert: 1000000,
    },
  )

  const [seqs, setSeqs] = useState<Record<string, number>>({
    receipt: state.sequences.receipt || 1,
    delivery: state.sequences.delivery || 1,
    internal: state.sequences.internal || 1,
    adjustment: state.sequences.adjustment || 1,
    po: state.sequences.po || 4,
    so: state.sequences.so || 4,
    'ret-c': state.sequences['ret-c'] || 1,
    'ret-v': state.sequences['ret-v'] || 1,
    lot: state.sequences.lot || 2,
    serial: state.sequences.serial || 4,
  })

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault()
    const err = saveCompanySettings(company)
    if (err) toast.error(err)
    else toast.success('Company profile updated.')
  }

  const handleSaveInventory = (e: React.FormEvent) => {
    e.preventDefault()
    const err = saveInventorySettings(inventory)
    if (err) toast.error(err)
    else toast.success('Inventory settings saved.')
  }

  const handleSaveApprovals = (e: React.FormEvent) => {
    e.preventDefault()
    const err = saveApprovalSettings(approvals)
    if (err) toast.error(err)
    else toast.success('Approval thresholds & workflow rules saved.')
  }

  const handleSaveAlerts = (e: React.FormEvent) => {
    e.preventDefault()
    const err = saveAlertRules(alerts)
    if (err) toast.error(err)
    else toast.success('Alert rules updated.')
  }

  const handleSaveSeqs = (e: React.FormEvent) => {
    e.preventDefault()
    const err = saveSequences(seqs)
    if (err) toast.error(err)
    else toast.success('Numbering sequence counters updated.')
  }

  const tabs: { key: SettingsTab; label: string; icon: any }[] = [
    { key: 'company', label: 'Company Profile', icon: Building2 },
    { key: 'inventory', label: 'Inventory Rules', icon: Boxes },
    { key: 'approvals', label: 'Approval Workflows', icon: ShieldCheck },
    { key: 'alerts', label: 'Alert & Notification Rules', icon: BellRing },
    { key: 'sequences', label: 'Numbering Sequences', icon: Hash },
    { key: 'valuation', label: 'Valuation & Costing', icon: Calculator },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">Enterprise Settings</h1>
        <p className="text-sm text-fg-muted">
          Configure enterprise parameters, numbering sequences, workflow approval thresholds, and costing policies.
        </p>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  isActive
                    ? 'bg-accent text-accent-fg shadow-sm'
                    : 'text-fg-soft hover:bg-surface hover:text-fg'
                }`}
              >
                <Icon size={17} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content Box */}
        <div className="flex-1 rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
          {/* 1. COMPANY PROFILE */}
          {activeTab === 'company' && (
            <form onSubmit={handleSaveCompany} className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-fg">Company & Entity Profile</h2>
                <p className="text-xs text-fg-muted">
                  Used on purchase orders, delivery notes, receipts, invoices, and compliance headers.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-fg">Trading / Display Name *</label>
                  <input
                    required
                    className={`${inputClass} mt-1`}
                    value={company.name}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fg">Legal Registered Entity Name</label>
                  <input
                    className={`${inputClass} mt-1`}
                    value={company.legalName}
                    onChange={(e) => setCompany({ ...company, legalName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-fg">Tax ID / GST / VAT Number</label>
                  <input
                    className={`${inputClass} mt-1`}
                    value={company.taxNumber}
                    onChange={(e) => setCompany({ ...company, taxNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fg">Currency Symbol *</label>
                  <input
                    required
                    className={`${inputClass} mt-1`}
                    value={company.currency}
                    onChange={(e) => setCompany({ ...company, currency: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fg">Website</label>
                  <input
                    className={`${inputClass} mt-1`}
                    value={company.website || ''}
                    onChange={(e) => setCompany({ ...company, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-fg">Operations Email Address</label>
                  <input
                    type="email"
                    className={`${inputClass} mt-1`}
                    value={company.email}
                    onChange={(e) => setCompany({ ...company, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fg">Primary Phone Number</label>
                  <input
                    className={`${inputClass} mt-1`}
                    value={company.phone}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg">Headquarters / Physical Address</label>
                <textarea
                  rows={2}
                  className={`${inputClass} mt-1`}
                  value={company.address}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-line">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-accent-fg shadow-sm hover:bg-accent-hover transition"
                >
                  <Save size={15} />
                  Save Company Profile
                </button>
              </div>
            </form>
          )}

          {/* 2. INVENTORY RULES */}
          {activeTab === 'inventory' && (
            <form onSubmit={handleSaveInventory} className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-fg">Inventory Rules & Tracking Policies</h2>
                <p className="text-xs text-fg-muted">
                  Configure inventory validation guards, negative stock behavior, and tracking modules.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg">Default Warehouse Facility</label>
                <select
                  className={`${inputClass} mt-1`}
                  value={inventory.defaultWarehouseId}
                  onChange={(e) => setInventory({ ...inventory, defaultWarehouseId: e.target.value })}
                >
                  {state.warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg">Negative Stock Policy</label>
                <select
                  className={`${inputClass} mt-1`}
                  value={inventory.negativeStockPolicy}
                  onChange={(e) =>
                    setInventory({
                      ...inventory,
                      negativeStockPolicy: e.target.value as 'disallow' | 'warn',
                    })
                  }
                >
                  <option value="disallow">Disallow — Strictly prevent fulfillment if available stock is insufficient</option>
                  <option value="warn">Warn Only — Allow override with managerial confirmation</option>
                </select>
                <p className="mt-1 text-[11px] text-fg-subtle">
                  Recommended: 'Disallow' ensures inventory integrity and prevents phantom stock.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inventory.enableLotTracking}
                    onChange={(e) => setInventory({ ...inventory, enableLotTracking: e.target.checked })}
                    className="rounded border-line text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="text-xs font-semibold text-fg">Enable Lot / Batch Number Tracking</span>
                    <p className="text-[11px] text-fg-muted">Track batches, manufacturing dates, and FEFO expiry rotations.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inventory.enableSerialTracking}
                    onChange={(e) => setInventory({ ...inventory, enableSerialTracking: e.target.checked })}
                    className="rounded border-line text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="text-xs font-semibold text-fg">Enable Unique Serial Number Tracking</span>
                    <p className="text-[11px] text-fg-muted">Maintain individual lifecycle tracking for high-value capital assets.</p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg">Lot Expiry Alert Threshold (Days in advance)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className={`${inputClass} mt-1 sm:w-48`}
                  value={inventory.expiryAlertDays}
                  onChange={(e) => setInventory({ ...inventory, expiryAlertDays: Number(e.target.value) || 30 })}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-line">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-accent-fg shadow-sm hover:bg-accent-hover transition"
                >
                  <Save size={15} />
                  Save Inventory Rules
                </button>
              </div>
            </form>
          )}

          {/* 3. APPROVAL WORKFLOWS */}
          {activeTab === 'approvals' && (
            <form onSubmit={handleSaveApprovals} className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-fg">Configurable Approval Workflows</h2>
                <p className="text-xs text-fg-muted">
                  Require managerial sign-off before high-value procurement orders or high-variance stock write-offs can be posted.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-line bg-surface-2">
                <input
                  type="checkbox"
                  checked={approvals.enabled}
                  onChange={(e) => setApprovals({ ...approvals, enabled: e.target.checked })}
                  className="rounded border-line text-accent focus:ring-accent h-4 w-4"
                />
                <div>
                  <span className="text-sm font-bold text-fg">Enforce Approval Requirements</span>
                  <p className="text-xs text-fg-muted">Transactions exceeding configured limits will require explicit manager approval before completion.</p>
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="rounded-xl border border-line p-4">
                  <label className="block text-xs font-semibold text-fg">Purchase Order Threshold ($)</label>
                  <input
                    type="number"
                    min={0}
                    className={`${inputClass} mt-1`}
                    value={approvals.poThreshold}
                    onChange={(e) => setApprovals({ ...approvals, poThreshold: Number(e.target.value) || 0 })}
                  />
                  <p className="mt-1 text-[11px] text-fg-subtle">
                    POs above this amount require Purchasing Manager or Admin approval before sending.
                  </p>
                </div>

                <div className="rounded-xl border border-line p-4">
                  <label className="block text-xs font-semibold text-fg">Inventory Variance Threshold ($)</label>
                  <input
                    type="number"
                    min={0}
                    className={`${inputClass} mt-1`}
                    value={approvals.adjustmentValueThreshold}
                    onChange={(e) => setApprovals({ ...approvals, adjustmentValueThreshold: Number(e.target.value) || 0 })}
                  />
                  <p className="mt-1 text-[11px] text-fg-subtle">
                    Stock adjustments with value discrepancy above this require Inventory Manager approval.
                  </p>
                </div>

                <div className="rounded-xl border border-line p-4">
                  <label className="block text-xs font-semibold text-fg">Return Order Threshold ($)</label>
                  <input
                    type="number"
                    min={0}
                    className={`${inputClass} mt-1`}
                    value={approvals.returnThreshold}
                    onChange={(e) => setApprovals({ ...approvals, returnThreshold: Number(e.target.value) || 0 })}
                  />
                  <p className="mt-1 text-[11px] text-fg-subtle">
                    Returns above this total amount require authorization before restocking or scrap.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-line">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-accent-fg shadow-sm hover:bg-accent-hover transition"
                >
                  <Save size={15} />
                  Save Approval Thresholds
                </button>
              </div>
            </form>
          )}

          {/* 4. ALERTS & NOTIFICATIONS */}
          {activeTab === 'alerts' && (
            <form onSubmit={handleSaveAlerts} className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-fg">Automated Alert Rules</h2>
                <p className="text-xs text-fg-muted">
                  Configure proactive triggers for replenishment notices, delay tracking, and stockout warnings.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alerts.poOverdueNotice}
                    onChange={(e) => setAlerts({ ...alerts, poOverdueNotice: e.target.checked })}
                    className="rounded border-line text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="text-xs font-semibold text-fg">Alert on Overdue Purchase Orders</span>
                    <p className="text-[11px] text-fg-muted">Trigger warning when vendor expected delivery date passes without receiving goods.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alerts.deliveryDelayNotice}
                    onChange={(e) => setAlerts({ ...alerts, deliveryDelayNotice: e.target.checked })}
                    className="rounded border-line text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="text-xs font-semibold text-fg">Alert on Delivery Order Delays</span>
                    <p className="text-[11px] text-fg-muted">Warn when outbound customer shipments exceed scheduled shipment dates.</p>
                  </div>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-fg">Stockout Risk Horizon (Days of consumption)</label>
                  <input
                    type="number"
                    min={1}
                    className={`${inputClass} mt-1`}
                    value={alerts.lowStockThresholdDays}
                    onChange={(e) => setAlerts({ ...alerts, lowStockThresholdDays: Number(e.target.value) || 14 })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fg">Lot Expiry Notice (Days before expiry)</label>
                  <input
                    type="number"
                    min={1}
                    className={`${inputClass} mt-1`}
                    value={alerts.expiryWarningDays}
                    onChange={(e) => setAlerts({ ...alerts, expiryWarningDays: Number(e.target.value) || 30 })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-line">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-accent-fg shadow-sm hover:bg-accent-hover transition"
                >
                  <Save size={15} />
                  Save Alert Rules
                </button>
              </div>
            </form>
          )}

          {/* 5. NUMBERING SEQUENCES */}
          {activeTab === 'sequences' && (
            <form onSubmit={handleSaveSeqs} className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-fg">Document Numbering Sequences</h2>
                <p className="text-xs text-fg-muted">
                  Auto-increment counters for documents, purchase orders, sales orders, and tracking records.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-line p-3.5">
                  <div className="text-xs font-bold text-fg">Receipts (WH/IN/...)</div>
                  <input
                    type="number"
                    min={1}
                    className={`${inputClass} mt-1`}
                    value={seqs.receipt || 1}
                    onChange={(e) => setSeqs({ ...seqs, receipt: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="rounded-xl border border-line p-3.5">
                  <div className="text-xs font-bold text-fg">Deliveries (WH/OUT/...)</div>
                  <input
                    type="number"
                    min={1}
                    className={`${inputClass} mt-1`}
                    value={seqs.delivery || 1}
                    onChange={(e) => setSeqs({ ...seqs, delivery: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="rounded-xl border border-line p-3.5">
                  <div className="text-xs font-bold text-fg">Transfers (WH/INT/...)</div>
                  <input
                    type="number"
                    min={1}
                    className={`${inputClass} mt-1`}
                    value={seqs.internal || 1}
                    onChange={(e) => setSeqs({ ...seqs, internal: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="rounded-xl border border-line p-3.5">
                  <div className="text-xs font-bold text-fg">Adjustments (WH/ADJ/...)</div>
                  <input
                    type="number"
                    min={1}
                    className={`${inputClass} mt-1`}
                    value={seqs.adjustment || 1}
                    onChange={(e) => setSeqs({ ...seqs, adjustment: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="rounded-xl border border-line p-3.5">
                  <div className="text-xs font-bold text-fg">Purchase Orders (PO-...)</div>
                  <input
                    type="number"
                    min={1}
                    className={`${inputClass} mt-1`}
                    value={seqs.po || 1}
                    onChange={(e) => setSeqs({ ...seqs, po: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="rounded-xl border border-line p-3.5">
                  <div className="text-xs font-bold text-fg">Sales Orders (SO-...)</div>
                  <input
                    type="number"
                    min={1}
                    className={`${inputClass} mt-1`}
                    value={seqs.so || 1}
                    onChange={(e) => setSeqs({ ...seqs, so: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-line">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-accent-fg shadow-sm hover:bg-accent-hover transition"
                >
                  <Save size={15} />
                  Save Sequence Counters
                </button>
              </div>
            </form>
          )}

          {/* 6. VALUATION & COSTING */}
          {activeTab === 'valuation' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-fg">Valuation & Costing Method</h2>
                <p className="text-xs text-fg-muted">
                  Configure inventory asset accounting policy.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div
                  onClick={() => setInventory({ ...inventory, valuationMethod: 'wac' })}
                  className={`cursor-pointer rounded-2xl border p-5 transition ${
                    inventory.valuationMethod === 'wac'
                      ? 'border-accent bg-surface-2 ring-1 ring-accent'
                      : 'border-line bg-surface hover:bg-surface-2/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg text-sm">Weighted Average Cost (WAC)</span>
                    {inventory.valuationMethod === 'wac' && (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-fg-muted leading-relaxed">
                    Recalculates unit cost automatically upon every inbound purchase order receiving event:
                  </p>
                  <div className="mt-3 rounded-xl bg-surface p-2.5 font-mono text-[11px] text-fg-muted">
                    New Cost = (Old Stock × Old Cost + New Qty × New Cost) / Total Qty
                  </div>
                  <span className="mt-3 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Recommended / Active
                  </span>
                </div>

                <div
                  onClick={() => setInventory({ ...inventory, valuationMethod: 'fifo' })}
                  className={`cursor-pointer rounded-2xl border p-5 transition ${
                    inventory.valuationMethod === 'fifo'
                      ? 'border-accent bg-surface-2 ring-1 ring-accent'
                      : 'border-line bg-surface hover:bg-surface-2/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg text-sm">First In, First Out (FIFO)</span>
                    {inventory.valuationMethod === 'fifo' && (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-fg-muted leading-relaxed">
                    Assumes the oldest inventory items are sold and consumed first. Requires strict lot/batch costing.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    const err = saveInventorySettings(inventory)
                    if (err) toast.error(err)
                    else toast.success('Valuation method saved.')
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-accent-fg shadow-sm hover:bg-accent-hover transition"
                >
                  <Save size={15} />
                  Save Costing Method
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
