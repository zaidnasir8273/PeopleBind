import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
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
import { ArchiveIcon } from './ui/archive'
import { SettingsIcon } from './ui/settings'
import { LogoutIcon } from './ui/logout'
import { ShieldCheckIcon } from './ui/shield-check'
import { PanelLeftCloseIcon } from './ui/panel-left-close'
import { PanelLeftOpenIcon } from './ui/panel-left-open'
import { useAuth } from '../context/AuthContext'
import { useSidebarCollapse } from '../hooks/useSidebarCollapse'

type SubItem = { to: string; label: string; icon: any }
type NavItem =
  | { key: string; to: string; label: string; icon: any; end?: boolean }
  | { key: string; label: string; icon: any; submodules: SubItem[] }

// Groups exist so the rail stays short (7 entries) without losing anything --
// every route below is unchanged, only how you reach it changes. Each group
// is a themed cluster (see the plan): People = employee lifecycle, Time =
// attendance/absence, Pay = money in/out, Records = company property/files.
const NAV_ITEMS: NavItem[] = [
  { key: 'home', to: '/app', label: 'Home', icon: HomeIcon, end: true },
  {
    key: 'people',
    label: 'People',
    icon: UsersIcon,
    submodules: [
      { to: '/app/people', label: 'Directory', icon: UsersIcon },
      { to: '/app/recruitment', label: 'Recruitment', icon: BriefcaseBusinessIcon },
      { to: '/app/onboarding', label: 'Onboarding', icon: ClipboardCheckIcon },
      { to: '/app/performance', label: 'Performance', icon: TrendingUpIcon },
    ],
  },
  {
    key: 'time',
    label: 'Time',
    icon: ClockIcon,
    submodules: [
      { to: '/app/attendance', label: 'Attendance', icon: ClockIcon },
      { to: '/app/leave', label: 'Leave', icon: CalendarDaysIcon },
      { to: '/app/timesheet', label: 'Timesheet', icon: TimerIcon },
    ],
  },
  {
    key: 'pay',
    label: 'Pay',
    icon: WalletIcon,
    submodules: [
      { to: '/app/payroll', label: 'Payroll', icon: WalletIcon },
      { to: '/app/expenses', label: 'Expenses', icon: ReceiptIcon },
    ],
  },
  {
    key: 'records',
    label: 'Records',
    icon: ArchiveIcon,
    submodules: [
      { to: '/app/documents', label: 'Documents', icon: FileTextIcon },
      { to: '/app/assets', label: 'Assets', icon: LaptopMinimalCheckIcon },
    ],
  },
  { key: 'reports', to: '/app/reports', label: 'Reports', icon: ChartColumnIncreasingIcon },
  { key: 'settings', to: '/app/settings', label: 'Settings', icon: SettingsIcon },
]

const CLOSE_DELAY = 150

export function Sidebar() {
  const { profile, company, signOut } = useAuth()
  const [collapsed, setCollapsed] = useSidebarCollapse()
  const location = useLocation()
  const navigate = useNavigate()
  const [openGroup, setOpenGroup] = useState<{ key: string; top: number; left: number } | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function cancelClose() {
    clearTimeout(closeTimer.current)
  }

  function scheduleClose() {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenGroup(null), CLOSE_DELAY)
  }

  function openFlyout(key: string, el: HTMLElement) {
    cancelClose()
    const rect = el.getBoundingClientRect()
    setOpenGroup({ key, top: rect.top, left: rect.right + 8 })
  }

  const openItem = openGroup ? NAV_ITEMS.find((i) => i.key === openGroup.key) : null

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
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon

          if ('submodules' in item) {
            const isActiveGroup = item.submodules.some((s) => location.pathname.startsWith(s.to))
            const isOpen = openGroup?.key === item.key
            return (
              <button
                key={item.key}
                type="button"
                className={`sidebar-link sidebar-link-button${isActiveGroup ? ' active' : ''}`}
                onClick={() => navigate(item.submodules[0].to)}
                onMouseEnter={(e) => openFlyout(item.key, e.currentTarget)}
                onMouseLeave={scheduleClose}
                data-tooltip={collapsed ? item.label : undefined}
                aria-label={item.label}
                aria-haspopup="true"
                aria-expanded={isOpen}
              >
                {isActiveGroup && <motion.span layoutId="sidebar-active-pill" className="sidebar-active-pill" transition={{ duration: 0.22 }} />}
                <Icon size={19} />
                {!collapsed && item.label}
              </button>
            )
          }

          return (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              data-tooltip={collapsed ? item.label : undefined}
              aria-label={item.label}
            >
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="sidebar-active-pill" className="sidebar-active-pill" transition={{ duration: 0.22 }} />}
                  <Icon size={19} />
                  {!collapsed && item.label}
                </>
              )}
            </NavLink>
          )
        })}
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

      {createPortal(
        <AnimatePresence>
          {openGroup && openItem && 'submodules' in openItem && (
            <motion.div
              key="sidebar-flyout"
              className="sidebar-flyout"
              style={{ top: openGroup.top, left: openGroup.left }}
              initial={{ opacity: 0, scale: 0.96, x: -4 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.96, x: -4 }}
              transition={{ duration: 0.15 }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className="sidebar-flyout-header">{openItem.label}</div>
              {openItem.submodules.map((sub) => {
                const SubIcon = sub.icon
                return (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    className={({ isActive }) => `sidebar-flyout-item${isActive ? ' active' : ''}`}
                    onClick={() => setOpenGroup(null)}
                  >
                    <SubIcon size={16} />
                    {sub.label}
                  </NavLink>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </aside>
  )
}
