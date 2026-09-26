import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  title?: string
}

interface ToastContextValue {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    ({ type, message, title }: Omit<ToastItem, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev, { id, type, message, title }])

      // Auto dismiss after 4.5 seconds
      setTimeout(() => {
        removeToast(id)
      }, 4500)
    },
    [removeToast],
  )

  const success = useCallback((message: string, title?: string) => addToast({ type: 'success', message, title }), [addToast])
  const error = useCallback((message: string, title?: string) => addToast({ type: 'error', message, title }), [addToast])
  const info = useCallback((message: string, title?: string) => addToast({ type: 'info', message, title }), [addToast])
  const warning = useCallback((message: string, title?: string) => addToast({ type: 'warning', message, title }), [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => {
          let bgClass = 'bg-surface text-fg border-line'
          let Icon = Info
          let iconColor = 'text-sky-500'

          if (toast.type === 'success') {
            Icon = CheckCircle2
            iconColor = 'text-emerald-500'
          } else if (toast.type === 'error') {
            Icon = AlertCircle
            iconColor = 'text-rose-500'
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle
            iconColor = 'text-amber-500'
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border ${bgClass} p-4 shadow-xl transition-all animate-in fade-in slide-in-from-bottom-3 duration-200`}
            >
              <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                {toast.title && <div className="text-sm font-semibold">{toast.title}</div>}
                <div className="text-xs text-fg-muted break-words leading-relaxed">{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-fg-subtle hover:text-fg transition p-0.5 rounded-lg"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      toasts: [],
      addToast: () => {},
      removeToast: () => {},
      success: (msg: string) => console.log('Toast success:', msg),
      error: (msg: string) => console.error('Toast error:', msg),
      info: (msg: string) => console.log('Toast info:', msg),
      warning: (msg: string) => console.warn('Toast warning:', msg),
    }
  }
  return ctx
}
