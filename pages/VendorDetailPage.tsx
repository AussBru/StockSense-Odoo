import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Clock, Edit, FileText, Mail, MapPin, Phone, Plus, Tag } from 'lucide-react'
import { StatusBadge } from '../components/Badges'
import { useStore } from '../store'

export function VendorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, toggleVendorStatus } = useStore()

  const vendor = useMemo(() => state.vendors.find((v) => v.id === id), [state.vendors, id])

  const vendorPos = useMemo(() => {
    return state.purchaseOrders.filter((p) => p.vendorId === id)
  }, [state.purchaseOrders, id])

  if (!vendor) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-fg">Vendor not found</h2>
        <p className="mt-1 text-sm text-fg-muted">The vendor with ID "{id}" does not exist.</p>
        <Link to="/vendors" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Back to vendors list
        </Link>
      </div>
    )
  }

  const totalSpent = vendorPos
    .filter((p) => p.status === 'received' || p.status === 'partial')
    .reduce((sum, p) => sum + p.total, 0)
  const completedOrders = vendorPos.filter((p) => p.status === 'received').length
  const pendingOrders = vendorPos.filter((p) => p.status === 'sent' || p.status === 'partial').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/vendors')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted hover:bg-surface-2"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-fg">{vendor.companyName}</h1>
              <StatusBadge status={vendor.status} />
            </div>
            <div className="font-mono text-xs text-fg-subtle">Code: {vendor.code}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/purchase-orders/new?vendorId=${vendor.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-accent-fg shadow-sm hover:bg-brand-dark"
          >
            <Plus size={16} />
            Create Purchase Order
          </Link>
          <Link
            to={`/vendors/${vendor.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg hover:bg-surface-2"
          >
            <Edit size={16} />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => toggleVendorStatus(vendor.id)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
              vendor.status === 'active'
                ? 'border-rose-200 bg-surface text-rose-600 hover:bg-rose-50'
                : 'border-emerald-200 bg-surface text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            {vendor.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Performance Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-fg-muted">Total Orders</div>
          <div className="mt-2 text-2xl font-bold text-fg">{vendorPos.length}</div>
          <div className="mt-1 text-xs text-fg-subtle">
            {completedOrders} fulfilled · {pendingOrders} pending
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-fg-muted">Total Spend</div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">${totalSpent.toLocaleString()}</div>
          <div className="mt-1 text-xs text-fg-subtle">Fulfilled purchase order value</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-fg-muted">Lead Time</div>
          <div className="mt-2 text-2xl font-bold text-fg">{vendor.leadTime} days</div>
          <div className="mt-1 text-xs text-fg-subtle">Standard delivery expectation</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-fg-muted">Payment Terms</div>
          <div className="mt-2 text-xl font-bold text-fg">{vendor.paymentTerms || 'Net 30'}</div>
          <div className="mt-1 text-xs text-fg-subtle">Tax ID: {vendor.taxNumber || '—'}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vendor Profile Card */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-fg">Vendor Details</h2>
            <div className="space-y-3.5 text-sm">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">Contact Person</span>
                <div className="font-medium text-fg">{vendor.contactPerson || 'Not specified'}</div>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">Email</span>
                <div className="flex items-center gap-1.5 text-fg">
                  <Mail size={14} className="text-fg-subtle" />
                  <a href={`mailto:${vendor.email}`} className="text-brand hover:underline">
                    {vendor.email}
                  </a>
                </div>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">Phone</span>
                <div className="flex items-center gap-1.5 text-fg">
                  <Phone size={14} className="text-fg-subtle" />
                  <span>{vendor.phone || '—'}</span>
                </div>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">Address</span>
                <div className="flex items-start gap-1.5 text-fg">
                  <MapPin size={14} className="mt-0.5 text-fg-subtle" />
                  <span>{vendor.address || '—'}</span>
                </div>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">Tax / GST Number</span>
                <div className="font-mono text-xs text-fg">{vendor.taxNumber || '—'}</div>
              </div>
              {vendor.notes ? (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">Notes</span>
                  <p className="mt-1 rounded-lg bg-surface-2 p-2.5 text-xs text-fg-soft">{vendor.notes}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Purchase History Table */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-fg">Purchase Order History</h2>
            <Link
              to={`/purchase-orders/new?vendorId=${vendor.id}`}
              className="text-xs font-semibold text-brand hover:underline"
            >
              + Create new PO
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-surface-2 text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Order Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Lines</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {vendorPos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-fg-subtle">
                      No purchase orders recorded for this vendor yet.
                    </td>
                  </tr>
                ) : (
                  vendorPos.map((po) => (
                    <tr key={po.id} className="transition hover:bg-surface-2/70">
                      <td className="px-4 py-3 font-semibold">
                        <Link to={`/purchase-orders/${po.id}`} className="text-brand hover:underline">
                          {po.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-soft">{po.orderDate}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={po.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-soft">
                        {po.lines.length} item{po.lines.length === 1 ? '' : 's'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-fg">
                        ${po.total.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
