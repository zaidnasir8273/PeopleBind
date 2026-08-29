import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
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

const NAV_LINKS = [
  { to: '/#modules', label: 'Modules' },
  { to: '/#faq', label: 'FAQ' },
  { to: '/pricing', label: 'Pricing' },
]

function HamburgerButton({ open, onClick }) {
  const prefersReducedMotion = useReducedMotion()
  const barTransition = prefersReducedMotion ? { duration: 0 } : SPRING.snappy
  return (
    <button type="button" className="header-menu-btn" onClick={onClick} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
      <motion.span className="header-menu-bar" animate={{ rotate: open ? 45 : 0, y: open ? 6 : 0 }} transition={barTransition} />
      <motion.span className="header-menu-bar" animate={{ opacity: open ? 0 : 1 }} transition={barTransition} />
      <motion.span className="header-menu-bar" animate={{ rotate: open ? -45 : 0, y: open ? -6 : 0 }} transition={barTransition} />
    </button>
  )
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 8))

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <>
      <header className={`header${scrolled ? ' is-scrolled' : ''}`}>
        <FadeIn as={Link} to="/" className="wordmark" y={6} aria-label="PeopleBind">
          <span className="wordmark-mark" aria-hidden="true" />
          <span><span className="wm-people">People</span><span className="wm-bind">Bind</span></span>
        </FadeIn>

        <motion.nav className="header-nav" initial="hidden" animate="show" variants={navVariants}>
          {NAV_LINKS.map((link) => (
            <MotionLink key={link.to} to={link.to} className="header-link" variants={navItemVariants} whileHover={linkHover}>
              {link.label}
            </MotionLink>
          ))}
          <MotionLink to="/login" className="header-link" variants={navItemVariants} whileHover={linkHover}>
            Sign in
          </MotionLink>
          <MagneticButton as={Link} to="/signup" className="header-cta" variants={navItemVariants}>
            Sign up
          </MagneticButton>
        </motion.nav>

        <HamburgerButton open={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
      </header>

      {createPortal(
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="header-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.base, ease: EASE }}
              onClick={() => setMenuOpen(false)}
            >
              <motion.div
                className="header-drawer"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: DURATION.base, ease: EASE }}
                onClick={(e) => e.stopPropagation()}
              >
                {NAV_LINKS.map((link) => (
                  <Link key={link.to} to={link.to} className="header-drawer-link" onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </Link>
                ))}
                <Link to="/login" className="header-drawer-link" onClick={() => setMenuOpen(false)}>
                  Sign in
                </Link>
                <Link to="/signup" className="header-drawer-link header-drawer-cta" onClick={() => setMenuOpen(false)}>
                  Sign up
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
