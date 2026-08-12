import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import AppShell from './pages/AppShell'
import Home from './pages/Home'
import People from './pages/People'
import ModulePlaceholder from './pages/ModulePlaceholder'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            <Route
              path="attendance"
              element={<ModulePlaceholder title="Attendance" description="Daily attendance, shifts, and corrections." />}
            />
            <Route
              path="leave"
              element={<ModulePlaceholder title="Leave" description="Leave requests, balances, and policies." />}
            />
            <Route
              path="payroll"
              element={<ModulePlaceholder title="Payroll" description="Salary structures, payroll runs, and payslips." />}
            />
            <Route
              path="expenses"
              element={<ModulePlaceholder title="Expenses" description="Employee expense claims and approvals." />}
            />
            <Route
              path="recruitment"
              element={<ModulePlaceholder title="Recruitment" description="Job openings, candidates, and interviews." />}
            />
            <Route
              path="performance"
              element={<ModulePlaceholder title="Performance" description="Goals, reviews, and feedback." />}
            />
            <Route
              path="reports"
              element={<ModulePlaceholder title="Reports" description="Workforce, payroll, and attendance reporting." />}
            />
            <Route
              path="settings"
              element={<ModulePlaceholder title="Settings" description="Company details, roles, and permissions." />}
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
