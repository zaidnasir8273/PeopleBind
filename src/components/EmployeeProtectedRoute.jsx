import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function EmployeeProtectedRoute({ children }) {
  const { session, employeeRecord, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="centered-loading">Loading…</div>
  }

  if (!session) {
    return <Navigate to="/employee/login" replace />
  }

  if (!employeeRecord && location.pathname !== '/employee/link') {
    return <Navigate to="/employee/link" replace />
  }

  return children
}
