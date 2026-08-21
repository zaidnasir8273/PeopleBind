import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SettingsIcon } from './ui/settings'
import { LogoutIcon } from './ui/logout'
import { Avatar } from './Avatar'
import { useAuth } from '../context/AuthContext'

export function AccountMenu({ settingsTo = '/app/settings' }) {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="account-menu-wrap" ref={ref}>
      <button className="account-menu-trigger" onClick={() => setOpen((v) => !v)} aria-label="Account menu">
        <Avatar name={profile?.full_name} size={30} />
      </button>

      {open && (
        <div className="account-menu-panel">
          <div className="account-menu-header">
            <span className="account-menu-name">{profile?.full_name || 'Account'}</span>
            <span className="account-menu-email">{profile?.email}</span>
          </div>
          <Link to={settingsTo} className="account-menu-item" onClick={() => setOpen(false)}>
            <SettingsIcon size={15} />
            Settings
          </Link>
          <button type="button" className="account-menu-item" onClick={signOut}>
            <LogoutIcon size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
