import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import AppShell from './pages/AppShell'
import Home from './pages/Home'
import People from './pages/People'
import EmployeeDetail from './pages/EmployeeDetail'
import Attendance from './pages/Attendance'
import Leave from './pages/Leave'
import Payroll from './pages/Payroll'
import Expenses from './pages/Expenses'
import Documents from './pages/Documents'
import Assets from './pages/Assets'
import Recruitment from './pages/Recruitment'
import EmployeeOnboardingTasks from './pages/EmployeeOnboardingTasks'
import Performance from './pages/Performance'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { PlatformAdminGate } from './components/PlatformAdminGate'
import PlatformAdminShell from './pages/PlatformAdminShell'
import PlatformCompanies from './pages/PlatformCompanies'
import PlatformPayroll from './pages/PlatformPayroll'
import { EmployeeProtectedRoute } from './components/EmployeeProtectedRoute'
import EmployeeLogin from './pages/EmployeeLogin'
import EmployeeSignup from './pages/EmployeeSignup'
import EmployeeLinkAccount from './pages/EmployeeLinkAccount'
import EmployeeShell from './pages/EmployeeShell'
import EmployeeHome from './pages/EmployeeHome'
import EmployeePayslips from './pages/EmployeePayslips'
import EmployeeLeave from './pages/EmployeeLeave'
import EmployeeProfile from './pages/EmployeeProfile'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          gap={8}
          toastOptions={{
            style: {
              background: 'var(--surface)',
              color: 'var(--ink)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-float)',
              fontFamily: 'var(--font-body)',
              fontSize: '13.5px',
            },
            classNames: {
              error: 'toast-error',
              success: 'toast-success',
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="people" element={<People />} />
            <Route path="people/:id" element={<EmployeeDetail />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="documents" element={<Documents />} />
            <Route path="assets" element={<Assets />} />
            <Route path="recruitment" element={<Recruitment />} />
            <Route path="onboarding" element={<EmployeeOnboardingTasks />} />
            <Route path="performance" element={<Performance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route
            path="/platform-admin"
            element={
              <ProtectedRoute>
                <PlatformAdminGate>
                  <PlatformAdminShell />
                </PlatformAdminGate>
              </ProtectedRoute>
            }
          >
            <Route index element={<PlatformCompanies />} />
            <Route path="payroll" element={<PlatformPayroll />} />
          </Route>

          <Route path="/employee/login" element={<EmployeeLogin />} />
          <Route path="/employee/signup" element={<EmployeeSignup />} />
          <Route
            path="/employee/link"
            element={
              <EmployeeProtectedRoute>
                <EmployeeLinkAccount />
              </EmployeeProtectedRoute>
            }
          />
          <Route
            path="/employee"
            element={
              <EmployeeProtectedRoute>
                <EmployeeShell />
              </EmployeeProtectedRoute>
            }
          >
            <Route index element={<EmployeeHome />} />
            <Route path="payslips" element={<EmployeePayslips />} />
            <Route path="leave" element={<EmployeeLeave />} />
            <Route path="profile" element={<EmployeeProfile />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
