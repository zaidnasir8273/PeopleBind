import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    setSubmitting(false)

    if (signUpError) {
      setError(signUpError.message)
      toast.error(signUpError.message || 'Failed to create account')
      return
    }

    if (data.session) {
      toast.success('Account created')
      navigate('/onboarding')
    } else {
      // Email confirmation is required before a session exists
      setCheckEmail(true)
      toast.success('Confirmation email sent')
    }
  }

  if (checkEmail) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <Link to="/" className="auth-wordmark">
            <span className="wordmark-mark" aria-hidden="true" />
            <span className="wm-people">People</span><span className="wm-bind">Bind</span>
          </Link>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">
            We sent a confirmation link to <strong>{email}</strong>. Click it,
            then come back and sign in.
          </p>
          <Link to="/login" className="btn-primary btn-link">
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-wordmark">
          <span className="wordmark-mark" aria-hidden="true" />
          <span className="wm-people">People</span><span className="wm-bind">Bind</span>
        </Link>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Next step sets up your company.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Your name</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

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
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Loader2 size={14} className="btn-spinner" />}
            {submitting ? 'Creating account…' : 'Continue'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
