import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { refreshProfile, signOut } = useAuth()
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const slug = slugify(companyName) || `company-${Date.now()}`

    const { error: rpcError } = await supabase.rpc('create_company_and_claim_admin', {
      p_company_name: companyName,
      p_company_slug: slug,
    })

    if (rpcError) {
      setSubmitting(false)
      setError(rpcError.message)
      return
    }

    await refreshProfile()
    navigate('/app')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-wordmark">
          <span className="wordmark-mark" aria-hidden="true" />
          <span className="wm-people">People</span><span className="wm-bind">Bind</span>
        </div>

        <h1 className="auth-title">Set up your company</h1>
        <p className="auth-subtitle">
          This creates your workspace and makes you its admin. Takes a few
          seconds.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Company name</span>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Acme Textiles"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Setting up…' : 'Create company'}
          </button>
        </form>

        <p className="auth-switch">
          Wrong account? <button className="link-button" onClick={signOut}>Sign out</button>
        </p>
      </div>
    </div>
  )
}
