import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Satellite } from 'lucide-react'
import type { Earthquake } from '../data/earthquakes'
import { MomentRateChart } from './MomentRateChart'
import { MomentTensorChart } from './MomentTensorChart'
import { NisarCoherenceChart } from './NisarCoherenceChart'
import { EarthquakeMagnitudeChart } from './EarthquakeMagnitudeChart'
import type { SlideIndex } from './CoverageQualityMap'
import coherenceMetricsUrl from '../../scripts/coherence_metrics.mjs?url'
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
  ['san-felipe', 0.408],
  ['yunare', 0.082],
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
  const [mapSelection, setMapSelection] = useState<{ index: SlideIndex; request: number }>({ index: 0, request: 0 })
  const [activeMapSlide, setActiveMapSlide] = useState<SlideIndex>(0)
  const evidenceMapRef = useRef<HTMLDivElement>(null)
  const showEvidence = (index: SlideIndex) => {
    setMapSelection((previous) => ({ index, request: previous.request + 1 }))
    evidenceMapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
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

        <section className="dash-story" aria-labelledby="dash-story-title">
          <div className="dash-story-heading">
            <span>{translate('La historia en los datos · Venezuela')}</span>
            <h2 id="dash-story-title">{translate('Dos fechas. Un territorio. Muchas preguntas.')}</h2>
            <p>{translate('Compara el retorno radar antes y después del 24 de junio. Desliza la cortina y cambia de polarización: los cambios no tienen por qué deberse al sismo.')}</p>
          </div>
          <div className="dash-story-map" ref={evidenceMapRef}>
            <div className="dash-story-map-header">
              <strong>{translate('Compara las observaciones GCOV')}</strong>
              <div role="group" aria-label={translate('Polarización para comparar')}>
                <button type="button" aria-pressed={activeMapSlide === 0} onClick={() => showEvidence(0)}>HH</button>
                <button type="button" aria-pressed={activeMapSlide === 1} onClick={() => showEvidence(1)}>HV</button>
              </div>
            </div>
            <Suspense fallback={<div className="dash-coverage-skeleton" role="status">{translate('Preparando terreno y datos InSAR')}</div>}>
              <CoverageQualityMap selection={mapSelection} onSlideChange={setActiveMapSlide} />
            </Suspense>
            <p className="dash-territory-note">
              {translate(activeMapSlide <= 1
                ? 'Vista cenital sin exageración del relieve. Los puntos señalan los epicentros, no la extensión de la ruptura.'
                : 'Los puntos señalan los epicentros, no la extensión de la ruptura. El relieve está exagerado 8 veces.')}
            </p>
          </div>
          <div className="dash-story-clues">
            <article>
              <span>01 · {translate('Fase')}</span>
              <h3>{translate('Un patrón que invita a investigar')}</h3>
              <p>{translate('Las franjas del par del 13–25 de junio representan cambios de fase en la región. Por sí solas no identifican la causa ni el desplazamiento total.')}</p>
              <button type="button" onClick={() => showEvidence(4)}>{translate('Ver evidencia')} →</button>
            </article>
            <article>
              <span>02 · LOS</span>
              <h3>{translate('El movimiento desde una mirada')}</h3>
              <p>{translate('El mapa LOS estima el cambio relativo de distancia hacia o desde el radar, no el movimiento completo del terreno.')}</p>
              <button type="button" onClick={() => showEvidence(6)}>{translate('Ver evidencia')} →</button>
            </article>
            <article>
              <span>03 · {translate('Coherencia')}</span>
              <h3>{translate('No toda la señal es igual de fiable')}</h3>
              <p>{translate('En un radio de 10 km, las medianas del GeoTIFF local son 0,408 en San Felipe y 0,082 en Catia La Mar. Una coherencia baja exige cautela al interpretar la fase.')}</p>
              <button type="button" onClick={() => showEvidence(5)}>{translate('Ver evidencia')} →</button>
              <a className="dash-story-method" href={coherenceMetricsUrl} download="coherence_metrics.mjs">{translate('Descargar cálculo')} ↓</a>
            </article>
          </div>
          <div className="dash-story-conclusion">
            <h3>{translate('Lo que nos llevamos')}</h3>
            <p><strong>{translate('Observamos:')}</strong> {translate('El producto presenta franjas y una estimación de desplazamiento LOS; el 16,7 % del GeoTIFF local cumple el umbral de coherencia γ ≥ 0,4.')}</p>
            <p><strong>{translate('Hipótesis:')}</strong> {translate('La ruptura sísmica pudo contribuir a la deformación. Los cambios de humedad, vegetación, atmósfera y el procesamiento también pueden influir en las señales.')}</p>
            <p><strong>{translate('Por comprobar:')}</strong> {translate('Contrastar con otras pasadas, datos independientes y observaciones de campo antes de atribuir la señal a una falla o evaluar daños.')}</p>
          </div>
        </section>

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
        </div>

        <div className="dash-tensor-row">
          <MomentTensorChart />
          <EarthquakeMagnitudeChart events={magnitudeEvents} />
          <div className="dash-panel dash-tensor-map">
            <span className="dash-section-title">{translate('Falla finita y epicentros')}</span>
            <p className="dash-territory-note">{translate('Amplía el mapa y superpone LOS o coherencia sobre localidades y vías de OpenStreetMap. LOS: −40 a +40 cm; coherencia: 0–1. No es un mapa de daños ni de riesgo.')}</p>
            <DeferredEpicenterMap events={events} />
          </div>
        </div>

      </div>
    </div>
  )
}
