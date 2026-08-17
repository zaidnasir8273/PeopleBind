import { NavLink, Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Building2, Wallet, LogOut, ArrowLeft, PanelLeftClose, PanelLeftOpen, HeartPulse, LifeBuoy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSidebarCollapse } from '../hooks/useSidebarCollapse'

const NAV_ITEMS = [
  { to: '/platform-admin', label: 'Companies', icon: Building2, end: true },
  { to: '/platform-admin/health', label: 'Health', icon: HeartPulse },
  { to: '/platform-admin/tickets', label: 'Support tickets', icon: LifeBuoy },
  { to: '/platform-admin/payroll', label: 'Payroll monitor', icon: Wallet },
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
            {collapsed ? <PanelLeftOpen size={15} strokeWidth={2} /> : <PanelLeftClose size={15} strokeWidth={2} />}
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
          {company && (
            <NavLink
              to="/app"
              className="sidebar-link"
              style={{ marginBottom: 6 }}
              data-tooltip={collapsed ? `Back to ${company.name}` : undefined}
              aria-label={`Back to ${company.name}`}
            >
              <ArrowLeft size={15} strokeWidth={2} />
              {!collapsed && `Back to ${company.name}`}
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
