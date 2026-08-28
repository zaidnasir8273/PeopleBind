import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { DURATION, EASE } from './motion'

// -- message pools --------------------------------------------------------

const GENERAL_MESSAGES = [
  'Ready to make today a productive one?',
  "Let's make today count.",
  "Here's to a smooth day ahead.",
  'Your people, all in one place.',
  "Let's see what's happening across your workforce.",
]

const TIME_MESSAGES = {
  'Good morning': [
    'A fresh day starts here.',
    "Let's get the day moving.",
    'Ready for a productive day?',
  ],
  'Good afternoon': [
    'Keep the momentum going.',
    "Here's what needs your attention.",
    'A quick check-in can go a long way.',
  ],
  'Good evening': [
    "Let's wrap up the day smoothly.",
    'A quick look before you call it a day.',
    'See how your team is doing.',
  ],
}

const DAY_MESSAGES = {
  friday: ["Almost there. Let's wrap up the week.", "Let's finish the week strong."],
  monday: ["Let's kick off the week strong.", 'A new week, a fresh start.'],
  weekend: ['A quieter day for your people.', "Here's your PeopleBind overview."],
}

// -- pure helpers -----------------------------------------------------------

function getTimeGreeting(hour) {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

function getDayContext(date) {
  const day = date.getDay() // 0 = Sunday ... 6 = Saturday
  if (day === 0 || day === 6) return 'weekend'
  if (day === 1) return 'monday'
  if (day === 5) return 'friday'
  return null
}

function getContextualMessage(actionCounts) {
  if (!actionCounts) return null
  const { leave = 0, total = 0 } = actionCounts
  if (total === 0) return "You're all caught up. Nice work."
  if (leave > 0 && leave === total) {
    return `You have ${leave} leave request${leave === 1 ? '' : 's'} to review.`
  }
  return `${total} action${total === 1 ? '' : 's'} need your attention.`
}

function getFallbackMessage(timeGreeting, dayContext, exclude) {
  const pool = [
    ...GENERAL_MESSAGES,
    ...(TIME_MESSAGES[timeGreeting] ?? []),
    ...(dayContext ? DAY_MESSAGES[dayContext] ?? [] : []),
  ]
  const candidates = pool.length > 1 ? pool.filter((m) => m !== exclude) : pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

const ROTATE_MS = 10000
const TIME_CHECK_MS = 60000

/**
 * Dynamic homepage greeting: a stable time-of-day heading plus a
 * subordinate message that prioritizes real pending-action data (passed
 * in via `actionCounts`, already computed by Home.jsx -- this component
 * fetches nothing itself) over a gently rotating general/day-aware line.
 */
export function SmartGreeting({ fullName, loading, actionCounts }) {
  const prefersReducedMotion = useReducedMotion()
  const [now, setNow] = useState(() => new Date())
  const [fallbackMessage, setFallbackMessage] = useState(() =>
    getFallbackMessage(getTimeGreeting(new Date().getHours()), getDayContext(new Date()), null)
  )

  // Keep the heading's wording correct if the tab stays open across an
  // hour/day boundary -- no page refresh required.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TIME_CHECK_MS)
    return () => clearInterval(id)
  }, [])

  const timeGreeting = getTimeGreeting(now.getHours())
  const dayContext = getDayContext(now)
  const contextualMessage = loading ? null : getContextualMessage(actionCounts)

  // Only rotate the generic fallback pool -- real actionable information
  // stays put instead of being interrupted by a rotating "quote of the day".
  useEffect(() => {
    if (contextualMessage) return
    const id = setInterval(() => {
      setFallbackMessage((prev) => getFallbackMessage(timeGreeting, dayContext, prev))
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [contextualMessage, timeGreeting, dayContext])

  const displayedMessage = contextualMessage ?? fallbackMessage
  const firstName = fullName ? fullName.split(' ')[0] : ''

  return (
    <>
      <h1 className="page-title">
        {timeGreeting}, {firstName}
      </h1>
      <div className="smart-greeting-stage" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={displayedMessage}
            className="smart-greeting-message"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: DURATION.slow, ease: EASE }}
          >
            {displayedMessage}
          </motion.p>
        </AnimatePresence>
      </div>
    </>
  )
}
