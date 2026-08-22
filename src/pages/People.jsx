import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PlusIcon } from '../components/ui/plus'
import { SearchIcon } from '../components/ui/search'
import { UploadIcon } from '../components/ui/upload'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { EmployeeFormDrawer } from '../components/EmployeeFormDrawer'
import { ImportEmployeesDrawer } from '../components/ImportEmployeesDrawer'
import { SkeletonTable } from '../components/Skeleton'
import { Avatar } from '../components/Avatar'

export default function People() {
  const { company } = useAuth()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [lookups, setLookups] = useState({ departments: [], designations: [], teams: [], employmentTypes: [], branches: [], shifts: [] })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('employees')
      .select(
        'id, employee_code, full_name, photo_url, employment_status, joining_date, phone, personal_email, cnic, bank_account_number, department_id, designation_id, employment_type_id, branch_id, manager_id, departments!employees_department_id_fkey(name), designations(name), branches(name, city)'
      )
      .order('created_at', { ascending: false })
    if (loadError) toast.error(loadError.message || 'Failed to load employees')
    setEmployees(data ?? [])
    setLoading(false)
  }, [])

  const loadLookups = useCallback(async () => {
    const [{ data: departments }, { data: designations }, { data: teams }, { data: employmentTypes }, { data: branches }, { data: shifts }] = await Promise.all([
      supabase.from('departments').select('id,name').eq('status', 'active').order('name'),
      supabase.from('designations').select('id,name').eq('status', 'active').order('name'),
      supabase.from('teams').select('id,name').eq('status', 'active').order('name'),
      supabase.from('employment_types').select('id,name').order('name'),
      supabase.from('branches').select('id,name').order('name'),
      supabase.from('shifts').select('id,name').eq('status', 'active').order('name'),
    ])
    setLookups({
      departments: departments ?? [],
      designations: designations ?? [],
      teams: teams ?? [],
      employmentTypes: employmentTypes ?? [],
      branches: branches ?? [],
      shifts: shifts ?? [],
    })
  }, [])

  useEffect(() => {
    loadEmployees()
    loadLookups()
  }, [loadEmployees, loadLookups])

  async function createLookup(table, name) {
    if (!name.trim()) return null
    const { data, error: insertError } = await supabase
      .from(table)
      .insert({ company_id: company.id, name: name.trim() })
      .select()
      .single()
    if (insertError) {
      toast.error(insertError.message || 'Something went wrong')
      return null
    }
    await loadLookups()
    const label = table.slice(0, -1)
    toast.success(`${label.charAt(0).toUpperCase()}${label.slice(1)} added`)
    return data.id
  }

  const filtered = employees.filter((e) =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code?.toLowerCase().includes(search.toLowerCase())
  )

  // Resolved client-side rather than via a manager:employees(...) embed --
  // PostgREST can't reliably self-join employees to itself on this project.
  const managerNameById = useMemo(() => {
    const map = new Map()
    for (const e of employees) map.set(e.id, e.full_name)
    return map
  }, [employees])

  return (
    <div className="page-inner" style={{ maxWidth: 920 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PEOPLE</p>
          <h1 className="page-title">Employees</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary btn-icon" onClick={() => setImportOpen(true)}>
            <UploadIcon size={16} /> Import
          </button>
          <button className="btn-primary btn-icon" onClick={() => setDrawerOpen(true)}>
            <PlusIcon size={16} /> Add employee
          </button>
        </div>
      </div>

      <div className="search-bar">
        <SearchIcon size={15} />
        <input
          type="text"
          placeholder="Search by name or employee code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>{employees.length === 0 ? 'No employees yet.' : 'No matches.'}</p>
          <p className="muted">
            {employees.length === 0
              ? 'Add your first employee to start managing attendance, leave, and payroll.'
              : 'Try a different search.'}
          </p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Location</th>
              <th>Manager</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr key={emp.id} onClick={() => navigate(`/app/people/${emp.id}`)}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={emp.full_name} photoUrl={emp.photo_url} size={32} />
                    <div>
                      <div>{emp.full_name}</div>
                      <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>
                        {[emp.employee_code, emp.personal_email].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  </div>
                </td>
                <td>{emp.designations?.name ?? '—'}</td>
                <td>{emp.departments?.name ?? '—'}</td>
                <td>{emp.branches?.name ?? '—'}</td>
                <td>{(emp.manager_id && managerNameById.get(emp.manager_id)) ?? '—'}</td>
                <td>
                  <span className={`status-badge status-${emp.employment_status}`}>{emp.employment_status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <EmployeeFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialData={null}
        company={company}
        lookups={lookups}
        managerOptions={employees}
        createLookup={createLookup}
        onSaved={loadEmployees}
      />

      <ImportEmployeesDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        company={company}
        lookups={lookups}
        onImported={loadEmployees}
      />
    </div>
  )
}
