import { useState } from 'react'
import { motion } from 'motion/react'

/**
 * All 9 widgets stay mounted (not remounted per selection) so each one's
 * own whileInView entrance plays exactly once, the same as it already does
 * in the plain grid -- switching modules just toggles which panel is
 * visible via CSS opacity, sidestepping any question of whether a widget's
 * IntersectionObserver-driven entrance would reliably refire on remount.
 */
export function ModuleShowcase({ modules }) {
  const [activeKey, setActiveKey] = useState(modules[0].key)

  return (
    <div className="showcase-shell">
      <div className="showcase-nav" role="tablist" aria-label="PeopleBind modules">
        {modules.map(({ key, label }) => {
          const isActive = key === activeKey
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`showcase-nav-item${isActive ? ' active' : ''}`}
              onMouseEnter={() => setActiveKey(key)}
              onFocus={() => setActiveKey(key)}
              onClick={() => setActiveKey(key)}
            >
              {isActive && (
                <motion.span
                  layoutId="showcase-active-pill"
                  className="showcase-active-pill"
                  transition={{ duration: 0.2 }}
                />
              )}
              <span className="showcase-nav-label">{label}</span>
            </button>
          )
        })}
      </div>

      <div className="showcase-stage">
        {modules.map(({ key, label, copy, Widget }) => (
          <div
            key={key}
            role="tabpanel"
            aria-hidden={key !== activeKey}
            className={`showcase-stage-panel${key === activeKey ? ' active' : ''}`}
          >
            <div className="showcase-stage-widget">
              <Widget className="module-widget" />
            </div>
            <h3 className="module-card-title">{label}</h3>
            <p className="module-card-copy">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
