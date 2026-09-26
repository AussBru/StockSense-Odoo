import { isValidElement, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  CursorPointer01Icon,
  Download04Icon,
  Layers01Icon,
  Notification03Icon,
  PaintBoardIcon,
  Rocket01Icon,
  Settings02Icon,
  TextFontIcon,
} from '@hugeicons/core-free-icons'
import './BranchedMenu.css'

/** Derived from the component's own prop so we don't reach into package internals. */
type HugeIconDescriptor = NonNullable<
  React.ComponentProps<typeof HugeiconsIcon>['icon']
>

/**
 * BranchedMenu — a folding, tree-styled navigation menu (React Bits).
 *
 * Sections fold/unfold with a `grid-template-rows` transition while an SVG rail
 * draws an accent path down to the active child.
 *
 * Additions over the upstream version, all backwards compatible:
 *  - Optional controlled `active` and `open`, so the menu can be driven by the
 *    router. Upstream keeps both in internal state, which means it cannot
 *    reflect browser back/forward or a direct URL load.
 *  - `icon` accepts any React element (the app already uses lucide-react) in
 *    addition to a Hugeicons icon descriptor.
 *  - Optional per-item `badge` node.
 *  - `--bm-active-bg` / `--bm-hover-bg` theme hooks, and a `--fill` modifier.
 */

const DEFAULT_ITEMS: BranchedMenuItem[] = [
  {
    label: 'Getting started',
    children: [
      { value: 'install', label: 'Installation', icon: Download04Icon },
      { value: 'quick', label: 'Quick start', icon: Rocket01Icon },
      { value: 'config', label: 'Configuration', icon: Settings02Icon },
      { value: 'theming', label: 'Theming', icon: PaintBoardIcon },
    ],
  },
  {
    label: 'Components',
    children: [
      { value: 'buttons', label: 'Buttons', icon: CursorPointer01Icon },
      { value: 'typography', label: 'Typography', icon: TextFontIcon },
      { value: 'overlays', label: 'Overlays', icon: Layers01Icon },
      { value: 'toasts', label: 'Toasts', icon: Notification03Icon },
    ],
  },
]

const PAD = 6
const MARK = 16

export type BranchedMenuIcon = HugeIconDescriptor | ReactNode

export interface BranchedMenuChild {
  value: string
  label: string
  icon?: BranchedMenuIcon
  /** Rendered after the label — e.g. a count badge. */
  badge?: ReactNode
}

export interface BranchedMenuItem {
  label: string
  /** Present for a foldable section. */
  children?: BranchedMenuChild[]
  /** Present for a standalone leaf. */
  value?: string
  icon?: BranchedMenuIcon
}

function renderIcon(icon: BranchedMenuIcon) {
  if (isValidElement(icon)) return icon
  return <HugeiconsIcon icon={icon as HugeIconDescriptor} size={16} strokeWidth={1.8} />
}

function toSet(open: number | number[]): Set<number> {
  return new Set(Array.isArray(open) ? open : open >= 0 ? [open] : [])
}

export interface BranchedMenuProps {
  items?: BranchedMenuItem[]
  /** Section(s) open at first. `-1` for none. */
  defaultOpen?: number | number[]
  defaultActive?: string
  /** Controlled active value. Falls back to internal state when omitted. */
  active?: string
  /** Controlled open sections. Falls back to internal state when omitted. */
  open?: number[]
  onSelect?: (value: string, item: BranchedMenuChild) => void
  onToggle?: (index: number, open: boolean) => void
  color?: string
  accentColor?: string
  lineColor?: string
  width?: number
  rowHeight?: number
  indent?: number
  trunk?: number
  radius?: number
  lineWidth?: number
  fontSize?: number
  drawDuration?: number
  foldDuration?: number
  className?: string
}

export default function BranchedMenu({
  items = DEFAULT_ITEMS,
  defaultOpen = 0,
  defaultActive = '',
  active: activeProp,
  open: openProp,
  onSelect,
  onToggle,
  color = '#f5f5f5',
  accentColor = '#f5f5f5',
  lineColor = '#3f3f46',
  width = 240,
  rowHeight = 36,
  indent = 40,
  trunk = 14,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 14,
  drawDuration = 400,
  foldDuration = 300,
  className = '',
}: BranchedMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(() => toSet(defaultOpen))
  const [uncontrolledActive, setUncontrolledActive] = useState(() => {
    if (defaultActive) return defaultActive
    const first = items.find((it, i) => it.children && toSet(defaultOpen).has(i))
    return first?.children?.[0]?.value ?? ''
  })

  // Controlled when the prop is supplied, internal otherwise.
  const open = openProp ? new Set(openProp) : uncontrolledOpen
  const active = activeProp ?? uncontrolledActive

  const navRef = useRef<HTMLElement | null>(null)
  const heads = useRef<(HTMLButtonElement | null)[]>([])
  const markerRef = useRef<HTMLSpanElement | null>(null)

  const latest = useRef({ onSelect, onToggle })
  latest.current = { onSelect, onToggle }

  const activeSection = items.findIndex((it) => it.children?.some((kid) => kid.value === active))
  const markerShown = activeSection >= 0 && open.has(activeSection)

  useLayoutEffect(() => {
    const place = (glide: boolean) => {
      const m = markerRef.current
      const el = heads.current[activeSection]
      if (!m) return
      const on = markerShown && el
      if (!glide) m.style.transition = 'none'
      if (on) m.style.top = `${el!.offsetTop + (el!.offsetHeight - MARK) / 2}px`
      m.toggleAttribute('data-on', Boolean(on))
      if (!glide) {
        void m.offsetHeight
        m.style.transition = ''
      }
    }

    place(true)
    // The first callback fires on observe and would fight the initial
    // animated placement, so it's skipped.
    let first = true
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false
        return
      }
      place(false)
    })
    if (navRef.current) ro.observe(navRef.current)
    return () => ro.disconnect()
  }, [activeSection, markerShown, fontSize, rowHeight])

  const select = (value: string, item: BranchedMenuChild) => {
    if (activeProp === undefined) setUncontrolledActive(value)
    latest.current.onSelect?.(value, item)
  }

  const toggle = (i: number) => {
    if (openProp === undefined) {
      setUncontrolledOpen((prev) => {
        const next = new Set(prev)
        if (next.has(i)) next.delete(i)
        else next.add(i)
        return next
      })
    }
    latest.current.onToggle?.(i, !open.has(i))
  }

  const r = Math.min(radius, rowHeight / 2 - 2)
  const endX = indent - 8
  const rowY = (k: number) => PAD + k * rowHeight + rowHeight / 2
  const branch = (k: number) =>
    `M ${trunk} ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`
  const reach = (k: number) =>
    `M ${trunk} 0 V ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`
  const length = (k: number) => rowY(k) - r + (Math.PI * r) / 2 + (endX - trunk - r)

  return (
    <nav
      ref={navRef}
      className={`branched-menu${className ? ` ${className}` : ''}`}
      style={{
        '--bm-w': `${width}px`,
        '--bm-ink': color,
        '--bm-accent': accentColor,
        '--bm-line': lineColor,
        '--bm-font': `${fontSize}px`,
        '--bm-row': `${rowHeight}px`,
        '--bm-indent': `${indent}px`,
        '--bm-line-w': lineWidth,
        '--bm-draw': `${drawDuration}ms`,
        '--bm-fold': `${foldDuration}ms`,
      } as React.CSSProperties}
    >
      <span ref={markerRef} className="branched-menu__marker" aria-hidden="true" />
      {items.map((item, i) => {
        const kids = item.children
        const isOpen = kids ? open.has(i) : false
        const leafValue = item.value ?? item.label
        const leafActive = !kids && leafValue === active
        const bodyH = kids ? PAD * 2 + kids.length * rowHeight : 0

        return (
          <div
            key={item.value ?? item.label}
            className="branched-menu__section"
            data-open={isOpen ? '' : undefined}
          >
            <button
              ref={(el) => {
                heads.current[i] = el
              }}
              type="button"
              className="branched-menu__head"
              aria-expanded={kids ? isOpen : undefined}
              aria-current={leafActive ? 'true' : undefined}
              data-active={leafActive ? '' : undefined}
              onClick={() => (kids ? toggle(i) : select(leafValue, { value: leafValue, label: item.label, icon: item.icon }))}
            >
              {item.label}
            </button>

            {kids ? (
              <div className="branched-menu__body">
                <div className="branched-menu__fold">
                  <div className="branched-menu__tree" style={{ height: bodyH }}>
                    <svg
                      className="branched-menu__lines"
                      width={indent}
                      height={bodyH}
                      aria-hidden="true"
                    >
                      <path
                        className="branched-menu__base"
                        d={`M ${trunk} 0 V ${rowY(kids.length - 1) - r}`}
                      />
                      {kids.map((kid, k) => (
                        <path key={kid.value} className="branched-menu__base" d={branch(k)} />
                      ))}
                      {kids.map((kid, k) => (
                        <path
                          key={kid.value}
                          className="branched-menu__reach"
                          d={reach(k)}
                          style={{
                            strokeDasharray: length(k),
                            strokeDashoffset: kid.value === active ? 0 : length(k),
                          }}
                        />
                      ))}
                    </svg>

                    {kids.map((kid) => (
                      <button
                        key={kid.value}
                        type="button"
                        className="branched-menu__item"
                        aria-current={kid.value === active ? 'true' : undefined}
                        data-active={kid.value === active ? '' : undefined}
                        tabIndex={isOpen ? 0 : -1}
                        onClick={() => select(kid.value, kid)}
                      >
                        {kid.icon ? (
                          <span className="branched-menu__icon" aria-hidden="true">
                            {renderIcon(kid.icon)}
                          </span>
                        ) : null}
                        <span className="branched-menu__label">{kid.label}</span>
                        {kid.badge ? <span className="branched-menu__badge">{kid.badge}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}

export { DEFAULT_ITEMS as DEFAULT_BRANCHED_MENU_ITEMS }
