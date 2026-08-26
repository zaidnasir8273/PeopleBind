import { useState } from 'react'
import { motion } from 'motion/react'
import { AnimatedNumber } from '../AnimatedNumber'
import { Avatar } from '../../Avatar'

const STATS = { performance: 96, attendance: 98, leaveBalance: 12 }

export function EmployeeProfile({ className }) {
  const [stats, setStats] = useState({ performance: 0, attendance: 0, leaveBalance: 0 })

  return (
    <motion.div
      className={className}
      whileInView="visible"
      onViewportEnter={() => setTimeout(() => setStats(STATS), 450)}
      viewport={{ once: true, margin: '-40px' }}
    >
      <div className="widget-profile">
        <div className="widget-profile-head">
          <Avatar name="Sara Ali" size={44} />
          <div>
            <div className="widget-card-name">Sara Ali</div>
            <div className="widget-card-role">HR Manager</div>
            <div className="widget-profile-meta">Human Resources · Joined Mar 2023</div>
          </div>
        </div>
        <div className="widget-mini-stats widget-profile-stats">
          <div className="widget-mini-stat">
            <AnimatedNumber value={stats.performance} suffix="%" className="widget-mini-stat-value" />
            <span className="widget-mini-stat-label">Performance</span>
          </div>
          <div className="widget-mini-stat">
            <AnimatedNumber value={stats.attendance} suffix="%" className="widget-mini-stat-value" />
            <span className="widget-mini-stat-label">Attendance</span>
          </div>
          <div className="widget-mini-stat">
            <AnimatedNumber value={stats.leaveBalance} className="widget-mini-stat-value" />
            <span className="widget-mini-stat-label">Leave left</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
