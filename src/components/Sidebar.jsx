import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
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
  FileText,
  Laptop,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Timer,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSidebarCollapse } from '../hooks/useSidebarCollapse'

const NAV_ITEMS = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/people', label: 'People', icon: Users },
  { to: '/app/attendance', label: 'Attendance', icon: Clock },
  { to: '/app/leave', label: 'Leave', icon: CalendarDays },
  { to: '/app/timesheet', label: 'Timesheet', icon: Timer },
  { to: '/app/payroll', label: 'Payroll', icon: Wallet },
  { to: '/app/expenses', label: 'Expenses', icon: Receipt },
  { to: '/app/documents', label: 'Documents', icon: FileText },
  { to: '/app/assets', label: 'Assets', icon: Laptop },
  { to: '/app/recruitment', label: 'Recruitment', icon: Briefcase },
  { to: '/app/onboarding', label: 'Onboarding', icon: ListChecks },
  { to: '/app/performance', label: 'Performance', icon: Target },
  { to: '/app/reports', label: 'Reports', icon: BarChart3 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { profile, company, signOut } = useAuth()
  const [collapsed, setCollapsed] = useSidebarCollapse()

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-company">
        <span className="wordmark-mark" aria-hidden="true" />
        {!collapsed && (
          <div>
            <div className="sidebar-company-name">{company?.name ?? 'PeopleBind'}</div>
            {company?.plan && <div className="sidebar-company-plan">{company.plan} plan</div>}
          </div>
        )}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((v) => !v)}
          data-tooltip={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={collapsed ? 'open' : 'close'}
              initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
              transition={{ duration: 0.16 }}
              style={{ display: 'flex' }}
            >
              {collapsed ? <PanelLeftOpen size={15} strokeWidth={2} /> : <PanelLeftClose size={15} strokeWidth={2} />}
            </motion.span>
          </AnimatePresence>
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
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="sidebar-active-pill" className="sidebar-active-pill" transition={{ duration: 0.22 }} />}
                <Icon size={17} strokeWidth={2} />
                {!collapsed && label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        {profile?.is_platform_admin && (
          <NavLink
            to="/platform-admin"
            className="sidebar-link"
            style={{ marginBottom: 6 }}
            data-tooltip={collapsed ? 'Platform Admin' : undefined}
            aria-label="Platform Admin"
          >
            <ShieldCheck size={15} strokeWidth={2} />
            {!collapsed && 'Platform Admin'}
          </NavLink>
        )}
        {!collapsed && <div className="sidebar-user-name">{profile?.full_name || profile?.email}</div>}
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
  )
}
