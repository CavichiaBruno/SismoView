import { useEffect, useState } from 'react'
import type { Earthquake } from '../data/earthquakes'

const PIE_RADIUS = 50
const PIE_CIRCUMFERENCE = 2 * Math.PI * PIE_RADIUS

interface EventCoherence {
  event: Earthquake
  coherence: number
}

interface Props {
  events: EventCoherence[]
}

function formatCoherence(value: number) {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })
}

export function NisarCoherenceChart({ events }: Props) {
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [entryProgress, setEntryProgress] = useState(prefersReducedMotion ? 1 : 0)

  useEffect(() => {
    if (prefersReducedMotion) return

    const startedAt = performance.now()
    let frameId = 0
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 850)
      setEntryProgress(1 - (1 - progress) ** 3)
      if (progress < 1) frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [prefersReducedMotion])

  return (
    <section className="dash-panel dash-coherence-panel" aria-labelledby="nisar-coherence-title">
      <span className="dash-section-title">NISAR · Coherencia epicentral</span>
      <h2 id="nisar-coherence-title">Señal radar cerca de cada sismo</h2>
      <p className="dash-coherence-subtitle">
        Mediana de coherencia (γ) en un radio de 10 km · escala de 0 a 1
      </p>

      <div className="dash-coherence-events">
        {events.map(({ event, coherence }) => {
          const value = formatCoherence(coherence * entryProgress)
          const coherenceArc = PIE_CIRCUMFERENCE * coherence * entryProgress

          return (
            <div className="dash-coherence-event" key={event.id}>
              <div
                className="dash-coherence-pie"
                role="img"
                aria-label={`M${event.magnitude.toFixed(1)} ${event.state}: coherencia mediana ${value}`}
              >
                <svg viewBox="0 0 132 132" aria-hidden="true">
                  <circle
                    cx="66"
                    cy="66"
                    r={PIE_RADIUS}
                    fill="none"
                    stroke="#263449"
                    strokeWidth="16"
                  />
                  <circle
                    cx="66"
                    cy="66"
                    r={PIE_RADIUS}
                    fill="none"
                    stroke="#38bdf8"
                    strokeDasharray={`${coherenceArc} ${PIE_CIRCUMFERENCE - coherenceArc}`}
                    strokeWidth="16"
                    transform="rotate(-90 66 66)"
                  />
                </svg>
                <span className="dash-coherence-pie-value">{value}</span>
                <span className="dash-coherence-pie-label">γ mediana</span>
              </div>
              <div className="dash-coherence-event-copy">
                <strong>M{event.magnitude.toFixed(1)} · {event.state}</strong>
                <span>{event.place}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="dash-coherence-legend">
        <span><i className="dash-coherence-legend-swatch is-coherence" />Coherencia medida</span>
        <span><i className="dash-coherence-legend-swatch" />Margen hasta 1</span>
      </div>
      <p className="dash-coherence-note">
        El sector oscuro solo completa la escala; no representa píxeles sin señal.
        La coherencia mide consistencia radar, no desplazamiento.
      </p>
    </section>
  )
}
