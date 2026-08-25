import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Reveal, RevealGroup, RevealItem } from '../components/motion'
import { SiteHeader } from '../components/SiteHeader'
import { SiteFooter } from '../components/SiteFooter'
import { supabase } from '../lib/supabase'

const FEATURES = [
  'People & employee records',
  'Attendance & shift management',
  'Leave management',
  'Payroll & payslips',
  'Team structure & org chart',
  'Recruitment',
  'Document management',
  'Reports & dashboards',
  'Timesheet',
  'Expenses',
  'Assets',
  'Performance management',
  'Announcements & kudos',
  'Roles & permissions',
  'SESSI / PESSI / KPESSI / BESSI',
  'Provident Fund',
  'Professional Tax',
  'EOBI',
  'Gratuity',
  'Full & Final Settlement',
]

const TEAM_SIZES = ['1–10', '11–50', '51–200', '200+']

export default function Pricing() {
  const [form, setForm] = useState({
    full_name: '',
    company_name: '',
    work_email: '',
    phone: '',
    team_size: TEAM_SIZES[0],
    message: '',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: insertError } = await supabase.from('sales_inquiries').insert(form)

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      toast.error(insertError.message || 'Failed to send your request')
      return
    }

    setSubmitted(true)
    toast.success('Request sent')
  }

  return (
    <div className="page">
      <SiteHeader />

      <section className="pricing-hero">
        <Reveal as="p" className="section-eyebrow">PRICING</Reveal>
        <Reveal as="h1" delay={0.05} className="section-title">
          One plan. Every module. Priced for your team.
        </Reveal>
        <Reveal as="p" delay={0.1} className="pricing-lede">
          No tiers, no feature-gating — every company gets the full platform.
          Tell us about your team and we'll get back to you with a quote.
        </Reveal>
      </section>

      <section className="pricing-section">
        <RevealGroup as="div" className="pricing-features" staggerDelay={0.03}>
          <h3>What's included</h3>
          <div className="pricing-feature-list">
            {FEATURES.map((item) => (
              <RevealItem as="div" key={item} className="pricing-feature-item">
                <Check size={15} strokeWidth={2.5} />
                {item}
              </RevealItem>
            ))}
          </div>
        </RevealGroup>

        <Reveal as="div" delay={0.05} className="pricing-form-card">
          {submitted ? (
            <div className="pricing-success">
              <h3>Thanks — we'll be in touch.</h3>
              <p>Someone from our team will reach out with a quote shortly.</p>
            </div>
          ) : (
            <>
              <h3>Get a price quote</h3>
              <p>Tell us a bit about your company and we'll follow up.</p>

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="field-row">
                  <label className="field">
                    <span>Your name</span>
                    <input required value={form.full_name} onChange={update('full_name')} />
                  </label>
                  <label className="field">
                    <span>Company name</span>
                    <input required value={form.company_name} onChange={update('company_name')} />
                  </label>
                </div>

                <div className="field-row">
                  <label className="field">
                    <span>Work email</span>
                    <input type="email" required value={form.work_email} onChange={update('work_email')} />
                  </label>
                  <label className="field">
                    <span>Phone (optional)</span>
                    <input type="tel" value={form.phone} onChange={update('phone')} />
                  </label>
                </div>

                <label className="field">
                  <span>Team size</span>
                  <select value={form.team_size} onChange={update('team_size')}>
                    {TEAM_SIZES.map((size) => (
                      <option key={size} value={size}>{size} employees</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Anything else? (optional)</span>
                  <textarea rows={3} value={form.message} onChange={update('message')} />
                </label>

                {error && <p className="field-error">{error}</p>}

                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting && <Loader2 size={14} className="btn-spinner" />}
                  {submitting ? 'Sending…' : 'Get a price quote'}
                </button>
              </form>
            </>
          )}
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  )
}
