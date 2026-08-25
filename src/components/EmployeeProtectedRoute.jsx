import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullPageLoader } from './FullPageLoader'

export function EmployeeProtectedRoute({ children }) {
  const { session, employeeRecord, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <FullPageLoader />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!employeeRecord && location.pathname !== '/employee/link') {
    return <Navigate to="/employee/link" replace />
  }

  return children
}
