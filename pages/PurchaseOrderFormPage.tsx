import { useState, type FormEvent, useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { Field, PrimaryButton, inputClass } from '../components/AuthFrame'
import { emptyPoLine, useStore } from '../store'
import type { PurchaseOrderLine } from '../types'

export function PurchaseOrderFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state, savePurchaseOrder } = useStore()

  const existing = id ? state.purchaseOrders.find((p) => p.id === id) : null
  const preselectedVendorId = searchParams.get('vendorId') || ''
  const preselectedProductId = searchParams.get('productId') || ''
  const preselectedQty = Number(searchParams.get('suggestedQty')) || 10

  const [vendorId, setVendorId] = useState(preselectedVendorId || state.vendors[0]?.id || '')
  const [warehouseId, setWarehouseId] = useState(state.warehouses[0]?.id || '')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(new Date().toISOString().slice(0, 10))
  const [currency, setCurrency] = useState('USD')
  const [notes, setNotes] = useState('')
  const [allowOverReceipt, setAllowOverReceipt] = useState(false)
  const [lines, setLines] = useState<PurchaseOrderLine[]>([emptyPoLine()])
  const [error, setError] = useState<string | null>(null)

  // Auto-calculate expected date based on vendor lead time
  function updateVendor(vId: string) {
    setVendorId(vId)
    const v = state.vendors.find((item) => item.id === vId)
    if (v) {
      const days = v.leadTime || 7
      const d = new Date(orderDate)
      d.setDate(d.getDate() + days)
      setExpectedDeliveryDate(d.toISOString().slice(0, 10))
    }
  }

  useEffect(() => {
    if (existing) {
      setVendorId(existing.vendorId)
      setWarehouseId(existing.warehouseId)
      setOrderDate(existing.orderDate)
      setExpectedDeliveryDate(existing.expectedDeliveryDate)
      setCurrency(existing.currency)
      setNotes(existing.notes)
      setAllowOverReceipt(Boolean(existing.allowOverReceipt))
      setLines(existing.lines)
    } else if (preselectedProductId) {
      // Pre-fill from reorder suggestion
      const prod = state.products.find((p) => p.id === preselectedProductId)
      const cost = prod?.costPrice ?? 25
      const subtotal = preselectedQty * cost
      const tax = subtotal * 0.1
      setLines([
        {
          id: 'pol_init',
          productId: preselectedProductId,
          orderedQty: preselectedQty,
          receivedQty: 0,
          unitCost: cost,
          taxRate: 10,
          subtotal,
          tax,
          total: subtotal + tax,
        },
      ])
    }
  }, [existing, preselectedProductId, preselectedQty])

  function handleLineChange(index: number, patch: Partial<PurchaseOrderLine>) {
    setLines((prev) =>
      prev.map((line, idx) => {
        if (idx !== index) return line
        const updated = { ...line, ...patch }

        // If product changed, auto-fill unitCost
        if (patch.productId && patch.productId !== line.productId) {
          const prod = state.products.find((p) => p.id === patch.productId)
          if (prod && prod.costPrice) {
            updated.unitCost = prod.costPrice
          }
        }

        const subtotal = updated.orderedQty * updated.unitCost
        const tax = subtotal * ((updated.taxRate || 0) / 100)
        return {
          ...updated,
          subtotal: Math.round(subtotal * 100) / 100,
          tax: Math.round(tax * 100) / 100,
          total: Math.round((subtotal + tax) * 100) / 100,
        }
      }),
    )
  }

  function addLine() {
    setLines((prev) => [...prev, emptyPoLine()])
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return
    setLines((prev) => prev.filter((_, idx) => idx !== index))
  }

  const orderSubtotal = lines.reduce((sum, l) => sum + (l.subtotal || 0), 0)
  const orderTax = lines.reduce((sum, l) => sum + (l.tax || 0), 0)
  const orderTotal = orderSubtotal + orderTax

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!vendorId) {
      setError('Please select a supplier / vendor.')
      return
    }
    if (!warehouseId) {
      setError('Please select a destination warehouse.')
      return
    }
    if (lines.some((l) => !l.productId || l.orderedQty <= 0)) {
      setError('Please select a product and enter a valid ordered quantity (> 0) for all lines.')
      return
    }

    const savedId = savePurchaseOrder({
      id: existing?.id,
      number: existing?.number,
      vendorId,
      warehouseId,
      orderDate,
      expectedDeliveryDate,
      currency,
      notes,
      lines,
      allowOverReceipt,
      status: existing?.status || 'draft',
    })

    navigate(`/purchase-orders/${savedId}`)
  }

  const selectedVendor = state.vendors.find((v) => v.id === vendorId)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted hover:bg-surface-2"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-fg">
            {existing ? `Edit Purchase Order ${existing.number}` : 'New Purchase Order'}
          </h1>
          <p className="text-sm text-fg-muted">Create a formal procurement order for suppliers.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? <div className="rounded-lg bg-rose-50 p-3.5 text-sm font-medium text-rose-700">{error}</div> : null}

        {/* PO Header Information */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-fg">Supplier & Destination</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Field label="Vendor / Supplier *">
                <select className={inputClass} value={vendorId} onChange={(e) => updateVendor(e.target.value)} required>
                  <option value="">Select a vendor...</option>
                  {state.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.companyName} ({v.code} - {v.leadTime}d lead)
                    </option>
                  ))}
                </select>
              </Field>
              {selectedVendor ? (
                <div className="mt-1 text-xs text-fg-muted">
                  Contact: {selectedVendor.contactPerson || '—'} · Terms: {selectedVendor.paymentTerms || 'Net 30'}
                </div>
              ) : null}
            </div>

            <Field label="Destination Warehouse *">
              <select className={inputClass} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
                {state.warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Order Date">
              <input
                className={inputClass}
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </Field>

            <Field label="Expected Delivery Date">
              <input
                className={inputClass}
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                required
              />
            </Field>

            <Field label="Currency">
              <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </Field>

            <div className="flex items-center pt-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={allowOverReceipt}
                  onChange={(e) => setAllowOverReceipt(e.target.checked)}
                  className="rounded border-line text-brand"
                />
                <span>Allow Over-Receipt (accept qty above order)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Product Lines Card */}
        <div className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-fg">Products to Order</h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
            >
              <Plus size={14} /> Add Product Line
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div
                key={line.id || idx}
                className="grid grid-cols-12 items-center gap-2 rounded-xl border border-line-soft bg-surface-2/50 p-3"
              >
                <div className="col-span-12 sm:col-span-4">
                  <span className="mb-1 block text-xs font-medium text-fg-muted sm:hidden">Product</span>
                  <select
                    className={inputClass}
                    value={line.productId}
                    onChange={(e) => handleLineChange(idx, { productId: e.target.value })}
                    required
                  >
                    <option value="">Select product...</option>
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-fg-muted sm:hidden">Qty</span>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={line.orderedQty}
                    onChange={(e) => handleLineChange(idx, { orderedQty: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-fg-muted sm:hidden">Unit Cost ($)</span>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Cost"
                    value={line.unitCost}
                    onChange={(e) => handleLineChange(idx, { unitCost: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="col-span-4 sm:col-span-1">
                  <span className="mb-1 block text-xs font-medium text-fg-muted sm:hidden">Tax %</span>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    placeholder="Tax"
                    value={line.taxRate}
                    onChange={(e) => handleLineChange(idx, { taxRate: Number(e.target.value) })}
                  />
                </div>

                <div className="col-span-10 sm:col-span-2 text-right font-semibold text-fg">
                  <span className="mr-2 text-xs font-normal text-fg-subtle sm:hidden">Total:</span>$
                  {line.total?.toFixed(2) || '0.00'}
                </div>

                <div className="col-span-2 sm:col-span-1 text-right">
                  <button
                    type="button"
                    disabled={lines.length <= 1}
                    onClick={() => removeLine(idx)}
                    className="p-1.5 text-fg-subtle hover:text-rose-600 disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-xs font-semibold text-fg-soft hover:border-brand hover:text-brand"
          >
            <Plus size={14} /> Add another line
          </button>

          {/* Totals */}
          <div className="flex flex-col items-end gap-1.5 border-t border-line-soft pt-4 text-sm">
            <div className="flex w-64 justify-between text-fg-soft">
              <span>Subtotal:</span>
              <span className="font-semibold text-fg">${orderSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex w-64 justify-between text-fg-soft">
              <span>Estimated Tax:</span>
              <span className="font-semibold text-fg">${orderTax.toFixed(2)}</span>
            </div>
            <div className="flex w-64 justify-between border-t border-line pt-1.5 text-base font-bold text-fg">
              <span>Order Total:</span>
              <span className="text-emerald-700">${orderTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <Field label="Order Notes & Vendor Instructions">
          <textarea
            className={inputClass}
            rows={2}
            placeholder="Special handling instructions, delivery windows, packaging requirements..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-end gap-3 border-t border-line-soft pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-fg-soft hover:bg-surface-2"
          >
            Cancel
          </button>
          <PrimaryButton>
            <span className="flex items-center justify-center gap-1.5">
              <Save size={16} />
              {existing ? 'Save Changes' : 'Create Purchase Order'}
            </span>
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}
