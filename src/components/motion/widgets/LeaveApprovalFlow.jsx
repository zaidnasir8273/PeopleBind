import { useState } from 'react'
import { motion } from 'motion/react'
import { DURATION, EASE, SPRING } from '../index'

const STAGES = [
  { label: 'Employee', status: null },
  { label: 'Leave request', status: 'Pending' },
  { label: 'Manager', status: 'Reviewing' },
  { label: 'Approved', status: 'Approved' },
]

export function LeaveApprovalFlow({ className }) {
  const [stageIndex, setStageIndex] = useState(0)

  return (
    <motion.div
      className={className}
      whileInView="visible"
      onViewportEnter={() => {
        STAGES.forEach((_, i) => {
          setTimeout(() => setStageIndex(i), i * 550)
        })
      }}
      viewport={{ once: true, margin: '-40px' }}
    >
      <div className="widget-flow">
        {STAGES.map((stage, i) => {
          const reached = i <= stageIndex
          const isApproved = stage.status === 'Approved' && reached
          return (
            <div key={stage.label} className="widget-flow-stage">
              <motion.div
                className={`widget-flow-dot${isApproved ? ' approved' : ''}`}
                initial={{ scale: 0.7, opacity: 0.4 }}
                animate={{ scale: reached ? 1 : 0.7, opacity: reached ? 1 : 0.4 }}
                transition={SPRING.gentle}
              />
              <div className="widget-flow-label">{stage.label}</div>
              {i < STAGES.length - 1 && (
                <motion.div
                  className="widget-flow-line"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: i < stageIndex ? 1 : 0 }}
                  transition={{ duration: DURATION.slow, ease: EASE }}
                />
              )}
            </div>
          )
        })}
      </div>
      {stageIndex > 0 && (
        <motion.p
          key={STAGES[stageIndex].status}
          className={`widget-flow-status${stageIndex === STAGES.length - 1 ? ' approved' : ''}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE }}
        >
          {STAGES[stageIndex].status}
        </motion.p>
      )}
    </motion.div>
  )
}
