import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { FadeIn, Reveal, RevealGroup, RevealItem } from '../components/motion'
import { MagneticButton } from '../components/motion/MagneticButton'
import { TiltCard } from '../components/motion/TiltCard'
import { FloatingEmployeeCard } from '../components/motion/FloatingEmployeeCard'
import { AnimatedNumber } from '../components/motion/AnimatedNumber'
import { PeopleNetwork } from '../components/motion/widgets/PeopleNetwork'
import { AttendanceAnimation } from '../components/motion/widgets/AttendanceAnimation'
import { LeaveApprovalFlow } from '../components/motion/widgets/LeaveApprovalFlow'
import { OrganizationChart } from '../components/motion/widgets/OrganizationChart'
import { DocumentStack } from '../components/motion/widgets/DocumentStack'
import { PayrollCalculation } from '../components/motion/widgets/PayrollCalculation'
import { RecruitmentPipeline } from '../components/motion/widgets/RecruitmentPipeline'
import { ReportsChart } from '../components/motion/widgets/ReportsChart'
import { TimerIcon } from '../components/ui/timer'
import { ReceiptIcon } from '../components/ui/receipt'
import { LaptopMinimalCheckIcon } from '../components/ui/laptop-minimal-check'
import { TrendingUpIcon } from '../components/ui/trending-up'
import { HeartHandshakeIcon } from '../components/ui/heart-handshake'
import { SettingsIcon } from '../components/ui/settings'

const payslipRows = [
  { label: 'Basic salary', amount: 'Rs. 100,000', delay: 0.05 },
  { label: 'House allowance', amount: 'Rs. 20,000', delay: 0.15 },
  { label: 'Transport', amount: 'Rs. 10,000', delay: 0.25 },
  { label: 'Overtime · 5 hrs approved', amount: 'Rs. 5,000', delay: 0.35 },
  { label: 'Tax', amount: '– Rs. 2,550', delay: 0.45, deduction: true },
  { label: 'Unpaid leave · 0 days', amount: 'Rs. 0', delay: 0.55, deduction: true },
]

const FEATURED_MODULES = [
  {
    key: 'people',
    label: 'People',
    copy: 'Every hire flows straight from application to a real employee record — nothing re-typed.',
    Widget: PeopleNetwork,
  },
  {
    key: 'attendance',
    label: 'Attendance',
    copy: 'Shifts, biometric imports, and corrections — one true daily record, not a spreadsheet.',
    Widget: AttendanceAnimation,
  },
  {
    key: 'leave',
    label: 'Leave',
    copy: 'Balances update the moment a request is approved. No manual reconciliation, ever.',
    Widget: LeaveApprovalFlow,
  },
  {
    key: 'payroll',
    label: 'Payroll',
    copy: 'Every deduction calculated from real attendance, leave, and policy — not a flat estimate.',
    Widget: PayrollCalculation,
  },
  {
    key: 'structure',
    label: 'Team structure',
    copy: 'Reporting lines drawn once, reflected in the org chart, approvals, and dashboards alike.',
    Widget: OrganizationChart,
  },
  {
    key: 'recruitment',
    label: 'Recruitment',
    copy: 'From application to offer to a real employee record — no re-entering candidate details.',
    Widget: RecruitmentPipeline,
  },
  {
    key: 'documents',
    label: 'Documents',
    copy: 'Contracts, payslips, and records — organized per employee, with expiry tracking built in.',
    Widget: DocumentStack,
  },
  {
    key: 'reports',
    label: 'Reports & Dashboards',
    copy: 'Statutory and operational reports, plus live dashboards you build from real data.',
    Widget: ReportsChart,
  },
]

const OTHER_MODULES = [
  { label: 'Timesheet', icon: TimerIcon },
  { label: 'Expenses', icon: ReceiptIcon },
  { label: 'Assets', icon: LaptopMinimalCheckIcon },
  { label: 'Performance', icon: TrendingUpIcon },
  { label: 'Announcements & Kudos', icon: HeartHandshakeIcon },
  { label: 'Settings', icon: SettingsIcon },
]

const COMPLIANCE_ITEMS = [
  'SESSI / PESSI / KPESSI / BESSI',
  'Provident Fund',
  'Professional Tax',
  'EOBI',
  'Gratuity',
  'Full & Final Settlement',
]

const EMPLOYEE_CARDS = [
  { name: 'Ahmed Khan', role: 'Finance', className: 'employee-card ec-1', delay: 0.9, floatDuration: 4.2, depth: 1, rotate: 1.5 },
  { name: 'Sara Ali', role: 'HR', className: 'employee-card ec-2', delay: 1.1, floatDuration: 5.1, depth: 1.3, rotate: -2 },
  { name: 'Usman Malik', role: 'Operations', className: 'employee-card ec-3', delay: 1.3, floatDuration: 4.7, depth: 0.8, rotate: 1.2 },
]

export default function Landing() {
  const prefersReducedMotion = useReducedMotion()
  const [netSalary, setNetSalary] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setNetSalary(132450), prefersReducedMotion ? 0 : 750)
    return () => clearTimeout(t)
  }, [prefersReducedMotion])

  return (
    <div className="page">
      <header className="header">
        <FadeIn as={Link} to="/" className="wordmark" y={6}>
          <span className="wordmark-mark" aria-hidden="true" />
          <span className="wm-people">People</span><span className="wm-bind">Bind</span>
        </FadeIn>
        <nav className="header-nav">
          <Link to="/login" className="header-link">Sign in</Link>
          <MagneticButton as={Link} to="/signup" className="header-cta">Sign up</MagneticButton>
        </nav>
      </header>

      <main className="hero">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="eyebrow">HR &amp; PAYROLL FOR PAKISTANI BUSINESSES</p>
          <h1>The simplest way to manage your people, payroll, and workplace.</h1>
          <p className="lede">
            Powerful under the hood, simple on the surface. Every payroll number
            traces back to where it came from — no black boxes, no
            re-entering the same information twice.
          </p>
          <p className="footnote">
            Built by <strong>UpScale</strong> in Islamabad. Currently under
            active development.
          </p>
        </motion.div>

        <div className="hero-payroll-visual">
          <TiltCard className="payslip" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}>
            <div className="payslip-head">
              <span className="payslip-title">Payslip · Ahmed Khan</span>
              <span className="payslip-period">Aug 2026</span>
            </div>
            {payslipRows.map((row) => (
              <div
                key={row.label}
                className={`payslip-row${row.deduction ? ' deduction' : ''}`}
                style={{ animationDelay: `${row.delay}s` }}
              >
                <span className="label">{row.label}</span>
                <span className="amount">{row.amount}</span>
              </div>
            ))}
            <div className="payslip-row total" style={{ animationDelay: '0.65s' }}>
              <span className="label">Net salary</span>
              <span className="amount">
                Rs. <AnimatedNumber value={netSalary} />
              </span>
            </div>
            <p className="payslip-caption">
              Every line traces to its source — attendance, approvals, and
              policy, not a black box.
            </p>
          </TiltCard>

          {EMPLOYEE_CARDS.map((card) => (
            <FloatingEmployeeCard key={card.name} {...card} />
          ))}
        </div>
      </main>

      <Reveal as="div" className="strip">
        <div className="strip-flow">
          See <span className="arrow">→</span> Understand{' '}
          <span className="arrow">→</span> Act
        </div>
        <p className="strip-note">
          not: configure → navigate → find → enter → calculate → verify
        </p>
      </Reveal>

      <section className="modules-section">
        <Reveal as="p" className="section-eyebrow">EVERYTHING IN ONE PLACE</Reveal>
        <Reveal as="h2" delay={0.05} className="section-title">
          One record of truth, across every module.
        </Reveal>

        <RevealGroup as="div" className="modules-grid" staggerDelay={0.09}>
          {FEATURED_MODULES.map(({ key, label, copy, Widget }) => (
            <RevealItem as="div" key={key} className="module-card">
              <div className="module-card-widget">
                <Widget className="module-widget" />
              </div>
              <h3 className="module-card-title">{label}</h3>
              <p className="module-card-copy">{copy}</p>
            </RevealItem>
          ))}
        </RevealGroup>

        <RevealGroup as="div" className="modules-chip-row" staggerDelay={0.04}>
          {OTHER_MODULES.map(({ label, icon: Icon }) => (
            <RevealItem as="span" key={label} className="module-chip">
              <Icon size={14} />
              {label}
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section className="compliance-section">
        <Reveal as="p" className="section-eyebrow">BUILT FOR PAKISTAN</Reveal>
        <Reveal as="h2" delay={0.05} className="section-title">
          Statutory compliance, handled by default.
        </Reveal>
        <Reveal as="p" delay={0.1} className="compliance-lede">
          Every deduction is calculated from your company's actual configured
          rates — not a generic template.
        </Reveal>
        <RevealGroup as="div" className="compliance-chip-row" staggerDelay={0.05}>
          {COMPLIANCE_ITEMS.map((item) => (
            <RevealItem as="span" key={item} className="compliance-chip">{item}</RevealItem>
          ))}
        </RevealGroup>
      </section>

      <Reveal as="section" className="closing-cta">
        <h2 className="section-title">Ready to see it for yourself?</h2>
        <p className="closing-cta-copy">Set up your company in a few minutes — no sales call required.</p>
        <MagneticButton as={Link} to="/signup" className="header-cta closing-cta-btn">Sign up</MagneticButton>
      </Reveal>

      <footer className="footer">
        <span><span className="wm-people">People</span><span className="wm-bind">Bind</span></span>
        <span>© 2026</span>
      </footer>
    </div>
  )
}
