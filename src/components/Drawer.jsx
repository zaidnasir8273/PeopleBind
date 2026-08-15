import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const EXIT_DURATION = 320

export function Drawer({ open, onClose, title, children }) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let raf1, raf2, exitTimer

    if (open) {
      setMounted(true)
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      exitTimer = setTimeout(() => setMounted(false), EXIT_DURATION)
    }

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      clearTimeout(exitTimer)
    }
  }, [open])

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!mounted) return null

  return (
    <div className={`drawer-overlay${visible ? ' visible' : ''}`} onClick={onClose}>
      <div className={`drawer-panel${visible ? ' visible' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 className="drawer-title">{title}</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  )
}
