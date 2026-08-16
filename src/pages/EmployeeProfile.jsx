import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, CreditCard, Building2, BadgeCheck, CalendarDays } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonBlock } from '../components/Skeleton'
import { Avatar } from '../components/Avatar'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function EmployeeProfile() {
  const { employeeRecord, refreshProfile } = useAuth()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (employeeRecord) {
      setForm({
        phone: employeeRecord.phone || '',
        personal_email: employeeRecord.personal_email || '',
        address: employeeRecord.address || '',
        emergency_contact_name: employeeRecord.emergency_contact_name || '',
        emergency_contact_phone: employeeRecord.emergency_contact_phone || '',
        bank_name: employeeRecord.bank_name || '',
        bank_account_number: employeeRecord.bank_account_number || '',
        bank_iban: employeeRecord.bank_iban || '',
      })
    }
  }, [employeeRecord])

  if (!form) return <div className="page-inner" style={{ maxWidth: 700 }}><SkeletonBlock rows={5} /></div>

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error: saveError } = await supabase.rpc('update_my_employee_profile', {
      p_phone: form.phone || null,
      p_personal_email: form.personal_email || null,
      p_address: form.address || null,
      p_emergency_contact_name: form.emergency_contact_name || null,
      p_emergency_contact_phone: form.emergency_contact_phone || null,
      p_bank_name: form.bank_name || null,
      p_bank_account_number: form.bank_account_number || null,
      p_bank_iban: form.bank_iban || null,
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message || 'Failed to update profile')
      return
    }

    toast.success('Profile updated')
    if (refreshProfile) refreshProfile()
  }

  return (
    <div className="page-inner" style={{ maxWidth: 700 }}>
      <div className="page-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar name={employeeRecord.full_name} photoUrl={employeeRecord.photo_url} size={48} />
          <div>
            <p className="page-eyebrow" style={{ marginBottom: 4 }}>EMPLOYEE PORTAL</p>
            <h1 className="page-title" style={{ marginBottom: 0, fontSize: 24 }}>{employeeRecord.full_name}</h1>
            <p className="muted" style={{ margin: 0 }}>{employeeRecord.designations?.name ?? 'My profile'}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div className="info-field">
          <span className="info-field-icon"><CreditCard size={15} /></span>
          <span className="info-field-body">
            <span className="info-field-label">Employee code</span>
            <span className="info-field-value">{employeeRecord.employee_code}</span>
          </span>
        </div>
        <div className="info-field">
          <span className="info-field-icon"><Building2 size={15} /></span>
          <span className="info-field-body">
            <span className="info-field-label">Department</span>
            <span className="info-field-value">{employeeRecord.departments?.name ?? '—'}</span>
          </span>
        </div>
        <div className="info-field">
          <span className="info-field-icon"><BadgeCheck size={15} /></span>
          <span className="info-field-body">
            <span className="info-field-label">Designation</span>
            <span className="info-field-value">{employeeRecord.designations?.name ?? '—'}</span>
          </span>
        </div>
        <div className="info-field">
          <span className="info-field-icon"><CalendarDays size={15} /></span>
          <span className="info-field-body">
            <span className="info-field-label">Joined</span>
            <span className="info-field-value">{formatDate(employeeRecord.joining_date)}</span>
          </span>
        </div>
      </div>

      <p className="section-heading">Contact & bank details</p>
      <p className="muted" style={{ marginTop: -8 }}>These are the only fields you can update yourself — everything else is managed by HR.</p>

      <form onSubmit={handleSubmit} className="drawer-form" style={{ maxWidth: 460 }}>
        <div className="field-row">
          <label className="field">
            <span>Phone</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="field">
            <span>Personal email</span>
            <input type="email" value={form.personal_email} onChange={(e) => setForm({ ...form, personal_email: e.target.value })} />
          </label>
        </div>

        <label className="field">
          <span>Address</span>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Emergency contact name</span>
            <input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
          </label>
          <label className="field">
            <span>Emergency contact phone</span>
            <input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
          </label>
        </div>

        <label className="field">
          <span>Bank name</span>
          <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Account number</span>
            <input value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
          </label>
          <label className="field">
            <span>IBAN</span>
            <input value={form.bank_iban} onChange={(e) => setForm({ ...form, bank_iban: e.target.value })} />
          </label>
        </div>

        {error && <p className="field-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          {saving && <Loader2 size={14} className="btn-spinner" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
