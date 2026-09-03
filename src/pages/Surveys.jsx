import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PlusIcon } from '../components/ui/plus'
import { MessageSquareIcon } from '../components/ui/message-square'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock } from '../components/Skeleton'

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const EMPTY_SURVEY_FORM = { title: '', description: '', questions: [] }
const EMPTY_RESPONSE_FORM = { enps_score: null, enps_comment: '', answers: {} }

// eNPS: % promoters (9-10) minus % detractors (0-6), the standard
// formula -- not an average of scores, and not something to approximate.
function computeEnps(scores) {
  if (scores.length === 0) return null
  const promoters = scores.filter((s) => s >= 9).length
  const detractors = scores.filter((s) => s <= 6).length
  return Math.round(((promoters - detractors) / scores.length) * 100)
}

export default function Surveys() {
  const { company, employeeRecord } = useAuth()
  const [surveys, setSurveys] = useState([])
  const [receiptSurveyIds, setReceiptSurveyIds] = useState(new Set())
  const [results, setResults] = useState({}) // surveyId -> { count, enps, comments }
  const [loading, setLoading] = useState(true)

  const [composing, setComposing] = useState(false)
  const [composeForm, setComposeForm] = useState(EMPTY_SURVEY_FORM)
  const [composeSaving, setComposeSaving] = useState(false)

  const [respondingTo, setRespondingTo] = useState(null)
  const [responseForm, setResponseForm] = useState(EMPTY_RESPONSE_FORM)
  const [responseSaving, setResponseSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: surveyRows } = await supabase
      .from('surveys')
      .select('id, title, description, custom_questions, status, created_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    setSurveys(surveyRows ?? [])

    if (employeeRecord) {
      const { data: receiptRows } = await supabase
        .from('survey_receipts')
        .select('survey_id')
        .eq('employee_id', employeeRecord.id)
      setReceiptSurveyIds(new Set((receiptRows ?? []).map((r) => r.survey_id)))
    }

    // Results/completion are admin-only under RLS -- a non-admin's query
    // here just comes back empty per survey, so the results section
    // below simply never renders for them. No client-side permission
    // check needed.
    const resultsBySurvey = {}
    for (const s of surveyRows ?? []) {
      const [{ data: responseRows }, { count: receiptCount }] = await Promise.all([
        supabase.from('survey_responses').select('enps_score, enps_comment').eq('survey_id', s.id),
        supabase.from('survey_receipts').select('id', { count: 'exact', head: true }).eq('survey_id', s.id),
      ])
      if (responseRows && responseRows.length > 0) {
        const scores = responseRows.map((r) => r.enps_score).filter((v) => v !== null)
        resultsBySurvey[s.id] = {
          count: responseRows.length,
          receiptCount: receiptCount ?? 0,
          enps: computeEnps(scores),
          comments: responseRows.map((r) => r.enps_comment).filter(Boolean),
        }
      }
    }
    setResults(resultsBySurvey)

    setLoading(false)
  }, [company.id, employeeRecord])

  useEffect(() => {
    load()
  }, [load])

  function openCompose() {
    setComposeForm(EMPTY_SURVEY_FORM)
    setComposing(true)
  }

  function addQuestion() {
    setComposeForm((f) => ({
      ...f,
      questions: [...f.questions, { id: crypto.randomUUID(), type: 'rating_1_5', label: '' }],
    }))
  }

  function updateQuestion(id, patch) {
    setComposeForm((f) => ({
      ...f,
      questions: f.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }))
  }

  function removeQuestion(id) {
    setComposeForm((f) => ({ ...f, questions: f.questions.filter((q) => q.id !== id) }))
  }

  async function publish() {
    if (!composeForm.title.trim()) return
    setComposeSaving(true)
    const { error } = await supabase.from('surveys').insert({
      company_id: company.id,
      title: composeForm.title.trim(),
      description: composeForm.description.trim() || null,
      custom_questions: composeForm.questions
        .filter((q) => q.label.trim())
        .map((q) => ({ id: q.id, type: q.type, label: q.label.trim() })),
      status: 'active',
    })
    setComposeSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to publish survey')
      return
    }
    toast.success('Survey published')
    setComposing(false)
    load()
  }

  async function closeSurvey(id) {
    const { error } = await supabase.from('surveys').update({ status: 'closed' }).eq('id', id)
    if (error) {
      toast.error(error.message || 'Failed to close survey')
      return
    }
    toast.success('Survey closed')
    load()
  }

  function openRespond(survey) {
    setResponseForm({ enps_score: null, enps_comment: '', answers: {} })
    setRespondingTo(survey)
  }

  async function submitResponse() {
    if (responseForm.enps_score === null || !respondingTo || !employeeRecord) return
    setResponseSaving(true)

    const { error: responseError } = await supabase.from('survey_responses').insert({
      survey_id: respondingTo.id,
      company_id: company.id,
      enps_score: responseForm.enps_score,
      enps_comment: responseForm.enps_comment.trim() || null,
      answers: responseForm.answers,
    })
    if (responseError) {
      setResponseSaving(false)
      toast.error(responseError.message || 'Failed to submit response')
      return
    }

    // Best-effort -- the response itself (anonymous) already landed even
    // if this fails; worst case they could respond again.
    await supabase.from('survey_receipts').insert({ survey_id: respondingTo.id, employee_id: employeeRecord.id })

    setResponseSaving(false)
    toast.success('Thanks for your feedback — your response is anonymous')
    setRespondingTo(null)
    load()
  }

  if (loading) return <SkeletonBlock rows={5} />

  return (
    <div className="page-inner">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Surveys</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Every response is anonymous — nothing here links an answer back to a person, even for admins.
          </p>
        </div>
        <button className="btn-primary btn-icon" onClick={openCompose}>
          <PlusIcon size={16} /> New survey
        </button>
      </div>

      {surveys.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <MessageSquareIcon size={28} />
          <p>No surveys yet.</p>
          <p className="muted">Create one to start tracking engagement and eNPS over time.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {surveys.map((s) => {
            const alreadyResponded = receiptSurveyIds.has(s.id)
            const result = results[s.id]
            return (
              <div key={s.id} className="report-section" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{s.title}</p>
                    {s.description && <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>{s.description}</p>}
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                      {formatDate(s.created_at)} · <span className={`status-badge status-${s.status === 'active' ? 'approved' : s.status}`}>{s.status}</span>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {s.status === 'active' && !alreadyResponded && (
                      <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => openRespond(s)}>Respond</button>
                    )}
                    {s.status === 'active' && alreadyResponded && (
                      <span className="muted" style={{ fontSize: 12.5, alignSelf: 'center' }}>You've responded — thanks!</span>
                    )}
                    {s.status === 'active' && (
                      <button className="link-button" style={{ fontSize: 12.5 }} onClick={() => closeSurvey(s.id)}>Close</button>
                    )}
                  </div>
                </div>

                {result && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', gap: 24 }}>
                    <div>
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>eNPS</p>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 20 }}>{result.enps}</p>
                    </div>
                    <div>
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>Responses</p>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 20 }}>{result.count}</p>
                    </div>
                    {result.comments.length > 0 && (
                      <div style={{ flex: 1 }}>
                        <p className="muted" style={{ margin: 0, fontSize: 12 }}>Comments</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                          {result.comments.slice(0, 5).map((c, i) => (
                            <p key={i} style={{ margin: 0, fontSize: 13 }}>"{c}"</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Drawer open={composing} onClose={() => setComposing(false)} title="New survey" wide>
        <div className="drawer-form">
          <label className="field">
            <span>Title</span>
            <input required value={composeForm.title} onChange={(e) => setComposeForm({ ...composeForm, title: e.target.value })} placeholder="Q3 Engagement Check-in" />
          </label>
          <label className="field">
            <span>Description (optional)</span>
            <textarea rows={2} value={composeForm.description} onChange={(e) => setComposeForm({ ...composeForm, description: e.target.value })} />
          </label>

          <p className="muted" style={{ margin: 0 }}>
            Every survey automatically includes the standard eNPS question ("How likely are you to recommend
            working here, 0–10?") plus an optional comment. Add more questions below if you want.
          </p>

          {composeForm.questions.map((q) => (
            <div key={q.id} className="field-row" style={{ alignItems: 'flex-end' }}>
              <label className="field" style={{ flex: 2 }}>
                <span>Question</span>
                <input value={q.label} onChange={(e) => updateQuestion(q.id, { label: e.target.value })} placeholder="How supported do you feel by your manager?" />
              </label>
              <label className="field">
                <span>Type</span>
                <select value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value })}>
                  <option value="rating_1_5">Rating (1–5)</option>
                  <option value="text">Free text</option>
                </select>
              </label>
              <button type="button" className="link-button" style={{ marginBottom: 8 }} onClick={() => removeQuestion(q.id)}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn-secondary btn-icon" style={{ alignSelf: 'flex-start' }} onClick={addQuestion}>
            <PlusIcon size={14} /> Add question
          </button>

          <button type="button" className="btn-primary" disabled={composeSaving || !composeForm.title.trim()} onClick={publish} style={{ marginTop: 8 }}>
            {composeSaving ? 'Publishing…' : 'Publish survey'}
          </button>
        </div>
      </Drawer>

      <Drawer open={!!respondingTo} onClose={() => setRespondingTo(null)} title={respondingTo?.title ?? 'Respond'} wide>
        {respondingTo && (
          <div className="drawer-form">
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Your response is completely anonymous — it isn't linked to your account in any way.
            </p>

            <label className="field">
              <span>How likely are you to recommend working here to a friend? (0 = not at all, 10 = extremely likely)</span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                {Array.from({ length: 11 }, (_, n) => n).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={n === responseForm.enps_score ? 'btn-primary' : 'btn-secondary'}
                    style={{ width: 34, height: 34, padding: 0, fontSize: 13 }}
                    onClick={() => setResponseForm({ ...responseForm, enps_score: n })}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </label>

            <label className="field">
              <span>Anything you'd like to add? (optional)</span>
              <textarea rows={3} value={responseForm.enps_comment} onChange={(e) => setResponseForm({ ...responseForm, enps_comment: e.target.value })} />
            </label>

            {(respondingTo.custom_questions ?? []).map((q) => (
              <label className="field" key={q.id}>
                <span>{q.label}</span>
                {q.type === 'text' ? (
                  <textarea
                    rows={2}
                    value={responseForm.answers[q.id] ?? ''}
                    onChange={(e) => setResponseForm({ ...responseForm, answers: { ...responseForm.answers, [q.id]: e.target.value } })}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={n === responseForm.answers[q.id] ? 'btn-primary' : 'btn-secondary'}
                        style={{ width: 34, height: 34, padding: 0, fontSize: 13 }}
                        onClick={() => setResponseForm({ ...responseForm, answers: { ...responseForm.answers, [q.id]: n } })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </label>
            ))}

            <button type="button" className="btn-primary" disabled={responseSaving || responseForm.enps_score === null} onClick={submitResponse} style={{ marginTop: 8 }}>
              {responseSaving ? 'Submitting…' : 'Submit anonymously'}
            </button>
          </div>
        )}
      </Drawer>
    </div>
  )
}
