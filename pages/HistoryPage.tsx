import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TypeBadge } from '../components/Badges'
import { inputClass } from '../components/AuthFrame'
import { formatDate } from '../lib/utils'
import { useStore } from '../store'

export function HistoryPage() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [productId, setProductId] = useState('')
  const rows = useMemo(() => {
    const needle = q.toLowerCase()
    return state.ledger.filter((e) => {
      if (productId && e.productId !== productId) return false
      const p = state.products.find((x) => x.id === e.productId)
      if (needle && !`${e.documentNumber} ${e.note} ${p?.sku} ${p?.name}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [state, q, productId])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Move History</h1>
        <p className="text-sm text-muted">Every receipt, transfer, delivery, and adjustment is posted to the stock ledger.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input className={inputClass} placeholder="Search SKU, document, note" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">All products</option>
          {state.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const p = state.products.find((x) => x.id === e.productId)
              const from = state.locations.find((l) => l.id === e.fromLocationId)
              const to = state.locations.find((l) => l.id === e.toLocationId)
              return (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-500">{formatDate(e.date)}</td>
                  <td className="px-4 py-3">
                    {e.type !== 'initial' ? <TypeBadge type={e.type} /> : <span className="text-xs">Opening</span>}
                    <div className="font-mono text-xs">{e.documentNumber}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="text-brand hover:underline" to={`/products/${e.productId}`}>
                      {p?.name}
                    </Link>
                    <div className="font-mono text-[11px] text-slate-400">{p?.sku}</div>
                  </td>
                  <td className="px-4 py-3">{from?.code ?? '—'}</td>
                  <td className="px-4 py-3">{to?.code ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">{e.qty}</td>
                  <td className="px-4 py-3 text-slate-500">{e.note}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
