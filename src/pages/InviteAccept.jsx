import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function inviteErrorMessage(invite) {
  if (!invite) return 'This invite link is invalid.'
  if (invite.status === 'accepted') return 'This invite has already been used.'
  if (invite.status === 'revoked') return 'This invite has been revoked.'
  if (new Date(invite.expires_at) < new Date()) return 'This invite has expired.'
  return null
}

function InviteShell({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-wordmark">
          <span className="wordmark-mark" aria-hidden="true" />
          <span className="wm-people">People</span><span className="wm-bind">Bind</span>
        </Link>
        {children}
      </div>
    </div>
  )
}

export default function InviteAccept() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth()

  const [invite, setInvite] = useState(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.rpc('get_invite_by_token', { p_token: token }).then(({ data }) => {
      if (cancelled) return
      setInvite(data?.[0] ?? null)
      setLoadingInvite(false)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  async function finishAccept() {
    const { error: acceptError } = await supabase.rpc('accept_invite', { p_token: token })
    if (acceptError) {
      setSubmitting(false)
      setError(acceptError.message)
      toast.error(acceptError.message || 'Failed to accept invite')
      return
    }
    await refreshProfile()
    toast.success(`You've joined ${invite.company_name}`)
    navigate('/app')
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: invite.email,
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

    await finishAccept()
  }

  async function handleAccept() {
    setError(null)
    setSubmitting(true)
    await finishAccept()
  }

  if (loadingInvite || authLoading) {
    return (
      <InviteShell>
        <Loader2 size={20} className="btn-spinner" style={{ margin: '24px auto', display: 'block' }} />
      </InviteShell>
    )
  }

  const invalidReason = inviteErrorMessage(invite)
  if (invalidReason) {
    return (
      <InviteShell>
        <h1 className="auth-title">Invite not available</h1>
        <p className="auth-subtitle">{invalidReason}</p>
        <p className="auth-switch">
          <Link to="/login">Sign in</Link>
        </p>
      </InviteShell>
    )
  }

  if (checkEmail) {
    return (
      <InviteShell>
        <h1 className="auth-title">Check your email</h1>
        <p className="auth-subtitle">
          We sent a confirmation link to <strong>{invite.email}</strong>. Click it, then come back to this invite
          link and sign in to join {invite.company_name}.
        </p>
      </InviteShell>
    )
  }

  if (user) {
    if (profile?.company_id) {
      return (
        <InviteShell>
          <h1 className="auth-title">Already part of a company</h1>
          <p className="auth-subtitle">
            You're signed in as <strong>{profile.email}</strong>, which already belongs to a company. Sign out and
            sign in with <strong>{invite.email}</strong> to accept this invite.
          </p>
          <button type="button" className="btn-secondary" onClick={signOut} style={{ marginTop: 12 }}>
            Sign out
          </button>
        </InviteShell>
      )
    }

    if (profile && profile.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return (
        <InviteShell>
          <h1 className="auth-title">Wrong account</h1>
          <p className="auth-subtitle">
            This invite was sent to <strong>{invite.email}</strong>, but you're signed in as{' '}
            <strong>{profile.email}</strong>. Sign out and sign in with the invited email to accept it.
          </p>
          <button type="button" className="btn-secondary" onClick={signOut} style={{ marginTop: 12 }}>
            Sign out
          </button>
        </InviteShell>
      )
    }

    return (
      <InviteShell>
        <h1 className="auth-title">Join {invite.company_name}</h1>
        <p className="auth-subtitle">You've been invited to join as <strong>{invite.role_name}</strong>.</p>
        {error && <p className="field-error">{error}</p>}
        <button type="button" className="btn-primary" disabled={submitting} onClick={handleAccept}>
          {submitting && <Loader2 size={14} className="btn-spinner" />}
          {submitting ? 'Joining…' : 'Accept & join'}
        </button>
      </InviteShell>
    )
  }

  return (
    <InviteShell>
      <h1 className="auth-title">Join {invite.company_name}</h1>
      <p className="auth-subtitle">
        You've been invited to join as <strong>{invite.role_name}</strong>. Set a password to create your account.
      </p>

      <form onSubmit={handleSignup} className="auth-form">
        <label className="field">
          <span>Email</span>
          <input type="email" value={invite.email} readOnly disabled />
        </label>

        <label className="field">
          <span>Choose a password</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="field-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Loader2 size={14} className="btn-spinner" />}
          {submitting ? 'Creating account…' : 'Create account & join'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </InviteShell>
  )
}
