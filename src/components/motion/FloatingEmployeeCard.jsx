import { motion, useReducedMotion } from 'motion/react'
import { DURATION, EASE, SPRING, FLOAT_DISTANCE_PX } from './index'

const EASE_LOOP = [0.45, 0, 0.55, 1]

export function FloatingEmployeeCard({ name, role, className, style, delay = 0, floatDuration = 4.5, depth = 1, rotate = 0 }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: prefersReducedMotion ? 0 : [0, -FLOAT_DISTANCE_PX * depth, 0],
        rotate: prefersReducedMotion ? 0 : [0, rotate, 0],
      }}
      transition={{
        opacity: { duration: DURATION.slower, ease: EASE, delay },
        scale: { ...SPRING.gentle, delay },
        y: prefersReducedMotion
          ? { duration: DURATION.slower, ease: EASE, delay }
          : { duration: floatDuration, ease: EASE_LOOP, repeat: Infinity, delay: delay + 0.6 },
        rotate: prefersReducedMotion
          ? { duration: 0 }
          : { duration: floatDuration, ease: EASE_LOOP, repeat: Infinity, delay: delay + 0.6 },
      }}
    >
      <div className="employee-card-name">{name}</div>
      <div className="employee-card-role">{role}</div>
    </motion.div>
  )
}
