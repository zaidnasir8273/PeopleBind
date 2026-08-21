import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { HomeIcon } from './ui/home'
import { UsersIcon } from './ui/users'
import { ClockIcon } from './ui/clock'
import { CalendarDaysIcon } from './ui/calendar-days'
import { TimerIcon } from './ui/timer'
import { WalletIcon } from './ui/wallet'
import { ReceiptIcon } from './ui/receipt'
import { FileTextIcon } from './ui/file-text'
import { BriefcaseBusinessIcon } from './ui/briefcase-business'
import { ClipboardCheckIcon } from './ui/clipboard-check'
import { ChartColumnIncreasingIcon } from './ui/chart-column-increasing'
import { TrendingUpIcon } from './ui/trending-up'
import { LaptopMinimalCheckIcon } from './ui/laptop-minimal-check'
import { SettingsIcon } from './ui/settings'
import { LogoutIcon } from './ui/logout'
import { ShieldCheckIcon } from './ui/shield-check'
import { PanelLeftCloseIcon } from './ui/panel-left-close'
import { PanelLeftOpenIcon } from './ui/panel-left-open'
import { useAuth } from '../context/AuthContext'
import { useSidebarCollapse } from '../hooks/useSidebarCollapse'

const NAV_ITEMS = [
  { to: '/app', label: 'Home', icon: HomeIcon, end: true },
  { to: '/app/people', label: 'People', icon: UsersIcon },
  { to: '/app/attendance', label: 'Attendance', icon: ClockIcon },
  { to: '/app/leave', label: 'Leave', icon: CalendarDaysIcon },
  { to: '/app/timesheet', label: 'Timesheet', icon: TimerIcon },
  { to: '/app/payroll', label: 'Payroll', icon: WalletIcon },
  { to: '/app/expenses', label: 'Expenses', icon: ReceiptIcon },
  { to: '/app/documents', label: 'Documents', icon: FileTextIcon },
  { to: '/app/assets', label: 'Assets', icon: LaptopMinimalCheckIcon },
  { to: '/app/recruitment', label: 'Recruitment', icon: BriefcaseBusinessIcon },
  { to: '/app/onboarding', label: 'Onboarding', icon: ClipboardCheckIcon },
  { to: '/app/performance', label: 'Performance', icon: TrendingUpIcon },
  { to: '/app/reports', label: 'Reports', icon: ChartColumnIncreasingIcon },
  { to: '/app/settings', label: 'Settings', icon: SettingsIcon },
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
              {collapsed ? <PanelLeftOpenIcon size={15} /> : <PanelLeftCloseIcon size={15} />}
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
                <Icon size={19} />
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
            <ShieldCheckIcon size={15} />
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
          <LogoutIcon size={15} />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  )
}
