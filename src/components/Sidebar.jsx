import { NavLink } from 'react-router-dom'
import {
  Home,
  Users,
  Clock,
  CalendarDays,
  Wallet,
  Receipt,
  Briefcase,
  Target,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/people', label: 'People', icon: Users },
  { to: '/app/attendance', label: 'Attendance', icon: Clock },
  { to: '/app/leave', label: 'Leave', icon: CalendarDays },
  { to: '/app/payroll', label: 'Payroll', icon: Wallet },
  { to: '/app/expenses', label: 'Expenses', icon: Receipt },
  { to: '/app/recruitment', label: 'Recruitment', icon: Briefcase },
  { to: '/app/performance', label: 'Performance', icon: Target },
  { to: '/app/reports', label: 'Reports', icon: BarChart3 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { profile, company, signOut } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-company">
        <span className="wordmark-mark" aria-hidden="true" />
        <div>
          <div className="sidebar-company-name">{company?.name ?? 'PeopleBind'}</div>
          {company?.plan && <div className="sidebar-company-plan">{company.plan} plan</div>}
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        {profile?.is_platform_admin && (
          <NavLink to="/platform-admin" className="sidebar-link" style={{ marginBottom: 6 }}>
            <ShieldCheck size={15} strokeWidth={2} />
            Platform Admin
          </NavLink>
        )}
        <div className="sidebar-user-name">{profile?.full_name || profile?.email}</div>
        <button className="sidebar-signout" onClick={signOut}>
          <LogOut size={15} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
