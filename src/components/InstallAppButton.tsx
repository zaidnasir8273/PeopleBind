import { DownloadIcon } from './ui/download'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

export function InstallAppButton({ collapsed }: { collapsed: boolean }) {
  const { canInstall, promptInstall } = useInstallPrompt()
  if (!canInstall) return null

  return (
    <button
      type="button"
      className="sidebar-signout"
      onClick={promptInstall}
      data-tooltip={collapsed ? 'Install app' : undefined}
      aria-label="Install app"
    >
      <DownloadIcon size={15} />
      {!collapsed && 'Install app'}
    </button>
  )
}
