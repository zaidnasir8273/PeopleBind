import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { DeleteIcon } from '../components/ui/delete'
import { PlusIcon } from '../components/ui/plus'
import { DownloadIcon } from '../components/ui/download'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonTable } from '../components/Skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import type { Database } from '../lib/database.types'

type Doc = Pick<Database['public']['Tables']['documents']['Row'], 'id' | 'doc_type' | 'file_path' | 'expiry_date' | 'uploaded_at'>
type EmployeeOption = Pick<Database['public']['Tables']['employees']['Row'], 'id' | 'employee_code' | 'full_name'>
interface ExpiringDoc {
  id: string
  doc_type: string
  expiry_date: string | null
  employees: { full_name: string } | null
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const COMMON_TYPES = ['CNIC', 'Employment contract', 'Degree / certificate', 'Experience letter', 'Offer letter', 'Bank details']

export default function Documents() {
  const { profile, company } = useAuth()
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(false)
  const [expiringSoon, setExpiringSoon] = useState<ExpiringDoc[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [docType, setDocType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEmployees = useCallback(async () => {
    const { data } = await supabase.from('employees').select('id, employee_code, full_name').in('employment_status', ['training', 'probation', 'confirmed']).order('full_name')
    setEmployees(data ?? [])
  }, [])

  const loadExpiring = useCallback(async () => {
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    const in30Str = `${in30.getFullYear()}-${String(in30.getMonth() + 1).padStart(2, '0')}-${String(in30.getDate()).padStart(2, '0')}`
    const { data } = await supabase
      .from('documents')
      .select('id, doc_type, expiry_date, employees(full_name)')
      .not('expiry_date', 'is', null)
      .lte('expiry_date', in30Str)
      .order('expiry_date')
      .returns<ExpiringDoc[]>()
    setExpiringSoon(data ?? [])
  }, [])

  const loadDocs = useCallback(async () => {
    if (!selectedEmployeeId) {
      setDocs([])
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('id, doc_type, file_path, expiry_date, uploaded_at')
      .eq('employee_id', selectedEmployeeId)
      .order('uploaded_at', { ascending: false })
    setDocs(data ?? [])
    setLoading(false)
  }, [selectedEmployeeId])

  useEffect(() => {
    loadEmployees()
    loadExpiring()
  }, [loadEmployees, loadExpiring])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  function openUpload() {
    setDocType('')
    setExpiryDate('')
    setFile(null)
    setError(null)
    setDrawerOpen(true)
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Choose a file first.')
      return
    }
    setError(null)
    setUploading(true)

    const path = `${company!.id}/${selectedEmployeeId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)

    if (uploadError) {
      setUploading(false)
      setError(uploadError.message)
      toast.error(uploadError.message || 'Something went wrong')
      return
    }

    const { error: insertError } = await supabase.from('documents').insert({
      company_id: company!.id,
      employee_id: selectedEmployeeId,
      doc_type: docType,
      file_path: path,
      expiry_date: expiryDate || null,
      uploaded_by: profile!.id,
    })

    setUploading(false)

    if (insertError) {
      setError(insertError.message)
      toast.error(insertError.message || 'Something went wrong')
      return
    }

    toast.success('Document uploaded')
    setDrawerOpen(false)
    loadDocs()
    loadExpiring()
  }

  async function handleView(doc: Doc) {
    const { data, error: signError } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60)
    if (signError || !data) {
      toast.error("Couldn't open that file")
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(doc: Doc) {
    await supabase.storage.from('documents').remove([doc.file_path])
    const { error: deleteError } = await supabase.from('documents').delete().eq('id', doc.id)
    if (!deleteError) {
      toast.success('Document removed')
      loadDocs()
      loadExpiring()
    }
  }

  return (
    <div className="page-inner" style={{ maxWidth: 900 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Documents</h1>
        </div>
      </div>

      {expiringSoon.length > 0 && (
        <div className="exception-box">
          <p className="exception-heading"><AlertTriangle size={14} /> {expiringSoon.length} document{expiringSoon.length > 1 ? 's' : ''} expiring within 30 days</p>
          <ul>
            {expiringSoon.map((d) => (
              <li key={d.id}><strong>{d.employees?.full_name}</strong> — {d.doc_type} expires {formatDate(d.expiry_date)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="field-row" style={{ maxWidth: 320, marginBottom: 4, alignItems: 'flex-end', gap: 12 }}>
        <label className="field" style={{ flex: 1 }}>
          <span>Employee</span>
          <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
            <option value="">— Select employee —</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
        </label>
        {selectedEmployeeId && (
          <button className="btn-primary btn-icon" onClick={openUpload} style={{ marginBottom: 2 }}>
            <PlusIcon size={16} /> Upload
          </button>
        )}
      </div>

      {!selectedEmployeeId ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>Select an employee to view or upload their documents.</p>
        </div>
      ) : loading ? (
        <SkeletonTable rows={5} columns={4} />
      ) : docs.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No documents yet.</p>
          <p className="muted">Upload a contract, ID, or certificate to get started.</p>
        </div>
      ) : (
        <Table className="data-table">
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((d) => (
              <TableRow key={d.id} style={{ cursor: 'default' }}>
                <TableCell>{d.doc_type}</TableCell>
                <TableCell className="mono">{formatDate(d.uploaded_at)}</TableCell>
                <TableCell className="mono">{d.expiry_date ? formatDate(d.expiry_date) : '—'}</TableCell>
                <TableCell>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-icon-round approve" onClick={() => handleView(d)} aria-label="View"><DownloadIcon size={14} /></button>
                    <button className="btn-icon-round reject" onClick={() => handleDelete(d)} aria-label="Delete"><DeleteIcon size={14} /></button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Upload document">
        <form onSubmit={handleUpload} className="drawer-form">
          <label className="field">
            <span>Document type</span>
            <input required list="doc-types" value={docType} onChange={(e) => setDocType(e.target.value)} placeholder="e.g. CNIC" />
            <datalist id="doc-types">
              {COMMON_TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </label>

          <label className="field">
            <span>Expiry date</span>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </label>

          <label className="field">
            <span>File</span>
            <input type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          <p className="muted" style={{ margin: 0 }}>PDF, JPG, PNG, or WEBP — up to 15MB.</p>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}
