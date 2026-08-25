import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { DURATION, EASE_INOUT } from '../components/motion'

const HR_QUOTES = [
  {
    text: "Take care of your employees and they'll take care of your business.",
    author: 'Richard Branson',
    role: 'Founder, Virgin Group',
  },
  {
    text: 'Culture eats strategy for breakfast.',
    author: 'Peter Drucker',
    role: 'Management consultant',
  },
  {
    text: 'Customers will never love a company until the employees love it first.',
    author: 'Simon Sinek',
    role: 'Author, Start with Why',
  },
  {
    text: 'Great vision without great people is irrelevant.',
    author: 'Jim Collins',
    role: 'Author, Good to Great',
  },
  {
    text: 'Employees who feel genuinely cared for are more productive, more satisfied, and more fulfilled.',
    author: 'Anne M. Mulcahy',
    role: 'Former CEO, Xerox',
  },
  {
    text: 'The way your employees feel is the way your customers will feel.',
    author: 'Sybil F. Stershic',
    role: 'Author, marketing strategist',
  },
]

function QuotePanel() {
  const prefersReducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % HR_QUOTES.length), 5000)
    return () => clearInterval(id)
  }, [])

  const quote = HR_QUOTES[index]

  return (
    <div className="login-panel-right">
      <span className="login-quote-mark" aria-hidden="true">&ldquo;</span>
      <div className="login-quote-stage">
        <AnimatePresence mode="wait">
          <motion.figure
            key={index}
            className="login-quote"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -18 }}
            transition={{ duration: DURATION.slower, ease: EASE_INOUT }}
          >
            <blockquote className="login-quote-text">{quote.text}</blockquote>
            <figcaption className="login-quote-author">
              <span className="login-quote-name">{quote.author}</span>
              <span className="login-quote-role">{quote.role}</span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
      <div className="login-quote-dots">
        {HR_QUOTES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`login-quote-dot${i === index ? ' active' : ''}`}
            aria-label={`Show quote ${i + 1}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setSubmitting(false)

    if (signInError) {
      setError(signInError.message)
      toast.error(signInError.message || 'Failed to sign in')
      return
    }

    toast.success('Signed in')
    navigate('/app')
  }

  return (
    <div className="login-split">
      <div className="login-panel-left">
        <div className="login-form-wrap">
          <Link to="/" className="auth-wordmark">
            <span className="wordmark-mark" aria-hidden="true" />
            <span className="wm-people">People</span><span className="wm-bind">Bind</span>
          </Link>

          <h1 className="auth-title">Sign in</h1>
          <p className="auth-subtitle">Welcome back.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && <p className="field-error">{error}</p>}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting && <Loader2 size={14} className="btn-spinner" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/signup">Create one</Link>
          </p>
        </div>
      </div>
      <QuotePanel />
    </div>
  )
}
