import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { StaggerContainer, StaggerItem } from '../index'
import { AnimatedNumber } from '../AnimatedNumber'
import { Avatar } from '../../Avatar'

// Same palette/style as Reports.jsx/Home.jsx's real attendance chart,
// reused verbatim so this mockup doesn't invent a second visual language.
const TEAL = '#1f7a63'
const GOLD = '#c98a2e'
const RED = '#b0473f'
const LINE = '#e2ddd0'
const INK_SOFT = '#5a6472'
const axisStyle = { fontSize: 11, fontFamily: 'Inter, sans-serif', fill: INK_SOFT }
const tooltipStyle = { fontSize: 13, fontFamily: 'Inter, sans-serif', borderRadius: 8, border: `1px solid ${LINE}` }

const TREND = [
  { label: 'Mon', present: 21, late: 2, absent: 1 },
  { label: 'Tue', present: 22, late: 1, absent: 1 },
  { label: 'Wed', present: 20, late: 3, absent: 1 },
  { label: 'Thu', present: 23, late: 1, absent: 0 },
  { label: 'Fri', present: 21, late: 2, absent: 1 },
]

const ACTIVITY = [
  { name: 'Ahmed Khan', text: 'approved a leave request', time: '2m ago' },
  { name: 'Sara Ali', text: 'completed onboarding', time: '14m ago' },
  { name: null, text: 'Payroll processed for August', time: '1h ago' },
  { name: 'Usman Malik', text: 'celebrated a work anniversary', time: '3h ago' },
]

export function DashboardMockup() {
  const [stats] = useState({ employees: 24, presentToday: 21, onLeave: 2, payroll: 1245000 })

  return (
    <div className="dashboard-mockup">
      <StaggerContainer as="div" className="stat-row dashboard-mockup-stats" staggerDelay={0.06}>
        <StaggerItem as="div" className="stat-card">
          <span className="stat-label">Employees</span>
          <AnimatedNumber value={stats.employees} className="stat-value" />
        </StaggerItem>
        <StaggerItem as="div" className="stat-card">
          <span className="stat-label">Present today</span>
          <AnimatedNumber value={stats.presentToday} className="stat-value" />
        </StaggerItem>
        <StaggerItem as="div" className="stat-card">
          <span className="stat-label">On leave</span>
          <AnimatedNumber value={stats.onLeave} className="stat-value" />
        </StaggerItem>
        <StaggerItem as="div" className="stat-card">
          <span className="stat-label">Payroll</span>
          <span className="stat-value">Rs. <AnimatedNumber value={stats.payroll} /></span>
        </StaggerItem>
      </StaggerContainer>

      <div className="dashboard-mockup-body">
        <div className="dashboard-mockup-chart">
          <h4 className="dashboard-mockup-heading">Attendance — this week</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={TREND} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={LINE} vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} axisLine={{ stroke: LINE }} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="present" name="Present" stackId="a" fill={TEAL} />
              <Bar dataKey="late" name="Late" stackId="a" fill={GOLD} />
              <Bar dataKey="absent" name="Absent" stackId="a" fill={RED} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-mockup-activity">
          <h4 className="dashboard-mockup-heading">Recent activity</h4>
          <StaggerContainer as="div" staggerDelay={0.05}>
            {ACTIVITY.map((a) => (
              <StaggerItem as="div" key={a.text} className="activity-row">
                <Avatar name={a.name ?? 'PeopleBind'} size={26} />
                <span>{a.name ? `${a.name} ${a.text}` : a.text}</span>
                <span className="activity-row-time">{a.time}</span>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </div>
  )
}
