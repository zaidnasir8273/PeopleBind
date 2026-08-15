import { NavLink, Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Building2, Wallet, LogOut, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/platform-admin', label: 'Companies', icon: Building2, end: true },
  { to: '/platform-admin/payroll', label: 'Payroll monitor', icon: Wallet },
]

export default function PlatformAdminShell() {
  const { profile, company, signOut } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-company">
          <span className="wordmark-mark" aria-hidden="true" />
          <div>
            <div className="sidebar-company-name">Platform Admin</div>
            <div className="sidebar-company-plan">across all companies</div>
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
          {company && (
            <NavLink to="/app" className="sidebar-link" style={{ marginBottom: 6 }}>
              <ArrowLeft size={15} strokeWidth={2} />
              Back to {company.name}
            </NavLink>
          )}
          <div className="sidebar-user-name">{profile?.full_name || profile?.email}</div>
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
