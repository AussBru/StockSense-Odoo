import { useState, type FormEvent } from 'react'
import { Field, inputClass } from '../components/AuthFrame'
import { useStore } from '../store'
import type { Role } from '../types'

export function ProfilePage() {
  const { currentUser, updateProfile } = useStore()
  const [name, setName] = useState(currentUser?.name ?? '')
  const [phone, setPhone] = useState(currentUser?.phone ?? '')
  const [role, setRole] = useState<Role>(currentUser?.role ?? 'inventory_manager')
  const [saved, setSaved] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    updateProfile({ name, phone, role })
    setSaved(true)
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 rounded-2xl border border-line bg-surface p-6">
      <h1 className="text-2xl font-semibold">My Profile</h1>
      <Field label="Full name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Email">
        <input className={inputClass} value={currentUser?.email ?? ''} disabled />
      </Field>
      <Field label="Phone">
        <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Role">
        <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="inventory_manager">Inventory Manager</option>
          <option value="warehouse_staff">Warehouse Staff</option>
        </select>
      </Field>
      {saved ? <p className="text-sm text-emerald-600">Profile updated.</p> : null}
      <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-accent-fg" type="submit">
        Save profile
      </button>
    </form>
  )
}
