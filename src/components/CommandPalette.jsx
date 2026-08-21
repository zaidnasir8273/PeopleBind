import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target } from 'lucide-react'
import { SearchIcon } from './ui/search'
import { HomeIcon } from './ui/home'
import { UsersIcon } from './ui/users'
import { ClockIcon } from './ui/clock'
import { CalendarDaysIcon } from './ui/calendar-days'
import { WalletIcon } from './ui/wallet'
import { ReceiptIcon } from './ui/receipt'
import { BriefcaseBusinessIcon } from './ui/briefcase-business'
import { ChartBarIncreasingIcon } from './ui/chart-bar-increasing'
import { SettingsIcon } from './ui/settings'
import { FileTextIcon } from './ui/file-text'
import { supabase } from '../lib/supabase'

const STATIC_ACTIONS = [
  { label: 'Home', to: '/app', icon: HomeIcon, keywords: 'dashboard home' },
  { label: 'People', to: '/app/people', icon: UsersIcon, keywords: 'employees people directory' },
  { label: 'Attendance', to: '/app/attendance', icon: ClockIcon, keywords: 'attendance roster corrections' },
  { label: 'Leave', to: '/app/leave', icon: CalendarDaysIcon, keywords: 'leave requests balances' },
  { label: 'Payroll', to: '/app/payroll', icon: WalletIcon, keywords: 'payroll salary payslips runs' },
  { label: 'Expenses', to: '/app/expenses', icon: ReceiptIcon, keywords: 'expenses claims reimbursement' },
  { label: 'Documents', to: '/app/documents', icon: FileTextIcon, keywords: 'documents files contracts' },
  { label: 'Recruitment', to: '/app/recruitment', icon: BriefcaseBusinessIcon, keywords: 'recruitment candidates jobs hiring' },
  { label: 'Performance', to: '/app/performance', icon: Target, keywords: 'performance goals reviews feedback' },
  { label: 'Reports', to: '/app/reports', icon: ChartBarIncreasingIcon, keywords: 'reports analytics dashboards' },
  { label: 'Settings', to: '/app/settings', icon: SettingsIcon, keywords: 'settings shifts holidays roles' },
]

export function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  const runSearch = useCallback(async (q) => {
    const staticMatches = STATIC_ACTIONS.filter(
      (a) => a.label.toLowerCase().includes(q.toLowerCase()) || a.keywords.includes(q.toLowerCase())
    ).map((a) => ({ ...a, group: 'Go to' }))

    if (q.trim().length < 2) {
      setResults(staticMatches)
      return
    }

    const [{ data: employees }, { data: candidates }, { data: openings }] = await Promise.all([
      supabase.from('employees').select('id, full_name, employee_code').ilike('full_name', `%${q}%`).limit(5),
      supabase.from('candidates').select('id, full_name').ilike('full_name', `%${q}%`).limit(5),
      supabase.from('job_openings').select('id, title').ilike('title', `%${q}%`).limit(5),
    ])

    const dynamicMatches = [
      ...(employees ?? []).map((e) => ({ label: e.full_name, sublabel: e.employee_code, to: '/app/people', icon: UsersIcon, group: 'Employees' })),
      ...(candidates ?? []).map((c) => ({ label: c.full_name, to: '/app/recruitment', icon: BriefcaseBusinessIcon, group: 'Candidates' })),
      ...(openings ?? []).map((o) => ({ label: o.title, to: '/app/recruitment', icon: BriefcaseBusinessIcon, group: 'Job openings' })),
    ]

    setResults([...staticMatches, ...dynamicMatches])
  }, [])

  useEffect(() => {
    runSearch(query)
    setActiveIndex(0)
  }, [query, runSearch])

  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  function select(item) {
    navigate(item.to)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      select(results[activeIndex])
    }
  }

  let lastGroup = null

  return (
    <>
      <button className="cmdk-trigger" onClick={() => setOpen(true)}>
        <SearchIcon size={14} />
        <span>Search</span>
        <kbd>⌘K</kbd>
      </button>

      {open && (
        <div className="cmdk-overlay" onClick={() => setOpen(false)}>
          <div className="cmdk-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cmdk-input-row">
              <SearchIcon size={16} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search employees, candidates, or jump to a module…"
              />
            </div>
            <div className="cmdk-results">
              {results.length === 0 ? (
                <p className="muted" style={{ padding: '20px 16px', fontSize: 13 }}>No matches.</p>
              ) : (
                results.map((item, i) => {
                  const showGroup = item.group !== lastGroup
                  lastGroup = item.group
                  const Icon = item.icon
                  return (
                    <div key={`${item.group}-${item.label}-${i}`}>
                      {showGroup && <div className="cmdk-group-label">{item.group}</div>}
                      <button
                        className={`cmdk-item${i === activeIndex ? ' active' : ''}`}
                        onClick={() => select(item)}
                        onMouseEnter={() => setActiveIndex(i)}
                      >
                        <Icon size={15} />
                        <span>{item.label}</span>
                        {item.sublabel && <span className="muted mono" style={{ fontSize: 12 }}>{item.sublabel}</span>}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
