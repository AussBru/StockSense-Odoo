import { useState, type FormEvent, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Field, PrimaryButton, inputClass } from '../components/AuthFrame'
import { useStore } from '../store'

export function CustomerFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, saveCustomer } = useStore()

  const existing = id ? state.customers.find((c) => c.id === id) : null

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setCode(existing.code)
      setEmail(existing.email)
      setPhone(existing.phone)
      setAddress(existing.address)
      setTaxNumber(existing.taxNumber)
      setStatus(existing.status)
      setNotes(existing.notes)
    }
  }, [existing])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Customer name is required.')
      return
    }
    if (!email.trim()) {
      setError('Customer email is required.')
      return
    }

    saveCustomer({
      id: existing?.id,
      code: code.trim(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      taxNumber: taxNumber.trim(),
      status,
      notes: notes.trim(),
    })

    navigate('/customers')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-ink">{existing ? 'Edit Customer' : 'New Customer'}</h1>
          <p className="text-sm text-muted">
            {existing ? `Update record for ${existing.name}` : 'Register a new customer account.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error ? <div className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer / Company Name *">
            <input
              className={inputClass}
              placeholder="e.g. Acme Corporation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label="Customer Code">
            <input
              className={inputClass}
              placeholder="e.g. CUST-004 (auto-generated if empty)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>

          <Field label="Email Address *">
            <input
              className={inputClass}
              type="email"
              placeholder="e.g. billing@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Phone Number">
            <input
              className={inputClass}
              placeholder="e.g. +1 555-0199"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          <Field label="Tax / GST Number">
            <input
              className={inputClass}
              placeholder="e.g. US-GST-12345"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
            />
          </Field>

          <Field label="Status">
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>

        <Field label="Billing / Shipping Address">
          <textarea
            className={inputClass}
            rows={2}
            placeholder="Street address, City, State, ZIP..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>

        <Field label="Notes">
          <textarea
            className={inputClass}
            rows={2}
            placeholder="Commercial terms, special notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <PrimaryButton>
            <span className="flex items-center justify-center gap-1.5">
              <Save size={16} />
              {existing ? 'Save Changes' : 'Create Customer'}
            </span>
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}
