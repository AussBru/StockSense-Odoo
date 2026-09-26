import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthForm, AuthFrame, Field, PrimaryButton, inputClass } from '../components/AuthFrame'
import { useStore } from '../store'

export function ForgotPasswordPage() {
  const { requestOtp, resetPassword } = useStore()
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('demo@stocksense.app')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [demoOtp, setDemoOtp] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendOtp(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await requestOtp(email)
    setBusy(false)
    if (res.error) setError(res.error)
    else {
      setDemoOtp(res.otp ?? null)
      setStep('otp')
    }
  }

  async function complete(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await resetPassword(email.trim().toLowerCase(), otp, password)
    setBusy(false)
    if (err) setError(err)
    else navigate('/login', { replace: true })
  }

  return (
    <AuthFrame title="Reset password" subtitle="We’ll send a one-time code to verify it’s you.">
      {step === 'email' ? (
        <AuthForm onSubmit={sendOtp}>
          <Field label="Account email">
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <PrimaryButton disabled={busy}>{busy ? 'Sending…' : 'Send OTP'}</PrimaryButton>
        </AuthForm>
      ) : (
        <AuthForm onSubmit={complete}>
          {demoOtp ? (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
              Demo inbox OTP: <span className="font-mono font-bold tracking-widest">{demoOtp}</span>
              <div className="text-xs text-indigo-600">Valid for 10 minutes. In production this is emailed.</div>
            </div>
          ) : null}
          <Field label="6-digit OTP">
            <input className={inputClass} value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} />
          </Field>
          <Field label="New password">
            <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <PrimaryButton disabled={busy}>{busy ? 'Updating…' : 'Reset password'}</PrimaryButton>
        </AuthForm>
      )}
      <p className="mt-4 text-sm text-slate-500">
        <Link className="text-brand hover:underline" to="/login">
          Back to login
        </Link>
      </p>
    </AuthFrame>
  )
}
