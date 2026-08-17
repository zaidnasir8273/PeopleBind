import { Outlet, useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { NotificationBell } from '../components/NotificationBell'
import { CommandPalette } from '../components/CommandPalette'
import { useAuth } from '../context/AuthContext'

export default function AppShell() {
  const { isImpersonating, company, exitImpersonation } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        {isImpersonating && (
          <div className="impersonation-banner">
            <ShieldAlert size={15} />
            <span>Viewing <strong>{company?.name}</strong> as Platform Admin</span>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                exitImpersonation()
                navigate('/platform-admin')
              }}
            >
              Exit
            </button>
          </div>
        )}
        <div className="topbar">
          <CommandPalette />
          <NotificationBell portal="app" />
        </div>
        <Outlet />
      </div>
    </div>
  )
}
