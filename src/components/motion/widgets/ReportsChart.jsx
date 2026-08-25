import { motion } from 'motion/react'
import { DURATION, EASE } from '../index'

const BARS = [
  { label: 'Jun', value: 0.45 },
  { label: 'Jul', value: 0.68 },
  { label: 'Aug', value: 0.92 },
]

export function ReportsChart({ className }) {
  return (
    <div className={className}>
      <div className="widget-chart">
        {BARS.map((bar, i) => (
          <div key={bar.label} className="widget-chart-col">
            <div className="widget-chart-track">
              <motion.div
                className="widget-chart-bar"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: bar.value }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: DURATION.slower, ease: EASE, delay: 0.15 + i * 0.12 }}
              />
            </div>
            <span className="widget-chart-label">{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
