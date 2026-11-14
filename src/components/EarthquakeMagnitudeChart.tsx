import type { Earthquake } from '../data/earthquakes'
import i18n, { translate } from '../i18n'

interface Props {
  events: Earthquake[]
}

const CHART_WIDTH = 460
const PLOT_LEFT = 112
const PLOT_RIGHT = 436
const PLOT_TOP = 32
const ROW_HEIGHT = 76

function formatMagnitude(value: number) {
  return value.toLocaleString(i18n.language.startsWith('en') ? 'en-US' : 'es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

export function EarthquakeMagnitudeChart({ events }: Props) {
  const maxMagnitude = Math.max(8, ...events.map((event) => Math.ceil(event.magnitude)))
  const plotBottom = PLOT_TOP + ROW_HEIGHT * Math.max(events.length, 1)
  const chartHeight = plotBottom + 44
  const ticks = Array.from({ length: 5 }, (_, index) => maxMagnitude * index / 4)
  const chartDescription = events
    .map((event) => `${translate(event.state)} M${formatMagnitude(event.magnitude)}`)
    .join(' · ')

  return (
    <section className="dash-panel dash-magnitude-card" aria-labelledby="earthquake-magnitude-title">
      <span className="dash-section-title">{translate('USGS · Sismos')}</span>
      <h2 id="earthquake-magnitude-title">{translate('Magnitud de los sismos')}</h2>
      <p>{translate('Magnitud momento · Mw')}</p>

      {events.length > 0 ? (
        <svg
          className="dash-magnitude-svg"
          viewBox={`0 0 ${CHART_WIDTH} ${chartHeight}`}
          role="img"
          aria-label={translate('Magnitudes de los sismos por estado: {{events}}', {
            events: chartDescription,
          })}
        >
          {ticks.map((tick) => {
            const x = PLOT_LEFT + tick / maxMagnitude * (PLOT_RIGHT - PLOT_LEFT)
            return (
              <g key={tick}>
                <line x1={x} x2={x} y1={PLOT_TOP - 12} y2={plotBottom} className="dash-magnitude-grid" />
                <text x={x} y={plotBottom + 22} textAnchor="middle" className="dash-magnitude-tick">
                  {tick}
                </text>
              </g>
            )
          })}

          {events.map((event, index) => {
            const centerY = PLOT_TOP + ROW_HEIGHT * (index + 0.5)
            const barWidth = event.magnitude / maxMagnitude * (PLOT_RIGHT - PLOT_LEFT)
            const magnitude = formatMagnitude(event.magnitude)

            return (
              <g key={event.id}>
                <text x={PLOT_LEFT - 10} y={centerY + 4} textAnchor="end" className="dash-magnitude-state">
                  {translate(event.state)}
                </text>
                <rect
                  x={PLOT_LEFT}
                  y={centerY - 14}
                  width={barWidth}
                  height="28"
                  rx="6"
                  className="dash-magnitude-bar"
                >
                  <title>
                    {translate('Magnitud Mw {{magnitude}} · {{state}}', {
                      magnitude,
                      state: translate(event.state),
                    })}
                  </title>
                </rect>
                <text
                  x={Math.max(PLOT_LEFT + 34, PLOT_LEFT + barWidth - 8)}
                  y={centerY + 5}
                  textAnchor="end"
                  className="dash-magnitude-value"
                >
                  {magnitude}
                </text>
              </g>
            )
          })}
        </svg>
      ) : (
        <div className="dash-empty-state">{translate('No hay sismos para mostrar')}</div>
      )}
    </section>
  )
}