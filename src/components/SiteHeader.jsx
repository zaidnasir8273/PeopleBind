import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { FadeIn, DURATION, EASE, SPRING, resolveMotionComponent } from './motion'
import { MagneticButton } from './motion/MagneticButton'

const navVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}

const navItemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE } },
}

const linkHover = { y: -3, transition: SPRING.snappy }

const MotionLink = resolveMotionComponent(Link)

export function SiteHeader() {
  return (
    <header className="header">
      <FadeIn as={Link} to="/" className="wordmark" y={6}>
        <span className="wordmark-mark" aria-hidden="true" />
        <span className="wm-people">People</span><span className="wm-bind">Bind</span>
      </FadeIn>
      <motion.nav className="header-nav" initial="hidden" animate="show" variants={navVariants}>
        <MotionLink to="/pricing" className="header-link" variants={navItemVariants} whileHover={linkHover}>
          Pricing
        </MotionLink>
        <MotionLink to="/login" className="header-link" variants={navItemVariants} whileHover={linkHover}>
          Sign in
        </MotionLink>
        <MagneticButton as={Link} to="/signup" className="header-cta" variants={navItemVariants}>
          Sign up
        </MagneticButton>
      </motion.nav>
    </header>
  )
}
