import { useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { GaugeIcon } from '../components/ui/gauge'
import { BoxesIcon } from '../components/ui/boxes'
import { TicketIcon } from '../components/ui/ticket'
import { MessageCircleIcon } from '../components/ui/message-circle'
import { WalletIcon } from '../components/ui/wallet'
import { BookTextIcon } from '../components/ui/book-text'
import { LogoutIcon } from '../components/ui/logout'
import { ArrowLeftIcon } from '../components/ui/arrow-left'
import { PanelLeftCloseIcon } from '../components/ui/panel-left-close'
import { PanelLeftOpenIcon } from '../components/ui/panel-left-open'
import { useAuth } from '../context/AuthContext'
import { useSidebarCollapse } from '../hooks/useSidebarCollapse'
import { InstallAppButton } from '../components/InstallAppButton'

const NAV_ITEMS = [
  { to: '/platform-admin', label: 'Dashboard', icon: GaugeIcon, end: true },
  { to: '/platform-admin/companies', label: 'Companies', icon: BoxesIcon },
  { to: '/platform-admin/chat', label: 'Live chat', icon: MessageCircleIcon },
  { to: '/platform-admin/tickets', label: 'Support tickets', icon: TicketIcon },
  { to: '/platform-admin/payroll', label: 'Payroll monitor', icon: WalletIcon },
  { to: '/platform-admin/help', label: 'Documentation', icon: BookTextIcon },
]

export default function PlatformAdminShell() {
  const { profile, company, signOut } = useAuth()
  const [collapsed, setCollapsed] = useSidebarCollapse()
  const iconRefs = useRef(new Map()).current
  const backIconRef = useRef(null)
  const signOutIconRef = useRef(null)

  function setIconRef(key) {
    return (handle) => {
      if (handle) iconRefs.set(key, handle)
      else iconRefs.delete(key)
    }
  }

  function playIcon(key) {
    iconRefs.get(key)?.startAnimation()
  }

  function stopIcon(key) {
    iconRefs.get(key)?.stopAnimation()
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-company">
          <span className="wordmark-mark" aria-hidden="true" />
          {!collapsed && (
            <div>
              <div className="sidebar-company-name">Platform Admin</div>
              <div className="sidebar-company-plan">across all companies</div>
            </div>
          )}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            data-tooltip={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpenIcon size={15} /> : <PanelLeftCloseIcon size={15} />}
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
              onMouseEnter={() => playIcon(to)}
              onMouseLeave={() => stopIcon(to)}
            >
              <Icon ref={setIconRef(to)} size={19} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          {company && (
            <NavLink
              to="/app"
              className="sidebar-link"
              style={{ marginBottom: 6 }}
              data-tooltip={collapsed ? `Back to ${company.name}` : undefined}
              aria-label={`Back to ${company.name}`}
              onMouseEnter={() => backIconRef.current?.startAnimation()}
              onMouseLeave={() => backIconRef.current?.stopAnimation()}
            >
              <ArrowLeftIcon ref={backIconRef} size={15} />
              {!collapsed && <span className="sidebar-link-label">{`Back to ${company.name}`}</span>}
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
      </aside>
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  )
}
