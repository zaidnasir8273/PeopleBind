import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullPageLoader } from './FullPageLoader'

export function PlatformAdminGate({ children }) {
  const { profile, loading } = useAuth()

  if (loading) {
    return <FullPageLoader />
  }

  if (!profile?.is_platform_admin) {
    return <Navigate to="/app" replace />
  }

  return children
}
