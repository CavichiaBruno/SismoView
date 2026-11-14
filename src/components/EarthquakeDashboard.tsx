import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Satellite } from 'lucide-react'
import type { Earthquake } from '../data/earthquakes'
import { MomentRateChart } from './MomentRateChart'
import { MomentTensorChart } from './MomentTensorChart'
import { NisarCoherenceChart } from './NisarCoherenceChart'
import { EarthquakeMagnitudeChart } from './EarthquakeMagnitudeChart'
import i18n, { translate } from '../i18n'
import './EarthquakeDashboard.css'

const CoverageQualityMap = lazy(() =>
  import('./CoverageQualityMap').then(({ CoverageQualityMap }) => ({
    default: CoverageQualityMap,
  })),
)

const EpicenterMap = lazy(() =>
  import('./EpicenterMap').then(({ EpicenterMap }) => ({
    default: EpicenterMap,
  })),
)

interface Props {
  events: Earthquake[]
}

const OBSERVATION_METRICS = {
  acceptedPixels: '2,94 M',
  acceptedPixelsDetail: 'γ ≥ 0,4 · 16,7 % del raster',
  acceptedCoherenceMedian: '0,572',
  acceptedCoherenceDetail: 'Mediana · píxeles con γ ≥ 0,4',
  epicentralCoherenceDetail: 'M7.2 San Felipe / M7.5 Catia La Mar · 10 km',
  temporalBaseline: '12 días',
  temporalBaselineDetail: '13 jun 10:06 → 25 jun 10:06 UTC',
} as const

const EPICENTRAL_COHERENCE_BY_EVENT = new Map<string, number>([
  ['san-felipe', 0.354],
  ['yunare', 0.092],
])

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="dash-stat-card">
      <div className="dash-stat-body">
        <span className="dash-stat-label">{label}</span>
        <strong className="dash-stat-value">{value}</strong>
        <span className="dash-stat-detail">{detail}</span>
      </div>
    </div>
  )
}

function DeferredEpicenterMap({ events }: { events: Earthquake[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    const map = mapRef.current
    if (!map || shouldLoad) return

    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { root: map.closest('.dash-body'), rootMargin: '200px' },
    )
    observer.observe(map)
    return () => observer.disconnect()
  }, [shouldLoad])

  const skeleton = (
    <div className="dash-coverage-skeleton" role="status">
      <span>{translate('Cargando mapa de epicentros')}</span>
    </div>
  )

  return (
    <div className="dash-epicenter-map-deferred" ref={mapRef}>
      {shouldLoad ? (
        <Suspense fallback={skeleton}>
          <EpicenterMap events={events} />
        </Suspense>
      ) : skeleton}
    </div>
  )
}

export function EarthquakeDashboard({ events }: Props) {
  const magnitudeEvents = [...events].sort((first, second) => first.magnitude - second.magnitude)
  const epicentralCoherenceEvents = magnitudeEvents.flatMap((event) => {
    const coherence = EPICENTRAL_COHERENCE_BY_EVENT.get(event.id)
    return coherence === undefined ? [] : [{ event, coherence }]
  })
  const locale = i18n.language.startsWith('en') ? 'en-US' : 'es-ES'
  const epicentralCoherenceValue = epicentralCoherenceEvents
    .map(({ coherence }) => coherence.toLocaleString(locale, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }))
    .join(' / ')

  return (
    <div className="dash-root dark">

      {/* Header */}
      <header className="dash-header">
        <div className="dash-header-title">
          <span className="dash-header-badge">
            <Satellite width={13} height={13} />
            NISAR · Venezuela 2026
          </span>
          <h1>{translate('Informe InSAR del doblete sísmico')}</h1>
        </div>

        <div className="dash-header-status">
          <span className="dash-status-dot" />
          <span>{translate('Datos NISAR procesados')}</span>
        </div>
      </header>

      {/* Body */}
      <div className="dash-body">

        {/* Key observations */}
        <div className="dash-stat-row">
          {magnitudeEvents.map((event) => (
            <KpiCard
              key={event.id}
              label={translate('Magnitud · {{state}}', { state: event.state })}
              value={`M${event.magnitude.toFixed(1)}`}
              detail={`${translate(event.place)} · Mw`}
            />
          ))}
          <KpiCard
            label={translate('Píxeles con señal aceptable')}
            value={translate(OBSERVATION_METRICS.acceptedPixels)}
            detail={translate(OBSERVATION_METRICS.acceptedPixelsDetail)}
          />
          <KpiCard
            label={translate('Coherencia mediana')}
            value={translate(OBSERVATION_METRICS.acceptedCoherenceMedian)}
            detail={translate(OBSERVATION_METRICS.acceptedCoherenceDetail)}
          />
          <KpiCard
            label={translate('Coherencia epicentral · 10 km')}
            value={epicentralCoherenceValue}
            detail={translate(OBSERVATION_METRICS.epicentralCoherenceDetail)}
          />
          <KpiCard
            label={translate('Intervalo de adquisición')}
            value={translate(OBSERVATION_METRICS.temporalBaseline)}
            detail={translate(OBSERVATION_METRICS.temporalBaselineDetail)}
          />
        </div>

        {/* Coverage and quality map */}
        <div className="dash-row-2">
          <MomentRateChart />
          <NisarCoherenceChart events={epicentralCoherenceEvents} />
          <div className="dash-panel dash-quality-panel">
            <span className="dash-section-title">{translate('Cobertura y calidad')}</span>
            <Suspense
              fallback={
                <div className="dash-coverage-skeleton" role="status">
                  <span>{translate('Preparando terreno y datos InSAR')}</span>
                </div>
              }
            >
              <CoverageQualityMap />
            </Suspense>
          </div>
        </div>

        <div className="dash-tensor-row">
          <MomentTensorChart />
          <EarthquakeMagnitudeChart events={magnitudeEvents} />
          <div className="dash-panel dash-tensor-map">
            <span className="dash-section-title">{translate('Falla finita y epicentros')}</span>
            <DeferredEpicenterMap events={events} />
          </div>
        </div>

      </div>
    </div>
  )
}
