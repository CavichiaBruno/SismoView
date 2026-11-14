import { Activity, RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import i18n, { translate } from '../i18n'

const MOMENT_RATE = [
  0.0000, 0.0043, 0.0288, 0.0732, 0.1173, 0.1414, 0.1539, 0.1741,
  0.1912, 0.2036, 0.2250, 0.2639, 0.2911, 0.2880, 0.2711, 0.2535,
  0.2379, 0.2217, 0.2114, 0.2083, 0.2102, 0.2162, 0.2255, 0.2370,
  0.2496, 0.2636, 0.2792, 0.2959, 0.3126, 0.3326, 0.3773, 0.4526,
  0.5369, 0.6040, 0.6492, 0.6758, 0.6750, 0.6585, 0.6501, 0.6534,
  0.6513, 0.6354, 0.6085, 0.5741, 0.5461, 0.5402, 0.5531, 0.5705,
  0.5847, 0.5943, 0.6027, 0.6189, 0.6540, 0.7067, 0.7636, 0.8111,
  0.8418, 0.8477, 0.8286, 0.7938, 0.7522, 0.7010, 0.6495, 0.6220,
  0.6241, 0.6500, 0.6831, 0.7204, 0.7620, 0.8027, 0.8430, 0.8958,
  0.9583, 0.9953, 1.0000, 0.9877, 0.9695, 0.9518, 0.9514, 0.9693,
  0.9748, 0.9602, 0.9338, 0.8949, 0.8363, 0.7705, 0.7250, 0.7055,
  0.7069, 0.7259, 0.7736, 0.8411, 0.8909, 0.9019, 0.8702, 0.7924,
  0.6775, 0.5523, 0.4478, 0.3773, 0.3495, 0.3585, 0.3905, 0.4366,
  0.4869, 0.5380, 0.5891, 0.6342, 0.6640, 0.6789, 0.6811, 0.6630,
  0.6216, 0.5666, 0.5086, 0.4549, 0.4142, 0.3957, 0.3972, 0.4099,
  0.4255, 0.4397, 0.4543, 0.4694, 0.4897, 0.5249, 0.5699, 0.6090,
  0.6335, 0.6404, 0.6216, 0.5831, 0.5416, 0.4987, 0.4531, 0.4075,
  0.3592, 0.3011, 0.2331, 0.1679, 0.1128, 0.0671, 0.0323, 0.0123,
  0.0062, 0.0046, 0.0033, 0.0022, 0.0014, 0.0008, 0.0005, 0.0002,
  0.0001, 0.0001, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
  0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
  0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
  0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
  0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
  0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
  0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
  0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
  0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
  0.0000, 0.0000, 0.0000, 0.0000,
] as const

const CHART_WIDTH = 1000
const CHART_HEIGHT = 300
const PLOT_LEFT = 82
const PLOT_RIGHT = 976
const PLOT_TOP = 22
const PLOT_BOTTOM = 236
const DURATION = 117.4
const RUPTURE_END = 70
const SAMPLE_INTERVAL = 0.5

function pointTime(index: number) {
  return index === MOMENT_RATE.length - 1 ? 117.3 : index * SAMPLE_INTERVAL
}

function chartX(time: number) {
  return PLOT_LEFT + (time / DURATION) * (PLOT_RIGHT - PLOT_LEFT)
}

function chartY(rate: number) {
  return PLOT_BOTTOM - rate * (PLOT_BOTTOM - PLOT_TOP)
}

const MOMENT_TOTAL = MOMENT_RATE.reduce<number>((total, rate, index) => {
  if (index === 0) return total
  const interval = pointTime(index) - pointTime(index - 1)
  return total + ((MOMENT_RATE[index - 1] + rate) / 2) * interval
}, 0)

const CUMULATIVE_MOMENT = MOMENT_RATE.reduce<number[]>((cumulative, rate, index) => {
  if (index === 0) {
    cumulative.push(0)
    return cumulative
  }
  const interval = pointTime(index) - pointTime(index - 1)
  cumulative.push(cumulative[index - 1] + ((MOMENT_RATE[index - 1] + rate) / 2) * interval)
  return cumulative
}, [])

const CURVE_PATH = MOMENT_RATE.map((rate, index) => {
  const command = index === 0 ? 'M' : 'L'
  return `${command}${chartX(pointTime(index)).toFixed(1)},${chartY(rate).toFixed(1)}`
}).join('')

const AREA_PATH = `${CURVE_PATH}L${chartX(pointTime(MOMENT_RATE.length - 1)).toFixed(1)},${PLOT_BOTTOM}L${PLOT_LEFT},${PLOT_BOTTOM}Z`

export function MomentRateChart() {
  const chartRef = useRef<SVGSVGElement>(null)
  const [progress, setProgress] = useState(0)
  const [playback, setPlayback] = useState(0)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const clipId = useId().replace(/:/g, '')
  const decimalSeparator = i18n.language.startsWith('en') ? '.' : ','

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    let raf = 0
    let started = false
    let observer: IntersectionObserver | undefined

    const animate = () => {
      if (started) return
      started = true
      observer?.disconnect()

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setProgress(1)
        return
      }

      const start = performance.now()
      const draw = (now: number) => {
        const t = Math.min(1, (now - start) / 5200)
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        setProgress(eased)
        if (t < 1) raf = requestAnimationFrame(draw)
      }
      raf = requestAnimationFrame(draw)
    }

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) animate()
      }, { threshold: 0.2 })
      observer.observe(chart)
    } else {
      animate()
    }

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [playback])

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (progress < 1) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * CHART_WIDTH
    const plotRatio = Math.max(0, Math.min(1, (relativeX - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT)))
    setActiveIndex(Math.round(plotRatio * (MOMENT_RATE.length - 1)))
  }

  const activeRate = activeIndex === null ? null : MOMENT_RATE[activeIndex]
  const activeTime = activeIndex === null ? null : pointTime(activeIndex)
  const activeX = activeTime === null ? null : chartX(activeTime)
  const activeY = activeRate === null ? null : chartY(activeRate)
  const tooltipX = activeX === null ? null : Math.max(PLOT_LEFT + 104, Math.min(PLOT_RIGHT - 104, activeX))
  const tooltipY = activeY === null ? null : Math.max(PLOT_TOP + 66, activeY - 72)
  const cumulativePercent = activeIndex === null
    ? 0
    : Math.round((CUMULATIVE_MOMENT[activeIndex] / MOMENT_TOTAL) * 100)

  return (
    <section className="dash-panel dash-moment-card" aria-labelledby="moment-rate-title">
      <div className="dash-moment-heading">
        <div>
          <span className="dash-section-title">
            <Activity width={14} height={14} />
            {translate('USGS · Falla finita')}
          </span>
          <h2 id="moment-rate-title">{translate('Tasa de liberación de momento')}</h2>
          <p>{i18n.language.startsWith('en') ? 'Jun 24, 2026' : '24 jun 2026'} · us6000t7zp</p>
        </div>
        <button
          className="dash-chart-replay"
          type="button"
          onClick={() => {
            setProgress(0)
            setActiveIndex(null)
            setPlayback((current) => current + 1)
          }}
          aria-label={translate('Repetir animación del gráfico')}
        >
          <RotateCcw width={14} height={14} />
          <span>{translate('Repetir')}</span>
        </button>
      </div>

      <div className="dash-moment-plot">
        <svg
          ref={chartRef}
          className="dash-moment-svg"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label={translate('Tasa de momento sísmico relativa durante 117,4 segundos, con el final interpretado de la rotura a los 70 segundos')}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id={`${clipId}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.015" />
            </linearGradient>
            <clipPath id={`${clipId}-reveal`}>
              <rect
                x={PLOT_LEFT}
                y={PLOT_TOP}
                width={(PLOT_RIGHT - PLOT_LEFT) * progress}
                height={PLOT_BOTTOM - PLOT_TOP}
              />
            </clipPath>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((rate) => (
            <g key={rate}>
              <line
                x1={PLOT_LEFT}
                x2={PLOT_RIGHT}
                y1={chartY(rate)}
                y2={chartY(rate)}
                className="dash-moment-grid"
              />
              <text x={PLOT_LEFT - 14} y={chartY(rate) + 5} textAnchor="end" className="dash-moment-tick">
                {rate.toFixed(2).replace('.', decimalSeparator)}
              </text>
            </g>
          ))}

          {[0, 20, 40, 60, 80, 100].map((time) => (
            <g key={time}>
              <line
                x1={chartX(time)}
                x2={chartX(time)}
                y1={PLOT_TOP}
                y2={PLOT_BOTTOM}
                className="dash-moment-grid"
              />
              <text x={chartX(time)} y={PLOT_BOTTOM + 28} textAnchor="middle" className="dash-moment-tick">
                {time}
              </text>
            </g>
          ))}

          <g clipPath={`url(#${clipId}-reveal)`}>
            <path d={AREA_PATH} fill={`url(#${clipId}-fill)`} />
            <path d={CURVE_PATH} className="dash-moment-line-glow" />
            <path d={CURVE_PATH} className="dash-moment-line" />
          </g>

          <line
            x1={chartX(RUPTURE_END)}
            x2={chartX(RUPTURE_END)}
            y1={PLOT_TOP}
            y2={PLOT_BOTTOM}
            className="dash-moment-rupture"
            opacity={progress >= RUPTURE_END / DURATION ? 1 : 0}
          />

          <rect
            x={PLOT_LEFT}
            y={PLOT_TOP}
            width={PLOT_RIGHT - PLOT_LEFT}
            height={PLOT_BOTTOM - PLOT_TOP}
            className="dash-moment-frame"
          />

          <text x={(PLOT_LEFT + PLOT_RIGHT) / 2} y={CHART_HEIGHT - 8} textAnchor="middle" className="dash-moment-axis-label">
            {translate('Tiempo desde el inicio (s)')}
          </text>
          <text
            className="dash-moment-axis-label dash-moment-axis-label--y"
            transform={`translate(22 ${(PLOT_TOP + PLOT_BOTTOM) / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            {translate('Tasa relativa')}
          </text>

          {activeIndex !== null && activeTime !== null && activeRate !== null && activeX !== null && activeY !== null && tooltipX !== null && tooltipY !== null && (
            <g pointerEvents="none">
              <line x1={activeX} x2={activeX} y1={PLOT_TOP} y2={PLOT_BOTTOM} className="dash-moment-crosshair" />
              <circle cx={activeX} cy={activeY} r="5.5" className="dash-moment-active-dot" />
              <g transform={`translate(${tooltipX} ${tooltipY})`}>
                <rect x="-104" y="-58" width="208" height="48" rx="8" className="dash-moment-tooltip" />
                <text y="-38" textAnchor="middle" className="dash-moment-tooltip-value">
                  {activeTime.toFixed(1).replace('.', decimalSeparator)} s · {(activeRate * 6.59).toFixed(2).replace('.', decimalSeparator)} × 10¹⁸ Nm/s
                </text>
                <text y="-20" textAnchor="middle" className="dash-moment-tooltip-detail">
                  {translate('Relativo {{rate}} · Acumulado {{percent}} %', {
                    rate: activeRate.toFixed(2).replace('.', decimalSeparator),
                    percent: cumulativePercent,
                  })}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      <div className="dash-moment-legend">
        <span><i className="dash-moment-legend-line" /> {translate('Tasa de momento relativa')}</span>
        <span><i className="dash-moment-legend-marker" /> {translate('Final interpretado de la rotura · 70 s')}</span>
      </div>
      <p className="dash-moment-note">
        {translate('Fuente: USGS. Curva normalizada del modelo; no es una medición directa.')}
      </p>
    </section>
  )
}
