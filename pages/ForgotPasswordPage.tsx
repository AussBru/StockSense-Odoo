import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthForm, AuthFrame, Field, PrimaryButton, inputClass } from '../components/AuthFrame'
import { useStore } from '../store'

export function ForgotPasswordPage() {
  const { requestOtp, resetPassword } = useStore()
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendOtp(e?: FormEvent) {
    if (e) e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    setBusy(true)
    setError(null)
    setSuccessMsg(null)
    const res = await requestOtp(email)
    setBusy(false)
    if (res.error) {
      setError(res.error)
    } else {
      setSuccessMsg(`A 6-digit OTP has been sent to ${email.trim()}.`)
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
    <AuthFrame
      title="Reset password"
      subtitle={
        step === 'email'
          ? 'Enter your account email to receive a one-time verification code.'
          : 'Enter the verification code sent to your email.'
      }
    >
      {step === 'email' ? (
        <AuthForm onSubmit={sendOtp}>
          <Field label="Account email">
            <input
              className={inputClass}
              type="email"
              placeholder="e.g. alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <PrimaryButton disabled={busy}>{busy ? 'Sending OTP to email…' : 'Send OTP'}</PrimaryButton>
        </AuthForm>
      ) : (
        <AuthForm onSubmit={complete}>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900">
            <div className="font-semibold">Check your inbox</div>
            <div className="mt-0.5 text-xs text-indigo-700">
              We emailed a 6-digit OTP code to <span className="font-semibold text-indigo-900">{email}</span>. Valid for 10 minutes.
            </div>
          </div>

          {successMsg ? <p className="text-xs text-emerald-600">{successMsg}</p> : null}

          <Field label="6-digit OTP code">
            <input
              className={inputClass}
              placeholder="e.g. 123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              maxLength={6}
            />
          </Field>
          <Field label="New password">
            <input
              className={inputClass}
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <PrimaryButton disabled={busy}>{busy ? 'Updating…' : 'Reset password'}</PrimaryButton>

          <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
            <button
              type="button"
              disabled={busy}
              onClick={() => sendOtp()}
              className="text-brand hover:underline disabled:opacity-50"
            >
              Resend OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setOtp('')
                setError(null)
              }}
              className="text-slate-500 hover:underline"
            >
              Change email
            </button>
          </div>
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
