import { motion, useReducedMotion } from 'motion/react'
import { EASE_INOUT } from './index'

const STROKE = 'rgba(255,255,255,0.92)'
const STROKE_SOFT = 'rgba(255,255,255,0.32)'

/**
 * Small abstract line-art loops, one per HR quote, echoing the quote's
 * idea (growth, culture absorbing strategy, feeling passed along, vision
 * aligning people, care rippling outward, a mirrored reaction) rather
 * than a generic decoration. Kept in the same restrained white-line
 * language as the rest of the app -- no photographic icon packs.
 */
export function QuoteMotif({ variant, className }) {
  const prefersReducedMotion = useReducedMotion()
  const loop = prefersReducedMotion
    ? { repeat: 0 }
    : { repeat: Infinity, repeatType: 'loop' }

  switch (variant) {
    case 'growth':
      return (
        <svg viewBox="0 0 120 72" className={className} role="img" aria-hidden="true">
          <motion.path
            d="M10 56 L38 40 L62 48 L94 16"
            fill="none"
            stroke={STROKE}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: EASE_INOUT }}
          />
          <motion.circle
            cx={94}
            cy={16}
            r={4.5}
            fill={STROKE}
            initial={{ scale: 0 }}
            animate={{ scale: prefersReducedMotion ? 1 : [1, 1.5, 1] }}
            transition={{ duration: 1.6, delay: 1, ease: EASE_INOUT, ...loop }}
          />
        </svg>
      )

    case 'absorb':
      return (
        <svg viewBox="0 0 120 90" className={className} role="img" aria-hidden="true">
          <circle cx={48} cy={45} r={20} fill="none" stroke={STROKE_SOFT} strokeWidth={2.5} />
          <motion.circle
            cx={62}
            cy={45}
            r={34}
            fill="none"
            stroke={STROKE}
            strokeWidth={3}
            animate={{ scale: prefersReducedMotion ? 1 : [1, 1.07, 1] }}
            transition={{ duration: 2.6, ease: EASE_INOUT, ...loop }}
            style={{ transformOrigin: '62px 45px' }}
          />
        </svg>
      )

    case 'pass-on':
      return (
        <svg viewBox="0 0 120 60" className={className} role="img" aria-hidden="true">
          <line x1={22} y1={30} x2={98} y2={30} stroke={STROKE_SOFT} strokeWidth={2.5} />
          <circle cx={22} cy={30} r={7} fill="none" stroke={STROKE} strokeWidth={2.5} />
          <circle cx={98} cy={30} r={7} fill="none" stroke={STROKE} strokeWidth={2.5} />
          <motion.circle
            cy={30}
            r={4.5}
            fill={STROKE}
            initial={{ cx: 22, opacity: 0 }}
            animate={
              prefersReducedMotion
                ? { cx: 98, opacity: 1 }
                : { cx: [22, 98, 98, 22], opacity: [0, 1, 1, 0] }
            }
            transition={{ duration: 2.4, ease: EASE_INOUT, times: prefersReducedMotion ? undefined : [0, 0.45, 0.55, 1], ...loop }}
          />
        </svg>
      )

    case 'align':
      return (
        <svg viewBox="0 0 100 100" className={className} role="img" aria-hidden="true">
          <circle cx={50} cy={50} r={9} fill={STROKE} />
          {[24, 36].map((r) => (
            <motion.circle
              key={r}
              cx={50}
              cy={50}
              r={r}
              fill="none"
              stroke={STROKE_SOFT}
              strokeWidth={2}
              strokeDasharray="3 6"
              initial={{ opacity: 0.6, scale: 0.8 }}
              animate={{ opacity: prefersReducedMotion ? 0.6 : [0.6, 0], scale: prefersReducedMotion ? 1 : [0.8, 1.15] }}
              transition={{ duration: 2.2, delay: r === 36 ? 0.5 : 0, ease: EASE_INOUT, ...loop }}
              style={{ transformOrigin: '50px 50px' }}
            />
          ))}
        </svg>
      )

    case 'ripple':
      return (
        <svg viewBox="0 0 100 100" className={className} role="img" aria-hidden="true">
          <circle cx={50} cy={50} r={6} fill={STROKE} />
          <motion.circle
            cx={50}
            cy={50}
            r={6}
            fill="none"
            stroke={STROKE}
            strokeWidth={2}
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: prefersReducedMotion ? 0.8 : [0.8, 0], scale: prefersReducedMotion ? 1 : [1, 5.5] }}
            transition={{ duration: 2.4, ease: EASE_INOUT, ...loop }}
            style={{ transformOrigin: '50px 50px' }}
          />
        </svg>
      )

    case 'mirror':
      return (
        <svg viewBox="0 0 120 80" className={className} role="img" aria-hidden="true">
          <line x1={60} y1={10} x2={60} y2={70} stroke={STROKE_SOFT} strokeWidth={2} strokeDasharray="3 5" />
          {[30, 90].map((cx) => (
            <motion.circle
              key={cx}
              cx={cx}
              cy={40}
              r={13}
              fill="none"
              stroke={STROKE}
              strokeWidth={3}
              animate={{ scale: prefersReducedMotion ? 1 : [1, 1.22, 1] }}
              transition={{ duration: 1.8, ease: EASE_INOUT, ...loop }}
              style={{ transformOrigin: `${cx}px 40px` }}
            />
          ))}
        </svg>
      )

    default:
      return null
  }
}
