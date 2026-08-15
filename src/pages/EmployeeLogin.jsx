import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function EmployeeLogin() {
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
    navigate('/employee')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-wordmark">
          <span className="wordmark-mark" aria-hidden="true" />
          <span className="wm-people">People</span><span className="wm-bind">Bind</span>
        </Link>

        <h1 className="auth-title">Employee sign in</h1>
        <p className="auth-subtitle">View your payslips, request leave, and update your info.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="field">
            <span>Password</span>
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Loader2 size={14} className="btn-spinner" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/employee/signup">Set up your account</Link>
        </p>
        <p className="auth-switch">
          HR or manager? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  )
}
