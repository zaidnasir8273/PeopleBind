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
import { ChartBarIncreasingIcon } from './ui/chart-bar-increasing'
import { TrendingUpIcon } from './ui/trending-up'
import { LaptopMinimalCheckIcon } from './ui/laptop-minimal-check'
import { ArchiveIcon } from './ui/archive'
import { GitBranchIcon } from './ui/git-branch'
import { SparklesIcon } from './ui/sparkles'
import { RadioTowerIcon } from './ui/radio-tower'
import { HeartHandshakeIcon } from './ui/heart-handshake'
import { SettingsIcon } from './ui/settings'
import { LogoutIcon } from './ui/logout'
import { ShieldCheckIcon } from './ui/shield-check'
import { CircleHelpIcon } from './ui/circle-help'
import { PanelLeftCloseIcon } from './ui/panel-left-close'
import { PanelLeftOpenIcon } from './ui/panel-left-open'
import { ChevronRightIcon } from './ui/chevron-right'
import { useAuth } from '../context/AuthContext'
import { useSidebarCollapse } from '../hooks/useSidebarCollapse'
import { InstallAppButton } from './InstallAppButton'

type SubItem = { to: string; label: string; icon: any }
type NavItem =
  | { key: string; to: string; label: string; icon: any; end?: boolean }
  | { key: string; label: string; icon: any; submodules: SubItem[] }

// Every lucide-animated icon plays its hover animation on its own tiny
// bounding box by default -- fine for a standalone icon, but a nav link's
// hover target is the whole row (icon + label). Each icon also exposes an
// imperative start/stop pair via forwardRef for exactly this case: hand it
// a ref, and its self-triggered hover listener steps aside in favor of
// whoever calls the ref explicitly (see each icon's own source). This map
// holds one such ref per rendered icon, keyed by whatever's already used
// as that item's React `key`, so the wrapping NavLink/button can trigger
// the animation from anywhere in its own hover area.
interface AnimatedIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

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
      { to: '/app/org-chart', label: 'Org hierarchy', icon: GitBranchIcon },
    ],
  },
  {
    key: 'time',
    label: 'Time',
    icon: ClockIcon,
    submodules: [
      { to: '/app/attendance', label: 'Attendance', icon: ClockIcon },
      { to: '/app/leave', label: 'Leave', icon: CalendarDaysIcon },
      { to: '/app/timesheet', label: 'Timesheets', icon: TimerIcon },
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
  {
    key: 'company',
    label: 'Company',
    icon: SparklesIcon,
    submodules: [
      { to: '/app/announcements', label: 'Announcements', icon: RadioTowerIcon },
      { to: '/app/kudos', label: 'Celebrate wins', icon: HeartHandshakeIcon },
    ],
  },
  { key: 'calendar', to: '/app/calendar', label: 'Calendar', icon: CalendarDaysIcon },
  {
    key: 'insights',
    label: 'Insights',
    icon: ChartColumnIncreasingIcon,
    submodules: [
      { to: '/app/reports', label: 'Reports', icon: ChartColumnIncreasingIcon },
      { to: '/app/dashboards', label: 'Dashboards', icon: ChartBarIncreasingIcon },
    ],
  },
  { key: 'settings', to: '/app/settings', label: 'Settings', icon: SettingsIcon },
]

const CLOSE_DELAY = 150

// space reserved between the rail trigger and the flyout panel for the
// connecting arrow icon: ARROW_GAP px before it, ARROW_SIZE for the icon
// itself, ARROW_GAP px after it before the panel starts
const ARROW_GAP = 6
const ARROW_SIZE = 14

export function Sidebar() {
  const { profile, company, signOut } = useAuth()
  const [collapsed, setCollapsed] = useSidebarCollapse()
  const location = useLocation()
  const navigate = useNavigate()
  const [openGroup, setOpenGroup] = useState<{ key: string; top: number; left: number; arrowTop: number; arrowLeft: number } | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const iconRefs = useRef(new Map<string, AnimatedIconHandle>()).current
  const platformAdminIconRef = useRef<AnimatedIconHandle>(null)
  const helpIconRef = useRef<AnimatedIconHandle>(null)
  const signOutIconRef = useRef<AnimatedIconHandle>(null)

  function setIconRef(key: string) {
    return (handle: AnimatedIconHandle | null) => {
      if (handle) iconRefs.set(key, handle)
      else iconRefs.delete(key)
    }
  }

  function playIcon(key: string) {
    iconRefs.get(key)?.startAnimation()
  }

  function stopIcon(key: string) {
    iconRefs.get(key)?.stopAnimation()
  }

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
    setOpenGroup({
      key,
      top: rect.top,
      left: rect.right + ARROW_GAP * 2 + ARROW_SIZE,
      // pre-centered (not via CSS transform: motion.span already owns the
      // element's transform for its slide-in animation, so a CSS
      // translateY here would just get clobbered)
      arrowTop: rect.top + rect.height / 2 - ARROW_SIZE / 2,
      arrowLeft: rect.right + ARROW_GAP,
    })
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
                onMouseEnter={(e) => { openFlyout(item.key, e.currentTarget); playIcon(item.key) }}
                onMouseLeave={() => { scheduleClose(); stopIcon(item.key) }}
                data-tooltip={collapsed ? item.label : undefined}
                aria-label={item.label}
                aria-haspopup="true"
                aria-expanded={isOpen}
              >
                {isActiveGroup && <motion.span layoutId="sidebar-active-pill" className="sidebar-active-pill" transition={{ duration: 0.22 }} />}
                <Icon ref={setIconRef(item.key)} size={19} />
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
              onMouseEnter={() => playIcon(item.key)}
              onMouseLeave={() => stopIcon(item.key)}
            >
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="sidebar-active-pill" className="sidebar-active-pill" transition={{ duration: 0.22 }} />}
                  <Icon ref={setIconRef(item.key)} size={19} />
                  {!collapsed && item.label}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-user">
        <NavLink
          to="/app/help"
          className="sidebar-link"
          style={{ marginBottom: 6 }}
          data-tooltip={collapsed ? 'Help & Support' : undefined}
          aria-label="Help & Support"
          onMouseEnter={() => helpIconRef.current?.startAnimation()}
          onMouseLeave={() => helpIconRef.current?.stopAnimation()}
        >
          <CircleHelpIcon ref={helpIconRef} size={15} />
          {!collapsed && 'Help & Support'}
        </NavLink>
        {profile?.is_platform_admin && (
          <NavLink
            to="/platform-admin"
            className="sidebar-link"
            style={{ marginBottom: 6 }}
            data-tooltip={collapsed ? 'Platform Admin' : undefined}
            aria-label="Platform Admin"
            onMouseEnter={() => platformAdminIconRef.current?.startAnimation()}
            onMouseLeave={() => platformAdminIconRef.current?.stopAnimation()}
          >
            <ShieldCheckIcon ref={platformAdminIconRef} size={15} />
            {!collapsed && 'Platform Admin'}
          </NavLink>
        )}
        {!collapsed && <div className="sidebar-user-name">{profile?.full_name || profile?.email}</div>}
        <InstallAppButton collapsed={collapsed} />
        <button
          className="sidebar-signout"
          onClick={signOut}
          data-tooltip={collapsed ? 'Sign out' : undefined}
          aria-label="Sign out"
          onMouseEnter={() => signOutIconRef.current?.startAnimation()}
          onMouseLeave={() => signOutIconRef.current?.stopAnimation()}
        >
          <LogoutIcon ref={signOutIconRef} size={15} />
          {!collapsed && 'Sign out'}
        </button>
      </div>

      {createPortal(
        <AnimatePresence>
          {openGroup && openItem && 'submodules' in openItem && (
            <motion.span
              key="sidebar-flyout-arrow"
              className="sidebar-flyout-arrow"
              style={{ top: openGroup.arrowTop, left: openGroup.arrowLeft }}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRightIcon size={ARROW_SIZE} />
            </motion.span>
          )}
        </AnimatePresence>,
        document.body
      )}

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
                    onMouseEnter={() => playIcon(sub.to)}
                    onMouseLeave={() => stopIcon(sub.to)}
                  >
                    <SubIcon ref={setIconRef(sub.to)} size={16} />
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
