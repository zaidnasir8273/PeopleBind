import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function EmployeeSignup() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [form, setForm] = useState({ email: '', company_slug: '', employee_code: '', personal_email: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password,
    })

    if (signUpError) {
      setSubmitting(false)
      setError(signUpError.message)
      toast.error(signUpError.message || 'Failed to create account')
      return
    }

    if (!data.session) {
      setSubmitting(false)
      setCheckEmail(true)
      toast.success('Confirmation email sent')
      return
    }

    const { error: linkError } = await supabase.rpc('link_employee_account', {
      p_company_slug: form.company_slug,
      p_employee_code: form.employee_code,
      p_personal_email: form.personal_email,
    })

    setSubmitting(false)

    if (linkError) {
      setError(`Your account was created, but we couldn't link it yet: ${linkError.message}`)
      toast.error(linkError.message || 'Failed to link account')
      return
    }

    toast.success('Account created')
    navigate('/employee')
  }

  if (checkEmail) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <Link to="/" className="auth-wordmark" aria-label="PeopleBind">
            <span className="wordmark-full" aria-hidden="true" />
          </Link>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">
            We sent a confirmation link to <strong>{form.email}</strong>. Click it, then come back and{' '}
            <Link to="/login">sign in</Link> — we'll link your account to your employee record then.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-wordmark" aria-label="PeopleBind">
          <span className="wordmark-full" aria-hidden="true" />
        </Link>

        <h1 className="auth-title">Set up your account</h1>
        <p className="auth-subtitle">Ask HR for your company link and employee code if you don't have them.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Your email</span>
            <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>

          <label className="field">
            <span>Choose a password</span>
            <input type="password" required autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          <label className="field">
            <span>Company link</span>
            <input required placeholder="e.g. acme-textiles" value={form.company_slug} onChange={(e) => setForm({ ...form, company_slug: e.target.value })} />
          </label>

          <label className="field">
            <span>Employee code</span>
            <input required placeholder="From HR" value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} />
          </label>

          <label className="field">
            <span>Personal email on file with HR</span>
            <input type="email" required value={form.personal_email} onChange={(e) => setForm({ ...form, personal_email: e.target.value })} />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Loader2 size={14} className="btn-spinner" />}
            {submitting ? 'Setting up…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already set up? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
