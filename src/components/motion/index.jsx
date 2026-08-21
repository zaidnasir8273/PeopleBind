import { motion } from 'motion/react'

// Mirrors the CSS custom properties in index.css (--duration-fast/--duration/
// --duration-slow, --ease/--ease-out/--ease-in-out) so JS-driven motion and
// CSS transitions read as one system instead of two competing timing scales.
export const DURATION = { fast: 0.1, base: 0.18, slow: 0.3 }
export const EASE = [0.16, 1, 0.3, 1] // matches --ease-out
export const EASE_INOUT = [0.65, 0, 0.35, 1] // matches --ease-in-out

const fadeUpVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

// `as` is usually a plain tag ('div', 'a', 'li') which motion exposes
// directly as motion.div/motion.a/etc. When it's a custom component (e.g.
// react-router's Link) it needs motion.create() instead -- cached so we
// don't mint a new component type (and remount the element) every render.
const motionComponentCache = new Map()
function resolveMotionComponent(as) {
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
