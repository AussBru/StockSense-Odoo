import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import {
  DEFAULT_GLOW_COLOR,
  DEFAULT_PARTICLE_COUNT,
  DEFAULT_SPOTLIGHT_RADIUS,
  MOBILE_BREAKPOINT,
  calculateSpotlightValues,
  updateCardGlowProperties,
  useCardInteractions,
} from './bentoShared'
import './MagicBento.css'

/**
 * MagicBento — animated bento card grid (React Bits).
 *
 * Differences from the upstream version:
 *  - `cards` is a prop. Upstream hard-coded six placeholder cards, which made
 *    the component unusable for real data.
 *  - Grid spans are data-driven, so any card count lays out correctly.
 *  - Columns collapse responsively instead of overflowing into slivers.
 *  - The non-particle branch shares the interaction hook, so its listeners are
 *    removed on unmount (upstream leaked them from a callback ref).
 *  - `href` uses react-router `Link` for client-side navigation.
 */

export interface BentoCardData {
  /** Small uppercase tag in the header. */
  label?: string
  /** Headline text. */
  title?: string
  /** Supporting line under the title. */
  description?: string
  /** Large figure, e.g. a KPI count. */
  value?: ReactNode
  /** Rendered inside the tinted square in the header. */
  icon?: ReactNode
  /** Grid footprint. Defaults to 1x1. */
  span?: { col?: number; row?: number }
  /** Overrides the card background. */
  color?: string
  /** Makes the whole card an internal link. */
  href?: string
  onClick?: () => void
}

/** The upstream placeholder set, kept as the default for standalone use. */
export const defaultBentoCards: BentoCardData[] = [
  { label: 'Insights', title: 'Analytics', description: 'Track user behavior' },
  { label: 'Overview', title: 'Dashboard', description: 'Centralized data view' },
  { label: 'Teamwork', title: 'Collaboration', description: 'Work together seamlessly' },
  { label: 'Efficiency', title: 'Automation', description: 'Streamline workflows' },
  { label: 'Connectivity', title: 'Integration', description: 'Connect favorite tools' },
  { label: 'Protection', title: 'Security', description: 'Enterprise-grade protection' },
]

export interface MagicBentoProps {
  textAutoHide?: boolean
  enableStars?: boolean
  enableSpotlight?: boolean
  enableBorderGlow?: boolean
  disableAnimations?: boolean
  spotlightRadius?: number
  particleCount?: number
  enableTilt?: boolean
  /** RGB channels, no rgba wrapper — e.g. "242, 239, 230". */
  glowColor?: string
  clickEffect?: boolean
  enableMagnetism?: boolean
  /** Card data. Defaults to the upstream placeholder set. */
  cards?: BentoCardData[]
  /** Grid columns at the widest breakpoint. */
  columns?: number
  /** Denser cards, for KPI rows. */
  compact?: boolean
  className?: string
}

export default function MagicBento({
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true,
  cards = defaultBentoCards,
  columns = 4,
  compact = false,
  className = '',
}: MagicBentoProps) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const isMobile = useMobileDetection()
  const shouldDisableAnimations = disableAnimations || isMobile

  const cardClass = [
    'magic-bento-card',
    textAutoHide ? 'magic-bento-card--text-autohide' : '',
    enableBorderGlow ? 'magic-bento-card--border-glow' : '',
    enableStars ? 'particle-container' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const sectionStyle = {
    '--bento-cols-max': columns,
    '--bento-glow': glowColor,
  } as CSSProperties

  return (
    <>
      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <div
        ref={gridRef}
        className={`bento-section${compact ? ' bento-section--compact' : ''}`}
        style={sectionStyle}
      >
        <div className="card-grid">
          {cards.map((card, index) => (
            <BentoCard
              key={`${index}-${card.title ?? card.label ?? ''}`}
              card={card}
              className={cardClass}
              disableAnimations={shouldDisableAnimations}
              particleCount={particleCount}
              glowColor={glowColor}
              enableTilt={enableTilt}
              clickEffect={clickEffect}
              enableMagnetism={enableMagnetism}
              enableStars={enableStars}
            />
          ))}
        </div>
      </div>
    </>
  )
}

interface BentoCardProps {
  card: BentoCardData
  className: string
  disableAnimations: boolean
  particleCount: number
  glowColor: string
  enableTilt: boolean
  clickEffect: boolean
  enableMagnetism: boolean
  enableStars: boolean
}

function BentoCard({
  card,
  className,
  disableAnimations,
  particleCount,
  glowColor,
  enableTilt,
  clickEffect,
  enableMagnetism,
  enableStars,
}: BentoCardProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useCardInteractions(ref, {
    enabled: !disableAnimations,
    enableStars,
    enableTilt,
    enableMagnetism,
    clickEffect,
    glowColor,
    particleCount,
  })

  const style = {
    ...(card.color ? { backgroundColor: card.color } : null),
    '--span-col': card.span?.col ?? 1,
    '--span-row': card.span?.row ?? 1,
  } as CSSProperties

  const body = (
    <>
      <div className="magic-bento-card__header">
        <span className="magic-bento-card__label">{card.label}</span>
        {card.icon ? <span className="magic-bento-card__icon">{card.icon}</span> : null}
      </div>
      <div className="magic-bento-card__content">
        {card.value != null ? <div className="magic-bento-card__value">{card.value}</div> : null}
        {card.title ? <h3 className="magic-bento-card__title">{card.title}</h3> : null}
        {card.description ? <p className="magic-bento-card__description">{card.description}</p> : null}
      </div>
    </>
  )

  if (card.href) {
    return (
      <Link
        to={card.href}
        ref={ref as RefObject<HTMLAnchorElement> & RefObject<HTMLDivElement>}
        className={className}
        style={style}
      >
        {body}
      </Link>
    )
  }

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      onClick={card.onClick}
      role={card.onClick ? 'button' : undefined}
      tabIndex={card.onClick ? 0 : undefined}
      onKeyDown={
        card.onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                card.onClick?.()
              }
            }
          : undefined
      }
    >
      {body}
    </div>
  )
}

interface GlobalSpotlightProps {
  gridRef: RefObject<HTMLDivElement | null>
  disableAnimations: boolean
  spotlightRadius: number
  glowColor: string
}

function GlobalSpotlight({ gridRef, disableAnimations, spotlightRadius, glowColor }: GlobalSpotlightProps) {
  const spotlightRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (disableAnimations || !gridRef.current) return

    const spotlight = document.createElement('div')
    spotlight.className = 'global-spotlight'
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        rgba(${glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `
    document.body.appendChild(spotlight)
    spotlightRef.current = spotlight

    const handleMouseMove = (e: MouseEvent) => {
      const grid = gridRef.current
      const spot = spotlightRef.current
      if (!spot || !grid) return

      const section = grid.closest('.bento-section')
      const rect = section?.getBoundingClientRect()
      const mouseInside =
        !!rect &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      const cards = grid.querySelectorAll<HTMLElement>('.magic-bento-card')

      if (!mouseInside) {
        gsap.to(spot, { opacity: 0, duration: 0.3, ease: 'power2.out' })
        cards.forEach((c) => c.style.setProperty('--glow-intensity', '0'))
        return
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius)
      let minDistance = Infinity

      cards.forEach((c) => {
        const cardRect = c.getBoundingClientRect()
        const centerX = cardRect.left + cardRect.width / 2
        const centerY = cardRect.top + cardRect.height / 2
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) -
          Math.max(cardRect.width, cardRect.height) / 2
        const effectiveDistance = Math.max(0, distance)

        minDistance = Math.min(minDistance, effectiveDistance)

        let glowIntensity = 0
        if (effectiveDistance <= proximity) {
          glowIntensity = 1
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity)
        }

        updateCardGlowProperties(c, e.clientX, e.clientY, glowIntensity, spotlightRadius)
      })

      gsap.to(spot, { left: e.clientX, top: e.clientY, duration: 0.1, ease: 'power2.out' })

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
            : 0

      gsap.to(spot, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      gridRef.current
        ?.querySelectorAll<HTMLElement>('.magic-bento-card')
        .forEach((c) => c.style.setProperty('--glow-intensity', '0'))
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' })
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      spotlightRef.current?.parentNode?.removeChild(spotlightRef.current)
      spotlightRef.current = null
    }
  }, [gridRef, disableAnimations, spotlightRadius, glowColor])

  return null
}

function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}
