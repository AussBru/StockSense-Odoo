import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Field, inputClass } from '../components/AuthFrame'
import { UOMS, qtyAt, stockByLocation, totalOnHand } from '../lib/inventory'
import { useStore } from '../store'

export function ProductsPage() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')

  const rows = useMemo(() => {
    const needle = q.toLowerCase()
    return state.products.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false
      if (needle && !`${p.name} ${p.sku}`.toLowerCase().includes(needle)) return false
      if (warehouseId) {
        const qty = state.locations
          .filter((l) => l.warehouseId === warehouseId)
          .reduce((s, l) => s + qtyAt(state, p.id, l.id), 0)
        if (qty <= 0 && needle === '') {
          /* still show, but filter only if searching empty? keep products even if 0 */
        }
      }
      return true
    })
  }, [state, q, categoryId, warehouseId])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted">Create SKUs, track availability per location, and set reorder rules.</p>
        </div>
        <Link to="/products/new" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
          New
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <input className={inputClass} placeholder="Search name or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {state.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={inputClass} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          <option value="">All warehouses (on-hand shown)</option>
          {state.warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">UoM</th>
              <th className="px-4 py-3">On hand</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const cat = state.categories.find((c) => c.id === p.categoryId)
              const onHand = warehouseId
                ? state.locations
                    .filter((l) => l.warehouseId === warehouseId)
                    .reduce((s, l) => s + qtyAt(state, p.id, l.id), 0)
                : totalOnHand(state, p.id)
              return (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">
                    <Link className="text-brand hover:underline" to={`/products/${p.id}`}>
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3">{cat?.name}</td>
                  <td className="px-4 py-3">{p.uom}</td>
                  <td className="px-4 py-3 font-semibold">{onHand}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, saveProduct, saveCategory, saveReorderRule, deleteReorderRule } = useStore()
  const existing = state.products.find((p) => p.id === id)
  const isNew = id === 'new' || !existing

  const [name, setName] = useState(existing?.name ?? '')
  const [sku, setSku] = useState(existing?.sku ?? '')
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? state.categories[0]?.id ?? '')
  const [uom, setUom] = useState(existing?.uom ?? 'Units')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [initialStock, setInitialStock] = useState('')
  const [locationId, setLocationId] = useState(
    state.locations.find((l) => l.type === 'internal')?.id ?? '',
  )
  const [newCat, setNewCat] = useState('')
  const [ruleMin, setRuleMin] = useState('10')
  const [ruleMax, setRuleMax] = useState('50')
  const [ruleLoc, setRuleLoc] = useState(locationId)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const pid = saveProduct({
      id: isNew ? undefined : existing?.id,
      name,
      sku,
      categoryId,
      uom,
      description,
      initialStock: isNew ? Number(initialStock) || 0 : undefined,
      locationId,
    })
    navigate(`/products/${pid}`)
  }

  const internals = state.locations.filter((l) => l.type === 'internal')
  const productId = existing?.id
  const rules = state.reorderRules.filter((r) => r.productId === productId)

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isNew ? 'New product' : existing?.name}</h1>
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white" type="submit">
          Save
        </button>
      </div>
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="SKU / Code">
          <input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} required />
        </Field>
        <Field label="Category">
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {state.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unit of Measure">
          <select className={inputClass} value={uom} onChange={(e) => setUom(e.target.value)}>
            {UOMS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        {isNew ? (
          <>
            <Field label="Initial stock (optional)">
              <input className={inputClass} type="number" min={0} value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
            </Field>
            <Field label="Opening location">
              <select className={inputClass} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                {internals.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : null}
        <div className="md:col-span-2 flex gap-2">
          <input className={inputClass} placeholder="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 text-sm"
            onClick={() => {
              if (!newCat.trim()) return
              const cid = saveCategory(newCat)
              setCategoryId(cid)
              setNewCat('')
            }}
          >
            Add category
          </button>
        </div>
      </div>

      {!isNew && productId ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold">Stock availability per location</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Location</th>
                  <th className="py-2">Warehouse</th>
                  <th className="py-2">Qty</th>
                </tr>
              </thead>
              <tbody>
                {stockByLocation(state, productId).map((row) => {
                  const wh = state.warehouses.find((w) => w.id === row.location.warehouseId)
                  return (
                    <tr key={row.location.id} className="border-t border-slate-100">
                      <td className="py-2">{row.location.name} ({row.location.code})</td>
                      <td className="py-2">{wh?.name}</td>
                      <td className="py-2 font-semibold">{row.qty}</td>
                    </tr>
                  )
                })}
                {stockByLocation(state, productId).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-slate-400">
                      No on-hand quantity.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <p className="mt-2 text-sm text-slate-500">
              Total on hand: <b>{totalOnHand(state, productId)}</b> {existing?.uom}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold">Reordering rules</h2>
            <div className="mb-3 grid gap-2 md:grid-cols-4">
              <select className={inputClass} value={ruleLoc} onChange={(e) => setRuleLoc(e.target.value)}>
                {internals.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code}
                  </option>
                ))}
              </select>
              <input className={inputClass} type="number" value={ruleMin} onChange={(e) => setRuleMin(e.target.value)} placeholder="Min" />
              <input className={inputClass} type="number" value={ruleMax} onChange={(e) => setRuleMax(e.target.value)} placeholder="Max" />
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-3 text-sm text-white"
                onClick={() =>
                  saveReorderRule({
                    productId,
                    locationId: ruleLoc,
                    minQty: Number(ruleMin),
                    maxQty: Number(ruleMax),
                  })
                }
              >
                Add rule
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              {rules.map((r) => {
                const loc = state.locations.find((l) => l.id === r.locationId)
                return (
                  <li key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span>
                      {loc?.code}: min {r.minQty} / max {r.maxQty}
                    </span>
                    <button type="button" className="text-rose-600" onClick={() => deleteReorderRule(r.id)}>
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      ) : null}
    </form>
  )
}
