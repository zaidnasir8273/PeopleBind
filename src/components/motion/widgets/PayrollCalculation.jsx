import { useState } from 'react'
import { motion } from 'motion/react'
import { DURATION, EASE } from '../index'
import { AnimatedNumber } from '../AnimatedNumber'

const ROWS = [
  { label: 'Basic salary', amount: 85000 },
  { label: 'Allowances', amount: 18000 },
  { label: 'Deductions', amount: -6200 },
]

const NET = 96800

export function PayrollCalculation({ className }) {
  const [net, setNet] = useState(0)

  return (
    <motion.div
      className={className}
      whileInView="visible"
      onViewportEnter={() => setTimeout(() => setNet(NET), 500)}
      viewport={{ once: true, margin: '-40px' }}
    >
      <div className="widget-payroll-rows">
        {ROWS.map((row, i) => (
          <motion.div
            key={row.label}
            className="widget-payroll-row"
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: DURATION.base, ease: EASE, delay: 0.1 + i * 0.12 }}
          >
            <span>{row.label}</span>
            <span className="widget-mono">
              {row.amount < 0 ? '– ' : ''}Rs. {Math.abs(row.amount).toLocaleString()}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="widget-payroll-net">
        <span>Net pay</span>
        <span className="widget-mono">
          Rs. <AnimatedNumber value={net} />
        </span>
      </div>
    </motion.div>
  )
}
