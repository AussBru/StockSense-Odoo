import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { gsap } from 'gsap'

/**
 * Shared internals for the MagicBento effects, used by both the card grid
 * (`MagicBento`) and the auto-attached surface treatment
 * (`AutoBentoSurfaces`). Keeping the DOM/GSAP plumbing here means the
 * behaviour is identical wherever the effects appear.
 */

export const DEFAULT_PARTICLE_COUNT = 12
export const DEFAULT_SPOTLIGHT_RADIUS = 300
export const DEFAULT_GLOW_COLOR = '242, 239, 230'
export const MOBILE_BREAKPOINT = 768

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function createParticleElement(x: number, y: number, color: string) {
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

export function calculateSpotlightValues(radius: number) {
  return { proximity: radius * 0.5, fadeDistance: radius * 0.75 }
}

export function updateCardGlowProperties(
  card: HTMLElement,
  mouseX: number,
  mouseY: number,
  glow: number,
  radius: number,
) {
  const rect = card.getBoundingClientRect()
  const relativeX = ((mouseX - rect.left) / rect.width) * 100
  const relativeY = ((mouseY - rect.top) / rect.height) * 100

  card.style.setProperty('--glow-x', `${relativeX}%`)
  card.style.setProperty('--glow-y', `${relativeY}%`)
  card.style.setProperty('--glow-intensity', glow.toString())
  card.style.setProperty('--glow-radius', `${radius}px`)
}

export function makeRipple(x: number, y: number, rect: DOMRect, color: string) {
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
    background: radial-gradient(circle, rgba(${color}, 0.4) 0%, rgba(${color}, 0.2) 30%, transparent 70%);
    left: ${x - maxDistance}px;
    top: ${y - maxDistance}px;
    pointer-events: none;
    z-index: 1000;
  `
  return ripple
}

/**
 * Owns the GSAP tweens and generated DOM nodes for one surface so they can all
 * be released on leave/unmount. `particles` are the live clones; `templates`
 * are the offscreen seeds that get cloned on each hover.
 */
export function useBentoParticles(glowColor: string) {
  const particlesRef = useRef<HTMLDivElement[]>([])
  const timeoutsRef = useRef<number[]>([])
  const templatesRef = useRef<HTMLDivElement[]>([])
  const initializedRef = useRef(false)
  const magnetismRef = useRef<gsap.core.Tween | null>(null)

  const clear = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
    magnetismRef.current?.kill()
    magnetismRef.current = null

    particlesRef.current.forEach((particle) => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => particle.parentNode?.removeChild(particle),
      })
    })
    particlesRef.current = []
  }, [])

  const spawn = useCallback(
    (host: HTMLElement, particleCount: number) => {
      if (!initializedRef.current) {
        const { width, height } = host.getBoundingClientRect()
        templatesRef.current = Array.from(
          { length: particleCount },
          () => createParticleElement(Math.random() * width, Math.random() * height, glowColor),
        )
        initializedRef.current = true
      }

      templatesRef.current.forEach((template, index) => {
        const timeoutId = window.setTimeout(() => {
          if (!host.isConnected) return

          const clone = template.cloneNode(true) as HTMLDivElement
          host.appendChild(clone)
          particlesRef.current.push(clone)

          gsap.fromTo(
            clone,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' },
          )
          gsap.to(clone, {
            x: (Math.random() - 0.5) * 100,
            y: (Math.random() - 0.5) * 100,
            rotation: Math.random() * 360,
            duration: 2 + Math.random() * 2,
            ease: 'none',
            repeat: -1,
            yoyo: true,
          })
          gsap.to(clone, {
            opacity: 0.3,
            duration: 1.5,
            ease: 'power2.inOut',
            repeat: -1,
            yoyo: true,
          })
        }, index * 100)

        timeoutsRef.current.push(timeoutId)
      })
    },
    [glowColor],
  )

  const ripple = useCallback(
    (host: HTMLElement, clientX: number, clientY: number) => {
      const rect = host.getBoundingClientRect()
      const node = makeRipple(clientX - rect.left, clientY - rect.top, rect, glowColor)
      host.appendChild(node)
      gsap.fromTo(
        node,
        { scale: 0, opacity: 1 },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => node.remove(),
        },
      )
    },
    [glowColor],
  )

  return { clear, spawn, ripple, magnetismRef }
}

export interface InteractionOptions {
  enabled: boolean
  enableStars: boolean
  enableTilt: boolean
  enableMagnetism: boolean
  clickEffect: boolean
  glowColor: string
  particleCount: number
}

/**
 * Pointer interactions for a single element. Every listener and generated node
 * is released on unmount, and on `enabled: false` any in-flight particles are
 * cleared.
 */
export function useCardInteractions(
  ref: RefObject<HTMLElement | null>,
  options: InteractionOptions,
) {
  const { enabled, enableStars, enableTilt, enableMagnetism, clickEffect, glowColor } = options
  const isHoveredRef = useRef(false)
  const { clear, spawn, ripple } = useBentoParticles(glowColor)

  // Read through a ref so a changed count doesn't re-subscribe listeners.
  const particleCountRef = useRef(options.particleCount)
  useEffect(() => {
    particleCountRef.current = options.particleCount
  }, [options.particleCount])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!enabled) {
      clear()
      return
    }

    const handleMouseEnter = () => {
      isHoveredRef.current = true
      if (enableStars) spawn(el, particleCountRef.current)
      if (enableTilt) {
        gsap.to(el, {
          rotateX: 5,
          rotateY: 5,
          duration: 0.3,
          ease: 'power2.out',
          transformPerspective: 1000,
        })
      }
    }

    const handleMouseLeave = () => {
      isHoveredRef.current = false
      clear()
      el.style.setProperty('--glow-intensity', '0')
      if (enableTilt) {
        gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.3, ease: 'power2.out' })
      }
      if (enableMagnetism) {
        gsap.to(el, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' })
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      if (enableTilt) {
        gsap.to(el, {
          rotateX: ((y - centerY) / centerY) * -10,
          rotateY: ((x - centerX) / centerX) * 10,
          duration: 0.1,
          ease: 'power2.out',
          transformPerspective: 1000,
        })
      }

      if (enableMagnetism) {
        gsap.to(el, {
          x: (x - centerX) * 0.05,
          y: (y - centerY) * 0.05,
          duration: 0.3,
          ease: 'power2.out',
        })
      }
    }

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return
      ripple(el, e.clientX, e.clientY)
    }

    el.addEventListener('mouseenter', handleMouseEnter)
    el.addEventListener('mouseleave', handleMouseLeave)
    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('click', handleClick)

    return () => {
      isHoveredRef.current = false
      el.removeEventListener('mouseenter', handleMouseEnter)
      el.removeEventListener('mouseleave', handleMouseLeave)
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('click', handleClick)
      clear()
    }
  }, [ref, enabled, enableStars, enableTilt, enableMagnetism, clickEffect, glowColor, spawn, clear, ripple])
}
