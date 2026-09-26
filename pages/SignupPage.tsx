import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthForm, AuthFrame, Field, PrimaryButton, inputClass } from '../components/AuthFrame'
import { useStore } from '../store'
import type { Role } from '../types'

export function SignupPage() {
  const { signup } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<Role>('inventory_manager')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await signup({ name, email, password, role, phone })
    setBusy(false)
    if (err) setError(err)
    else navigate('/dashboard', { replace: true })
  }

  return (
    <AuthFrame title="Create your account" subtitle="Inventory managers and warehouse staff can join.">
      <AuthForm onSubmit={onSubmit}>
        <Field label="Full name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
        <Field label="Password">
          <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <PrimaryButton disabled={busy}>{busy ? 'Creating…' : 'Sign up'}</PrimaryButton>
      </AuthForm>
      <p className="mt-4 text-sm text-slate-500">
        Already have an account?{' '}
        <Link className="text-brand hover:underline" to="/login">
          Log in
        </Link>
      </p>
    </AuthFrame>
  )
}
