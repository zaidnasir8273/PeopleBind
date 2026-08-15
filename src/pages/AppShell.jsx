import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Sidebar } from '../components/Sidebar'

export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
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
