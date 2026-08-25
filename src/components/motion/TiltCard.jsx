import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react'
import { SPRING, TILT_MAX_DEG } from './index'

/**
 * Subtle mouse-tracking 3D tilt, restrained to +/- maxTilt degrees and
 * settled with a spring rather than snapping straight back to flat.
 * Touch devices never fire continuous mousemove, so they degrade to a
 * static card with no extra handling needed.
 */
export function TiltCard({ maxTilt = TILT_MAX_DEG, className, style, children, ...rest }) {
  const prefersReducedMotion = useReducedMotion()
  const ref = useRef(null)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springRotateX = useSpring(rotateX, SPRING.gentle)
  const springRotateY = useSpring(rotateY, SPRING.gentle)

  function handleMouseMove(e) {
    if (prefersReducedMotion || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    rotateY.set(px * maxTilt * 2)
    rotateX.set(py * -maxTilt * 2)
  }

  function handleMouseLeave() {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        ...style,
        perspective: 1000,
        rotateX: prefersReducedMotion ? 0 : springRotateX,
        rotateY: prefersReducedMotion ? 0 : springRotateY,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
