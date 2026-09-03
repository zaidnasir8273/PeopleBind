import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Link2, AlignLeft, Paperclip, Trash2, ExternalLink } from 'lucide-react'
import { PlusIcon } from '../components/ui/plus'
import { GraduationCapIcon } from '../components/ui/graduation-cap'
import { SquarePenIcon } from '../components/ui/square-pen'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock } from '../components/Skeleton'
import { SearchableSelect } from '../components/SearchableSelect'

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_LABELS = { draft: 'Draft', published: 'Published', archived: 'Archived' }
// Reuses the existing badge palette rather than inventing new colors --
// same trick Surveys.jsx uses (mapping 'active' -> the 'approved' class).
const COURSE_STATUS_BADGE = { draft: 'pending', published: 'approved', archived: 'rejected' }
const ENROLLMENT_STATUS_BADGE = { assigned: 'pending', completed: 'approved' }
const CONTENT_TYPE_LABELS = { text: 'Text', link: 'Link', file: 'File' }
const CONTENT_TYPE_ICONS = { text: AlignLeft, link: Link2, file: Paperclip }

const EMPTY_COURSE = { title: '', description: '', category: '', status: 'draft' }
const EMPTY_LESSON = { title: '', content_type: 'text', content_text: '', content_url: '' }

export default function Learning() {
  const { company, profile, employeeRecord } = useAuth()
  const [courses, setCourses] = useState([])
  const [myEnrollments, setMyEnrollments] = useState({}) // course_id -> enrollment row
  const [loading, setLoading] = useState(true)

  const [composing, setComposing] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState(null)
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE)
  const [savingCourse, setSavingCourse] = useState(false)

  const [detailCourse, setDetailCourse] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [lessons, setLessons] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [employees, setEmployees] = useState([])

  const [addingLesson, setAddingLesson] = useState(false)
  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON)
  const [lessonFile, setLessonFile] = useState(null)
  const [savingLesson, setSavingLesson] = useState(false)

  const [assignEmployeeId, setAssignEmployeeId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [enrollingSelf, setEnrollingSelf] = useState(false)
  const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: courseRows } = await supabase
      .from('courses')
      .select('id, title, description, category, status, created_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    setCourses(courseRows ?? [])

    if (employeeRecord) {
      const { data: myRows } = await supabase
        .from('course_enrollments')
        .select('id, course_id, status, completed_at')
        .eq('employee_id', employeeRecord.id)
      const map = {}
      for (const r of myRows ?? []) map[r.course_id] = r
      setMyEnrollments(map)
    } else {
      setMyEnrollments({})
    }

    setLoading(false)
  }, [company.id, employeeRecord])

  useEffect(() => {
    load()
  }, [load])

  function openNewCourse() {
    setEditingCourseId(null)
    setCourseForm(EMPTY_COURSE)
    setComposing(true)
  }

  function openEditCourse(course) {
    setEditingCourseId(course.id)
    setCourseForm({ title: course.title, description: course.description ?? '', category: course.category ?? '', status: course.status })
    setComposing(true)
  }

  async function saveCourse(e) {
    e.preventDefault()
    if (!courseForm.title.trim()) return
    setSavingCourse(true)

    const payload = {
      title: courseForm.title.trim(),
      description: courseForm.description.trim() || null,
      category: courseForm.category.trim() || null,
      status: courseForm.status,
    }

    const { error } = editingCourseId
      ? await supabase.from('courses').update(payload).eq('id', editingCourseId)
      : await supabase.from('courses').insert({ ...payload, company_id: company.id, created_by: profile.id })

    setSavingCourse(false)
    if (error) {
      toast.error(error.message || 'Failed to save course')
      return
    }
    toast.success(editingCourseId ? 'Course updated' : 'Course created')
    setComposing(false)
    load()
  }

  const loadDetail = useCallback(async (courseId) => {
    setDetailLoading(true)
    const [{ data: lessonRows }, { data: enrollmentRows }] = await Promise.all([
      supabase.from('course_lessons').select('id, title, content_type, content_text, content_url, file_path, sort_order').eq('course_id', courseId).order('sort_order'),
      supabase.from('course_enrollments').select('id, employee_id, status, assigned_at, completed_at, employees(full_name)').eq('course_id', courseId).order('assigned_at', { ascending: false }),
    ])
    setLessons(lessonRows ?? [])
    setEnrollments(enrollmentRows ?? [])
    setDetailLoading(false)
  }, [])

  async function openDetail(course) {
    setDetailCourse(course)
    setAddingLesson(false)
    setLessonForm(EMPTY_LESSON)
    setAssignEmployeeId('')
    loadDetail(course.id)
    if (employees.length === 0) {
      const { data } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('company_id', company.id)
        .in('employment_status', ['training', 'probation', 'confirmed'])
        .order('full_name')
      setEmployees(data ?? [])
    }
  }

  function closeDetail() {
    setDetailCourse(null)
  }

  function openAddLesson() {
    setLessonForm(EMPTY_LESSON)
    setLessonFile(null)
    setAddingLesson(true)
  }

  async function saveLesson(e) {
    e.preventDefault()
    if (!lessonForm.title.trim()) return
    if (lessonForm.content_type === 'link' && !lessonForm.content_url.trim()) return
    if (lessonForm.content_type === 'file' && !lessonFile) return

    setSavingLesson(true)

    let filePath = null
    if (lessonForm.content_type === 'file' && lessonFile) {
      filePath = `${company.id}/${detailCourse.id}/${Date.now()}-${lessonFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from('course-materials').upload(filePath, lessonFile)
      if (uploadError) {
        setSavingLesson(false)
        toast.error(uploadError.message || 'Failed to upload file')
        return
      }
    }

    const { error } = await supabase.from('course_lessons').insert({
      course_id: detailCourse.id,
      title: lessonForm.title.trim(),
      content_type: lessonForm.content_type,
      content_text: lessonForm.content_type === 'text' ? lessonForm.content_text.trim() || null : null,
      content_url: lessonForm.content_type === 'link' ? lessonForm.content_url.trim() : null,
      file_path: filePath,
      sort_order: lessons.length,
    })

    setSavingLesson(false)
    if (error) {
      if (filePath) await supabase.storage.from('course-materials').remove([filePath])
      toast.error(error.message || 'Failed to add lesson')
      return
    }
    toast.success('Lesson added')
    setAddingLesson(false)
    loadDetail(detailCourse.id)
  }

  async function removeLesson(lesson) {
    if (lesson.file_path) await supabase.storage.from('course-materials').remove([lesson.file_path])
    const { error } = await supabase.from('course_lessons').delete().eq('id', lesson.id)
    if (error) {
      toast.error(error.message || 'Failed to remove lesson')
      return
    }
    toast.success('Lesson removed')
    loadDetail(detailCourse.id)
  }

  async function openLesson(lesson) {
    if (lesson.content_type === 'link') {
      window.open(lesson.content_url, '_blank', 'noopener,noreferrer')
      return
    }
    if (lesson.content_type === 'file') {
      const { data, error } = await supabase.storage.from('course-materials').createSignedUrl(lesson.file_path, 60)
      if (error || !data) {
        toast.error("Couldn't open that file")
        return
      }
      window.open(data.signedUrl, '_blank')
    }
  }

  async function assignToEmployee() {
    if (!assignEmployeeId || !detailCourse) return
    setAssigning(true)
    const { error } = await supabase.from('course_enrollments').insert({
      course_id: detailCourse.id,
      employee_id: assignEmployeeId,
      status: 'assigned',
      assigned_by: profile.id,
    })
    setAssigning(false)
    if (error) {
      toast.error(error.code === '23505' ? 'Already assigned to this course' : error.message || 'Failed to assign')
      return
    }
    toast.success('Course assigned')
    setAssignEmployeeId('')
    loadDetail(detailCourse.id)
    load()
  }

  async function enrollSelf(course) {
    if (!employeeRecord) return
    setEnrollingSelf(true)
    const { error } = await supabase.from('course_enrollments').insert({
      course_id: course.id,
      employee_id: employeeRecord.id,
      status: 'assigned',
    })
    setEnrollingSelf(false)
    if (error) {
      toast.error(error.message || 'Failed to enroll')
      return
    }
    toast.success('Enrolled — good luck!')
    load()
    if (detailCourse?.id === course.id) loadDetail(course.id)
  }

  async function setEnrollmentStatus(enrollment, status) {
    setUpdatingEnrollmentId(enrollment.id)
    const { error } = await supabase
      .from('course_enrollments')
      .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
      .eq('id', enrollment.id)
    setUpdatingEnrollmentId(null)
    if (error) {
      toast.error(error.message || 'Failed to update')
      return
    }
    load()
    if (detailCourse) loadDetail(detailCourse.id)
  }

  if (loading) return <SkeletonBlock rows={5} />

  return (
    <div className="page-inner">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Learning</h1>
          <p className="muted" style={{ marginTop: 4 }}>Courses your company has put together — browse, enroll, and track completion.</p>
        </div>
        <button className="btn-primary btn-icon" onClick={openNewCourse}>
          <PlusIcon size={16} /> New course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <GraduationCapIcon size={28} />
          <p>No courses yet.</p>
          <p className="muted">Create one to start building out your training catalog.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
          {courses.map((c) => {
            const mine = myEnrollments[c.id]
            return (
              <div key={c.id} className="report-section" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{c.title}</p>
                  <button className="link-button" style={{ flexShrink: 0 }} onClick={() => openEditCourse(c)} aria-label="Edit course">
                    <SquarePenIcon size={15} />
                  </button>
                </div>
                {c.description && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{c.description}</p>}
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  <span className={`status-badge status-${COURSE_STATUS_BADGE[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                  {c.category && <span> · {c.category}</span>}
                </p>

                <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => openDetail(c)}>Open</button>
                  {employeeRecord && c.status === 'published' && !mine && (
                    <button className="btn-primary" style={{ fontSize: 13 }} disabled={enrollingSelf} onClick={() => enrollSelf(c)}>Enroll</button>
                  )}
                  {mine?.status === 'assigned' && (
                    <button className="link-button" style={{ fontSize: 12.5 }} disabled={updatingEnrollmentId === mine.id} onClick={() => setEnrollmentStatus(mine, 'completed')}>
                      Mark complete
                    </button>
                  )}
                  {mine?.status === 'completed' && (
                    <span className="status-badge status-approved">Completed {formatDate(mine.completed_at)}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Drawer open={composing} onClose={() => setComposing(false)} title={editingCourseId ? 'Edit course' : 'New course'}>
        <form onSubmit={saveCourse} className="drawer-form">
          <label className="field">
            <span>Title</span>
            <input required value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="Workplace safety basics" />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea rows={2} value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="Optional" />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Category</span>
              <input value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })} placeholder="Optional, e.g. Compliance" />
            </label>
            <label className="field">
              <span>Status</span>
              <select value={courseForm.status} onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <p className="muted" style={{ margin: 0 }}>Only published courses can be self-enrolled in or assigned. Add lessons after creating the course.</p>
          <button type="submit" className="btn-primary" disabled={savingCourse || !courseForm.title.trim()}>
            {savingCourse && <Loader2 size={14} className="btn-spinner" />}
            {savingCourse ? 'Saving…' : editingCourseId ? 'Save changes' : 'Create course'}
          </button>
        </form>
      </Drawer>

      <Drawer open={!!detailCourse} onClose={closeDetail} title={detailCourse?.title ?? ''} wide>
        {detailCourse && (
          <div className="drawer-form">
            {detailLoading ? (
              <SkeletonBlock rows={4} />
            ) : (
              <>
                <div>
                  <p className="section-heading">Lessons</p>
                  {lessons.length === 0 ? (
                    <p className="muted" style={{ fontSize: 13 }}>No lessons yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {lessons.map((l) => {
                        const Icon = CONTENT_TYPE_ICONS[l.content_type]
                        return (
                          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
                            <Icon size={15} className="muted" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500 }}>{l.title}</p>
                              {l.content_type === 'text' && l.content_text && (
                                <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{l.content_text}</p>
                              )}
                              {l.content_type !== 'text' && (
                                <p className="muted" style={{ margin: 0, fontSize: 12 }}>{CONTENT_TYPE_LABELS[l.content_type]}</p>
                              )}
                            </div>
                            {l.content_type !== 'text' && (
                              <button className="link-button" onClick={() => openLesson(l)} aria-label="Open lesson">
                                <ExternalLink size={14} />
                              </button>
                            )}
                            <button className="link-button" onClick={() => removeLesson(l)} aria-label="Remove lesson">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {addingLesson ? (
                    <form onSubmit={saveLesson} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                      <label className="field">
                        <span>Lesson title</span>
                        <input required value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Type</span>
                        <select value={lessonForm.content_type} onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value })}>
                          {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </label>
                      {lessonForm.content_type === 'text' && (
                        <label className="field">
                          <span>Content</span>
                          <textarea rows={4} value={lessonForm.content_text} onChange={(e) => setLessonForm({ ...lessonForm, content_text: e.target.value })} />
                        </label>
                      )}
                      {lessonForm.content_type === 'link' && (
                        <label className="field">
                          <span>URL</span>
                          <input required type="url" value={lessonForm.content_url} onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })} placeholder="https://…" />
                        </label>
                      )}
                      {lessonForm.content_type === 'file' && (
                        <label className="field">
                          <span>File</span>
                          <input required type="file" onChange={(e) => setLessonFile(e.target.files?.[0] ?? null)} />
                        </label>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn-primary" style={{ fontSize: 13 }} disabled={savingLesson}>
                          {savingLesson ? 'Adding…' : 'Add lesson'}
                        </button>
                        <button type="button" className="link-button" onClick={() => setAddingLesson(false)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button type="button" className="btn-secondary btn-icon" style={{ marginTop: 10 }} onClick={openAddLesson}>
                      <PlusIcon size={14} /> Add lesson
                    </button>
                  )}
                </div>

                {employeeRecord && detailCourse.status === 'published' && !myEnrollments[detailCourse.id] && (
                  <button className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={enrollingSelf} onClick={() => enrollSelf(detailCourse)}>
                    Enroll me
                  </button>
                )}

                <div>
                  <p className="section-heading">Assign to an employee</p>
                  {detailCourse.status !== 'published' ? (
                    <p className="muted" style={{ fontSize: 13 }}>Publish this course before assigning it to anyone.</p>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <SearchableSelect
                          options={employees.map((e) => ({ value: e.id, label: e.full_name }))}
                          value={assignEmployeeId}
                          onChange={setAssignEmployeeId}
                          placeholder="— Select employee —"
                        />
                      </div>
                      <button className="btn-secondary" disabled={!assignEmployeeId || assigning} onClick={assignToEmployee}>
                        {assigning ? 'Assigning…' : 'Assign'}
                      </button>
                    </div>
                  )}
                </div>

                {enrollments.length > 0 && (
                  <div>
                    <p className="section-heading">Enrollments</p>
                    <table className="data-table">
                      <thead><tr><th>Employee</th><th>Status</th><th>Assigned</th><th></th></tr></thead>
                      <tbody>
                        {enrollments.map((en) => (
                          <tr key={en.id} style={{ cursor: 'default' }}>
                            <td>{en.employees?.full_name ?? '—'}</td>
                            <td><span className={`status-badge status-${ENROLLMENT_STATUS_BADGE[en.status]}`}>{en.status}</span></td>
                            <td className="mono">{formatDate(en.assigned_at)}</td>
                            <td>
                              {en.status === 'assigned' ? (
                                <button className="link-button" disabled={updatingEnrollmentId === en.id} onClick={() => setEnrollmentStatus(en, 'completed')}>Mark complete</button>
                              ) : (
                                <button className="link-button" disabled={updatingEnrollmentId === en.id} onClick={() => setEnrollmentStatus(en, 'assigned')}>Reopen</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
