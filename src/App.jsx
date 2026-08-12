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
import Attendance from './pages/Attendance'
import Leave from './pages/Leave'
import Payroll from './pages/Payroll'
import Expenses from './pages/Expenses'
import Recruitment from './pages/Recruitment'
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
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="recruitment" element={<Recruitment />} />
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
