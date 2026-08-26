import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'

const STAGES = [
  { verb: 'Recruit', label: 'Recruitment', description: 'Post a role, review applicants, and move them through interviews to an offer.' },
  { verb: 'Onboard', label: 'Onboarding', description: 'New hires get a real checklist from day one, not a stack of forms to chase.' },
  { verb: 'Manage', label: 'People & team structure', description: 'Every employee record, department, and reporting line lives in one place.' },
  { verb: 'Track', label: 'Attendance & leave', description: 'Shifts, check-ins, and leave balances stay accurate without spreadsheets.' },
  { verb: 'Develop', label: 'Performance', description: 'Goals and review cycles tracked against real numbers, not gut feel.' },
  { verb: 'Pay', label: 'Payroll', description: 'Every deduction traces back to real attendance, leave, and policy.' },
  { verb: 'Analyze', label: 'Reports & dashboards', description: 'Statutory and operational reports, plus live dashboards you build from real data.' },
]

// Sticky-pin, not scroll-jacking: native scroll is never intercepted --
// the tall track just gives the fill animation room to play out while a
// normal `position: sticky` rail stays visually pinned.
function PinnedWorkflow() {
  const trackRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] })
  const fillScaleX = useTransform(scrollYProgress, [0, 1], [0, 1])

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(STAGES.length - 1, Math.max(0, Math.round(v * (STAGES.length - 1))))
    setActiveIndex(idx)
  })

  const active = STAGES[activeIndex]

  return (
    <div className="workflow-track" ref={trackRef}>
      <div className="workflow-pin">
        <div className="workflow-rail">
          <div className="workflow-rail-line" />
          <motion.div className="workflow-rail-fill" style={{ scaleX: fillScaleX }} />
          {STAGES.map((stage, i) => (
            <div key={stage.verb} className={`workflow-node${i <= activeIndex ? ' active' : ''}`}>
              <span className="workflow-node-dot" />
              <span className="workflow-node-verb">{stage.verb}</span>
            </div>
          ))}
        </div>
        <div className="workflow-detail">
          <h3 className="workflow-detail-label">{active.label}</h3>
          <p className="workflow-detail-copy">{active.description}</p>
        </div>
      </div>
    </div>
  )
}

// Reused for both the <=860px breakpoint and prefers-reduced-motion
// (CSS handles which one shows -- see .workflow-track / .workflow-static
// in index.css) -- extra scroll distance for a pinned effect is
// disorienting for reduced-motion users, so it's removed entirely rather
// than just frozen in place.
function StaticWorkflow() {
  return (
    <div className="workflow-static history-timeline">
      {STAGES.map((stage) => (
        <div key={stage.verb} className="history-item workflow-static-item">
          <div className="history-item-date">{stage.verb}</div>
          <div className="history-item-summary">{stage.label}</div>
          <p className="workflow-static-copy">{stage.description}</p>
        </div>
      ))}
    </div>
  )
}

export function WorkflowTimeline() {
  return (
    <>
      <PinnedWorkflow />
      <StaticWorkflow />
    </>
  )
}
