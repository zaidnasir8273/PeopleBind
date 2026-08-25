import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullPageLoader } from './FullPageLoader'

export function ProtectedRoute({ children }) {
  const { session, profile, employeeRecord, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <FullPageLoader />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (profile && !profile.company_id && !profile.is_platform_admin) {
    // No company profile -- an employee-only account belongs in the
    // employee portal, not the "set up your company" onboarding flow.
    if (employeeRecord) {
      return <Navigate to="/employee" replace />
    }
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />
    }
  }

  return children
}
