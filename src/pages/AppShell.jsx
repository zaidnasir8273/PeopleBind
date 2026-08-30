import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { ShieldAlert } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { NotificationBell } from '../components/NotificationBell'
import { SupportChat } from '../components/SupportChat'
import { AiAssistant } from '../components/AiAssistant'
import { AccountMenu } from '../components/AccountMenu'
import { CommandPalette } from '../components/CommandPalette'
import { PageTransition } from '../components/motion'
import { useAuth } from '../context/AuthContext'

export default function AppShell() {
  const { isImpersonating, company, exitImpersonation, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // A platform admin with no company of their own and no active "View as"
  // has nothing to manage here -- every save on these pages assumes a
  // company is selected, so let them in only once one is.
  const strandedAdmin = profile?.is_platform_admin && !company

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
          <AiAssistant />
          <SupportChat />
          <NotificationBell portal="app" />
          <AccountMenu />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </div>
    </div>
  )
}
