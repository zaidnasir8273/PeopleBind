import { useState } from 'react'
import { motion } from 'motion/react'
import { DURATION, EASE, SPRING } from '../index'

// Shared vertical stage-flow -- a dot-and-line pipeline where each stage
// lights up in sequence once it scrolls into view. LeaveApprovalFlow and
// RecruitmentPipeline are both just this with different stage labels.
export function StageFlow({ className, stages, stepMs = 550 }) {
  const [stageIndex, setStageIndex] = useState(0)

  return (
    <motion.div
      className={className}
      whileInView="visible"
      onViewportEnter={() => {
        stages.forEach((_, i) => {
          setTimeout(() => setStageIndex(i), i * stepMs)
        })
      }}
      viewport={{ once: true, margin: '-40px' }}
    >
      <div className="widget-flow">
        {stages.map((stage, i) => {
          const reached = i <= stageIndex
          const isFinal = i === stages.length - 1 && reached
          return (
            <div key={stage.label} className="widget-flow-stage">
              <motion.div
                className={`widget-flow-dot${isFinal ? ' approved' : ''}`}
                initial={{ scale: 0.7, opacity: 0.4 }}
                animate={{ scale: reached ? 1 : 0.7, opacity: reached ? 1 : 0.4 }}
                transition={SPRING.gentle}
              />
              <div className="widget-flow-label">{stage.label}</div>
              {i < stages.length - 1 && (
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
      {stageIndex > 0 && stages[stageIndex].status && (
        <motion.p
          key={stages[stageIndex].status}
          className={`widget-flow-status${stageIndex === stages.length - 1 ? ' approved' : ''}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE }}
        >
          {stages[stageIndex].status}
        </motion.p>
      )}
    </motion.div>
  )
}
