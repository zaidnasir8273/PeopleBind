import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ZoomIn, ZoomOut, Download, Loader2 } from 'lucide-react'
import { RotateCCWIcon } from '../components/ui/rotate-ccw'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Avatar } from '../components/Avatar'
import { SkeletonBlock } from '../components/Skeleton'

const ZOOM_MIN = 0.5
const ZOOM_MAX = 1.5
const ZOOM_STEP = 0.1

function OrgNode({ employee, childrenByManager, isRoot }) {
  const kids = childrenByManager.get(employee.id) ?? []

  return (
    <div className="org-branch">
      {!isRoot && <span className="org-stub" />}
      <Link to={`/app/people/${employee.id}`} className="org-node">
        <Avatar name={employee.full_name} photoUrl={employee.photo_url} size={44} />
        <span className="org-node-name">{employee.full_name}</span>
        <span className="org-node-title">{employee.designations?.name ?? '—'}</span>
        {employee.departments?.name && <span className="org-node-dept">{employee.departments.name}</span>}
      </Link>
      {kids.length > 0 && (
        <>
          <span className="org-stub" />
          <div className="org-children">
            {kids.map((k) => (
              <OrgNode key={k.id} employee={k} childrenByManager={childrenByManager} isRoot={false} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function OrgChart() {
  const { company } = useAuth()
  const [loading, setLoading] = useState(true)
  const [roots, setRoots] = useState([])
  const [childrenByManager, setChildrenByManager] = useState(new Map())
  const [unlinked, setUnlinked] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [exporting, setExporting] = useState(false)
  const rootsRef = useRef(null)

  function zoomIn() {
    setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100))
  }

  function zoomOut() {
    setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100))
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('employees')
      .select('id, full_name, photo_url, manager_id, departments!employees_department_id_fkey(name), designations(name)')
      .eq('company_id', company.id)
      .in('employment_status', ['training', 'probation', 'confirmed'])
      .order('full_name')

    const employees = data ?? []
    const byId = new Map(employees.map((e) => [e.id, e]))
    const byManager = new Map()
    const topLevel = []

    for (const e of employees) {
      // Someone whose manager_id points at a person no longer in this
      // list (different status, or the field is just stale) has nothing
      // to hang off of -- treat them as a root rather than silently
      // dropping them from the chart.
      if (e.manager_id && byId.has(e.manager_id)) {
        if (!byManager.has(e.manager_id)) byManager.set(e.manager_id, [])
        byManager.get(e.manager_id).push(e)
      } else {
        topLevel.push(e)
      }
    }

    setRoots(topLevel)
    setChildrenByManager(byManager)
    setUnlinked(topLevel.length)
    setLoading(false)
  }, [company.id])

  useEffect(() => {
    load()
  }, [load])

  async function exportPdf() {
    if (!rootsRef.current) return
    setExporting(true)
    const previousZoom = zoom
    setZoom(1)
    // wait for the transform reset to actually paint before rasterizing
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const canvas = await html2canvas(rootsRef.current, { scale: 2, backgroundColor: '#ffffff' })
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const pxPerPt = canvas.width / pageWidth
      const pageHeightPx = pageHeight * pxPerPt

      let renderedPx = 0
      let first = true
      while (renderedPx < canvas.height) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx)
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = sliceHeightPx
        pageCanvas.getContext('2d').drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)

        if (!first) pdf.addPage()
        pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, sliceHeightPx / pxPerPt)
        renderedPx += sliceHeightPx
        first = false
      }

      pdf.save(`org-chart-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      toast.error('Failed to generate PDF')
    } finally {
      setZoom(previousZoom)
      setExporting(false)
    }
  }

  return (
    <div className="page-inner" style={{ maxWidth: 1180 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PEOPLE</p>
          <h1 className="page-title">Organizational hierarchy</h1>
        </div>
        {!loading && roots.length > 0 && (
          <div className="zoom-controls">
            <button type="button" className="btn-icon-round" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out" data-tooltip="Zoom out">
              <ZoomOut size={15} />
            </button>
            <span className="zoom-controls-level">{Math.round(zoom * 100)}%</span>
            <button type="button" className="btn-icon-round" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in" data-tooltip="Zoom in">
              <ZoomIn size={15} />
            </button>
            <button type="button" className="btn-icon-round" onClick={() => setZoom(1)} disabled={zoom === 1} aria-label="Reset zoom" data-tooltip="Reset zoom">
              <RotateCCWIcon size={14} />
            </button>
            <button type="button" className="btn-secondary btn-icon" onClick={exportPdf} disabled={exporting} style={{ padding: '6px 12px', fontSize: 13 }}>
              {exporting ? <Loader2 size={14} className="btn-spinner" /> : <Download size={14} />}
              {exporting ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonBlock rows={6} />
      ) : roots.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No employees yet.</p>
        </div>
      ) : (
        <div className="org-chart-scroll">
          <div ref={rootsRef} className="org-roots" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            {roots.map((e) => (
              <OrgNode key={e.id} employee={e} childrenByManager={childrenByManager} isRoot />
            ))}
          </div>
          {unlinked > 1 && (
            <p className="muted" style={{ textAlign: 'center', marginTop: 24, fontSize: 12 }}>
              {unlinked} people have no manager set, so they're shown as separate roots.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
