import { useState, type FormEvent, useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { Field, PrimaryButton, inputClass } from '../components/AuthFrame'
import { emptySoLine, useStore } from '../store'
import type { SalesOrderLine } from '../types'

export function SalesOrderFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state, saveSalesOrder } = useStore()

  const existing = id ? state.salesOrders.find((s) => s.id === id) : null
  const preselectedCustomerId = searchParams.get('customerId') || ''

  const [customerId, setCustomerId] = useState(preselectedCustomerId || state.customers[0]?.id || '')
  const [warehouseId, setWarehouseId] = useState(state.warehouses[0]?.id || '')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10))
  const [currency, setCurrency] = useState('USD')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<SalesOrderLine[]>([emptySoLine()])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existing) {
      setCustomerId(existing.customerId)
      setWarehouseId(existing.warehouseId)
      setOrderDate(existing.orderDate)
      setDeliveryDate(existing.deliveryDate)
      setCurrency(existing.currency)
      setNotes(existing.notes)
      setLines(existing.lines)
    }
  }, [existing])

  function handleLineChange(index: number, patch: Partial<SalesOrderLine>) {
    setLines((prev) =>
      prev.map((line, idx) => {
        if (idx !== index) return line
        const updated = { ...line, ...patch }

        // If product changed, auto-fill unitPrice from product salesPrice
        if (patch.productId && patch.productId !== line.productId) {
          const prod = state.products.find((p) => p.id === patch.productId)
          if (prod && prod.salesPrice) {
            updated.unitPrice = prod.salesPrice
          }
        }

        const discountAmt = (updated.qty * updated.unitPrice * (updated.discount || 0)) / 100
        const subtotal = updated.qty * updated.unitPrice - discountAmt
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
    setLines((prev) => [...prev, emptySoLine()])
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

    if (!customerId) {
      setError('Please select a customer.')
      return
    }
    if (!warehouseId) {
      setError('Please select a warehouse.')
      return
    }
    if (lines.some((l) => !l.productId || l.qty <= 0)) {
      setError('Please select a product and enter a valid quantity (> 0) for each line.')
      return
    }

    const savedId = saveSalesOrder({
      id: existing?.id,
      number: existing?.number,
      customerId,
      warehouseId,
      orderDate,
      deliveryDate,
      currency,
      notes,
      lines,
      status: existing?.status || 'draft',
    })

    navigate(`/sales-orders/${savedId}`)
  }

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
            {existing ? `Edit Sales Order ${existing.number}` : 'New Sales Order'}
          </h1>
          <p className="text-sm text-fg-muted">Create a customer order with automated stock reservations.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? <div className="rounded-lg bg-rose-50 p-3.5 text-sm font-medium text-rose-700">{error}</div> : null}

        {/* Customer & Warehouse Header */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-fg">Customer & Warehouse Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer Account *">
              <select className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">Select a customer...</option>
                {state.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fulfillment Warehouse *">
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

            <Field label="Target Delivery Date">
              <input
                className={inputClass}
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
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
          </div>
        </div>

        {/* Order Lines Card */}
        <div className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-fg">Products & Pricing</h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
            >
              <Plus size={14} /> Add Product
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
                    value={line.qty}
                    onChange={(e) => handleLineChange(idx, { qty: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-fg-muted sm:hidden">Unit Price ($)</span>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Price"
                    value={line.unitPrice}
                    onChange={(e) => handleLineChange(idx, { unitPrice: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="col-span-4 sm:col-span-1">
                  <span className="mb-1 block text-xs font-medium text-fg-muted sm:hidden">Disc %</span>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Disc %"
                    value={line.discount}
                    onChange={(e) => handleLineChange(idx, { discount: Number(e.target.value) })}
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
            <Plus size={14} /> Add another product line
          </button>

          {/* Totals */}
          <div className="flex flex-col items-end gap-1.5 border-t border-line-soft pt-4 text-sm">
            <div className="flex w-64 justify-between text-fg-soft">
              <span>Subtotal:</span>
              <span className="font-semibold text-fg">${orderSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex w-64 justify-between text-fg-soft">
              <span>Tax (8%):</span>
              <span className="font-semibold text-fg">${orderTax.toFixed(2)}</span>
            </div>
            <div className="flex w-64 justify-between border-t border-line pt-1.5 text-base font-bold text-fg">
              <span>Order Total:</span>
              <span className="text-emerald-700">${orderTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <Field label="Special Delivery Instructions & Customer Notes">
          <textarea
            className={inputClass}
            rows={2}
            placeholder="Special delivery gate, contact on arrival, packaging preferences..."
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
              {existing ? 'Save Changes' : 'Create Sales Order'}
            </span>
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}
