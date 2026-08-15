import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function PlatformAdminGate({ children }) {
  const { profile, loading } = useAuth()

  if (loading) {
    return <div className="centered-loading">Loading…</div>
  }

  if (!profile?.is_platform_admin) {
    return <Navigate to="/app" replace />
  }

  return children
}
