import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DURATION, EASE, SPRING } from '../index'

const BREAKDOWN = [
  { label: 'Present', value: 19 },
  { label: 'Late', value: 2 },
  { label: 'Absent', value: 1 },
  { label: 'On leave', value: 2 },
]

export function AttendanceAnimation({ className }) {
  const prefersReducedMotion = useReducedMotion()
  const [checkedIn, setCheckedIn] = useState(false)

  return (
    <motion.div
      className={className}
      whileInView="visible"
      onViewportEnter={() => setCheckedIn(true)}
      viewport={{ once: true, margin: '-40px' }}
    >
      <div className="widget-card-row">
        <motion.span
          className="widget-mono"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: DURATION.slow, ease: EASE }}
        >
          09:02 AM
        </motion.span>
        <motion.span
          className={`widget-status-badge${checkedIn ? ' in' : ''}`}
          initial={{ opacity: 0.5 }}
          animate={{
            opacity: 1,
            scale: checkedIn && !prefersReducedMotion ? [1, 1.08, 1] : 1,
          }}
          transition={{ duration: DURATION.slow, ease: EASE, delay: 0.5 }}
        >
          {checkedIn ? 'Checked in' : 'Not checked in'}
        </motion.span>
      </div>
      <div className="widget-card-name">Ahmed Khan</div>
      <div className="widget-card-role">Finance</div>
      <motion.div
        className="widget-mini-stats widget-attendance-stats"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: checkedIn ? 1 : 0, y: checkedIn ? 0 : 6 }}
        transition={{ duration: DURATION.slow, ease: EASE, delay: 0.7 }}
      >
        {BREAKDOWN.map((b) => (
          <div key={b.label} className="widget-mini-stat">
            <span className="widget-mini-stat-value">{b.value}</span>
            <span className="widget-mini-stat-label">{b.label}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}
