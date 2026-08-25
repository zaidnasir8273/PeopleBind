import { useReducedMotion } from 'motion/react'
import { resolveMotionComponent, SPRING } from './index'

/**
 * Lift-on-hover, settle-on-press interaction for primary CTAs. Not a
 * literal cursor-follow "magnet" -- just the restrained lift + shadow +
 * icon-shift + press-scale the animation brief actually describes.
 */
export function MagneticButton({ as = 'a', className, children, iconClassName, ...rest }) {
  const Component = resolveMotionComponent(as)
  const prefersReducedMotion = useReducedMotion()

  return (
    <Component
      className={className}
      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98, y: 0 }}
      transition={SPRING.snappy}
      {...rest}
    >
      {children}
    </Component>
  )
}
