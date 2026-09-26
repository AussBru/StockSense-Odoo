import { useState, type FormEvent, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Field, PrimaryButton, inputClass } from '../components/AuthFrame'
import { useStore } from '../store'

export function VendorFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, saveVendor } = useStore()

  const existing = id ? state.vendors.find((v) => v.id === id) : null

  const [companyName, setCompanyName] = useState('')
  const [code, setCode] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [leadTime, setLeadTime] = useState(7)
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existing) {
      setCompanyName(existing.companyName)
      setCode(existing.code)
      setContactPerson(existing.contactPerson)
      setEmail(existing.email)
      setPhone(existing.phone)
      setAddress(existing.address)
      setTaxNumber(existing.taxNumber)
      setPaymentTerms(existing.paymentTerms)
      setLeadTime(existing.leadTime)
      setStatus(existing.status)
      setNotes(existing.notes)
    }
  }, [existing])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!companyName.trim()) {
      setError('Company name is required.')
      return
    }
    if (!email.trim()) {
      setError('Vendor email address is required.')
      return
    }

    const savedId = saveVendor({
      id: existing?.id,
      code: code.trim(),
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      taxNumber: taxNumber.trim(),
      paymentTerms,
      leadTime: Number(leadTime) || 7,
      status,
      notes: notes.trim(),
    })

    navigate(`/vendors/${savedId}`)
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
          <h1 className="text-2xl font-bold text-fg">{existing ? 'Edit Vendor' : 'New Vendor'}</h1>
          <p className="text-sm text-fg-muted">
            {existing ? `Update details for ${existing.companyName}` : 'Add a new supplier or partner vendor.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
        {error ? <div className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company / Vendor Name *">
            <input
              className={inputClass}
              placeholder="e.g. Acme Industrial Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </Field>

          <Field label="Vendor Code">
            <input
              className={inputClass}
              placeholder="e.g. VND-004 (auto-generated if empty)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>

          <Field label="Contact Person">
            <input
              className={inputClass}
              placeholder="e.g. Jane Doe"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </Field>

          <Field label="Email Address *">
            <input
              className={inputClass}
              type="email"
              placeholder="e.g. orders@vendor.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Phone Number">
            <input
              className={inputClass}
              placeholder="e.g. +1 555-0123"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          <Field label="Tax / GST Number">
            <input
              className={inputClass}
              placeholder="e.g. US-TAX-99214"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
            />
          </Field>

          <Field label="Standard Lead Time (Days)">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={leadTime}
              onChange={(e) => setLeadTime(Number(e.target.value))}
              required
            />
          </Field>

          <Field label="Payment Terms">
            <select className={inputClass} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
              <option value="Immediate">Immediate / Due on Receipt</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 60">Net 60</option>
            </select>
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

        <Field label="Full Physical Address">
          <textarea
            className={inputClass}
            rows={2}
            placeholder="Street address, Suite, City, State, ZIP, Country"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>

        <Field label="Internal Notes & Observations">
          <textarea
            className={inputClass}
            rows={3}
            placeholder="Supplier capabilities, reliability ratings, special shipping instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-end gap-3 border-t border-line-soft pt-5">
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
              {existing ? 'Save Changes' : 'Create Vendor'}
            </span>
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}
