import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthForm, AuthFrame, Field, PrimaryButton, inputClass } from '../components/AuthFrame'
import { useStore } from '../store'

export function LoginPage() {
  const { login } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/dashboard'
  const [email, setEmail] = useState('demo@stocksense.app')
  const [password, setPassword] = useState('Demo@123')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await login(email, password)
    setBusy(false)
    if (err) setError(err)
    else navigate(from, { replace: true })
  }

  return (
    <AuthFrame title="Welcome back" subtitle="Sign in to the inventory dashboard.">
      <AuthForm onSubmit={onSubmit}>
        <Field label="Email">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <PrimaryButton disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</PrimaryButton>
      </AuthForm>
      <div className="mt-4 flex justify-between text-sm">
        <Link className="text-brand hover:underline" to="/signup">
          Create an account
        </Link>
        <Link className="text-fg-muted hover:underline" to="/forgot-password">
          Forgot password?
        </Link>
      </div>
    </AuthFrame>
  )
}
