import { useState, type FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { Field, PrimaryButton, inputClass } from '../components/AuthFrame'
import { emptyReturnLine, useStore } from '../store'
import type { ReturnDestination, ReturnLine, ReturnType } from '../types'

export function ReturnFormPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state, saveReturnOrder } = useStore()

  const typeParam = (searchParams.get('type') as ReturnType) || 'customer'
  const [type, setType] = useState<ReturnType>(typeParam)
  const [partnerId, setPartnerId] = useState('')
  const [warehouseId, setWarehouseId] = useState(state.warehouses[0]?.id || '')
  const [referenceDocNumber, setReferenceDocNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<ReturnLine[]>([emptyReturnLine()])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (type === 'customer' && state.customers.length) {
      setPartnerId(state.customers[0].id)
    } else if (type === 'vendor' && state.vendors.length) {
      setPartnerId(state.vendors[0].id)
    }
  }, [type, state.customers, state.vendors])

  function handleLineChange(index: number, patch: Partial<ReturnLine>) {
    setLines((prev) =>
      prev.map((line, idx) => (idx === index ? { ...line, ...patch } : line)),
    )
  }

  function addLine() {
    setLines((prev) => [...prev, emptyReturnLine()])
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return
    setLines((prev) => prev.filter((_, idx) => idx !== index))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!partnerId) {
      setError(`Please select a ${type === 'customer' ? 'customer' : 'vendor'}.`)
      return
    }
    if (!warehouseId) {
      setError('Please select a warehouse.')
      return
    }
    if (lines.some((l) => !l.productId || l.qty <= 0)) {
      setError('Please choose a product and positive quantity for each line.')
      return
    }

    const partnerName =
      type === 'customer'
        ? state.customers.find((c) => c.id === partnerId)?.name || 'Customer'
        : state.vendors.find((v) => v.id === partnerId)?.companyName || 'Vendor'

    const savedId = saveReturnOrder({
      type,
      partnerId,
      partnerName,
      warehouseId,
      referenceDocNumber,
      notes,
      lines,
      status: type === 'customer' ? 'delivered' : 'received',
    })

    navigate(`/returns/${savedId}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
            New {type === 'customer' ? 'Customer RMA Return' : 'Vendor Return'}
          </h1>
          <p className="text-sm text-fg-muted">Initiate an authorized return with automated inventory tracking.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? <div className="rounded-lg bg-rose-50 p-3.5 text-sm font-medium text-rose-700">{error}</div> : null}

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-fg">Return Parameters</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Return Flow Type">
              <select
                className={inputClass}
                value={type}
                onChange={(e) => setType(e.target.value as ReturnType)}
              >
                <option value="customer">Customer Return (Inbound RMA)</option>
                <option value="vendor">Vendor Return (Outbound Supplier Return)</option>
              </select>
            </Field>

            <Field label={type === 'customer' ? 'Customer Account *' : 'Vendor / Supplier *'}>
              <select className={inputClass} value={partnerId} onChange={(e) => setPartnerId(e.target.value)} required>
                {type === 'customer'
                  ? state.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))
                  : state.vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName} ({v.code})
                      </option>
                    ))}
              </select>
            </Field>

            <Field label="Target Warehouse *">
              <select className={inputClass} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
                {state.warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Reference Order / Invoice Number">
              <input
                className={inputClass}
                placeholder="e.g. SO/00001 or PO/00002"
                value={referenceDocNumber}
                onChange={(e) => setReferenceDocNumber(e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Lines Card */}
        <div className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-fg">Returned Items</h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
            >
              <Plus size={14} /> Add Line
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
                    value={line.qty}
                    onChange={(e) => handleLineChange(idx, { qty: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="col-span-8 sm:col-span-3">
                  <span className="mb-1 block text-xs font-medium text-fg-muted sm:hidden">Reason</span>
                  <input
                    className={inputClass}
                    placeholder="Reason (e.g. Defective)"
                    value={line.reason}
                    onChange={(e) => handleLineChange(idx, { reason: e.target.value })}
                  />
                </div>

                <div className="col-span-10 sm:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-fg-muted sm:hidden">Destination</span>
                  <select
                    className={inputClass}
                    value={line.destination}
                    onChange={(e) => handleLineChange(idx, { destination: e.target.value as ReturnDestination })}
                  >
                    <option value="restock">Restock</option>
                    <option value="damaged">Damaged</option>
                    <option value="scrap">Scrap</option>
                    <option value="inventory_loss">Loss</option>
                  </select>
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
        </div>

        <Field label="Return Notes / Incident Description">
          <textarea
            className={inputClass}
            rows={2}
            placeholder="Details regarding return authorization, courier tracking, customer notes..."
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
              Submit Return Order
            </span>
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}
