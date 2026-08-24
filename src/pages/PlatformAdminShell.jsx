import { NavLink, Outlet } from 'react-router-dom'
import { Building2, LifeBuoy, LayoutDashboard } from 'lucide-react'
import { MessageCircleIcon } from '../components/ui/message-circle'
import { WalletIcon } from '../components/ui/wallet'
import { LogoutIcon } from '../components/ui/logout'
import { ArrowLeftIcon } from '../components/ui/arrow-left'
import { PanelLeftCloseIcon } from '../components/ui/panel-left-close'
import { PanelLeftOpenIcon } from '../components/ui/panel-left-open'
import { useAuth } from '../context/AuthContext'
import { useSidebarCollapse } from '../hooks/useSidebarCollapse'

const NAV_ITEMS = [
  { to: '/platform-admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/platform-admin/companies', label: 'Companies', icon: Building2 },
  { to: '/platform-admin/chat', label: 'Live chat', icon: MessageCircleIcon },
  { to: '/platform-admin/tickets', label: 'Support tickets', icon: LifeBuoy },
  { to: '/platform-admin/payroll', label: 'Payroll monitor', icon: WalletIcon },
]

export default function PlatformAdminShell() {
  const { profile, company, signOut } = useAuth()
  const [collapsed, setCollapsed] = useSidebarCollapse()

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
            >
              <Icon size={19} />
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
            >
              <ArrowLeftIcon size={15} />
              {!collapsed && <span className="sidebar-link-label">{`Back to ${company.name}`}</span>}
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
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  )
}
