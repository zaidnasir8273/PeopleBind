import { NavLink, Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Home, Wallet, CalendarDays, User, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/employee', label: 'Home', icon: Home, end: true },
  { to: '/employee/payslips', label: 'Payslips', icon: Wallet },
  { to: '/employee/leave', label: 'Leave', icon: CalendarDays },
  { to: '/employee/profile', label: 'My profile', icon: User },
]

export default function EmployeeShell() {
  const { employeeRecord, company, signOut } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-company">
          <span className="wordmark-mark" aria-hidden="true" />
          <div>
            <div className="sidebar-company-name">{company?.name ?? 'PeopleBind'}</div>
            <div className="sidebar-company-plan">employee portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <Icon size={17} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-name">{employeeRecord?.full_name}</div>
          <button className="sidebar-signout" onClick={signOut}>
            <LogOut size={15} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="app-content">
        <Outlet />
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--paper-raised)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            borderRadius: '10px',
            boxShadow: 'var(--shadow)',
          },
        }}
      />
    </div>
  )
}
