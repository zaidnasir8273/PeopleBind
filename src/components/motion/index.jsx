import { motion, useReducedMotion } from 'motion/react'

// Mirrors the CSS custom properties in index.css (--duration-fast/--duration/
// --duration-slow, --ease/--ease-out/--ease-in-out) so JS-driven motion and
// CSS transitions read as one system instead of two competing timing scales.
export const DURATION = { fast: 0.1, base: 0.18, slow: 0.3, slower: 0.5 }
export const EASE = [0.16, 1, 0.3, 1] // matches --ease-out
export const EASE_INOUT = [0.65, 0, 0.35, 1] // matches --ease-in-out

// Spring presets shared by every tilt/float/press interaction in the landing
// page's animation system -- one vocabulary instead of hand-tuned constants
// scattered across components.
export const SPRING = {
  gentle: { type: 'spring', stiffness: 200, damping: 26, mass: 0.6 },
  snappy: { type: 'spring', stiffness: 340, damping: 28 },
  float: { type: 'spring', stiffness: 60, damping: 14 },
}

// Ceilings referenced by every tilt/float primitive -- keeps "subtle" an
// enforced constant rather than a per-component judgment call.
export const TILT_MAX_DEG = 4
export const FLOAT_DISTANCE_PX = 6
export const REVEAL_DISTANCE_PX = 16

const fadeUpVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

// `as` is usually a plain tag ('div', 'a', 'li') which motion exposes
// directly as motion.div/motion.a/etc. When it's a custom component (e.g.
// react-router's Link) it needs motion.create() instead -- cached so we
// don't mint a new component type (and remount the element) every render.
const motionComponentCache = new Map()
export function resolveMotionComponent(as) {
  if (typeof as === 'string') return motion[as] ?? motion.div
  if (motionComponentCache.has(as)) return motionComponentCache.get(as)
  const Wrapped = motion.create(as)
  motionComponentCache.set(as, Wrapped)
  return Wrapped
}

/** Fades content in with a small upward drift. Default entrance for cards, sections, widgets. */
export function FadeIn({ as = 'div', delay = 0, y = 8, className, children, ...rest }) {
  const Component = resolveMotionComponent(as)
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Component>
  )
}

/** Wraps a list of children and staggers their entrance. Pair with StaggerItem. */
export function StaggerContainer({ as = 'div', className, staggerDelay = 0.045, children, ...rest }) {
  const Component = resolveMotionComponent(as)
  return (
    <Component
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: staggerDelay } } }}
      {...rest}
    >
      {children}
    </Component>
  )
}

export function StaggerItem({ as = 'div', className, children, ...rest }) {
  const Component = resolveMotionComponent(as)
  return (
    <Component className={className} variants={fadeUpVariants} transition={{ duration: DURATION.base, ease: EASE }} {...rest}>
      {children}
    </Component>
  )
}

/** Fades content in once it scrolls into view (vs. FadeIn's on-mount trigger). Default for landing-page sections. */
export function Reveal({ as = 'div', delay = 0, y = REVEAL_DISTANCE_PX, className, children, ...rest }) {
  const Component = resolveMotionComponent(as)
  const prefersReducedMotion = useReducedMotion()
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : y, scale: prefersReducedMotion ? 1 : 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: DURATION.slower, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Component>
  )
}

/** Scroll-triggered sibling of StaggerContainer -- pair with RevealItem. */
export function RevealGroup({ as = 'div', className, staggerDelay = 0.08, children, ...rest }) {
  const Component = resolveMotionComponent(as)
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: staggerDelay } } }}
      {...rest}
    >
      {children}
    </Component>
  )
}

export function RevealItem({ as = 'div', className, y = REVEAL_DISTANCE_PX, children, ...rest }) {
  const Component = resolveMotionComponent(as)
  const prefersReducedMotion = useReducedMotion()
  return (
    <Component
      className={className}
      variants={{ hidden: { opacity: 0, y: prefersReducedMotion ? 0 : y }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: DURATION.slow, ease: EASE }}
      {...rest}
    >
      {children}
    </Component>
  )
}

/** Fade + slight rise used for route-level page entrances. */
export function PageTransition({ className = undefined, children }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURATION.base, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
