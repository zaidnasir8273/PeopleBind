import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { SPRING } from '../index'

const DOCS = ['Employment Contract', 'Payslip', 'Leave Record', 'Employee Record']

export function DocumentStack({ className }) {
  const [hovered, setHovered] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ perspective: 800 }}
    >
      {DOCS.map((doc, i) => {
        const baseRotate = (i - (DOCS.length - 1) / 2) * 2.5
        const baseOffset = i * 4
        return (
          <motion.div
            key={doc}
            className="widget-doc-card"
            style={{ zIndex: DOCS.length - i }}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    rotate: hovered ? baseRotate * 2.2 : baseRotate,
                    y: hovered ? -baseOffset * 2.4 - i * 2 : baseOffset,
                    x: hovered ? (i - (DOCS.length - 1) / 2) * 10 : 0,
                  }
            }
            transition={SPRING.gentle}
          >
            {doc}
          </motion.div>
        )
      })}
    </div>
  )
}
