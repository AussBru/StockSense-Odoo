import { lazy, Suspense, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

// `three` is ~600 kB minified. Lazy-loading keeps it out of the initial
// bundle so the login form paints before the WebGL chunk arrives.
const ShapeBlur = lazy(() => import('./ShapeBlur'))

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
    <div className="relative grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar lg:flex">
        {/* WebGL backdrop — the shader paints white, so the panel sits on
            black and stays legible in both themes. */}
        <div className="absolute inset-0 opacity-[0.16]">
          <Suspense fallback={null}>
            <ShapeBlur
              variation={0}
              pixelRatioProp={typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1}
              shapeSize={0.5}
              roundness={0.5}
              borderSize={0.05}
              circleSize={0.5}
              circleEdge={1}
            />
          </Suspense>
        </div>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.10) 0, transparent 45%)',
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 text-on-sidebar">
          <div className="flex items-center gap-3 text-lg font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-on-sidebar/10">
              S
            </span>
            StockSense
          </div>
          <div>
            <h1 className="max-w-md text-4xl font-semibold leading-tight">
              Real-time inventory, without the spreadsheets.
            </h1>
            <p className="mt-4 max-w-md text-on-sidebar/60">
              Receipts, deliveries, transfers, and adjustments in one ledger — built for inventory
              managers and warehouse staff.
            </p>
          </div>
          <p className="text-sm text-on-sidebar/50">Demo: demo@stocksense.app / Demo@123</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-canvas p-6">
        <div className="absolute right-6 top-6 z-20">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-sm">
          <Link to="/login" className="mb-6 flex items-center gap-2 font-semibold text-fg lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-accent-fg">S</span>
            StockSense
          </Link>
          <h2 className="text-2xl font-semibold text-fg">{title}</h2>
          <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
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
      <span className="mb-1.5 block font-medium text-fg">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-subtle ring-brand/30 focus:border-brand focus:ring-2'

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
      className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-accent-fg hover:bg-brand-dark disabled:opacity-60"
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
