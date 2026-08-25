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
    text: 'The way your employees feel is the way your customers will feel.',
    author: 'Sybil F. Stershic',
    role: 'Author, marketing strategist',
    motif: 'mirror',
  },
  {
    text: "Great things in business are never done by one person. They're done by a team of people.",
    author: 'Steve Jobs',
    role: 'Co-founder, Apple',
    motif: 'align',
  },
  {
    text: 'Coming together is a beginning; keeping together is progress; working together is success.',
    author: 'Henry Ford',
    role: 'Founder, Ford Motor Company',
    motif: 'growth',
  },
  {
    text: 'Leadership is about making others better as a result of your presence and making sure that impact lasts in your absence.',
    author: 'Sheryl Sandberg',
    role: 'Author, Lean In',
    motif: 'ripple',
  },
  {
    text: 'As we look ahead into the next century, leaders will be those who empower others.',
    author: 'Bill Gates',
    role: 'Co-founder, Microsoft',
    motif: 'align',
  },
  {
    text: "People will forget what you said, people will forget what you did, but people will never forget how you made them feel.",
    author: 'Maya Angelou',
    role: 'Poet and author',
    motif: 'mirror',
  },
  {
    text: 'Teamwork makes the dream work.',
    author: 'John C. Maxwell',
    role: 'Author, leadership expert',
    motif: 'growth',
  },
  {
    text: 'Individual commitment to a group effort — that is what makes a team work, a company work, a society work, a civilization work.',
    author: 'Vince Lombardi',
    role: 'NFL Hall of Fame coach',
    motif: 'growth',
  },
  {
    text: "Take care of your employees, and they'll take care of your customers.",
    author: 'Herb Kelleher',
    role: 'Co-founder, Southwest Airlines',
    motif: 'pass-on',
  },
  {
    text: 'To win in the marketplace, you must first win in the workplace.',
    author: 'Doug Conant',
    role: 'Former CEO, Campbell Soup Company',
    motif: 'absorb',
  },
  {
    text: "People are definitely a company's greatest asset. A company is only as good as the people it keeps.",
    author: 'Mary Kay Ash',
    role: 'Founder, Mary Kay Inc.',
    motif: 'ripple',
  },
  {
    text: 'The key to successful leadership today is influence, not authority.',
    author: 'Ken Blanchard',
    role: 'Author, The One Minute Manager',
    motif: 'absorb',
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
