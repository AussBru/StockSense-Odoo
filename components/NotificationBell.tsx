import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { useStore } from '../store'
import type { NotificationSeverity } from '../types'
import { formatDate } from '../lib/utils'

export function NotificationBell() {
  const { state, markNotificationRead, markAllNotificationsRead } = useStore()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const notifications = state.notifications || []
  const unreadList = notifications.filter((n) => !n.read)
  const unreadCount = unreadList.length

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const getSeverityIcon = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'error':
        return <AlertCircle size={15} className="text-rose-500 shrink-0" />
      case 'warning':
        return <AlertTriangle size={15} className="text-amber-500 shrink-0" />
      case 'success':
        return <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
      default:
        return <Info size={15} className="text-sky-500 shrink-0" />
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg transition shadow-sm"
        title="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-2xl border border-line bg-surface p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-line pb-2.5 px-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-fg">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsRead()}
                className="flex items-center gap-1 text-[11px] font-medium text-fg-muted hover:text-fg transition"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          <div className="ss-scroll max-h-80 overflow-y-auto divide-y divide-line my-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-fg-muted">
                No notifications right now. Everything is running smoothly!
              </div>
            ) : (
              notifications.slice(0, 6).map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markNotificationRead(n.id)
                    if (n.link) {
                      navigate(n.link)
                      setOpen(false)
                    }
                  }}
                  className={`flex cursor-pointer items-start gap-3 p-2.5 rounded-xl transition ${
                    n.read ? 'opacity-70 hover:bg-surface-2/60' : 'bg-surface-2/40 hover:bg-surface-2'
                  }`}
                >
                  <div className="mt-0.5">{getSeverityIcon(n.severity)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`truncate text-xs font-semibold ${n.read ? 'text-fg-soft' : 'text-fg'}`}>
                        {n.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-fg-subtle">
                        {formatDate(n.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-fg-muted line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-line pt-2 text-center">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg hover:underline py-1"
            >
              <span>View all notifications</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
