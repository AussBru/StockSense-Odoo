import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-brand lg:flex">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #fff 0, transparent 40%)' }} />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3 text-lg font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">S</span>
            StockSense
          </div>
          <div>
            <h1 className="max-w-md text-4xl font-semibold leading-tight">
              Real-time inventory, without the spreadsheets.
            </h1>
            <p className="mt-4 max-w-md text-indigo-100">
              Receipts, deliveries, transfers, and adjustments in one ledger — built for inventory
              managers and warehouse staff.
            </p>
          </div>
          <p className="text-sm text-indigo-200">Demo: demo@stocksense.app / Demo@123</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Link to="/login" className="mb-6 flex items-center gap-2 font-semibold text-ink lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">S</span>
            StockSense
          </Link>
          <h2 className="text-2xl font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-brand/30 focus:border-brand focus:ring-2'

export function PrimaryButton({
  children,
  disabled,
}: {
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {children}
    </button>
  )
}

export function AuthForm({
  onSubmit,
  children,
}: {
  onSubmit: (e: FormEvent) => void
  children: ReactNode
}) {
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {children}
    </form>
  )
}
