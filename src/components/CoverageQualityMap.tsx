import { useEffect, useRef, useState } from 'react'
import {
  Cartesian2,
  Cartesian3,
  Color,
  createWorldImageryAsync,
  createWorldTerrainAsync,
  EasingFunction,
  EllipsoidTerrainProvider,
  HeadingPitchRange,
  HeightReference,
  HorizontalOrigin,
  Ion,
  Math as CesiumMath,
  Matrix4,
  Rectangle,
  SplitDirection,
  SingleTileImageryProvider,
  Viewer,
  VerticalOrigin,
  type ImageryLayer,
  type ImageryProvider,
} from 'cesium'
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react'
import { coherenceOverlay } from '../data/coherence'
import { deformationComponents } from '../data/deformationComponents'
import { displacementOverlay } from '../data/displacement'
import { faultOverlay } from '../data/faultGradients'
import { fringeOverlay } from '../data/fringes'
import { gcovOverlays } from '../data/gcov'
import { earthquakes } from '../data/earthquakes'
import { terrainBlock } from '../data/terrainBlock'
import { translate } from '../i18n'
import { LayerSourceInfo } from './LayerSourceInfo'
import './CoverageQualityMap.css'

export type SlideIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
type LayerSource = {
  image: string
  bounds: { west: number; south: number; east: number; north: number }
}
type Slide = {
  title: string
  leftLabel: string
  rightLabel?: string
  left: LayerSource
  right?: LayerSource
  note: string
  focus?: { west: number; south: number; east: number; north: number }
}

const SLIDES: Slide[] = [
  {
    title: 'GCOV HH · misma polarización',
    leftLabel: '13 jun 2026',
    rightLabel: '17 sep 2026',
    left: gcovOverlays.hhBefore,
    right: gcovOverlays.hhAfter,
    note: 'Retrodispersión; no mide desplazamiento.',
  },
  {
    title: 'GCOV HV · misma polarización',
    leftLabel: '13 jun 2026',
    rightLabel: '17 sep 2026',
    left: gcovOverlays.hvBefore,
    right: gcovOverlays.hvAfter,
    note: 'Retrodispersión; no mide desplazamiento.',
  },
  {
    title: 'Desplazamiento LOS · órbitas distintas',
    leftLabel: 'Ascendente',
    rightLabel: 'Descendente',
    left: deformationComponents.losAscending,
    right: deformationComponents.losDescending,
    note: 'Misma magnitud proyectada; cambia la geometría.',
  },
  {
    title: 'Gradiente de fase · pasadas distintas',
    leftLabel: 'T162A',
    rightLabel: 'T54D',
    left: faultOverlay.gradients.t162a,
    right: faultOverlay.gradients.t54d,
    focus: {
      west: -68.57,
      south: 10.44,
      east: -68.20,
      north: 10.56,
    },
    note: 'Patrones de fase; no es diferencia directa de desplazamiento.',
  },
  {
    title: 'Interferograma · fase envuelta',
    leftLabel: 'Fase',
    left: fringeOverlay,
    note: 'La fase envuelta no equivale a desplazamiento en cm.',
  },
  {
    title: 'Coherencia · calidad de señal',
    leftLabel: 'Coherencia',
    left: coherenceOverlay,
    note: 'Indica calidad de señal; no mide movimiento.',
  },
  {
    title: 'Desplazamiento · línea de visión',
    leftLabel: 'Desplazamiento LOS',
    left: displacementOverlay,
    note: 'Movimiento proyectado en la línea de visión del radar.',
  },
  {
    title: 'Desplazamiento · componente este-oeste',
    leftLabel: 'Este-oeste',
    left: deformationComponents.eastWest,
    note: 'Componente horizontal del desplazamiento.',
  },
  {
    title: 'Desplazamiento · componente vertical',
    leftLabel: 'Vertical',
    left: deformationComponents.vertical,
    note: 'Componente vertical del desplazamiento.',
  },
]

const LAYER_TRANSITION_MS = 1_000
const LAYER_INTERVAL_MS = 8_000
const PREVIEW_RESOLUTION_SCALE = 1
const TERRAIN_EXAGGERATION = 8
const TERRAIN_CAMERA_RANGE_METERS = 145_000

function rectangleFor(bounds: { west: number; south: number; east: number; north: number }) {
  return Rectangle.fromDegrees(bounds.west, bounds.south, bounds.east, bounds.north)
}

export function CoverageQualityMap({
  selection,
  onSlideChange,
}: {
  selection?: { index: SlideIndex; request: number }
  onSlideChange?: (index: SlideIndex) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const activeSlideRef = useRef<SlideIndex>(0)
  const selectSlideRef = useRef<(index: SlideIndex, manual?: boolean) => void>(() => {})
  const resetViewRef = useRef<() => void>(() => {})
  const manualSelectionRef = useRef(false)
  const [activeSlide, setActiveSlide] = useState<SlideIndex>(0)
  const [comparisonPosition, setComparisonPosition] = useState(0.5)
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let viewer: Viewer
    try {
      viewer = new Viewer(container, {
        animation: false,
        baseLayer: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        scene3DOnly: true,
        requestRenderMode: true,
        maximumRenderTimeChange: Number.POSITIVE_INFINITY,
        msaaSamples: 2,
        terrainProvider: new EllipsoidTerrainProvider(),
      })
    } catch (error) {
      console.error('Unable to initialize the coverage and quality preview.', error)
      setLoadError(true)
      return
    }

    viewerRef.current = viewer
    viewer.scene.splitPosition = 0.5
    viewer.resolutionScale = PREVIEW_RESOLUTION_SCALE
    viewer.scene.globe.baseColor = Color.fromCssColorString('#101b2a')
    viewer.scene.globe.showGroundAtmosphere = true
    viewer.scene.globe.enableLighting = true
    viewer.scene.globe.depthTestAgainstTerrain = true
    viewer.scene.globe.maximumScreenSpaceError = 1.5
    earthquakes.forEach((event) => {
      viewer.entities.add({
        position: Cartesian3.fromDegrees(event.longitude, event.latitude),
        point: {
          pixelSize: 8,
          color: Color.fromCssColorString('#facc15'),
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: event.id === 'yunare' ? 'Catia La Mar' : 'San Felipe',
          font: '12px sans-serif',
          fillColor: Color.WHITE,
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#080e18').withAlpha(0.85),
          pixelOffset: new Cartesian2(0, -12),
          horizontalOrigin: HorizontalOrigin.CENTER,
          verticalOrigin: VerticalOrigin.BOTTOM,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
    })

    const cameraController = viewer.scene.screenSpaceCameraController
    cameraController.enableRotate = false
    cameraController.enableTranslate = false
    cameraController.enableZoom = false
    cameraController.enableTilt = false
    cameraController.enableLook = false

    const terrainCenterLongitude = (terrainBlock.grid.west + terrainBlock.grid.east) / 2
    const terrainCenterLatitude = (terrainBlock.grid.south + terrainBlock.grid.north) / 2
    const terrainCenter = Cartesian3.fromDegrees(terrainCenterLongitude, terrainCenterLatitude)
    const cameraRange = container.clientWidth < 500 ? 210_000 : TERRAIN_CAMERA_RANGE_METERS
    const setSlideView = (index: SlideIndex) => {
      viewer.camera.cancelFlight()
      viewer.camera.lookAtTransform(Matrix4.IDENTITY)
      const isGcov = index <= 1
      viewer.scene.verticalExaggeration = isGcov ? 1 : TERRAIN_EXAGGERATION
      viewer.scene.globe.enableLighting = !isGcov
      if (isGcov) {
        viewer.camera.setView({
          destination: rectangleFor(gcovOverlays.hhBefore.bounds),
          orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
        })
      } else if (SLIDES[index].focus) {
        viewer.camera.flyTo({
          destination: rectangleFor(SLIDES[index].focus),
          orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
          duration: 2.4,
          easingFunction: EasingFunction.CUBIC_IN_OUT,
        })
      } else {
        viewer.camera.lookAt(
          terrainCenter,
          new HeadingPitchRange(CesiumMath.toRadians(15), CesiumMath.toRadians(-20), cameraRange),
        )
      }
      viewer.scene.requestRender()
    }
    setSlideView(0)
    resetViewRef.current = () => setSlideView(activeSlideRef.current)
    const resizeObserver = new ResizeObserver(() => {
      if (viewer.isDestroyed()) return
      viewer.resize()
      if (activeSlideRef.current <= 1) setSlideView(activeSlideRef.current)
      else viewer.scene.requestRender()
    })
    resizeObserver.observe(container)

    let disposed = false
    let transitionTimeout = 0
    let opacityFrame = 0
    let readinessTimeout = 0
    const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim()
    if (ionToken) Ion.defaultAccessToken = ionToken

    const terrainPromise = ionToken
      ? createWorldTerrainAsync()
      : Promise.resolve(null)

    const loadBaseImagery = () => {
      void createWorldImageryAsync()
        .then((provider) => {
          if (disposed || viewer.isDestroyed()) return
          viewer.imageryLayers.addImageryProvider(provider, 0)
          viewer.scene.requestRender()
        })
        .catch((error: unknown) => {
          console.error('Unable to load base imagery in the coverage and quality preview.', error)
        })
    }

    let removeReadinessListener = () => {}
    let startLayerTransition = () => {}
    let mapReady = false
    const markReady = () => {
      if (mapReady || !viewer.scene.globe.tilesLoaded) return
      mapReady = true
      setIsReady(true)
      window.clearTimeout(readinessTimeout)
      removeReadinessListener()
      loadBaseImagery()
      startLayerTransition()
    }

    const loadLayers = async () => {
      const imageryPromises = SLIDES.flatMap((slide) => [
        SingleTileImageryProvider.fromUrl(slide.left.image, {
          rectangle: rectangleFor(slide.left.bounds),
        }),
        ...(slide.right
          ? [SingleTileImageryProvider.fromUrl(slide.right.image, {
              rectangle: rectangleFor(slide.right.bounds),
            })]
          : []),
      ])
      const [results, terrainResults] = await Promise.all([
        Promise.allSettled(imageryPromises),
        Promise.allSettled([terrainPromise]),
      ])

      if (disposed || viewer.isDestroyed()) return

      const terrainResult = terrainResults[0]
      if (terrainResult.status === 'fulfilled' && terrainResult.value) {
        viewer.terrainProvider = terrainResult.value
      } else if (terrainResult.status === 'rejected') {
        console.error('Unable to load terrain in the coverage and quality preview.', terrainResult.reason)
        if (ionToken) {
          disposed = true
          resizeObserver.disconnect()
          window.clearTimeout(readinessTimeout)
          viewer.destroy()
          setLoadError(true)
          return
        }
      }

      const createLayer = (
        result: PromiseSettledResult<ImageryProvider>,
        label: string,
        splitDirection: SplitDirection,
        alpha: number,
      ): ImageryLayer | null => {
        if (result.status === 'rejected') {
          console.error(`Unable to load the ${label} preview.`, result.reason)
          return null
        }
        const layer = viewer.imageryLayers.addImageryProvider(result.value)
        layer.splitDirection = splitDirection
        layer.alpha = alpha
        return layer
      }

      const slideLayers: { left: ImageryLayer; right?: ImageryLayer }[] = []
      let resultIndex = 0
      for (let index = 0; index < SLIDES.length; index += 1) {
        const slide = SLIDES[index]
        const left = createLayer(
          results[resultIndex++],
          `${slide.title} (${slide.leftLabel})`,
          slide.right ? SplitDirection.LEFT : SplitDirection.NONE,
          index === 0 ? 1 : 0,
        )
        const right = slide.right
          ? createLayer(
              results[resultIndex++],
              `${slide.title} (${slide.rightLabel})`,
              SplitDirection.RIGHT,
              index === 0 ? 1 : 0,
            )
          : undefined
        if (!left || (slide.right && !right)) {
          disposed = true
          resizeObserver.disconnect()
          window.clearTimeout(readinessTimeout)
          viewer.destroy()
          setLoadError(true)
          return
        }
        slideLayers.push(right ? { left, right } : { left })
      }

      removeReadinessListener = viewer.scene.postRender.addEventListener(markReady)
      viewer.scene.requestRender()
      const selectSlide = (nextIndex: SlideIndex, manual = false) => {
        if (disposed || viewer.isDestroyed()) return
        if (manual) manualSelectionRef.current = true
        window.clearTimeout(transitionTimeout)
        if (nextIndex === activeSlideRef.current) return
        window.cancelAnimationFrame(opacityFrame)
        slideLayers.forEach(({ left, right }) => {
          left.alpha = 0
          if (right) right.alpha = 0
        })
        const fromLayers = slideLayers[activeSlideRef.current]
        const toLayers = slideLayers[nextIndex]
        fromLayers.left.alpha = 1
        if (fromLayers.right) fromLayers.right.alpha = 1
        toLayers.left.alpha = 0
        if (toLayers.right) toLayers.right.alpha = 0
        const startedAt = performance.now()

        setSlideView(nextIndex)
        activeSlideRef.current = nextIndex
        setActiveSlide(nextIndex)

        const animateOpacity = (now: number) => {
          const progress = Math.min((now - startedAt) / LAYER_TRANSITION_MS, 1)
          fromLayers.left.alpha = 1 - progress
          if (fromLayers.right) fromLayers.right.alpha = 1 - progress
          toLayers.left.alpha = progress
          if (toLayers.right) toLayers.right.alpha = progress
          viewer.scene.requestRender()

          if (progress < 1) {
            opacityFrame = window.requestAnimationFrame(animateOpacity)
          } else if (!manualSelectionRef.current) {
            const nextSlide = ((nextIndex + 1) % SLIDES.length) as SlideIndex
            transitionTimeout = window.setTimeout(
              () => selectSlide(nextSlide),
              LAYER_INTERVAL_MS,
            )
          }
        }

        opacityFrame = window.requestAnimationFrame(animateOpacity)
      }

      selectSlideRef.current = selectSlide
      startLayerTransition = () => {
        const nextSlide = ((activeSlideRef.current + 1) % SLIDES.length) as SlideIndex
        transitionTimeout = window.setTimeout(
          () => selectSlide(nextSlide),
          LAYER_INTERVAL_MS,
        )
      }
    }

    readinessTimeout = window.setTimeout(() => {
      if (mapReady || disposed || viewer.isDestroyed()) return
      console.error('Timed out while loading terrain and imagery in the coverage and quality preview.')
      disposed = true
      resizeObserver.disconnect()
      viewer.destroy()
      setLoadError(true)
    }, 30_000)

    void loadLayers()

    return () => {
      disposed = true
      resizeObserver.disconnect()
      window.clearTimeout(transitionTimeout)
      window.clearTimeout(readinessTimeout)
      window.cancelAnimationFrame(opacityFrame)
      removeReadinessListener()
      selectSlideRef.current = () => {}
      resetViewRef.current = () => {}
      viewerRef.current = null
      if (!viewer.isDestroyed()) viewer.destroy()
    }
  }, [])

  useEffect(() => {
    if (isReady && selection) selectSlideRef.current(selection.index, true)
  }, [isReady, selection])

  useEffect(() => {
    onSlideChange?.(activeSlide)
  }, [activeSlide, onSlideChange])

  const zoom = (direction: 'in' | 'out') => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return
    const height = viewer.camera.positionCartographic.height
    if (direction === 'in' && height > 5_000) viewer.camera.zoomIn(height * 0.3)
    if (direction === 'out' && height < 1_000_000) viewer.camera.zoomOut(height * 0.4)
    viewer.scene.requestRender()
  }

  const updateComparisonPosition = (value: string) => {
    manualSelectionRef.current = true
    selectSlideRef.current(activeSlideRef.current, true)
    const position = Number(value) / 100
    setComparisonPosition(position)
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return
    viewer.scene.splitPosition = position
    viewer.scene.requestRender()
  }

  const slide = SLIDES[activeSlide]

  const sourceLayers = [
    'gcov_hh_before', 'gcov_hv_before', 'los_ascending', 'phase_gradient_t162a',
    'fringes', 'coherence', 'displacement', 'east_west', 'vertical',
  ] as const

  return (
    <div className="dash-quality-map">
      {loadError ? (
        <div className="dash-quality-map__error" role="status">
          {translate('No se pudo cargar la vista de cobertura y calidad.')}
        </div>
      ) : (
        <div className={`dash-quality-map__frame${slide.right ? '' : ' dash-quality-map__frame--single'}`}>
          <div
            className="dash-quality-map__viewport"
            ref={containerRef}
            role="img"
            aria-label={slide.right
              ? translate('Comparación: {{title}}; {{left}} frente a {{right}}', {
                title: translate(slide.title),
                left: translate(slide.leftLabel),
                right: translate(slide.rightLabel ?? ''),
              })
              : translate('Capa 3D: {{title}}', { title: translate(slide.title) })}
          />
          <div
            className={`dash-quality-map__skeleton${isReady ? ' dash-quality-map__skeleton--hidden' : ''}`}
            role="status"
          >
            <span>{translate('Preparando terreno y datos InSAR')}</span>
          </div>
          <div className="dash-quality-map__legend">
            <span className="dash-quality-map__indicator" />
            <span className="dash-quality-map__title" title={translate(slide.title)}>
              {translate(slide.title)}
            </span>
            <div className="dash-quality-map__navigation" role="group" aria-label={translate('Capas y comparaciones')}>
              <button
                type="button"
                aria-label={translate('Capa anterior')}
                disabled={!isReady}
                onClick={() => selectSlideRef.current(
                  ((activeSlide + SLIDES.length - 1) % SLIDES.length) as SlideIndex, true,
                )}
              >
                <ChevronLeft size={12} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={translate('Siguiente capa')}
                disabled={!isReady}
                onClick={() => selectSlideRef.current(
                  ((activeSlide + 1) % SLIDES.length) as SlideIndex, true,
                )}
              >
                <ChevronRight size={12} aria-hidden="true" />
              </button>
            </div>
            <span className="dash-quality-map__mode">
              {activeSlide <= 1 ? translate('Vista cenital') : '3D · ×8'}
            </span>
          </div>
          <div className="dash-quality-map__dates" aria-hidden="true">
            <span>{translate(slide.leftLabel)}</span>
            {slide.rightLabel && <span>{translate(slide.rightLabel)}</span>}
          </div>
          {slide.right && (
            <>
              <div
                className="dash-quality-map__divider"
                style={{ left: `${comparisonPosition * 100}%` }}
                aria-hidden="true"
              />
              <input
                className="dash-quality-map__range"
                type="range"
                min="5"
                max="95"
                step="1"
                value={comparisonPosition * 100}
                onChange={(event) => updateComparisonPosition(event.currentTarget.value)}
                disabled={!isReady}
                aria-label={translate('Posición de la cortina para comparar las capas')}
              />
            </>
          )}
          {activeSlide <= 1 && (
            <div className="dash-quality-map__zoom" role="group" aria-label={translate('Controles de zoom')}>
              <button type="button" onClick={() => zoom('in')} disabled={!isReady} aria-label={translate('Acercar mapa')}>
                <Plus size={16} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => zoom('out')} disabled={!isReady} aria-label={translate('Alejar mapa')}>
                <Minus size={16} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => resetViewRef.current()} disabled={!isReady} aria-label={translate('Restablecer vista')}>
                <RotateCcw size={15} aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="dash-quality-map__note" title={translate(slide.note)}>
            {translate(slide.note)}
          </div>
        </div>
      )}
      <LayerSourceInfo layer={sourceLayers[activeSlide]} />
    </div>
  )
}
