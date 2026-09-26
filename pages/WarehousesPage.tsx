import { useState, type FormEvent } from 'react'
import { Field, inputClass } from '../components/AuthFrame'
import { useStore } from '../store'

export function WarehousesPage() {
  const { state, saveWarehouse, saveLocation } = useStore()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [locName, setLocName] = useState('')
  const [locCode, setLocCode] = useState('')
  const [locWh, setLocWh] = useState(state.warehouses[0]?.id ?? '')

  function addWh(e: FormEvent) {
    e.preventDefault()
    saveWarehouse({ name, code, address })
    setName('')
    setCode('')
    setAddress('')
  }

  function addLoc(e: FormEvent) {
    e.preventDefault()
    const wh = state.warehouses.find((w) => w.id === locWh)
    saveLocation({
      warehouseId: locWh,
      name: locName,
      code: locCode || `${wh?.code ?? 'WH'}/${locName}`,
      type: 'internal',
    })
    setLocName('')
    setLocCode('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Warehouses & locations</h1>
        <p className="text-sm text-muted">Multi-warehouse stock with racks, docks, and production floors.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={addWh} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">New warehouse</h2>
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Code">
            <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} required />
          </Field>
          <Field label="Address">
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white" type="submit">
            Create warehouse
          </button>
        </form>
        <form onSubmit={addLoc} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">New internal location</h2>
          <Field label="Warehouse">
            <select className={inputClass} value={locWh} onChange={(e) => setLocWh(e.target.value)}>
              {state.warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name">
            <input className={inputClass} value={locName} onChange={(e) => setLocName(e.target.value)} required placeholder="Rack B" />
          </Field>
          <Field label="Code">
            <input className={inputClass} value={locCode} onChange={(e) => setLocCode(e.target.value)} placeholder="WH1/RackB" />
          </Field>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
            Add location
          </button>
        </form>
      </div>
      <div className="space-y-4">
        {state.warehouses.map((w) => {
          const locs = state.locations.filter((l) => l.warehouseId === w.id)
          return (
            <div key={w.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">
                  {w.name} <span className="text-sm font-normal text-slate-400">{w.code}</span>
                </h3>
                <span className="text-sm text-slate-500">{w.address}</span>
              </div>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {locs.map((l) => (
                  <li key={l.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <div className="font-medium">{l.name}</div>
                    <div className="font-mono text-xs text-slate-500">{l.code}</div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
