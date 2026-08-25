import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { DURATION, EASE_INOUT } from './motion'
import { QuoteMotif } from './motion/QuoteMotif'

const HR_QUOTES = [
  {
    text: "Take care of your employees and they'll take care of your business.",
    author: 'Richard Branson',
    role: 'Founder, Virgin Group',
    motif: 'growth',
  },
  {
    text: 'Culture eats strategy for breakfast.',
    author: 'Peter Drucker',
    role: 'Management consultant',
    motif: 'absorb',
  },
  {
    text: 'Customers will never love a company until the employees love it first.',
    author: 'Simon Sinek',
    role: 'Author, Start with Why',
    motif: 'pass-on',
  },
  {
    text: 'Great vision without great people is irrelevant.',
    author: 'Jim Collins',
    role: 'Author, Good to Great',
    motif: 'align',
  },
  {
    text: 'Employees who feel genuinely cared for are more productive, more satisfied, and more fulfilled.',
    author: 'Anne M. Mulcahy',
    role: 'Former CEO, Xerox',
    motif: 'ripple',
  },
  {
    text: 'The way your employees feel is the way your customers will feel.',
    author: 'Sybil F. Stershic',
    role: 'Author, marketing strategist',
    motif: 'mirror',
  },
]

const ROTATE_MS = 5000

export function AuthQuotePanel() {
  const prefersReducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % HR_QUOTES.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  const quote = HR_QUOTES[index]

  return (
    <div className="auth-panel-right">
      <span className="auth-quote-mark" aria-hidden="true">&ldquo;</span>
      <div className="auth-quote-stage">
        <AnimatePresence mode="wait">
          <motion.figure
            key={index}
            className="auth-quote"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -18 }}
            transition={{ duration: DURATION.slower, ease: EASE_INOUT }}
          >
            <QuoteMotif variant={quote.motif} className="auth-quote-motif" />
            <blockquote className="auth-quote-text">{quote.text}</blockquote>
            <figcaption className="auth-quote-author">
              <span className="auth-quote-name">{quote.author}</span>
              <span className="auth-quote-role">{quote.role}</span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
      <div className="auth-quote-dots">
        {HR_QUOTES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`auth-quote-dot${i === index ? ' active' : ''}`}
            aria-label={`Show quote ${i + 1}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  )
}
