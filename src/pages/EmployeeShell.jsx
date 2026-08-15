import { NavLink, Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Home, Wallet, CalendarDays, User, LogOut, PanelLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { NotificationBell } from '../components/NotificationBell'
import { useSidebarCollapse } from '../hooks/useSidebarCollapse'

const NAV_ITEMS = [
  { to: '/employee', label: 'Home', icon: Home, end: true },
  { to: '/employee/payslips', label: 'Payslips', icon: Wallet },
  { to: '/employee/leave', label: 'Leave', icon: CalendarDays },
  { to: '/employee/profile', label: 'My profile', icon: User },
]

export default function EmployeeShell() {
  const { employeeRecord, company, signOut } = useAuth()
  const [collapsed, setCollapsed] = useSidebarCollapse()

  return (
    <div className="app-shell">
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-company">
          <span className="wordmark-mark" aria-hidden="true" />
          {!collapsed && (
            <div>
              <div className="sidebar-company-name">{company?.name ?? 'PeopleBind'}</div>
              <div className="sidebar-company-plan">employee portal</div>
            </div>
          )}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            data-tooltip={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeft size={15} strokeWidth={2} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              data-tooltip={collapsed ? label : undefined}
              aria-label={label}
            >
              <Icon size={17} strokeWidth={2} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          {!collapsed && <div className="sidebar-user-name">{employeeRecord?.full_name}</div>}
          <button
            className="sidebar-signout"
            onClick={signOut}
            data-tooltip={collapsed ? 'Sign out' : undefined}
            aria-label="Sign out"
          >
            <LogOut size={15} strokeWidth={2} />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>
      <div className="app-content">
        <div className="topbar">
          <NotificationBell portal="employee" />
        </div>
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
