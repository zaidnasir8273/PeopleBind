import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="centered-loading">Loading…</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (
    profile &&
    !profile.company_id &&
    !profile.is_platform_admin &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
