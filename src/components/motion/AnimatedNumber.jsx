import { useEffect, useRef } from 'react'
import { useMotionValue, useTransform, animate, useReducedMotion } from 'motion/react'

/**
 * Rolls a stat value up from its previous value instead of teleporting.
 * Only animates on genuine value changes (not on every re-render), and skips
 * straight to the target for prefers-reduced-motion.
 */
export function AnimatedNumber({ value, className }) {
  const prefersReducedMotion = useReducedMotion()
  const motionValue = useMotionValue(value)
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString())
  const ref = useRef(null)
  const prevValue = useRef(value)

  useEffect(() => {
    if (prefersReducedMotion || prevValue.current === value) {
      motionValue.set(value)
    } else {
      const controls = animate(motionValue, value, { duration: 0.5, ease: [0.16, 1, 0.3, 1] })
      prevValue.current = value
      return controls.stop
    }
    prevValue.current = value
  }, [value, motionValue, prefersReducedMotion])

  useEffect(() => rounded.on('change', (v) => { if (ref.current) ref.current.textContent = v }), [rounded])

  return <span ref={ref} className={className}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
}
