import { Link } from 'react-router-dom'

const payslipRows = [
  { label: 'Basic salary', amount: 'Rs. 100,000', delay: 0.05 },
  { label: 'House allowance', amount: 'Rs. 20,000', delay: 0.15 },
  { label: 'Transport', amount: 'Rs. 10,000', delay: 0.25 },
  { label: 'Overtime · 5 hrs approved', amount: 'Rs. 5,000', delay: 0.35 },
  { label: 'Tax', amount: '– Rs. 2,550', delay: 0.45, deduction: true },
  { label: 'Unpaid leave · 0 days', amount: 'Rs. 0', delay: 0.55, deduction: true },
]

export default function Landing() {
  return (
    <div className="page">
      <header className="header">
        <div className="wordmark">
          <span className="wordmark-mark" aria-hidden="true" />
          PeopleBind
        </div>
        <nav className="header-nav">
          <Link to="/login" className="header-link">Sign in</Link>
          <Link to="/signup" className="header-cta">Sign up</Link>
        </nav>
      </header>

      <main className="hero">
        <div>
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
        </div>

        <div className="payslip">
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
          <div
            className="payslip-row total"
            style={{ animationDelay: '0.65s' }}
          >
            <span className="label">Net salary</span>
            <span className="amount">Rs. 132,450</span>
          </div>
          <p className="payslip-caption">
            Every line traces to its source — attendance, approvals, and
            policy, not a black box.
          </p>
        </div>
      </main>

      <div className="strip">
        <div className="strip-flow">
          See <span className="arrow">→</span> Understand{' '}
          <span className="arrow">→</span> Act
        </div>
        <p className="strip-note">
          not: configure → navigate → find → enter → calculate → verify
        </p>
      </div>

      <footer className="footer">
        <span>PeopleBind</span>
        <span>© 2026</span>
      </footer>
    </div>
  )
}
