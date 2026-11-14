import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { TOUR_STEPS, type TourStepId } from '../data/tourConfig'
import type { Earthquake } from '../data/earthquakes'
import type { GcovLayer, RadarLayer } from '../data/gcov'
import './TourStepper.css'

const INSAR_GUIDE_ITEMS = [
  { title: 'Franjas · fase envuelta', src: '/franjas.png', aspect: 0.86 },
  { title: 'Desplazamiento · LOS', src: '/desplazamiento.png', aspect: 0.86 },
  {
    title: 'Coherencia · calidad de señal',
    src: '/map_coherence.png',
    aspect: 0.86,
  },
  {
    title: 'Desplazamiento este-oeste',
    src: '/data/venezuela/deformation/este_oeste_completo.png',
    aspect: 2.6,
  },
  {
    title: 'Desplazamiento vertical',
    src: '/data/venezuela/deformation/vertical_completo.png',
    aspect: 2.6,
  },
  {
    title: 'LOS · geometría ascendente',
    src: '/data/venezuela/deformation/los_asc_mosaico.png',
    aspect: 2.6,
  },
  {
    title: 'LOS · geometría descendente',
    src: '/data/venezuela/deformation/los_desc_mosaico.png',
    aspect: 2.6,
  },
  {
    title: 'Gradiente de fase · ruptura',
    src: '/data/venezuela/faults/gradiente_T162A.png',
    aspect: 1.03,
  },
  {
    title: 'Gradiente de fase · T54D',
    src: '/data/venezuela/faults/gradiente_T54D.png',
    aspect: 1.03,
  },
  { title: 'HH · 13 jun 2026', src: '/data/venezuela/gcov/gcov_hh_20260613.png', aspect: 1 },
  { title: 'HV · 13 jun 2026', src: '/data/venezuela/gcov/gcov_hv_20260613.png', aspect: 1 },
]

type RadarModuleId = 'interferometry' | 'deformation' | 'polarization' | 'rupture'

const RADAR_MODULES: {
  id: RadarModuleId
  title: string
  summary: string
  layerIndexes: number[]
  initialLayer: number
}[] = [
  {
    id: 'interferometry',
    title: 'Interferometría',
    summary: 'Franjas, coherencia y calidad de la señal',
    layerIndexes: [0, 2],
    initialLayer: 0,
  },
  {
    id: 'deformation',
    title: 'Deformación',
    summary: 'LOS, componentes y geometrías de observación',
    layerIndexes: [1, 3, 4, 5, 6],
    initialLayer: 1,
  },
  {
    id: 'polarization',
    title: 'Polarización',
    summary: 'Qué destacan los retornos HH y HV',
    layerIndexes: [9, 10],
    initialLayer: 9,
  },
  {
    id: 'rupture',
    title: 'Ruptura',
    summary: 'Gradientes de fase y referencia del epicentro',
    layerIndexes: [7, 8],
    initialLayer: 7,
  },
]

const GUIDE_LAYER_RADAR_LAYERS: RadarLayer[] = [
  'fringes',
  'displacement',
  'coherence',
  'east_west',
  'vertical',
  'los_ascending',
  'los_descending',
  'phase_gradient_t162a',
  'phase_gradient_t54d',
  'gcov_hh_before',
  'gcov_hv_before',
]

const GUIDE_LAYER_LEGENDS: Record<number, [string, string, string]> = {
  0: ['Fase envuelta', '1 ciclo ≈ 12,1 cm LOS', 'Fase envuelta'],
  1: ['−40 cm LOS', 'Escala limitada', '+40 cm LOS'],
  2: ['Menos consistente', 'Coherencia', 'Más consistente'],
  3: ['−619 mm', '0 mm', '+619 mm'],
  4: ['−125 mm', '0 mm', '+125 mm'],
  5: ['−417 mm LOS', '0 mm', '+417 mm LOS'],
  6: ['−344 mm LOS', '0 mm', '+344 mm LOS'],
  7: ['Gradiente de fase', 'Escala visual', 'Sin unidades de desplazamiento'],
  8: ['Gradiente de fase', 'Escala visual', 'Sin unidades de desplazamiento'],
  9: ['Menor retorno', 'Gamma-0 · dB', 'Mayor retorno'],
  10: ['Menor retorno', 'Gamma-0 · dB', 'Mayor retorno'],
}

const AUTO_RADAR_LAYERS: RadarLayer[] = [
  'fringes',
  'coherence',
  'displacement',
  'east_west',
  'vertical',
  'los_ascending',
  'los_descending',
  'phase_gradient_t162a',
  'phase_gradient_t54d',
  'gcov_hh_before',
  'gcov_hv_before',
  'gcov_hh_after',
  'gcov_hv_after',
]

const RADAR_MODULE_DESCRIPTIONS: Record<RadarModuleId, string> = {
  deformation:
    'Explora el movimiento observado en la línea de visión y las componentes estimadas. Las capas ascendentes y descendentes tienen geometrías y fechas distintas; las componentes este-oeste y vertical dependen de la hipótesis norte-sur igual a cero.',
  interferometry:
    'La fase muestra cambios de distancia proyectados hacia el radar y la coherencia indica dónde la comparación entre fechas es más confiable. Ninguna de las dos identifica por sí sola la causa de la señal.',
  polarization:
    'HH y HV muestran la intensidad del retorno del radar, no desplazamiento. Una zona oscura indica menor retorno y podría deberse a una superficie lisa o a poca dispersión; por ejemplo, en el valle de Yaracuy podría ser un lote agrícola de caña de azúcar con suelo expuesto o cultivo bajo. Es solo una posibilidad: el tono no identifica el cultivo ni su estado. Compara HH y HV con el contexto del terreno; HV puede resaltar la dispersión en vegetación, pero estas imágenes no clasifican automáticamente la cobertura.',
  rupture:
    'Los gradientes resaltan cambios espaciales rápidos de fase que pueden ayudar a inspeccionar posibles fracturas. La flecha amarilla señala el epicentro Mw 7.2.',
}

interface TourStepperProps {
  currentStep: TourStepId
  animateNisarIntro: boolean
  isExpanded: boolean
  events: Earthquake[]
  onNext: () => void
  onPrev: () => void
  onRestart: () => void
  onSelectStep: (step: TourStepId) => void
  radarLayer: RadarLayer
  onRadarLayerChange: (layer: RadarLayer) => void
  comparisonBefore: GcovLayer
  comparisonPosition: number
  isGcovComparisonEnabled: boolean
  isLosGeometryComparisonEnabled: boolean
  onComparisonBeforeChange: (layer: GcovLayer) => void
  onComparisonAfterChange: (layer: GcovLayer) => void
  onComparisonPositionChange: (position: number) => void
  onGcovComparisonChange: (enabled: boolean) => void
  onLosGeometryComparisonChange: (enabled: boolean) => void
  activeEpicenterIndex: number
  onSelectEpicenter: (index: number) => void
  isAutoPanning: boolean
  onToggleAutoPan: () => void
  onStepButtonClick: () => void
  onDismissIntro: () => void
  onFocusRupture: () => void
  onFocusRadarOverview: () => void
  onToggleFaultView: () => void
  isFaultModel3D: boolean
  showFaultModel: boolean
  showSurfaceDeformation: boolean
  finiteFaultError: string | null
  onToggleFaultModel: () => void
  onToggleSurfaceDeformation: () => void
}

export const TourStepper: React.FC<TourStepperProps> = ({
  currentStep,
  animateNisarIntro,
  isExpanded,
  events,
  onNext,
  onPrev,
  onRestart,
  onSelectStep,
  radarLayer,
  onRadarLayerChange,
  comparisonBefore,
  comparisonPosition,
  isGcovComparisonEnabled,
  isLosGeometryComparisonEnabled,
  onComparisonBeforeChange,
  onComparisonAfterChange,
  onComparisonPositionChange,
  onGcovComparisonChange,
  onLosGeometryComparisonChange,
  activeEpicenterIndex,
  onSelectEpicenter,
  isAutoPanning,
  onToggleAutoPan,
  onStepButtonClick,
  onDismissIntro,
  onFocusRupture,
  onFocusRadarOverview,
  onToggleFaultView,
  isFaultModel3D,
  showFaultModel,
  showSurfaceDeformation,
  finiteFaultError,
  onToggleFaultModel,
  onToggleSurfaceDeformation,
}) => {
  const [activeRadarModule, setActiveRadarModule] = useState<RadarModuleId>('interferometry')
  const [isInsarGuideOpen, setIsInsarGuideOpen] = useState(false)
  const [isMapDockOpen, setIsMapDockOpen] = useState(false)
  const [activeGuideLayer, setActiveGuideLayer] = useState(0)
  const lastRadarInteractionRef = React.useRef(0)
  const radarLayerRef = React.useRef(radarLayer)
  const stepInfo = TOUR_STEPS[currentStep]
  useEffect(() => {
    radarLayerRef.current = radarLayer
  }, [radarLayer])

  const openInsarGuide = useCallback((moduleId: RadarModuleId) => {
    if (isInsarGuideOpen && activeRadarModule === moduleId) {
      setIsInsarGuideOpen(false)
      setIsMapDockOpen(false)
      onGcovComparisonChange(false)
      onLosGeometryComparisonChange(false)
      return
    }
    const module = RADAR_MODULES.find((item) => item.id === moduleId)
    if (!module) return
    const currentLayerIndex = GUIDE_LAYER_RADAR_LAYERS.indexOf(radarLayer)
    const selectedLayerIndex = module.layerIndexes.includes(currentLayerIndex)
      ? currentLayerIndex
      : module.initialLayer
    setActiveRadarModule(moduleId)
    setActiveGuideLayer(selectedLayerIndex)
    const selectedLayer = GUIDE_LAYER_RADAR_LAYERS[selectedLayerIndex]
    if (selectedLayer) onRadarLayerChange(selectedLayer)
    if (moduleId !== 'polarization') onGcovComparisonChange(false)
    if (moduleId !== 'deformation') onLosGeometryComparisonChange(false)
    if (moduleId === 'rupture') onFocusRupture()
    else onFocusRadarOverview()
    setIsMapDockOpen(false)
    setIsInsarGuideOpen(true)
  }, [
    radarLayer,
    onRadarLayerChange,
    isInsarGuideOpen,
    activeRadarModule,
    onGcovComparisonChange,
    onLosGeometryComparisonChange,
    onFocusRupture,
    onFocusRadarOverview,
  ])
  const closeInsarGuide = useCallback(() => {
    setIsInsarGuideOpen(false)
    setIsMapDockOpen(false)
    onGcovComparisonChange(false)
    onLosGeometryComparisonChange(false)
  }, [onGcovComparisonChange, onLosGeometryComparisonChange])

  const toggleGcovComparison = (enabled: boolean) => {
    onGcovComparisonChange(enabled)
    setIsMapDockOpen(enabled)
    setIsInsarGuideOpen(!enabled)
  }

  const toggleLosGeometryComparison = (enabled: boolean) => {
    onLosGeometryComparisonChange(enabled)
    setIsMapDockOpen(enabled)
    setIsInsarGuideOpen(!enabled)
  }

  useEffect(() => {
    if (currentStep !== 'radar_zoom' || isExpanded) {
      closeInsarGuide()
    }
  }, [currentStep, isExpanded, closeInsarGuide])

  useEffect(() => {
    if (!isInsarGuideOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeInsarGuide()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isInsarGuideOpen, closeInsarGuide])

  useEffect(() => {
    if (currentStep !== 'radar_zoom' || isInsarGuideOpen || isMapDockOpen) return

    lastRadarInteractionRef.current = Date.now()
    const markInteraction = () => {
      lastRadarInteractionRef.current = Date.now()
    }
    const interactionEvents = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const
    interactionEvents.forEach((eventName) =>
      window.addEventListener(eventName, markInteraction, { passive: true }),
    )
    const rotation = window.setInterval(() => {
      if (Date.now() - lastRadarInteractionRef.current < 8000) return
      const currentIndex = AUTO_RADAR_LAYERS.indexOf(radarLayerRef.current)
      const nextLayer = AUTO_RADAR_LAYERS[(currentIndex + 1) % AUTO_RADAR_LAYERS.length]
      if (nextLayer) {
        onRadarLayerChange(nextLayer)
        const nextIndex = GUIDE_LAYER_RADAR_LAYERS.indexOf(nextLayer)
        const nextModule = RADAR_MODULES.find((module) => module.layerIndexes.includes(nextIndex))
        if (nextModule) {
          setActiveRadarModule(nextModule.id)
          setActiveGuideLayer(nextIndex)
          if (nextModule.id === 'rupture') onFocusRupture()
          else onFocusRadarOverview()
        }
        lastRadarInteractionRef.current = Date.now()
      }
    }, 1000)

    return () => {
      window.clearInterval(rotation)
      interactionEvents.forEach((eventName) =>
        window.removeEventListener(eventName, markInteraction),
      )
    }
  }, [
    currentStep,
    isInsarGuideOpen,
    isMapDockOpen,
    onRadarLayerChange,
    onFocusRupture,
    onFocusRadarOverview,
  ])

  if (!stepInfo || currentStep === 'wall' || currentStep === 'typing') {
    return null
  }

  const stepsList: TourStepId[] = [
    'nisar_intro',
    'globe',
    'radar_zoom',
    'epicenters_3d',
  ]
  const currentStepNumber = stepInfo.number
  const isFirst = currentStepNumber <= 1
  const isLast = currentStepNumber >= stepInfo.totalSteps
  const activeModule = RADAR_MODULES.find((module) => module.id === activeRadarModule) ?? RADAR_MODULES[0]
  const activeGuideItem = INSAR_GUIDE_ITEMS[activeGuideLayer]
  const selectGuideLayer = (index: number) => {
    if (!activeModule.layerIndexes.includes(index)) return
    const layer = GUIDE_LAYER_RADAR_LAYERS[index]
    if (!layer) return
    setActiveGuideLayer(index)
    onRadarLayerChange(layer)
  }
  const showModuleOnMap = () => {
    setIsInsarGuideOpen(false)
    setIsMapDockOpen(true)
  }

  return (
    <>
      <div
        className={`tour-stepper-container ${isExpanded ? 'is-expanded' : ''} ${isInsarGuideOpen ? 'is-module-open' : ''} ${currentStep === 'epicenters_3d' ? 'is-3d-step' : ''}`}
        onClickCapture={(event) => {
          if (event.target instanceof Element && event.target.closest('button')) {
            onStepButtonClick()
          }
        }}
      >
      {/* Dynamic Camera Control Indicator (visible during epicenters step) */}
      {currentStep === 'epicenters_3d' && (
        <div className="camera-hint-banner">
          <div className="camera-hint-text">
            <strong>{isAutoPanning ? 'Paneo automático' : 'Cámara manual'}</strong>
            <span>Arrastra para mover la cámara. El paneo se reanuda tras 2 s.</span>
          </div>
          <button
            className={`camera-toggle-btn ${isAutoPanning ? 'active' : ''}`}
            onClick={onToggleAutoPan}
            title={isAutoPanning ? 'Pausar paneo' : 'Reanudar paneo'}
          >
            {isAutoPanning ? 'Pausar' : 'Reanudar'}
          </button>
        </div>
      )}

      {/* Main Wizard Card */}
      <div
        className={`tour-wizard-card${currentStep === 'nisar_intro' && animateNisarIntro ? ' nisar-intro-entering' : ''}`}
      >
        {/* Progress Bar & Indicators */}
        {!isExpanded && (
          <div className="tour-progress-bar">
            {stepsList.map((stepKey, idx) => {
              const stepNum = idx + 1
              const isCompleted = stepNum < currentStepNumber
              const isActive = stepNum === currentStepNumber
              return (
                <button
                  key={stepKey}
                  className={`step-dot-btn ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''}`}
                  onClick={() => onSelectStep(stepKey)}
                  title={TOUR_STEPS[stepKey].title}
                >
                  <span className="step-dot-number">{stepNum}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Header Badge & Title */}
        <div className="tour-card-header">
          <div className="tour-badge-pill">{stepInfo.badge}</div>
          <h2 className="tour-card-title">{stepInfo.title}</h2>
        </div>

        {/* Narrative Description */}
        <p className="tour-card-narrative">{stepInfo.narrative}</p>

        {/* Interactive Step-specific Controls */}
        {!isExpanded && currentStep === 'radar_zoom' && (
          <div className="tour-subcontrols radar-controls">
            <p className="radar-modules-intro">Elige un tema para explorar sus capas y controles.</p>
            <div className="radar-module-grid">
              {RADAR_MODULES.map((module, index) => (
                <button
                  key={module.id}
                  className={`radar-module-card${activeRadarModule === module.id ? ' is-active' : ''}`}
                  type="button"
                  aria-pressed={activeRadarModule === module.id}
                  aria-label={`Abrir módulo ${module.title}`}
                  onClick={() => openInsarGuide(module.id)}
                >
                  <span className="radar-module-number">0{index + 1}</span>
                  <span className="radar-module-card-copy">
                    <strong>{module.title}</strong>
                    <span>{module.summary}</span>
                    <span className="radar-module-action">Abrir módulo</span>
                  </span>
                  <span className="radar-module-arrow" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!isExpanded && currentStep === 'epicenters_3d' && (
          <div className="tour-subcontrols epicenter-controls">
            <span className="subcontrol-label">Seleccionar epicentro a inspeccionar:</span>
            <div className="epicenter-btn-group">
              {events.map((ev, idx) => (
                <button
                  key={ev.id}
                  className={`epicenter-select-btn ${activeEpicenterIndex === idx ? 'active' : ''}`}
                  onClick={() => onSelectEpicenter(idx)}
                >
                  <span className="ep-dot" />
                  <span>
                    {ev.place} (M{ev.magnitude.toFixed(1)})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!isExpanded && currentStep === 'radar_zoom' && (
          <div className="tour-subcontrols finite-fault-controls">
            <div className="finite-fault-summary">
              <span><strong>130</strong> subfallas · <strong>2</strong> segmentos</span>
              <span>Rumbo 81° / 86,1° · buzamiento 78° · Mw 7.5</span>
            </div>
            <button
              className="finite-fault-view-3d-btn"
              type="button"
              aria-pressed={isFaultModel3D}
              onClick={onToggleFaultView}
            >
              {isFaultModel3D ? 'Volver a vista en planta' : 'Ver en 3D'}
            </button>
            <button
              className={`finite-fault-layer-btn${showFaultModel ? ' is-active' : ''}`}
              type="button"
              aria-pressed={showFaultModel}
              onClick={onToggleFaultModel}
            >
              <span className="finite-fault-swatch finite-fault-swatch--slip" aria-hidden="true" />
              <span className="finite-fault-layer-copy">
                <strong>Falla finita</strong>
                <small>Deslizamiento representado por subfalla</small>
              </span>
              <span className="finite-fault-layer-state">{showFaultModel ? 'Visible' : 'Oculta'}</span>
            </button>
            {showFaultModel && (
              <div className="finite-fault-legend" aria-label="Leyenda del deslizamiento por subfalla">
                <span>Deslizamiento por subfalla (m)</span>
                <div className="finite-fault-legend-scale" aria-hidden="true" />
                <div className="finite-fault-legend-labels">
                  <span>Menor · 0 m</span>
                  <span>Mayor · 1,82 m</span>
                </div>
                <small>Selecciona una subfalla para consultar sus datos.</small>
              </div>
            )}
            <button
              className={`finite-fault-layer-btn${showSurfaceDeformation ? ' is-active' : ''}`}
              type="button"
              aria-pressed={showSurfaceDeformation}
              onClick={onToggleSurfaceDeformation}
            >
              <span className="finite-fault-swatch finite-fault-swatch--deformation" aria-hidden="true" />
              <span className="finite-fault-layer-copy">
                <strong>Deformación superficial</strong>
                <small>Componente vertical calculada · mm</small>
              </span>
              <span className="finite-fault-layer-state">{showSurfaceDeformation ? 'Visible' : 'Oculta'}</span>
            </button>
            {finiteFaultError && (
              <p className="finite-fault-error" role="alert">{finiteFaultError}</p>
            )}
          </div>
        )}

        {!isExpanded && stepInfo.instruction && (
          <div className="tour-card-instruction">
            <span>{stepInfo.instruction}</span>
          </div>
        )}

        {/* Navigation Buttons Footer */}
        <div className="tour-card-footer">
          {isExpanded ? (
            <button className="tour-nav-btn next tour-nav-btn--confirm" onClick={onDismissIntro}>
              {currentStep === 'nisar_intro' ? 'Siguiente' : 'Cerrar'}
            </button>
          ) : (
            <>
              <button
                className="tour-nav-btn prev"
                onClick={onPrev}
                disabled={isFirst}
                title="Paso anterior"
              >
                Anterior
              </button>

              <button
                className="tour-nav-btn restart"
                onClick={onRestart}
                title="Reiniciar recorrido"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14">
                  <path
                    d="M13 5V2.5M13 5h-2.5M13 5a5.5 5.5 0 1 0 1.1 4.7"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
                <span>Reiniciar</span>
              </button>

              {isLast ? (
                <button className="tour-nav-btn next complete" onClick={() => onSelectStep('dashboard')}>
                  Ver informe →
                </button>
              ) : (
                <button className="tour-nav-btn next" onClick={onNext}>
                  Siguiente
                </button>
              )}
            </>
          )}
        </div>
      </div>
      </div>
      {isInsarGuideOpen &&
        createPortal(
          <div className="insar-guide-backdrop">
            <section
              className="insar-guide-dialog"
              role="dialog"
              aria-modal="false"
              aria-labelledby="insar-guide-title"
              aria-describedby="insar-guide-description"
            >
              <header className="insar-guide-header">
                <div>
                  <span className="tour-badge-pill">MÓDULO DE EXPLORACIÓN</span>
                  <h2 id="insar-guide-title">{activeModule.title}</h2>
                  <p id="insar-guide-description">{RADAR_MODULE_DESCRIPTIONS[activeRadarModule]}</p>
                </div>
                <button
                  className="insar-guide-close"
                  type="button"
                  onClick={showModuleOnMap}
                  aria-label="Ver el módulo en el mapa"
                >
                  Ver en el mapa
                </button>
              </header>

              <div className="insar-guide-content">
                <div className="insar-guide-layout">
                  <aside className="insar-guide-tools">
                    <label className="insar-guide-layer-label" htmlFor="insar-module-layer">
                      Capa del mapa <span>· elige para cambiar la vista</span>
                    </label>
                    <div className="insar-layer-select-wrap">
                      <select
                        id="insar-module-layer"
                        className="tour-radar-select insar-layer-select"
                        value={activeGuideLayer}
                        onChange={(event) => selectGuideLayer(Number(event.currentTarget.value))}
                      >
                        {activeModule.layerIndexes.map((index) => {
                          const item = INSAR_GUIDE_ITEMS[index]
                          return item ? (
                            <option key={item.title} value={index}>{item.title}</option>
                          ) : null
                        })}
                      </select>
                      <span className="insar-layer-select-chevron" aria-hidden="true">⌄</span>
                    </div>
                    <figure className="insar-guide-figure">
                      <img
                        src={activeGuideItem.src}
                        alt={activeGuideItem.title}
                        loading="lazy"
                      />
                      <figcaption>{activeGuideItem.title}</figcaption>
                    </figure>
                    <div className={`radar-legend-bar radar-legend-bar--${GUIDE_LAYER_RADAR_LAYERS[activeGuideLayer]}`} aria-hidden="true" />
                    <div className="radar-legend-labels">
                      {(GUIDE_LAYER_LEGENDS[activeGuideLayer] ?? []).map((label, index) => (
                        <span key={`${activeGuideLayer}-${index}`}>{label}</span>
                      ))}
                    </div>

                    {activeRadarModule === 'polarization' && (activeGuideLayer === 9 || activeGuideLayer === 10) && (
                      <div className="insar-module-controls">
                        <button
                          className={`gcov-compare-toggle${isGcovComparisonEnabled ? ' is-active' : ''}`}
                          type="button"
                          aria-pressed={isGcovComparisonEnabled}
                          onClick={() => toggleGcovComparison(!isGcovComparisonEnabled)}
                        >
                          {isGcovComparisonEnabled ? 'Desactivar comparación' : 'Comparar fechas'}
                        </button>
                        <p className="radar-layer-note">
                          Misma polarización a 96 días de diferencia. Humedad y vegetación
                          también pueden explicar cambios.
                        </p>
                        {isGcovComparisonEnabled && (
                          <>
                            <label htmlFor="gcov-before-select">Polarización</label>
                            <select
                              id="gcov-before-select"
                              className="tour-radar-select"
                              value={comparisonBefore}
                              onChange={(event) => {
                                const value = event.currentTarget.value
                                if (value === 'gcov_hh_before' || value === 'gcov_hv_before') {
                                  onComparisonBeforeChange(value)
                                  onComparisonAfterChange(value === 'gcov_hh_before' ? 'gcov_hh_after' : 'gcov_hv_after')
                                }
                              }}
                            >
                              <option value="gcov_hh_before">HH</option>
                              <option value="gcov_hv_before">HV</option>
                            </select>
                            <div className="gcov-comparison-dates" aria-hidden="true">
                              <span>Izquierda · 13 de junio de 2026</span>
                              <span>Derecha · 17 de septiembre de 2026</span>
                            </div>
                            <input
                              id="gcov-swipe-slider"
                              className="gcov-swipe-slider"
                              type="range"
                              min="0.05"
                              max="0.95"
                              step="0.01"
                              value={comparisonPosition}
                              onChange={(event) => onComparisonPositionChange(Number(event.currentTarget.value))}
                              aria-label="Mover la cortina de comparación"
                            />
                          </>
                        )}
                      </div>
                    )}

                    {activeRadarModule === 'deformation' && (activeGuideLayer === 5 || activeGuideLayer === 6) && (
                      <div className="insar-module-controls">
                        <button
                          className={`gcov-compare-toggle${isLosGeometryComparisonEnabled ? ' is-active' : ''}`}
                          type="button"
                          aria-pressed={isLosGeometryComparisonEnabled}
                          onClick={() => toggleLosGeometryComparison(!isLosGeometryComparisonEnabled)}
                        >
                          {isLosGeometryComparisonEnabled ? 'Desactivar cortina LOS' : 'Comparar geometrías LOS'}
                        </button>
                        <p className="radar-layer-note">
                          Ascendente T162A (13–25 jun) frente a descendente T54D (17–29 jun).
                          Son miradas complementarias, no un antes y después; cada lado usa
                          su propia escala.
                        </p>
                        {isLosGeometryComparisonEnabled && (
                          <>
                            <div className="radar-legend-labels">
                              <span>Asc. ±417 mm</span>
                              <span>Desc. ±344 mm</span>
                            </div>
                            <label htmlFor="los-geometry-swipe-slider">Mover la cortina</label>
                            <input
                              id="los-geometry-swipe-slider"
                              className="gcov-swipe-slider"
                              type="range"
                              min="0.05"
                              max="0.95"
                              step="0.01"
                              value={comparisonPosition}
                              onChange={(event) => onComparisonPositionChange(Number(event.currentTarget.value))}
                              aria-label="Mover la cortina entre geometrías LOS"
                            />
                          </>
                        )}
                      </div>
                    )}

                    {activeRadarModule === 'rupture' && (
                      <div className="insar-module-controls">
                        <div className="radar-fault-legend">
                          <p className="radar-layer-note">
                            La flecha amarilla ubica el epicentro Mw 7.2; no representa una
                            traza de ruptura.
                          </p>
                        </div>
                      </div>
                    )}
                  </aside>
                  <div className="insar-guide-sections">
                  {activeGuideLayer === 0 && (
                    <article className="insar-guide-section insar-guide-section--details">
                      <div className="insar-guide-copy">
                        <h3>Franjas: fase envuelta</h3>
                        <p>
                          <strong>En explicación sencilla:</strong> el radar tomó imágenes en
                          dos fechas y las comparó. Cada ciclo completo de color representa
                          unos 12,1 cm de cambio relativo de distancia en la dirección en que
                          mira el radar (LOS). Cuando las franjas aparecen más juntas, la fase
                          cambia más rápidamente en una distancia menor: si la señal se debe
                          a deformación, indica un gradiente LOS más pronunciado, no que el
                          terreno necesariamente se haya abierto o separado.
                        </p>
                        <p>
                          <strong>Cómo se preparó:</strong> se combinaron grupos de 3 × 3
                          píxeles y se ocultaron las zonas donde la señal era poco consistente.
                          La fase es cíclica: los colores se repiten, por lo que las franjas
                          no indican por sí solas el cambio total ni si el movimiento fue
                          hacia el satélite o en sentido contrario. Un gradiente fuerte también
                          puede verse afectado por ruido, atmósfera o errores residuales del
                          procesamiento; no confirma por sí solo la causa de la señal.
                        </p>
                      </div>
                    </article>
                  )}

                  {activeGuideLayer === 1 && (
                    <article className="insar-guide-section insar-guide-section--details">
                      <div className="insar-guide-copy">
                        <h3>Estimación de desplazamiento en LOS</h3>
                        <p>
                          <strong>En explicación sencilla:</strong> este mapa estima cuánto
                          cambió la distancia entre el suelo y el satélite entre las dos
                          observaciones. Azul y rojo indican valores con signo opuesto; no
                          significan oeste y este. El radar solo mide desde su propia línea
                          de visión, así que este mapa no separa cuánto fue movimiento
                          horizontal y cuánto vertical.
                        </p>
                        <p>
                          <strong>Cómo se calculó:</strong> se restó la estimación de la
                          señal ionosférica de la fase desenrollada y se convirtió el
                          resultado a centímetros. Luego se tomó la mediana como referencia
                          provisional. Se usaron píxeles con coherencia mayor que 0,25 y
                          componente conectado válido. La convención física del signo no
                          está verificada para esta visualización.
                        </p>
                        <p>
                          La escala de color va de −40 a +40 cm; los valores que exceden
                          ese rango aparecen saturados. Es un cambio relativo estimado, no
                          el desplazamiento total ni una medición que confirme cuánto del
                          cambio fue causado por el sismo.
                        </p>
                      </div>
                    </article>
                  )}

                  {activeGuideLayer === 2 && (
                    <article className="insar-guide-section insar-guide-section--details">
                      <div className="insar-guide-copy">
                        <h3>Coherencia: qué tan confiable es la señal</h3>
                        <p>
                          <strong>En explicación sencilla:</strong> compara si el radar vio
                          una superficie parecida en las dos fechas. Amarillo indica una señal
                          más consistente; azul, una menos consistente. Donde es baja, hay
                          menos confianza en las franjas y en el desplazamiento estimado.
                        </p>
                        <p>
                          El gran sector azul al norte de la costa es el mar Caribe: el agua
                          cambia de aspecto para el radar entre observaciones y suele dar una
                          señal poco consistente. Las zonas azules pequeñas en tierra indican
                          baja coherencia, pero este mapa por sí solo no permite saber su causa.
                          La coherencia mide calidad, no movimiento.
                        </p>
                      </div>
                    </article>
                  )}
                  {activeGuideLayer === 3 && (
                    <article className="insar-guide-section insar-guide-section--details">
                      <div className="insar-guide-copy">
                        <h3>Desplazamiento este-oeste</h3>
                        <p>
                          <strong>En explicación sencilla:</strong> el mapa estima cuánto se
                          movió el terreno hacia el este o el oeste. Los valores positivos
                          representan movimiento al este y los negativos al oeste. El patrón
                          opuesto a ambos lados de la falla es compatible con movimiento
                          lateral dextral.
                        </p>
                        <p>
                          <strong>Cómo se estimó:</strong> se combinaron las observaciones LOS
                          ascendente y descendente, suponiendo que el movimiento norte-sur es
                          cero. Las observaciones abarcan el 13–25 de junio (ascendente) y
                          el 17–29 de junio (descendente). Por eso es una descomposición
                          condicionada por esa hipótesis, no una medición independiente de
                          las tres componentes. La malla es de aproximadamente 500 m y la
                          escala de color llega a cerca de ±619 mm.
                        </p>
                      </div>
                    </article>
                  )}
                  {activeGuideLayer === 4 && (
                    <article className="insar-guide-section insar-guide-section--details">
                      <div className="insar-guide-copy">
                        <h3>Desplazamiento vertical</h3>
                        <p>
                          <strong>En explicación sencilla:</strong> esta capa representa la
                          componente vertical estimada: positivo hacia arriba y negativo hacia
                          abajo. La señal es menor que la componente este-oeste y debe leerse
                          con cautela.
                        </p>
                        <p>
                          <strong>Cómo se estimó:</strong> se resolvieron las observaciones LOS
                          ascendente (13–25 de junio) y descendente (17–29 de junio) con la
                          misma hipótesis de movimiento norte-sur igual a cero. La capa no
                          es una medición vertical directa; los errores de ambas observaciones
                          y la hipótesis pueden afectar el resultado. La escala completa es
                          aproximadamente ±125 mm.
                        </p>
                      </div>
                    </article>
                  )}
                  {activeGuideLayer === 5 && (
                    <article className="insar-guide-section insar-guide-section--details">
                      <div className="insar-guide-copy">
                        <h3>Desplazamiento LOS: geometría ascendente</h3>
                        <p>
                          <strong>En explicación sencilla:</strong> este mosaico muestra el
                          movimiento proyectado sobre la línea de visión del satélite en una
                          pasada ascendente. No separa por sí solo el movimiento este-oeste,
                          norte-sur y vertical.
                        </p>
                        <p>
                          <strong>Cómo leerlo:</strong> los tonos representan milímetros en la
                          escala indicada. Este mosaico usa la geometría ascendente del
                          13–25 de junio. La geometría observa el terreno desde una dirección
                          distinta a la descendente; sus valores no son una imagen anterior
                          o posterior de la otra.
                        </p>
                      </div>
                    </article>
                  )}
                  {activeGuideLayer === 6 && (
                    <article className="insar-guide-section insar-guide-section--details">
                      <div className="insar-guide-copy">
                        <h3>Desplazamiento LOS: geometría descendente</h3>
                        <p>
                          <strong>En explicación sencilla:</strong> este mosaico muestra el
                          movimiento proyectado sobre la línea de visión durante una pasada
                          descendente. Cada valor combina la contribución de los movimientos
                          horizontales y verticales según la dirección de observación.
                        </p>
                        <p>
                          <strong>Cómo compararlo:</strong> junto con la geometría ascendente
                          ayuda a estimar componentes del movimiento, pero no es una
                          comparación antes/después. Este mosaico cubre el 17–29 de junio;
                          la pasada ascendente cubre el 13–25. Tienen direcciones de mirada
                          y ventanas de adquisición diferentes, así que el signo y la magnitud
                          se interpretan en la geometría de cada una.
                        </p>
                      </div>
                    </article>
                  )}
                  {activeGuideLayer === 7 && (
                    <article className="insar-guide-section insar-guide-section--details">
                      <div className="insar-guide-copy">
                        <h3>Gradiente de fase · ruptura</h3>
                        <p>
                          <strong>En explicación sencilla:</strong> el gradiente resalta
                          dónde cambia rápidamente la fase interferométrica en el mapa.
                          Una señal lineal puede ayudar a localizar un posible límite de
                          deformación, pero no es por sí sola una medida de desplazamiento
                          ni prueba de una ruptura superficial.
                        </p>
                        <p>
                          <strong>Cómo leerlo:</strong> la imagen muestra el gradiente de fase
                          del par ascendente T162A, del 13–25 de junio, sin la traza vectorial
                          superpuesta. La pasada descendente T54D observa esta misma zona
                          desde otro ángulo y en fechas distintas; es otra adquisición, no
                          la misma imagen girada. Los cambios lineales pueden ayudar a localizar un
                          posible límite de deformación, pero no confirman por sí solos una
                          ruptura superficial.
                        </p>
                      </div>
                    </article>
                  )}
                  {activeGuideLayer === 8 && (
                    <article className="insar-guide-section insar-guide-section--details">
                      <div className="insar-guide-copy">
                        <h3>Gradiente de fase · T54D</h3>
                        <p>
                          <strong>En explicación sencilla:</strong> este gradiente resalta
                          cambios espaciales rápidos de fase desde una geometría descendente.
                          Puede ayudar a inspeccionar señales lineales asociadas a deformación,
                          pero no mide desplazamiento por sí solo.
                        </p>
                        <p>
                          <strong>Cómo leerlo:</strong> corresponde al par T54D del 17–29 de
                          junio. Observa la misma zona que T162A desde otro ángulo y con
                          fechas distintas: es otra adquisición, no la misma imagen girada.
                          No debe leerse como una imagen antes/después. La flecha amarilla ubica el epicentro, no
                          una traza de ruptura ni una confirmación independiente en terreno.
                        </p>
                      </div>
                    </article>
                  )}
                  {activeGuideLayer === 9 && (
                    <article className="insar-guide-section insar-guide-section--details">
                      <div className="insar-guide-copy">
                        <h3>HH: polarización horizontal</h3>
                        <p>
                          <strong>En explicación sencilla:</strong> la primera letra indica
                          cómo transmite el radar y la segunda cómo recibe el eco. HH
                          significa que transmite una onda horizontal y recibe una onda
                          horizontal. Es una medición de la energía que vuelve al satélite,
                          no una fotografía del terreno.
                        </p>
                        <p>
                          <strong>Cómo se preparó:</strong> la capa muestra el término HHHH
                          de frecuencia A del producto GCOV. Es retrodispersión gamma-0,
                          expresada en decibelios y colocada en el mapa. Un retorno alto puede
                          deberse a suelo rugoso o a estructuras que dispersan la señal hacia
                          el radar. La humedad, la orientación y la vegetación también
                          influyen, así que HH no identifica por sí sola el tipo de superficie.
                        </p>
                      </div>
                    </article>
                  )}
                  {activeGuideLayer === 10 && (
                    <article className="insar-guide-section insar-guide-section--details">
                      <div className="insar-guide-copy">
                        <h3>HV: polarización cruzada</h3>
                        <p>
                          <strong>En explicación sencilla:</strong> HV significa que el radar
                          transmite una onda horizontal y recibe el eco en vertical. La
                          superficie cambia parte de la polarización de la onda. Esta respuesta
                          puede ser más fuerte cuando la señal interactúa con muchas ramas y
                          hojas en distintas direcciones.
                        </p>
                        <p>
                          <strong>Cómo se preparó:</strong> la capa muestra el término HVHV
                          de frecuencia A del GCOV, como retrodispersión gamma-0 en decibelios.
                          Un retorno HV relativamente alto puede ser compatible con
                          dispersión dentro de vegetación, pero no la confirma. El suelo y la
                          humedad afectan la señal. El agua tranquila suele devolver poca
                          energía, aunque el viento puede volverla más rugosa y cambiar el eco.
                        </p>
                      </div>
                    </article>
                  )}
                </div>
                </div>
              </div>

            </section>
          </div>,
          document.body,
        )}
      {isMapDockOpen &&
        createPortal(
          <section
            className="insar-comparison-dock"
            aria-label={isGcovComparisonEnabled || isLosGeometryComparisonEnabled
              ? 'Controles de comparación'
              : `Vista del mapa del módulo ${activeModule.title}`}
          >
            <header className="insar-comparison-dock-header">
              <strong>
                {isLosGeometryComparisonEnabled
                  ? 'Comparación de geometrías LOS'
                  : isGcovComparisonEnabled
                    ? 'Comparación de fechas'
                    : `Vista del mapa · ${activeModule.title}`}
              </strong>
              <button
                type="button"
                className="insar-comparison-dock-close"
                onClick={() => {
                  setIsMapDockOpen(false)
                  setIsInsarGuideOpen(true)
                }}
                aria-label="Volver a abrir el módulo"
                title="Volver a abrir el módulo"
              >
                ×
              </button>
            </header>
            {isGcovComparisonEnabled ? (
              <>
                <div className="insar-comparison-dock-controls">
                  <label htmlFor="gcov-dock-polarization">Polarización</label>
                  <select
                    id="gcov-dock-polarization"
                    className="tour-radar-select"
                    value={comparisonBefore}
                    onChange={(event) => {
                      const value = event.currentTarget.value
                      if (value === 'gcov_hh_before' || value === 'gcov_hv_before') {
                        onComparisonBeforeChange(value)
                        onComparisonAfterChange(value === 'gcov_hh_before' ? 'gcov_hh_after' : 'gcov_hv_after')
                      }
                    }}
                  >
                    <option value="gcov_hh_before">HH</option>
                    <option value="gcov_hv_before">HV</option>
                  </select>
                  <div className="gcov-comparison-dates">
                    <span>Izquierda · 13 de junio de 2026</span>
                    <span>Derecha · 17 de septiembre de 2026</span>
                  </div>
                </div>
              </>
            ) : isLosGeometryComparisonEnabled ? (
              <div className="insar-comparison-dock-geometry-labels">
                <span>Ascendente · ±417 mm</span>
                <span>Descendente · ±344 mm</span>
              </div>
            ) : null}
            {(isGcovComparisonEnabled || isLosGeometryComparisonEnabled) && (
              <input
                className="gcov-swipe-slider"
                type="range"
                min="0.05"
                max="0.95"
                step="0.01"
                value={comparisonPosition}
                onChange={(event) => onComparisonPositionChange(Number(event.currentTarget.value))}
                aria-label="Mover la cortina de comparación en el mapa"
              />
            )}
          </section>,
          document.body,
        )}
    </>
  )
}
