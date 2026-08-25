import { motion } from 'motion/react'
import { DURATION, EASE } from '../index'

const GOALS = [
  { label: 'Sales target', value: 0.82 },
  { label: 'CSAT score', value: 0.94 },
  { label: 'On-time delivery', value: 0.76 },
]

export function PerformanceGoals({ className }) {
  return (
    <div className={className}>
      <div className="widget-goals">
        {GOALS.map((goal, i) => (
          <div key={goal.label} className="widget-goal-row">
            <div className="widget-goal-labels">
              <span>{goal.label}</span>
              <span className="widget-mono">{Math.round(goal.value * 100)}%</span>
            </div>
            <div className="widget-goal-track">
              <motion.div
                className="widget-goal-bar"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: goal.value }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: DURATION.slower, ease: EASE, delay: 0.15 + i * 0.12 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
