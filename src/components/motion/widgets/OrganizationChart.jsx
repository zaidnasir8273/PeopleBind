import { motion } from 'motion/react'
import { DURATION, EASE, SPRING } from '../index'

const DEPARTMENTS = ['HR', 'Finance', 'Operations']

export function OrganizationChart({ className }) {
  return (
    <svg viewBox="0 0 280 190" className={className} role="img" aria-label="CEO at the top, connected to HR, Finance, and Operations, each with their own team">
      <motion.line
        x1={140} y1={38} x2={140} y2={62}
        stroke="var(--line)" strokeWidth={1}
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: DURATION.slow, ease: EASE, delay: 0.25 }}
      />
      {DEPARTMENTS.map((_, i) => {
        const x = 60 + i * 80
        return (
          <motion.line
            key={`dept-line-${i}`}
            x1={140} y1={62} x2={x} y2={92}
            stroke="var(--line)" strokeWidth={1}
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: DURATION.slow, ease: EASE, delay: 0.4 + i * 0.06 }}
          />
        )
      })}
      {DEPARTMENTS.map((_, di) =>
        [0, 1].map((ei) => {
          const x = 60 + di * 80
          const ex = x - 10 + ei * 20
          return (
            <motion.line
              key={`emp-line-${di}-${ei}`}
              x1={x} y1={98} x2={ex} y2={140}
              stroke="var(--line)" strokeWidth={1}
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: DURATION.base, ease: EASE, delay: 0.75 + di * 0.06 }}
            />
          )
        })
      )}

      <motion.g
        initial={{ opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={SPRING.gentle}
      >
        <rect x={106} y={16} width={68} height={22} rx={5} fill="var(--accent)" />
        <text x={140} y={31} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#fff" fontFamily="var(--font-display)">CEO</text>
      </motion.g>

      {DEPARTMENTS.map((dept, i) => {
        const x = 60 + i * 80
        return (
          <motion.g
            key={dept}
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ ...SPRING.gentle, delay: 0.45 + i * 0.06 }}
          >
            <rect x={x - 34} y={88} width={68} height={20} rx={5} fill="var(--paper-raised)" stroke="var(--ink-soft)" strokeWidth={1} />
            <text x={x} y={102} textAnchor="middle" fontSize="9.5" fill="var(--ink)" fontFamily="var(--font-mono)">{dept}</text>
          </motion.g>
        )
      })}

      {DEPARTMENTS.map((_, di) =>
        [0, 1].map((ei) => {
          const x = 60 + di * 80
          const ex = x - 10 + ei * 20
          return (
            <motion.circle
              key={`emp-${di}-${ei}`}
              cx={ex} cy={144} r={5}
              fill="var(--green-sage)"
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ ...SPRING.gentle, delay: 0.8 + di * 0.06 }}
            />
          )
        })
      )}
    </svg>
  )
}
