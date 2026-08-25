import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { FadeIn, DURATION, EASE, SPRING, resolveMotionComponent } from './motion'
import { MagneticButton } from './motion/MagneticButton'

const navVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const navItemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
}

const MotionLink = resolveMotionComponent(Link)

export function SiteHeader() {
  return (
    <header className="header">
      <FadeIn as={Link} to="/" className="wordmark" y={6}>
        <span className="wordmark-mark" aria-hidden="true" />
        <span className="wm-people">People</span><span className="wm-bind">Bind</span>
      </FadeIn>
      <motion.nav className="header-nav" initial="hidden" animate="show" variants={navVariants}>
        <MotionLink
          to="/pricing"
          className="header-link"
          variants={navItemVariants}
          whileHover={{ y: -1, transition: SPRING.snappy }}
        >
          Pricing
        </MotionLink>
        <MotionLink
          to="/login"
          className="header-link"
          variants={navItemVariants}
          whileHover={{ y: -1, transition: SPRING.snappy }}
        >
          Sign in
        </MotionLink>
        <MagneticButton as={Link} to="/signup" className="header-cta" variants={navItemVariants}>
          Sign up
        </MagneticButton>
      </motion.nav>
    </header>
  )
}
