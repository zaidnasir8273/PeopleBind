import { Link } from 'react-router-dom'
import { FadeIn } from './motion'
import { MagneticButton } from './motion/MagneticButton'

export function SiteHeader() {
  return (
    <header className="header">
      <FadeIn as={Link} to="/" className="wordmark" y={6}>
        <span className="wordmark-mark" aria-hidden="true" />
        <span className="wm-people">People</span><span className="wm-bind">Bind</span>
      </FadeIn>
      <nav className="header-nav">
        <Link to="/pricing" className="header-link">Pricing</Link>
        <Link to="/login" className="header-link">Sign in</Link>
        <MagneticButton as={Link} to="/signup" className="header-cta">Sign up</MagneticButton>
      </nav>
    </header>
  )
}
