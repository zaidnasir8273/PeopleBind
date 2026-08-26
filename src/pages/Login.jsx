import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AuthQuotePanel } from '../components/AuthQuotePanel'
import { FadeIn } from '../components/motion'

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
    <div className="auth-split">
      <div className="auth-panel-left">
        <div className="auth-form-wrap">
          <FadeIn as={Link} to="/" className="auth-wordmark" y={6} aria-label="PeopleBind">
            <span className="wordmark-full" aria-hidden="true" />
          </FadeIn>

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
      <AuthQuotePanel />
    </div>
  )
}
