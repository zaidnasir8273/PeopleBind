import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'

function fmt(n) {
  return 'Rs. ' + Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']

const EMPTY_OPENING = {
  title: '',
  department_id: '',
  designation_id: '',
  employment_type_id: '',
  description: '',
}

export default function Recruitment() {
  const { profile, company } = useAuth()
  const [openings, setOpenings] = useState([])
  const [loading, setLoading] = useState(true)
  const [lookups, setLookups] = useState({ departments: [], designations: [], employmentTypes: [] })
  const [activeOpeningId, setActiveOpeningId] = useState(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_OPENING)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadOpenings = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('job_openings')
      .select('id, title, status, opened_at, closed_at, departments(name), applications(count)')
      .order('created_at', { ascending: false })
    setOpenings(data ?? [])
    setLoading(false)
  }, [])

  const loadLookups = useCallback(async () => {
    const [{ data: departments }, { data: designations }, { data: employmentTypes }] = await Promise.all([
      supabase.from('departments').select('id,name').eq('status', 'active').order('name'),
      supabase.from('designations').select('id,name').eq('status', 'active').order('name'),
      supabase.from('employment_types').select('id,name').order('name'),
    ])
    setLookups({ departments: departments ?? [], designations: designations ?? [], employmentTypes: employmentTypes ?? [] })
  }, [])

  useEffect(() => {
    loadOpenings()
    loadLookups()
  }, [loadOpenings, loadLookups])

  function openNew() {
    setForm(EMPTY_OPENING)
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error: saveError } = await supabase.from('job_openings').insert({
      company_id: company.id,
      title: form.title,
      department_id: form.department_id || null,
      designation_id: form.designation_id || null,
      employment_type_id: form.employment_type_id || null,
      description: form.description || null,
      created_by: profile.id,
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setDrawerOpen(false)
    loadOpenings()
  }

  if (activeOpeningId) {
    return (
      <div className="page-inner" style={{ maxWidth: 1020 }}>
        <PipelineView openingId={activeOpeningId} profile={profile} company={company} onBack={() => { setActiveOpeningId(null); loadOpenings() }} />
      </div>
    )
  }

  return (
    <div className="page-inner" style={{ maxWidth: 1020 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">RECRUITMENT</p>
          <h1 className="page-title">Job openings</h1>
        </div>
        <button className="btn-primary btn-icon" onClick={openNew}>
          <Plus size={16} /> New opening
        </button>
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
      ) : openings.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No job openings yet.</p>
          <p className="muted">Create one to start building a candidate pipeline.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Department</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Opened</th>
            </tr>
          </thead>
          <tbody>
            {openings.map((o) => (
              <tr key={o.id} onClick={() => setActiveOpeningId(o.id)}>
                <td>{o.title}</td>
                <td>{o.departments?.name ?? '—'}</td>
                <td><span className={`status-badge status-${o.status === 'open' ? 'active' : o.status === 'filled' ? 'approved' : ''}`}>{o.status}</span></td>
                <td className="mono">{o.applications?.[0]?.count ?? 0}</td>
                <td className="mono">{formatDate(o.opened_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New job opening">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Title</span>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Department</span>
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">—</option>
                {lookups.departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Designation</span>
              <select value={form.designation_id} onChange={(e) => setForm({ ...form, designation_id: e.target.value })}>
                <option value="">—</option>
                {lookups.designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Employment type</span>
            <select value={form.employment_type_id} onChange={(e) => setForm({ ...form, employment_type_id: e.target.value })}>
              <option value="">—</option>
              {lookups.employmentTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Description</span>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create opening'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}

/* =========================== PIPELINE =========================== */

function PipelineView({ openingId, profile, company, onBack }) {
  const [opening, setOpening] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  const [addDrawerOpen, setAddDrawerOpen] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [candidateMode, setCandidateMode] = useState('existing')
  const [candidateId, setCandidateId] = useState('')
  const [newCandidate, setNewCandidate] = useState({ full_name: '', email: '', phone: '', source: '' })
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState(null)

  const [activeApp, setActiveApp] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: openingRow }, { data: apps }] = await Promise.all([
      supabase.from('job_openings').select('*').eq('id', openingId).single(),
      supabase
        .from('applications')
        .select('id, stage, applied_at, rejected_reason, candidates(id, full_name, email, phone, source, notes)')
        .eq('job_opening_id', openingId)
        .order('applied_at', { ascending: false }),
    ])
    setOpening(openingRow ?? null)
    setApplications(apps ?? [])
    setLoading(false)
  }, [openingId])

  useEffect(() => {
    load()
  }, [load])

  async function openAddDrawer() {
    const { data } = await supabase.from('candidates').select('id, full_name, email').order('full_name')
    setCandidates(data ?? [])
    setCandidateMode('existing')
    setCandidateId('')
    setNewCandidate({ full_name: '', email: '', phone: '', source: '' })
    setAddError(null)
    setAddDrawerOpen(true)
  }

  async function handleAddSubmit(e) {
    e.preventDefault()
    setAddError(null)
    setAddSaving(true)

    let finalCandidateId = candidateId

    if (candidateMode === 'new') {
      const { data: created, error: candError } = await supabase
        .from('candidates')
        .insert({
          company_id: company.id,
          full_name: newCandidate.full_name,
          email: newCandidate.email || null,
          phone: newCandidate.phone || null,
          source: newCandidate.source || null,
        })
        .select()
        .single()
      if (candError) {
        setAddSaving(false)
        setAddError(candError.message)
        return
      }
      finalCandidateId = created.id
    }

    const { error: appError } = await supabase.from('applications').insert({
      company_id: company.id,
      job_opening_id: openingId,
      candidate_id: finalCandidateId,
    })

    setAddSaving(false)

    if (appError) {
      setAddError(appError.message)
      return
    }

    setAddDrawerOpen(false)
    load()
  }

  return (
    <div>
      <button className="link-button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        <ChevronLeft size={14} /> Back to openings
      </button>

      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">RECRUITMENT</p>
          <h1 className="page-title">{opening?.title ?? '…'}</h1>
        </div>
        <button className="btn-primary btn-icon" onClick={openAddDrawer}>
          <Plus size={16} /> Add candidate
        </button>
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
      ) : applications.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No candidates yet.</p>
          <p className="muted">Add a candidate to start the pipeline for this opening.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Contact</th>
              <th>Stage</th>
              <th>Applied</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a) => (
              <tr key={a.id} onClick={() => setActiveApp(a)}>
                <td>{a.candidates?.full_name}</td>
                <td className="mono" style={{ fontSize: 12 }}>{a.candidates?.email || a.candidates?.phone || '—'}</td>
                <td><span className={`status-badge status-${a.stage === 'hired' ? 'approved' : a.stage === 'rejected' || a.stage === 'withdrawn' ? 'rejected' : 'pending'}`}>{a.stage}</span></td>
                <td className="mono">{formatDate(a.applied_at?.slice(0, 10))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={addDrawerOpen} onClose={() => setAddDrawerOpen(false)} title="Add candidate to pipeline">
        <form onSubmit={handleAddSubmit} className="drawer-form">
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button type="button" className={`tab-button${candidateMode === 'existing' ? ' active' : ''}`} onClick={() => setCandidateMode('existing')}>
              Existing candidate
            </button>
            <button type="button" className={`tab-button${candidateMode === 'new' ? ' active' : ''}`} onClick={() => setCandidateMode('new')}>
              New candidate
            </button>
          </div>

          {candidateMode === 'existing' ? (
            <label className="field">
              <span>Candidate</span>
              <select required value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
                <option value="">— Select —</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}{c.email ? ` (${c.email})` : ''}</option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="field">
                <span>Full name</span>
                <input required value={newCandidate.full_name} onChange={(e) => setNewCandidate({ ...newCandidate, full_name: e.target.value })} />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={newCandidate.email} onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })} />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input value={newCandidate.phone} onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })} />
                </label>
              </div>
              <label className="field">
                <span>Source</span>
                <input value={newCandidate.source} onChange={(e) => setNewCandidate({ ...newCandidate, source: e.target.value })} placeholder="e.g. LinkedIn, referral" />
              </label>
            </>
          )}

          {addError && <p className="field-error">{addError}</p>}

          <button type="submit" className="btn-primary" disabled={addSaving}>
            {addSaving ? 'Adding…' : 'Add to pipeline'}
          </button>
        </form>
      </Drawer>

      {activeApp && (
        <CandidateDrawer
          application={activeApp}
          opening={opening}
          profile={profile}
          company={company}
          onClose={() => setActiveApp(null)}
          onChanged={() => { load() }}
        />
      )}
    </div>
  )
}

/* ======================= CANDIDATE DRAWER ======================= */

function CandidateDrawer({ application, opening, profile, company, onClose, onChanged }) {
  const [stage, setStage] = useState(application.stage)
  const [rejectedReason, setRejectedReason] = useState(application.rejected_reason || '')
  const [stageSaving, setStageSaving] = useState(false)

  const [interviews, setInterviews] = useState([])
  const [offers, setOffers] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(true)

  const [interviewForm, setInterviewForm] = useState({ round: '', scheduled_at: '', interviewer_id: profile.id })
  const [interviewSaving, setInterviewSaving] = useState(false)

  const [offerForm, setOfferForm] = useState({ offered_salary: '', joining_date: '' })
  const [offerSaving, setOfferSaving] = useState(false)

  const [convertBusy, setConvertBusy] = useState(false)
  const [convertError, setConvertError] = useState(null)

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true)
    const [{ data: interviewRows }, { data: offerRows }, { data: profileRows }] = await Promise.all([
      supabase.from('interviews').select('id, round, scheduled_at, status, rating, feedback, interviewer_id').eq('application_id', application.id).order('scheduled_at'),
      supabase.from('offers').select('id, offered_salary, joining_date, status').eq('application_id', application.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email'),
    ])
    setInterviews(interviewRows ?? [])
    setOffers(offerRows ?? [])
    setProfiles(profileRows ?? [])
    setLoadingDetail(false)
  }, [application.id])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  async function saveStage(newStage) {
    setStageSaving(true)
    const { error } = await supabase
      .from('applications')
      .update({ stage: newStage, rejected_reason: newStage === 'rejected' ? rejectedReason || null : null })
      .eq('id', application.id)
    setStageSaving(false)
    if (!error) {
      setStage(newStage)
      onChanged()
    }
  }

  async function addInterview(e) {
    e.preventDefault()
    setInterviewSaving(true)
    const { error } = await supabase.from('interviews').insert({
      company_id: company.id,
      application_id: application.id,
      interviewer_id: interviewForm.interviewer_id || null,
      round: interviewForm.round || null,
      scheduled_at: interviewForm.scheduled_at ? new Date(interviewForm.scheduled_at).toISOString() : null,
    })
    setInterviewSaving(false)
    if (!error) {
      setInterviewForm({ round: '', scheduled_at: '', interviewer_id: profile.id })
      loadDetail()
    }
  }

  async function updateInterview(id, patch) {
    await supabase.from('interviews').update(patch).eq('id', id)
    loadDetail()
  }

  async function addOffer(e) {
    e.preventDefault()
    setOfferSaving(true)
    const { error } = await supabase.from('offers').insert({
      company_id: company.id,
      application_id: application.id,
      offered_salary: offerForm.offered_salary ? Number(offerForm.offered_salary) : null,
      joining_date: offerForm.joining_date || null,
      department_id: opening?.department_id ?? null,
      designation_id: opening?.designation_id ?? null,
      branch_id: opening?.branch_id ?? null,
      employment_type_id: opening?.employment_type_id ?? null,
      created_by: profile.id,
    })
    setOfferSaving(false)
    if (!error) {
      setOfferForm({ offered_salary: '', joining_date: '' })
      loadDetail()
      if (stage === 'applied' || stage === 'screening' || stage === 'interview') saveStage('offer')
    }
  }

  async function updateOfferStatus(id, status) {
    await supabase.from('offers').update({ status, sent_at: status === 'sent' ? new Date().toISOString() : undefined, responded_at: ['accepted', 'declined'].includes(status) ? new Date().toISOString() : undefined }).eq('id', id)
    loadDetail()
  }

  async function convertToEmployee() {
    setConvertBusy(true)
    setConvertError(null)
    const { error } = await supabase.rpc('convert_candidate_to_employee', { p_application_id: application.id })
    setConvertBusy(false)
    if (error) {
      setConvertError(error.message)
      return
    }
    toast.success('Candidate hired', { description: `${application.candidates?.full_name} is now an employee.` })
    setStage('hired')
    onChanged()
  }

  const hasAcceptedOffer = offers.some((o) => o.status === 'accepted')

  return (
    <Drawer open onClose={onClose} title={application.candidates?.full_name}>
      <div className="drawer-form">
        <div className="field-row">
          <div className="field">
            <span>Email</span>
            <p style={{ margin: 0 }}>{application.candidates?.email || '—'}</p>
          </div>
          <div className="field">
            <span>Phone</span>
            <p style={{ margin: 0 }}>{application.candidates?.phone || '—'}</p>
          </div>
        </div>

        <label className="field">
          <span>Stage</span>
          <select value={stage} disabled={stageSaving} onChange={(e) => saveStage(e.target.value)}>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        {stage === 'rejected' && (
          <label className="field">
            <span>Rejection reason</span>
            <input
              value={rejectedReason}
              onChange={(e) => setRejectedReason(e.target.value)}
              onBlur={() => saveStage('rejected')}
              placeholder="Optional"
            />
          </label>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '4px 0' }} />

        <p className="section-heading" style={{ marginBottom: 8 }}>Interviews</p>
        {loadingDetail ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            {interviews.map((iv) => (
              <div key={iv.id} className="mini-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong>{iv.round || 'Interview'}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {formatDateTime(iv.scheduled_at)} · {profiles.find((p) => p.id === iv.interviewer_id)?.full_name ?? 'Unassigned'}
                    </div>
                  </div>
                  <select
                    value={iv.status}
                    onChange={(e) => updateInterview(iv.id, { status: e.target.value })}
                    style={{ fontSize: 12 }}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                {iv.status === 'completed' && (
                  <div className="field-row" style={{ marginTop: 8 }}>
                    <label className="field">
                      <span>Rating (1–5)</span>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={iv.rating ?? ''}
                        onBlur={(e) => updateInterview(iv.id, { rating: e.target.value ? Number(e.target.value) : null })}
                      />
                    </label>
                    <label className="field">
                      <span>Feedback</span>
                      <input
                        defaultValue={iv.feedback ?? ''}
                        onBlur={(e) => updateInterview(iv.id, { feedback: e.target.value || null })}
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}

            <form onSubmit={addInterview} className="mini-card">
              <div className="field-row">
                <label className="field">
                  <span>Round</span>
                  <input placeholder="e.g. Technical" value={interviewForm.round} onChange={(e) => setInterviewForm({ ...interviewForm, round: e.target.value })} />
                </label>
                <label className="field">
                  <span>When</span>
                  <input type="datetime-local" value={interviewForm.scheduled_at} onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_at: e.target.value })} />
                </label>
              </div>
              <label className="field">
                <span>Interviewer</span>
                <select value={interviewForm.interviewer_id} onChange={(e) => setInterviewForm({ ...interviewForm, interviewer_id: e.target.value })}>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn-primary" disabled={interviewSaving} style={{ alignSelf: 'flex-start' }}>
                {interviewSaving ? 'Scheduling…' : 'Schedule interview'}
              </button>
            </form>

            <p className="section-heading" style={{ margin: '16px 0 8px' }}>Offers</p>
            {offers.map((o) => (
              <div key={o.id} className="mini-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{o.offered_salary ? fmt(o.offered_salary) : 'No amount set'}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>Joining {formatDate(o.joining_date)}</div>
                  </div>
                  <span className={`status-badge status-${o.status === 'accepted' ? 'approved' : o.status === 'declined' ? 'rejected' : 'pending'}`}>{o.status}</span>
                </div>
                {o.status === 'draft' && (
                  <button type="button" className="link-button" style={{ marginTop: 6 }} onClick={() => updateOfferStatus(o.id, 'sent')}>Mark as sent</button>
                )}
                {o.status === 'sent' && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <button type="button" className="link-button" onClick={() => updateOfferStatus(o.id, 'accepted')}>Mark accepted</button>
                    <button type="button" className="link-button" onClick={() => updateOfferStatus(o.id, 'declined')}>Mark declined</button>
                  </div>
                )}
              </div>
            ))}

            <form onSubmit={addOffer} className="mini-card">
              <div className="field-row">
                <label className="field">
                  <span>Offered salary</span>
                  <input type="number" min="0" value={offerForm.offered_salary} onChange={(e) => setOfferForm({ ...offerForm, offered_salary: e.target.value })} />
                </label>
                <label className="field">
                  <span>Joining date</span>
                  <input type="date" value={offerForm.joining_date} onChange={(e) => setOfferForm({ ...offerForm, joining_date: e.target.value })} />
                </label>
              </div>
              <button type="submit" className="btn-primary" disabled={offerSaving} style={{ alignSelf: 'flex-start' }}>
                {offerSaving ? 'Creating…' : 'Create offer'}
              </button>
            </form>

            {hasAcceptedOffer && stage !== 'hired' && (
              <>
                <button type="button" className="btn-primary" onClick={convertToEmployee} disabled={convertBusy} style={{ marginTop: 8 }}>
                  {convertBusy ? 'Converting…' : 'Convert to employee'}
                </button>
                {convertError && <p className="field-error">{convertError}</p>}
              </>
            )}
          </>
        )}
      </div>
    </Drawer>
  )
}
