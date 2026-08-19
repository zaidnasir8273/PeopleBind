import { useEffect } from 'react'
import { Outlet, useNavigate, Navigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Sidebar } from '../components/Sidebar'
import { NotificationBell } from '../components/NotificationBell'
import { CommandPalette } from '../components/CommandPalette'
import { useAuth } from '../context/AuthContext'

export default function AppShell() {
  const { isImpersonating, company, exitImpersonation, profile } = useAuth()
  const navigate = useNavigate()

  // A platform admin with no company of their own and no active "View as"
  // has nothing to manage here -- every save on these pages assumes a
  // company is selected, so let them in only once one is.
  const strandedAdmin = profile?.is_platform_admin && !company

  useEffect(() => {
    if (strandedAdmin) {
      toast.error('Pick a company to manage first — use "View as" from Platform Admin → Companies.')
    }
  }, [strandedAdmin])

  if (strandedAdmin) {
    return <Navigate to="/platform-admin" replace />
  }

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
