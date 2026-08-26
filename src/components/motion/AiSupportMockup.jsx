import { useState } from 'react'
import { motion } from 'motion/react'
import { DURATION, EASE } from './index'
import { QuoteMotif } from './QuoteMotif'

const WAITING_LABEL = 'Baking your reply'

const CUSTOMER_MESSAGE = "Hi, I can't find where to update my bank account details for payroll."
const AI_REPLY = "You can update it under Employee Profile → Bank Details — changes apply from your next payroll run. Let me know if you don't see that option and I'll get a person to help."

export function AiSupportMockup() {
  const [phase, setPhase] = useState(0)

  function handleViewportEnter() {
    if (phase > 0) return
    setTimeout(() => setPhase(1), 400)
    setTimeout(() => setPhase(2), 1400)
    setTimeout(() => setPhase(3), 3000)
  }

  return (
    <motion.div
      className="ai-mockup"
      onViewportEnter={handleViewportEnter}
      viewport={{ once: true, margin: '-40px' }}
    >
      <QuoteMotif variant="pass-on" className="ai-mockup-motif" />

      <div className="ai-mockup-chat">
        {phase >= 1 && (
          <motion.div
            className="support-chat-msg from-self"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.base, ease: EASE }}
          >
            <p className="support-chat-msg-body">{CUSTOMER_MESSAGE}</p>
          </motion.div>
        )}

        {phase === 2 && (
          <motion.div
            className="support-chat-typing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.base, ease: EASE }}
          >
            <div className="support-chat-typing-bubble">
              <span className="support-chat-typing-dot" />
              <span className="support-chat-typing-dot" />
              <span className="support-chat-typing-dot" />
            </div>
            <span className="support-chat-typing-label">{WAITING_LABEL}…</span>
          </motion.div>
        )}

        {phase >= 3 && (
          <motion.div
            className="support-chat-msg from-admin"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.base, ease: EASE }}
          >
            <p className="support-chat-msg-body">{AI_REPLY}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
