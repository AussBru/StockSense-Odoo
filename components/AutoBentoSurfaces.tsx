import { useEffect } from 'react'
import { gsap } from 'gsap'
import {
  DEFAULT_GLOW_COLOR,
  DEFAULT_PARTICLE_COUNT,
  DEFAULT_SPOTLIGHT_RADIUS,
  MOBILE_BREAKPOINT,
  updateCardGlowProperties,
  useBentoParticles,
} from './bentoShared'
import './MagicBento.css'

/**
 * Applies the MagicBento hover treatment to every panel in the app that already
 * uses the standard surface classes, without touching each page.
 *
 * The app has ~90 such panels (`rounded-2xl border border-line bg-surface`)
 * spread over 20 pages, so they are matched by selector and wired with a single
 * delegated listener set rather than per-element React effects.
 *
 * Notes:
 *  - Tilt and magnetism are deliberately OFF here. They move the element, which
 *    makes text blurry and shifts tables out from under the cursor. The grid
 *    component (`MagicBento`) still opts into them for KPI tiles.
 *  - Add `data-bento="off"` to any panel (or an ancestor) to opt out.
 *  - Every generated particle/ripple node is removed on mouse-out.
 */

/**
 * Matches the shared surface treatment.
 *
 * The app has two panel conventions — older pages use `rounded-2xl`, newer ones
 * `rounded-xl` — so the radius is matched as a substring. Restricted to block
 * containers so text inputs and selects (which also carry `border-line
 * bg-surface`) are never decorated.
 */
const SURFACE_SELECTOR =
  ':is(div, form, section, article).border.border-line.bg-surface[class*="rounded-"]'

interface SurfaceState {
  clear: () => void
  spawn: (host: HTMLElement, count: number) => void
  ripple: (host: HTMLElement, clientX: number, clientY: number) => void
}

export function AutoBentoSurfaces({
  glowColor = DEFAULT_GLOW_COLOR,
  particleCount = DEFAULT_PARTICLE_COUNT,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
}: {
  glowColor?: string
  particleCount?: number
  spotlightRadius?: number
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.innerWidth <= MOBILE_BREAKPOINT) return
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    // One particle pool per bound surface, keyed weakly so detached nodes and
    // their animations are collectable.
    const pools = new WeakMap<HTMLElement, SurfaceState>()

    function poolFor(el: HTMLElement): SurfaceState {
      const existing = pools.get(el)
      if (existing) return existing
      // useBentoParticles is a hook, so the primitives are instantiated once per
      // surface via a tiny adapter component-free helper below.
      const pool = createPool(glowColor)
      pools.set(el, pool)
      return pool
    }

    function optOut(el: HTMLElement) {
      return !!el.closest('[data-bento="off"]')
    }

    function handleOver(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target || typeof target.closest !== 'function') return

      const el = target.closest<HTMLElement>(SURFACE_SELECTOR)
      if (!el || el.dataset.bentoBound === '1' || optOut(el)) return

      el.dataset.bentoBound = '1'
      el.classList.add('bento-surface')
      el.style.setProperty('--bento-glow', glowColor)
      el.style.setProperty('--glow-radius', `${spotlightRadius}px`)

      const pool = poolFor(el)
      pool.spawn(el, particleCount)
      updateCardGlowProperties(el, e.clientX, e.clientY, 1, spotlightRadius)
    }

    function handleOut(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target || typeof target.closest !== 'function') return

      const el = target.closest<HTMLElement>(SURFACE_SELECTOR)
      if (!el || el.dataset.bentoBound !== '1') return

      // Ignore moves between descendants of the same panel.
      const to = e.relatedTarget as HTMLElement | null
      if (to && el.contains(to)) return

      el.style.setProperty('--glow-intensity', '0')
      poolFor(el).clear()
    }

    function handleMove(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target || typeof target.closest !== 'function') return

      const el = target.closest<HTMLElement>(SURFACE_SELECTOR)
      if (!el || el.dataset.bentoBound !== '1') return

      updateCardGlowProperties(el, e.clientX, e.clientY, 1, spotlightRadius)
    }

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target || typeof target.closest !== 'function') return

      const el = target.closest<HTMLElement>(SURFACE_SELECTOR)
      if (!el || el.dataset.bentoBound !== '1') return
      // Don't fire on controls — the ripple would land on every button press.
      if (target.closest('button, a, input, select, textarea, [role="button"]')) return

      poolFor(el).ripple(el, e.clientX, e.clientY)
    }

    document.addEventListener('mouseover', handleOver, true)
    document.addEventListener('mouseout', handleOut, true)
    document.addEventListener('mousemove', handleMove, true)
    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('mouseover', handleOver, true)
      document.removeEventListener('mouseout', handleOut, true)
      document.removeEventListener('mousemove', handleMove, true)
      document.removeEventListener('click', handleClick, true)

      // Release anything still animating.
      document.querySelectorAll<HTMLElement>('.bento-surface').forEach((el) => {
        pools.get(el)?.clear()
        el.classList.remove('bento-surface')
        delete el.dataset.bentoBound
        el.style.removeProperty('--glow-intensity')
        el.style.removeProperty('--glow-x')
        el.style.removeProperty('--glow-y')
      })
    }
  }, [glowColor, particleCount, spotlightRadius])

  return null
}

/**
 * `useBentoParticles` is a hook, so it can't be called from an event handler.
 * This mirrors it with a plain factory; both are thin wrappers over the same
 * GSAP calls, kept separate so the hook stays usable from React components.
 */
function createPool(glowColor: string): SurfaceState {
  const particles: HTMLDivElement[] = []
  const timeouts: number[] = []
  const templates: HTMLDivElement[] = []
  let initialized = false

  function clear() {
    timeouts.forEach(clearTimeout)
    timeouts.length = 0
    particles.forEach((particle) => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => particle.parentNode?.removeChild(particle),
      })
    })
    particles.length = 0
  }

  function spawn(host: HTMLElement, count: number) {
    if (!initialized) {
      const { width, height } = host.getBoundingClientRect()
      for (let i = 0; i < count; i += 1) {
        templates.push(createSeed(Math.random() * width, Math.random() * height, glowColor))
      }
      initialized = true
    }

    templates.forEach((template, index) => {
      timeouts.push(
        window.setTimeout(() => {
          if (!host.isConnected) return
          const clone = template.cloneNode(true) as HTMLDivElement
          host.appendChild(clone)
          particles.push(clone)

          gsap.fromTo(
            clone,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' },
          )
          gsap.to(clone, {
            x: (Math.random() - 0.5) * 80,
            y: (Math.random() - 0.5) * 80,
            duration: 2 + Math.random() * 2,
            ease: 'none',
            repeat: -1,
            yoyo: true,
          })
          gsap.to(clone, {
            opacity: 0.25,
            duration: 1.5,
            ease: 'power2.inOut',
            repeat: -1,
            yoyo: true,
          })
        }, index * 90),
      )
    })
  }

  function ripple(host: HTMLElement, clientX: number, clientY: number) {
    const rect = host.getBoundingClientRect()
    const node = makeRippleNode(clientX - rect.left, clientY - rect.top, rect, glowColor)
    host.appendChild(node)
    gsap.fromTo(
      node,
      { scale: 0, opacity: 1 },
      { scale: 1, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => node.remove() },
    )
  }

  return { clear, spawn, ripple }
}

function createSeed(x: number, y: number, color: string) {
  const el = document.createElement('div')
  el.className = 'particle'
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `
  return el
}

function makeRippleNode(x: number, y: number, rect: DOMRect, color: string) {
  const maxDistance = Math.max(
    Math.hypot(x, y),
    Math.hypot(x - rect.width, y),
    Math.hypot(x, y - rect.height),
    Math.hypot(x - rect.width, y - rect.height),
  )

  const ripple = document.createElement('div')
  ripple.className = 'bento-ripple'
  ripple.style.cssText = `
    position: absolute;
    width: ${maxDistance * 2}px;
    height: ${maxDistance * 2}px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(${color}, 0.35) 0%, rgba(${color}, 0.16) 30%, transparent 70%);
    left: ${x - maxDistance}px;
    top: ${y - maxDistance}px;
    pointer-events: none;
    z-index: 1000;
  `
  return ripple
}
