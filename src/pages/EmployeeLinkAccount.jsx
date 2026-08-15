import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function EmployeeLinkAccount() {
  const navigate = useNavigate()
  const { refreshProfile, signOut } = useAuth()
  const [form, setForm] = useState({ company_slug: '', employee_code: '', personal_email: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: linkError } = await supabase.rpc('link_employee_account', {
      p_company_slug: form.company_slug,
      p_employee_code: form.employee_code,
      p_personal_email: form.personal_email,
    })

    setSubmitting(false)

    if (linkError) {
      setError(linkError.message)
      toast.error(linkError.message || 'Failed to link account')
      return
    }

    toast.success('Account linked')
    await refreshProfile()
    navigate('/employee')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-wordmark">
          <span className="wordmark-mark" aria-hidden="true" />
          <span className="wm-people">People</span><span className="wm-bind">Bind</span>
        </Link>

        <h1 className="auth-title">Link your account</h1>
        <p className="auth-subtitle">
          Your account isn't connected to an employee record yet. Enter the details HR gave you.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
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
            {submitting ? 'Linking…' : 'Link account'}
          </button>
        </form>

        <p className="auth-switch">
          <button type="button" className="link-button" onClick={signOut}>Sign out</button>
        </p>
      </div>
    </div>
  )
}
