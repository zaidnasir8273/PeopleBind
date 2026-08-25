import { TiltCard } from './TiltCard'
import { DURATION, EASE } from './index'

export function Icon3D({ src, alt, className }) {
  return (
    <TiltCard
      className={className}
      maxTilt={7}
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: DURATION.slow, ease: EASE }}
    >
      <img src={src} alt={alt} draggable={false} />
    </TiltCard>
  )
}
