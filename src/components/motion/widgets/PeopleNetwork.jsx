import { motion, useReducedMotion } from 'motion/react'
import { DURATION, EASE } from '../index'

const NODES = [
  { label: 'HR', angle: -90 },
  { label: 'Finance', angle: -18 },
  { label: 'Operations', angle: 54 },
  { label: 'Employee', angle: 126 },
  { label: 'Payroll', angle: 198 },
]

const CENTER = { x: 140, y: 118 }
const RADIUS = 82

function pointOn(angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CENTER.x + RADIUS * Math.cos(rad), y: CENTER.y + RADIUS * Math.sin(rad) }
}

// The connection that gets a traveling pulse -- Payroll, since "people
// connect to payroll" is the one relationship this whole product exists
// to make effortless.
const ACTIVE_INDEX = 4

export function PeopleNetwork({ className }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <svg viewBox="0 0 280 236" className={className} role="img" aria-label="PeopleBind connecting HR, Finance, Operations, Employees, and Payroll">
      {NODES.map((node, i) => {
        const p = pointOn(node.angle)
        const isActive = i === ACTIVE_INDEX
        return (
          <motion.line
            key={`line-${node.label}`}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={p.x}
            y2={p.y}
            stroke={isActive ? 'var(--teal-deep)' : 'var(--line)'}
            strokeWidth={isActive ? 1.5 : 1}
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: DURATION.slower, ease: EASE, delay: 0.15 + i * 0.08 }}
          />
        )
      })}

      {!prefersReducedMotion && (
        <motion.circle
          r={3}
          fill="var(--teal-deep)"
          initial={{ opacity: 0 }}
          whileInView={{
            cx: [CENTER.x, pointOn(NODES[ACTIVE_INDEX].angle).x],
            cy: [CENTER.y, pointOn(NODES[ACTIVE_INDEX].angle).y],
            opacity: [0, 1, 1, 0],
          }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.9, repeat: Infinity, repeatDelay: 2.2 }}
        />
      )}

      {NODES.map((node, i) => {
        const p = pointOn(node.angle)
        const isActive = i === ACTIVE_INDEX
        const labelAbove = node.angle < -45 && node.angle > -135
        return (
          <motion.g
            key={node.label}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: DURATION.slow, ease: EASE, delay: 0.35 + i * 0.08 }}
          >
            <motion.circle
              cx={p.x}
              cy={p.y}
              r={5}
              fill={isActive ? 'var(--teal-deep)' : 'var(--paper-raised)'}
              stroke={isActive ? 'var(--teal-deep)' : 'var(--ink-soft)'}
              strokeWidth={1.5}
              animate={!prefersReducedMotion && isActive ? { scale: [1, 1.25, 1] } : undefined}
              transition={!prefersReducedMotion && isActive ? { duration: 2, repeat: Infinity, ease: EASE, delay: 1.4 } : undefined}
            />
            <text
              x={p.x}
              y={labelAbove ? p.y - 12 : p.y + 18}
              textAnchor="middle"
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="var(--ink-soft)"
            >
              {node.label}
            </text>
          </motion.g>
        )
      })}

      <motion.g
        initial={{ opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: DURATION.slow, ease: EASE }}
      >
        <circle cx={CENTER.x} cy={CENTER.y} r={14} fill="var(--accent)" />
        <text x={CENTER.x} y={CENTER.y + 4} textAnchor="middle" fontSize="13" fill="#fff" fontWeight="700" fontFamily="var(--font-display)">
          P
        </text>
      </motion.g>
    </svg>
  )
}
