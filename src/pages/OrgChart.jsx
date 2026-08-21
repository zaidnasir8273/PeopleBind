import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Avatar } from '../components/Avatar'
import { SkeletonBlock } from '../components/Skeleton'

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
  const [loading, setLoading] = useState(true)
  const [roots, setRoots] = useState([])
  const [childrenByManager, setChildrenByManager] = useState(new Map())
  const [unlinked, setUnlinked] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('employees')
      .select('id, full_name, photo_url, manager_id, departments!employees_department_id_fkey(name), designations(name)')
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
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page-inner" style={{ maxWidth: 1180 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PEOPLE</p>
          <h1 className="page-title">Organizational hierarchy</h1>
        </div>
      </div>

      {loading ? (
        <SkeletonBlock rows={6} />
      ) : roots.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No employees yet.</p>
        </div>
      ) : (
        <div className="org-chart-scroll">
          <div className="org-roots">
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
