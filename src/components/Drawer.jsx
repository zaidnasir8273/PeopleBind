import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

const CLOSE_DISTANCE_RATIO = 0.35
const CLOSE_VELOCITY = 0.15
const RUBBER_BAND_RESISTANCE = 0.25

function getExitDuration(el) {
  if (!el) return 300
  const seconds = parseFloat(getComputedStyle(el).transitionDuration)
  return Number.isFinite(seconds) ? seconds * 1000 : 300
}

export function Drawer({ open, onClose, title, children, wide = false }) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const panelRef = useRef(null)
  const dragRef = useRef({ dragging: false, startX: 0, startTime: 0, dx: 0 })

  useEffect(() => {
    let raf1, raf2, exitTimer

    if (open) {
      setMounted(true)
      if (panelRef.current) panelRef.current.style.transform = ''
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      exitTimer = setTimeout(() => {
        setMounted(false)
        if (panelRef.current) panelRef.current.style.transform = ''
      }, getExitDuration(panelRef.current))
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

  function handlePointerDown(e) {
    if (e.target.closest('.drawer-close') || !panelRef.current) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragRef.current = { dragging: true, startX: e.clientX, startTime: Date.now(), dx: 0 }
    panelRef.current.classList.add('dragging')
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!dragRef.current.dragging || !panelRef.current) return
    const raw = e.clientX - dragRef.current.startX
    const dx = raw > 0 ? raw : raw * RUBBER_BAND_RESISTANCE
    dragRef.current.dx = dx
    panelRef.current.style.transform = `translateX(${dx}px)`
  }

  function handlePointerUp() {
    if (!dragRef.current.dragging || !panelRef.current) return
    const { dx, startTime } = dragRef.current
    dragRef.current.dragging = false
    panelRef.current.classList.remove('dragging')

    const elapsed = Math.max(Date.now() - startTime, 1)
    const velocity = dx / elapsed
    const width = panelRef.current.offsetWidth || 1
    const shouldClose = dx / width > CLOSE_DISTANCE_RATIO || velocity > CLOSE_VELOCITY

    if (shouldClose) {
      panelRef.current.style.transform = 'translateX(100%)'
      onClose()
    } else {
      panelRef.current.style.transform = ''
    }
  }

  if (!mounted) return null

  return (
    <div className={`drawer-overlay${visible ? ' visible' : ''}`} onClick={onClose}>
      <div
        ref={panelRef}
        className={`drawer-panel${visible ? ' visible' : ''}${wide ? ' wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="drawer-header"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
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
