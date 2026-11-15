import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react'
import {
  ArcType,
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  CallbackProperty,
  CallbackPositionProperty,
  CameraEventType,
  Cartographic,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  createWorldImageryAsync,
  createWorldTerrainAsync,
  DistanceDisplayCondition,
  EllipsoidTerrainProvider,
  EasingFunction,
  Entity,
  HeadingPitchRange,
  HeightReference,
  HorizontalOrigin,
  ImageryLayer,
  Ion,
  GeoJsonDataSource,
  JulianDate,
  KeyboardEventModifier,
  LabelStyle,
  Math as CesiumMath,
  Matrix4,
  NearFarScalar,
  PointPrimitiveCollection,
  PolylineArrowMaterialProperty,
  Rectangle,
  SingleTileImageryProvider,
  SplitDirection,
  Transforms,
  VerticalOrigin,
  Viewer,
} from 'cesium'
import type { Earthquake } from '../data/earthquakes'
import {
  FINITE_FAULT_GEOJSON_URL,
  SURFACE_DEFORMATION_URL,
  parseFiniteFaultCollection,
  parseSurfaceDisplacement,
  projectFiniteFaultToSurface,
  surfaceDisplacementColor,
} from '../data/finiteFault'
import { coherenceOverlay } from '../data/coherence'
import { locateCoherencePixel, readCoherencePixel } from '../data/coherenceSampler'
import { displacementOverlay } from '../data/displacement'
import { deformationComponents } from '../data/deformationComponents'
import { faultOverlay } from '../data/faultGradients'
import { fringeOverlay } from '../data/fringes'
import { gcovOverlays, type GcovLayer, type RadarLayer } from '../data/gcov'
import type { TourStepId } from '../data/tourConfig'
import { ParallaxComponent } from './ui/parallax-scrolling'
import { AstronautArms } from './AstronautArms'
import { NisarSatellite } from './NisarSatellite'
import { TourTypingScreen } from './TourTypingScreen'
import { TourStepper } from './TourStepper'
import { EarthquakeDashboard } from './EarthquakeDashboard'
import { Waveform } from './ui/waveform'
import { optimizeCesiumTileCache, prewarmTileCache, clearExpiredTiles } from '../utils/cesiumOptimizations'
import i18n, { translate } from '../i18n'
import 'cesium/Build/Cesium/Widgets/widgets.css'

type CesiumMapProps = {
  events: Earthquake[]
  startupComplete: boolean
  introSoundEnabled: boolean
  initialStep?: TourStepId
}

type OverlayLayers = {
  displacement?: ImageryLayer
  eastWest?: ImageryLayer
  vertical?: ImageryLayer
  losAscending?: ImageryLayer
  losDescending?: ImageryLayer
  gradientT162A?: ImageryLayer
  gradientT54D?: ImageryLayer
  fringes?: ImageryLayer
  coherence?: ImageryLayer
  gcovHHBefore?: ImageryLayer
  gcovHVBefore?: ImageryLayer
  gcovHHAfter?: ImageryLayer
  gcovHVAfter?: ImageryLayer
  mw72Marker?: Entity
  faultNameLabel?: Entity
  crackArrow?: Entity
}

type CoherenceProbe = {
  status: 'loading' | 'value' | 'empty' | 'error'
  value: number | null
  x: number
  y: number
}

const CesiumCanvas = memo(forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CesiumCanvas(props, ref) {
    return <div ref={ref} {...props} />
  },
))

const DISPLACEMENT_OPACITY = 0.9
const EXAGGERATION_ON_HEIGHT = 4_000_000
const EXAGGERATION_OFF_HEIGHT = 5_000_000
const TERRAIN_EXAGGERATION = 2.5
const MINIMUM_CAMERA_HEIGHT = 1_000
const PROVISIONING_TIMEOUT = 15_000
const MAXIMUM_CAMERA_TILT = CesiumMath.toRadians(89)
const CAMERA_ORBIT_DISTANCE = 85_000
const PROVISIONING_MESSAGES = [
  translate('Preparando visualización'),
  translate('Cargando texturas 3D'),
  translate('Calibrando mediciones'),
  translate('Sincronizando capas satelitales'),
] as const
const EPICENTER_FLIGHT_DURATION = 4.2
const CAMERA_FLIGHT_EASING = EasingFunction.CUBIC_IN_OUT
const CAMERA_ORBIT_SPEED = 0.045
const CAMERA_IDLE_RESUME_DELAY = 2_000
const CAMERA_DRAG_SENSITIVITY = 0.005
const MIN_CAMERA_ORBIT_PITCH = CesiumMath.toRadians(-80)
const MAX_CAMERA_ORBIT_PITCH = CesiumMath.toRadians(-5)
const ARROW_REVEAL_HEIGHT = 8_000_000
const SUIT_CHANGE_HYSTERESIS = 250_000
const EXPLANATION_REVEAL_HEIGHT = 1_500_000
const NISAR_ORBIT_ALTITUDE_METERS = 747_000
const NISAR_ORBIT_INCLINATION = CesiumMath.toRadians(98.4)
const NISAR_ORBIT_NODE = CesiumMath.toRadians(-68)
const NISAR_ORBIT_PERIOD_SECONDS = 240
const MUSIC_VOLUME = 0.35
const MUSIC_FADE_DURATION = 900
const VOICE_INTRO_VOLUME = 0.9
const VOICE_INTRO_FADE_DURATION = 1_200
const VOICE_INTRO_SUBTITLES = [
  { start: 0, end: 1.1, text: 'One...' },
  { start: 1.1, end: 2.15, text: 'Two...' },
  { start: 2.15, end: 3.2, text: 'Three,' },
  { start: 3.2, end: 4.15, text: 'testing,' },
  { start: 4.15, end: 5.2, text: 'testing...' },
  { start: 5.2, end: 7.15, text: 'LuckyCode team here,' },
  { start: 7.15, end: 9.1, text: 'do you copy?' },
]

const audioFadeFrames = new WeakMap<HTMLAudioElement, number>()

function finiteFaultDescription(properties: {
  slip: number
  sf_moment: number
  rise: number
  trup: number
  rake: number
}) {
  const numberFormat = new Intl.NumberFormat(i18n.language.startsWith('en') ? 'en-US' : 'es-ES', {
    maximumFractionDigits: 3,
  })
  const moment = properties.sf_moment.toExponential(2).replace('e+', ' × 10^')

  return `<table><tbody>
    <tr><th>${translate('Deslizamiento')}</th><td>${numberFormat.format(properties.slip)} m</td></tr>
    <tr><th>${translate('Momento de esta subfalla')}</th><td>${moment} N·m</td></tr>
    <tr><th>${translate('Duración del movimiento (rise)')}</th><td>${numberFormat.format(properties.rise)} s</td></tr>
    <tr><th>${translate('Inicio de ruptura (Trup)')}</th><td>${numberFormat.format(properties.trup)} s</td></tr>
    <tr><th>${translate('Dirección del deslizamiento (rake)')}</th><td>${numberFormat.format(properties.rake)}°</td></tr>
  </tbody></table>`
}

function getCameraOrbitOffset(position: Cartesian3, target: Cartesian3) {
  const targetFrame = Transforms.eastNorthUpToFixedFrame(target)
  const inverseTargetFrame = Matrix4.inverseTransformation(targetFrame, new Matrix4())
  const localPosition = Matrix4.multiplyByPoint(
    inverseTargetFrame,
    position,
    new Cartesian3(),
  )
  const range = Cartesian3.magnitude(localPosition)

  return new HeadingPitchRange(
    Math.atan2(-localPosition.x, -localPosition.y),
    Math.asin(CesiumMath.clamp(-localPosition.z / range, -1, 1)),
    range,
  )
}

function cancelAudioFade(audio: HTMLAudioElement) {
  const frame = audioFadeFrames.get(audio)
  if (frame !== undefined) cancelAnimationFrame(frame)
  audioFadeFrames.delete(audio)
}

function fadeAudio(
  audio: HTMLAudioElement,
  targetVolume: number,
  onComplete?: () => void,
  duration = MUSIC_FADE_DURATION,
) {
  cancelAudioFade(audio)
  const startVolume = audio.volume
  const startedAt = performance.now()

  const animate = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1)
    audio.volume = startVolume + (targetVolume - startVolume) * progress

    if (progress < 1) {
      audioFadeFrames.set(audio, requestAnimationFrame(animate))
      return
    }

    audio.volume = targetVolume
    audioFadeFrames.delete(audio)
    onComplete?.()
  }

  audioFadeFrames.set(audio, requestAnimationFrame(animate))
}

const displacementZones = [
  {
    longitude: -68.55,
    latitude: 10.72,
    label: translate('LOS negativo · azul'),
  },
  {
    longitude: -67.55,
    latitude: 10.05,
    label: translate('LOS positivo · rojo'),
  },
] as const

const radarLayerAnnotations = [
  {
    layer: 'phase_gradient_t162a',
    longitude: -68.32,
    latitude: 10.575,
    text: translate('Gradiente de fase · T162A\nContraste espacial; no es desplazamiento directo'),
  },
  {
    layer: 'phase_gradient_t54d',
    longitude: -68.32,
    latitude: 10.575,
    text: translate('Gradiente de fase · T54D\nContraste espacial; no es desplazamiento directo'),
  },
  {
    layer: 'east_west',
    longitude: -68.55,
    latitude: 10.72,
    text: translate('Lado norte de la falla\nEste positivo: movimiento hacia el este'),
  },
  {
    layer: 'east_west',
    longitude: -67.55,
    latitude: 10.05,
    text: translate('Lado sur de la falla\nOeste negativo: movimiento hacia el oeste'),
  },
  {
    layer: 'vertical',
    longitude: -68.05,
    latitude: 10.575,
    text: translate('Componente vertical\nPositivo hacia arriba · señal débil'),
  },
  {
    layer: 'los_ascending',
    longitude: -68.05,
    latitude: 10.575,
    text: translate('LOS ascendente\nDesplazamiento proyectado en la línea de visión'),
  },
  {
    layer: 'los_descending',
    longitude: -68.05,
    latitude: 10.575,
    text: translate('LOS descendente\nDesplazamiento proyectado en la línea de visión'),
  },
  {
    layer: 'gcov_hh_before',
    longitude: -68.05,
    latitude: 10.575,
    text: translate('HH · 13 jun\nRetrodispersión gamma-0, no desplazamiento'),
  },
  {
    layer: 'gcov_hv_before',
    longitude: -68.05,
    latitude: 10.575,
    text: translate('HV · 13 jun\nRetrodispersión gamma-0, no desplazamiento'),
  },
  {
    layer: 'gcov_hh_after',
    longitude: -68.05,
    latitude: 10.575,
    text: translate('HH · 17 sep\nRetrodispersión gamma-0, no desplazamiento'),
  },
  {
    layer: 'gcov_hv_after',
    longitude: -68.05,
    latitude: 10.575,
    text: translate('HV · 17 sep\nRetrodispersión gamma-0, no desplazamiento'),
  },
] as const

function createPulseMarker() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="25" fill="#ff3b47" fill-opacity="0.22" stroke="#ff3b47" stroke-width="2" stroke-opacity="0.85"/>
      <circle cx="32" cy="32" r="12" fill="#ff3b47" stroke="#ffffff" stroke-width="3"/>
      <circle cx="32" cy="32" r="4" fill="#ffffff"/>
    </svg>
  `

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function createEpicenterStar() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <path d="m32 4 7.5 18.3L59 24l-15 12.2L48.7 56 32 45.2 15.3 56 20 36.2 5 24l19.5-1.7Z"
        fill="#39e600" stroke="#111827" stroke-width="3" stroke-linejoin="round"/>
    </svg>
  `

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function createNisarOrbitMarker() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <g stroke="#d8e6f0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M47 42 27 25M49 42 68 23" fill="none"/>
        <path d="m27 25-8 9 17 10 5-10ZM68 23l8 9-17 11-5-10Z" fill="#285985"/>
        <path d="m43 39 12 0 6 13-21 0Z" fill="#d9b866"/>
        <path d="m44 52-5 10m13-10 5 10" fill="none"/>
        <path d="M39 62h18" fill="none" stroke="#d9b866" stroke-width="4"/>
      </g>
      <circle cx="49" cy="45" r="3" fill="#fff3ca"/>
    </svg>
  `

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function getNisarOrbitPosition(angle: number) {
  const x =
    Math.cos(NISAR_ORBIT_NODE) * Math.cos(angle) -
    Math.sin(NISAR_ORBIT_NODE) * Math.sin(angle) * Math.cos(NISAR_ORBIT_INCLINATION)
  const y =
    Math.sin(NISAR_ORBIT_NODE) * Math.cos(angle) +
    Math.cos(NISAR_ORBIT_NODE) * Math.sin(angle) * Math.cos(NISAR_ORBIT_INCLINATION)
  const z = Math.sin(angle) * Math.sin(NISAR_ORBIT_INCLINATION)
  const longitude = Math.atan2(y, x)
  const latitude = Math.atan2(z, Math.hypot(x, y))

  return Cartesian3.fromRadians(longitude, latitude, NISAR_ORBIT_ALTITUDE_METERS)
}

function createNisarOrbitPath() {
  const positions = Array.from({ length: 241 }, (_, index) =>
    getNisarOrbitPosition((index / 240) * Math.PI * 2),
  )

  return positions
}

export function CesiumMap({
  events,
  startupComplete,
  introSoundEnabled,
  initialStep = 'wall',
}: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const coherenceReadoutRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const overlayLayersRef = useRef<OverlayLayers | null>(null)
  const finiteFaultDataSourceRef = useRef<GeoJsonDataSource | null>(null)
  const finiteFaultPlanDataSourceRef = useRef<GeoJsonDataSource | null>(null)
  const surfaceDisplacementPointsRef = useRef<PointPrimitiveCollection | null>(null)

  // Tour State
  const [tourStep, setTourStep] = useState<TourStepId>(initialStep)
  const [hasStartedTour, setHasStartedTour] = useState(initialStep !== 'wall')
  const [hasConfirmedDashboardShortcut, setHasConfirmedDashboardShortcut] = useState(false)
  const [radarLayer, setRadarLayer] = useState<RadarLayer>('fringes')
  const [comparisonBefore, setComparisonBefore] = useState<GcovLayer>('gcov_hh_before')
  const [comparisonAfter, setComparisonAfter] = useState<GcovLayer>('gcov_hh_after')
  const [comparisonPosition, setComparisonPosition] = useState(0.5)
  const [isGcovComparisonEnabled, setIsGcovComparisonEnabled] = useState(false)
  const [isLosGeometryComparisonEnabled, setIsLosGeometryComparisonEnabled] = useState(false)
  const [activeEpicenterIndex, setActiveEpicenterIndex] = useState(0)
  const [isAutoPanning, setIsAutoPanning] = useState(true)
  const [armGestureId, setArmGestureId] = useState(0)
  const [isEarthView, setIsEarthView] = useState(false)
  const [coherenceProbe, setCoherenceProbe] = useState<CoherenceProbe | null>(null)
  const [isStepperExpanded, setIsStepperExpanded] = useState(true)
  const [showFaultModel, setShowFaultModel] = useState(true)
  const [showSurfaceDeformation, setShowSurfaceDeformation] = useState(false)
  const [isFaultModel3D, setIsFaultModel3D] = useState(false)
  const [finiteFaultError, setFiniteFaultError] = useState<string | null>(null)
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [isProvisioningLeaving, setIsProvisioningLeaving] = useState(false)
  const [provisioningMessageIndex, setProvisioningMessageIndex] = useState(0)
  const [isNisarIntroAnimationReady, setIsNisarIntroAnimationReady] = useState(false)
  const [isVoiceIntroPlaying, setIsVoiceIntroPlaying] = useState(false)
  const [isVoiceIntroOpening, setIsVoiceIntroOpening] = useState(false)
  const [isVoiceIntroClosing, setIsVoiceIntroClosing] = useState(false)
  const [isVoiceIntroComplete, setIsVoiceIntroComplete] = useState(false)
  const [voiceSubtitleIndex, setVoiceSubtitleIndex] = useState(-1)
  const [userHasInteracted, setUserHasInteracted] = useState(false)
  const isVoiceIntroPlayingRef = useRef(false)
  const isMapActive =
    tourStep !== 'wall'
    && tourStep !== 'typing'
    && tourStep !== 'dashboard'
  const mainThemeAudioRef = useRef<HTMLAudioElement | null>(null)
  const epicentersAudioRef = useRef<HTMLAudioElement | null>(null)
  const voiceIntroAudioRef = useRef<HTMLAudioElement | null>(null)
  const isTourUiVisible = isMapActive
  const isCoherenceLayerActive =
    tourStep === 'radar_zoom'
    && radarLayer === 'coherence'
    && !isGcovComparisonEnabled
    && !isLosGeometryComparisonEnabled

  const startProvisioning = useCallback(() => {
    setProvisioningMessageIndex(0)
    setIsProvisioning(true)
  }, [])

  useEffect(() => {
    if (!isProvisioning) return
    const interval = window.setInterval(() => {
      setProvisioningMessageIndex((index) => (index + 1) % PROVISIONING_MESSAGES.length)
    }, 2400)
    return () => window.clearInterval(interval)
  }, [isProvisioning])

  useEffect(() => {
    if (userHasInteracted) return

    const handleUserInteraction = () => {
      setUserHasInteracted(true)
    }

    const events = ['click', 'touchstart', 'keydown', 'pointerdown']
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction)
      })
    }
  }, [userHasInteracted])

  useEffect(() => {
    const mainThemeAudio = new Audio('/sounds/main-theme.wav')
    const epicentersAudio = new Audio('/sounds/view-epicentres.mp3')
    const voiceIntroAudio = new Audio('/sounds/voice-intro.wav')
    
    mainThemeAudio.loop = true
    epicentersAudio.loop = true
    mainThemeAudio.volume = 0
    epicentersAudio.volume = 0
    voiceIntroAudio.volume = 0
    
    mainThemeAudio.addEventListener('canplay', () => console.log('main-theme audio ready'))
    epicentersAudio.addEventListener('canplay', () => console.log('epicentres audio ready'))
    voiceIntroAudio.addEventListener('canplay', () => console.log('voice-intro audio ready'))
    
    mainThemeAudioRef.current = mainThemeAudio
    epicentersAudioRef.current = epicentersAudio
    voiceIntroAudioRef.current = voiceIntroAudio

    return () => {
      for (const audio of [mainThemeAudio, epicentersAudio, voiceIntroAudio]) {
        cancelAudioFade(audio)
        audio.pause()
        audio.currentTime = 0
      }
      mainThemeAudioRef.current = null
      epicentersAudioRef.current = null
      voiceIntroAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (
      !startupComplete
      || tourStep !== 'nisar_intro'
      || isProvisioningLeaving
    ) return

    const audio = voiceIntroAudioRef.current
    if (!audio) return

    let cancelled = false
    const finishVoiceIntro = () => {
      if (!cancelled) {
        setIsVoiceIntroClosing(true)
      }
    }

    isVoiceIntroPlayingRef.current = true
    setIsVoiceIntroPlaying(true)
    setIsVoiceIntroOpening(true)
    setIsVoiceIntroClosing(false)
    setIsVoiceIntroComplete(false)
    const mainThemeAudio = mainThemeAudioRef.current
    if (mainThemeAudio) fadeAudio(mainThemeAudio, 0)
    audio.currentTime = 0
    audio.volume = 0
    audio.addEventListener('ended', finishVoiceIntro, { once: true })
    
    if (userHasInteracted) {
      void audio.play().then(() => {
        if (!cancelled) {
          fadeAudio(audio, VOICE_INTRO_VOLUME, undefined, VOICE_INTRO_FADE_DURATION)
        }
      }).catch((error: unknown) => {
        console.error('Failed to play voice intro:', error)
        finishVoiceIntro()
      })
    } else {
      console.log('Waiting for user interaction to play voice intro')
    }

    return () => {
      cancelled = true
      audio.removeEventListener('ended', finishVoiceIntro)
      cancelAudioFade(audio)
      audio.pause()
      audio.currentTime = 0
      isVoiceIntroPlayingRef.current = false
      setIsVoiceIntroPlaying(false)
      setIsVoiceIntroOpening(false)
      setIsVoiceIntroClosing(false)
      setIsVoiceIntroComplete(false)
    }
  }, [isProvisioningLeaving, startupComplete, tourStep, userHasInteracted])

  useEffect(() => {
    if (!isVoiceIntroPlaying) {
      setVoiceSubtitleIndex(-1)
      return
    }

    let frameId = 0
    let previousSubtitleIndex = -1
    const updateSubtitle = () => {
      const currentTime = voiceIntroAudioRef.current?.currentTime ?? 0
      const nextIndex = VOICE_INTRO_SUBTITLES.findIndex(
        ({ start, end }) => currentTime >= start && currentTime < end,
      )
      if (nextIndex !== previousSubtitleIndex) {
        previousSubtitleIndex = nextIndex
        setVoiceSubtitleIndex(nextIndex)
      }
      frameId = window.requestAnimationFrame(updateSubtitle)
    }

    frameId = window.requestAnimationFrame(updateSubtitle)
    return () => window.cancelAnimationFrame(frameId)
  }, [isVoiceIntroPlaying])

  const finishVoiceIntroTransition = useCallback(() => {
    isVoiceIntroPlayingRef.current = false
    setIsVoiceIntroPlaying(false)
    setIsVoiceIntroClosing(false)
    setIsVoiceIntroComplete(true)
    setIsNisarIntroAnimationReady(true)
  }, [])

  useEffect(() => {
    const mainThemeAudio = mainThemeAudioRef.current
    const epicentersAudio = epicentersAudioRef.current
    if (!mainThemeAudio || !epicentersAudio) return

    const transitionAudio = (
      audio: HTMLAudioElement,
      shouldPlay: boolean,
      resetWhenPaused = false,
    ) => {
      if (shouldPlay) {
        if (audio.paused) {
          audio.volume = 0
          if (userHasInteracted) {
            void audio.play().catch((error: unknown) => {
              console.error('Failed to play music:', error)
            })
          }
        }
        fadeAudio(audio, MUSIC_VOLUME)
        return
      }

      if (audio.paused && audio.volume === 0) return
      fadeAudio(audio, 0, () => {
        audio.pause()
        if (resetWhenPaused) audio.currentTime = 0
      })
    }

    const isEpicentersStep = tourStep === 'epicenters_3d'
    const shouldPlayMainTheme = isMapActive
      && !isEpicentersStep
      && (tourStep !== 'nisar_intro' || isVoiceIntroComplete)
      && !isVoiceIntroPlaying
      && !isVoiceIntroPlayingRef.current

    transitionAudio(mainThemeAudio, shouldPlayMainTheme)
    transitionAudio(epicentersAudio, isEpicentersStep, true)
  }, [isMapActive, isVoiceIntroPlaying, tourStep, userHasInteracted])

  // Motion refs to avoid re-renders during 60 FPS animation loops
  const radarLayerRef = useRef<RadarLayer>('fringes')
  const isGcovComparisonEnabledRef = useRef(false)
  const isLosGeometryComparisonEnabledRef = useRef(false)
  const fringeDemoStoppedRef = useRef(false)
  const isAutoPanningRef = useRef(true)
  const tourStepRef = useRef<TourStepId>('wall')
  const showFaultModelRef = useRef(showFaultModel)
  const showSurfaceDeformationRef = useRef(showSurfaceDeformation)
  const isFaultModel3DRef = useRef(isFaultModel3D)
  const isFlyingRef = useRef(false)
  const orbitTargetRef = useRef<Cartesian3 | null>(null)
  const orbitHeadingRef = useRef(0)
  const orbitPitchRef = useRef(CesiumMath.toRadians(-24))
  const lastOrbitFrameAtRef = useRef(0)
  const lastCameraInteractionAtRef = useRef(0)
  const nisarOrbitStartedAtRef = useRef(0)
  useEffect(() => {
    isAutoPanningRef.current = isAutoPanning
  }, [isAutoPanning])

  useEffect(() => {
    tourStepRef.current = tourStep
  }, [tourStep])

  useEffect(() => {
    showFaultModelRef.current = showFaultModel
    const showFaultLayers = tourStep === 'radar_zoom' && showFaultModel
    const dataSource = finiteFaultDataSourceRef.current
    const planDataSource = finiteFaultPlanDataSourceRef.current
    if (dataSource) dataSource.show = showFaultLayers && isFaultModel3D
    if (planDataSource) planDataSource.show = showFaultLayers && !isFaultModel3D
    const viewer = viewerRef.current
    if (viewer && !viewer.isDestroyed()) viewer.scene.requestRender()
  }, [showFaultModel, isFaultModel3D, tourStep])

  useEffect(() => {
    isFaultModel3DRef.current = isFaultModel3D
  }, [isFaultModel3D])

  useEffect(() => {
    showSurfaceDeformationRef.current = showSurfaceDeformation
    const points = surfaceDisplacementPointsRef.current
    if (points) points.show = tourStep === 'radar_zoom' && showSurfaceDeformation
    const viewer = viewerRef.current
    if (viewer && !viewer.isDestroyed()) viewer.scene.requestRender()
  }, [showSurfaceDeformation, tourStep])

  useEffect(() => {
    isGcovComparisonEnabledRef.current = isGcovComparisonEnabled
  }, [isGcovComparisonEnabled])

  useEffect(() => {
    isLosGeometryComparisonEnabledRef.current = isLosGeometryComparisonEnabled
  }, [isLosGeometryComparisonEnabled])

  const hideOverlayLayers = useCallback(() => {
    const layers = overlayLayersRef.current
    if (layers?.displacement) layers.displacement.alpha = 0
    if (layers?.eastWest) layers.eastWest.alpha = 0
    if (layers?.vertical) layers.vertical.alpha = 0
    if (layers?.losAscending) layers.losAscending.alpha = 0
    if (layers?.losDescending) layers.losDescending.alpha = 0
    if (layers?.gradientT162A) layers.gradientT162A.alpha = 0
    if (layers?.gradientT54D) layers.gradientT54D.alpha = 0
    if (layers?.fringes) layers.fringes.alpha = 0
    if (layers?.coherence) layers.coherence.alpha = 0
    if (layers?.gcovHHBefore) layers.gcovHHBefore.alpha = 0
    if (layers?.gcovHVBefore) layers.gcovHVBefore.alpha = 0
    if (layers?.gcovHHAfter) layers.gcovHHAfter.alpha = 0
    if (layers?.gcovHVAfter) layers.gcovHVAfter.alpha = 0
    if (layers?.mw72Marker) layers.mw72Marker.show = false
    if (layers?.faultNameLabel) layers.faultNameLabel.show = false
    if (layers?.crackArrow) layers.crackArrow.show = false
  }, [])

  const handleRadarLayerChange = (layer: RadarLayer) => {
    fringeDemoStoppedRef.current = true
    setIsGcovComparisonEnabled(false)
    setIsLosGeometryComparisonEnabled(false)
    radarLayerRef.current = layer
    setRadarLayer(layer)
  }

  const handleGcovComparisonChange = (enabled: boolean) => {
    fringeDemoStoppedRef.current = true
    setIsLosGeometryComparisonEnabled(false)
    setIsGcovComparisonEnabled(enabled)
    if (enabled) {
      radarLayerRef.current = comparisonBefore
      setRadarLayer(comparisonBefore)
    }
  }

  const handleLosGeometryComparisonChange = (enabled: boolean) => {
    fringeDemoStoppedRef.current = true
    setIsGcovComparisonEnabled(false)
    setIsLosGeometryComparisonEnabled(enabled)
    if (enabled) {
      radarLayerRef.current = 'los_ascending'
      setRadarLayer('los_ascending')
    }
  }

  const handleComparisonBeforeChange = (layer: GcovLayer) => {
    setComparisonBefore(layer)
    if (isGcovComparisonEnabled) {
      radarLayerRef.current = layer
      setRadarLayer(layer)
    }
  }

  useEffect(() => {
    const layers = overlayLayersRef.current
    if (!layers) return

    const showRadarLayers = tourStep === 'radar_zoom'
    const showComparison = showRadarLayers && isGcovComparisonEnabled
    const showLosGeometryComparison =
      showRadarLayers && isLosGeometryComparisonEnabled
    const comparisonBeforeKey =
      comparisonBefore === 'gcov_hh_before' ? 'gcovHHBefore' : 'gcovHVBefore'
    const comparisonAfterKey =
      comparisonAfter === 'gcov_hh_after' ? 'gcovHHAfter' : 'gcovHVAfter'
    const gcovLayerDirections = [
      ['gcovHHBefore', comparisonBeforeKey === 'gcovHHBefore' ? SplitDirection.LEFT : SplitDirection.NONE],
      ['gcovHVBefore', comparisonBeforeKey === 'gcovHVBefore' ? SplitDirection.LEFT : SplitDirection.NONE],
      ['gcovHHAfter', comparisonAfterKey === 'gcovHHAfter' ? SplitDirection.RIGHT : SplitDirection.NONE],
      ['gcovHVAfter', comparisonAfterKey === 'gcovHVAfter' ? SplitDirection.RIGHT : SplitDirection.NONE],
    ] as const
    gcovLayerDirections.forEach(([key, direction]) => {
      if (layers[key]) {
        layers[key]!.splitDirection = showComparison ? direction : SplitDirection.NONE
      }
    })
    if (layers.losAscending) {
      layers.losAscending.splitDirection = showLosGeometryComparison
        ? SplitDirection.LEFT
        : SplitDirection.NONE
    }
    if (layers.losDescending) {
      layers.losDescending.splitDirection = showLosGeometryComparison
        ? SplitDirection.RIGHT
        : SplitDirection.NONE
    }
    const targets = [
      {
        layer: layers.displacement,
        alpha: showRadarLayers
          && !showComparison
          && !showLosGeometryComparison
          && radarLayer === 'displacement'
          ? DISPLACEMENT_OPACITY
          : 0,
      },
      {
        layer: layers.eastWest,
        alpha: showRadarLayers && !showComparison && !showLosGeometryComparison
          && radarLayer === 'east_west' ? 1 : 0,
      },
      {
        layer: layers.vertical,
        alpha: showRadarLayers && !showComparison && !showLosGeometryComparison
          && radarLayer === 'vertical' ? 1 : 0,
      },
      {
        layer: layers.losAscending,
        alpha: showLosGeometryComparison
          || (showRadarLayers && !showComparison && radarLayer === 'los_ascending')
          ? 1
          : 0,
      },
      {
        layer: layers.losDescending,
        alpha: showLosGeometryComparison
          || (showRadarLayers && !showComparison && radarLayer === 'los_descending')
          ? 1
          : 0,
      },
      {
        layer: layers.gradientT162A,
        alpha: showRadarLayers && !showComparison && !showLosGeometryComparison
          && radarLayer === 'phase_gradient_t162a' ? 1 : 0,
      },
      {
        layer: layers.gradientT54D,
        alpha: showRadarLayers && !showComparison && !showLosGeometryComparison
          && radarLayer === 'phase_gradient_t54d' ? 1 : 0,
      },
      {
        layer: layers.fringes,
        alpha: showRadarLayers && !showComparison && !showLosGeometryComparison
          && radarLayer === 'fringes' ? 1 : 0,
      },
      {
        layer: layers.coherence,
        alpha: showRadarLayers && !showComparison && !showLosGeometryComparison
          && radarLayer === 'coherence' ? 1 : 0,
      },
      {
        layer: layers.gcovHHBefore,
        alpha: showComparison
          ? (comparisonBefore === 'gcov_hh_before' ? 1 : 0)
          : (!showComparison && !showLosGeometryComparison
            && radarLayer === 'gcov_hh_before' ? 1 : 0),
      },
      {
        layer: layers.gcovHVBefore,
        alpha: showComparison
          ? (comparisonBefore === 'gcov_hv_before' ? 1 : 0)
          : (!showComparison && !showLosGeometryComparison
            && radarLayer === 'gcov_hv_before' ? 1 : 0),
      },
      {
        layer: layers.gcovHHAfter,
        alpha: showComparison
          ? (comparisonAfter === 'gcov_hh_after' ? 1 : 0)
          : (!showComparison && !showLosGeometryComparison
            && radarLayer === 'gcov_hh_after' ? 1 : 0),
      },
      {
        layer: layers.gcovHVAfter,
        alpha: showComparison
          ? (comparisonAfter === 'gcov_hv_after' ? 1 : 0)
          : (!showComparison && !showLosGeometryComparison
            && radarLayer === 'gcov_hv_after' ? 1 : 0),
      },
    ].filter((target) => target.layer !== undefined)
    const showFaultOverlay =
      showRadarLayers
      && !showComparison
      && !showLosGeometryComparison
      && (radarLayer === 'phase_gradient_t162a' || radarLayer === 'phase_gradient_t54d')
    if (layers.mw72Marker) layers.mw72Marker.show = showFaultOverlay
    if (layers.faultNameLabel) layers.faultNameLabel.show = showFaultOverlay
    if (layers.crackArrow) layers.crackArrow.show = showFaultOverlay
    if (!targets.length) return

    let frameId = 0
    const fadeOutDuration = 140
    const fadeInDuration = 260
    const startedAt = performance.now()
    const initialAlphas = targets.map(({ layer }) => layer!.alpha)

    const animateTransition = (now: number) => {
      const elapsed = now - startedAt
      if (elapsed < fadeOutDuration) {
        const progress = elapsed / fadeOutDuration
        const eased = 1 - (1 - progress) ** 3
        targets.forEach(({ layer }, index) => {
          layer!.alpha = initialAlphas[index] * (1 - eased)
        })
      } else {
        const progress = Math.min((elapsed - fadeOutDuration) / fadeInDuration, 1)
        const eased = progress ** 2 * (3 - 2 * progress)
        targets.forEach(({ layer, alpha }) => {
          layer!.alpha = alpha * eased
        })
        if (progress === 1) return
      }

      frameId = window.requestAnimationFrame(animateTransition)
    }

    frameId = window.requestAnimationFrame(animateTransition)
    return () => window.cancelAnimationFrame(frameId)
  }, [
    comparisonAfter,
    comparisonBefore,
    isGcovComparisonEnabled,
    isLosGeometryComparisonEnabled,
    radarLayer,
    tourStep,
  ])

  useEffect(() => {
    const viewer = viewerRef.current
    if (viewer && !viewer.isDestroyed()) {
      viewer.scene.splitPosition = comparisonPosition
    }
  }, [comparisonPosition])

  useEffect(() => {
    if (tourStep !== 'radar_zoom' || isStepperExpanded) return

    let frameId = 0
    let lastUpdate = 0
    const startedAt = performance.now()
    const animateSlider = (now: number) => {
      if (fringeDemoStoppedRef.current) return

      if (now - lastUpdate >= 32) {
        const cycle = ((now - startedAt) % 6000) / 6000
        const nextLayer: RadarLayer = cycle < 1 / 3
          ? 'displacement'
          : cycle < 2 / 3
            ? 'fringes'
            : 'coherence'
        if (nextLayer !== radarLayerRef.current) {
          radarLayerRef.current = nextLayer
          setRadarLayer(nextLayer)
        }
        lastUpdate = now
      }

      frameId = window.requestAnimationFrame(animateSlider)
    }

    frameId = window.requestAnimationFrame(animateSlider)
    return () => window.cancelAnimationFrame(frameId)
  }, [tourStep, isStepperExpanded])

  // ----------------------------------------------------
  // Camera Choreography
  // ----------------------------------------------------
  const executeCameraMove = useCallback(
    (step: TourStepId, epIndex = 0) => {
      const viewer = viewerRef.current
      if (!viewer || viewer.isDestroyed()) return

      if (step === 'nisar_intro') {
        return
      }

      // Always unlock lookAt transform before flying
      viewer.camera.cancelFlight()
      viewer.camera.lookAtTransform(Matrix4.IDENTITY)
      orbitTargetRef.current = null
      isFlyingRef.current = true

      if (step === 'globe') {
        // Step 1: Global view from deep space
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(-68.0, 10.5, 23_000_000),
          orientation: {
            heading: 0,
            pitch: -CesiumMath.PI_OVER_TWO,
            roll: 0,
          },
          duration: 3.2,
          easingFunction: CAMERA_FLIGHT_EASING,
          complete: () => {
            isFlyingRef.current = false
          },
        })
      } else if (step === 'radar_zoom') {
        viewer.camera.flyTo({
          destination: Rectangle.fromDegrees(-70.5, 8.5, -64.5, 12.5),
          orientation: {
            heading: 0,
            pitch: -CesiumMath.PI_OVER_TWO,
            roll: 0,
          },
          duration: 3.6,
          easingFunction: CAMERA_FLIGHT_EASING,
          complete: () => {
            isFlyingRef.current = false
          },
        })
      } else if (step === 'epicenters_3d') {
        // Step 3: Close-up 3D view of epicenter
        const ev = events[epIndex] || events[0]
        if (!ev) return

        const target = Cartesian3.fromDegrees(ev.longitude, ev.latitude, 0)
        const initialHeading = CesiumMath.toRadians(0)
        const initialPitch = CesiumMath.toRadians(-24)

        viewer.camera.flyToBoundingSphere(
          new BoundingSphere(target, 0),
          {
            offset: new HeadingPitchRange(
              initialHeading,
              initialPitch,
              CAMERA_ORBIT_DISTANCE,
            ),
            duration: EPICENTER_FLIGHT_DURATION,
            easingFunction: CAMERA_FLIGHT_EASING,
            complete: () => {
              isFlyingRef.current = false
              orbitHeadingRef.current = initialHeading
              orbitPitchRef.current = initialPitch
              orbitTargetRef.current = target
              lastOrbitFrameAtRef.current = 0
              lastCameraInteractionAtRef.current = 0
              setIsAutoPanning(true)
              isAutoPanningRef.current = true
            },
          },
        )
      }
    },
    [events],
  )

  const focusRuptureCorridor = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    viewer.camera.cancelFlight()
    viewer.camera.lookAtTransform(Matrix4.IDENTITY)
    isFlyingRef.current = true
    viewer.camera.flyTo({
      destination: Rectangle.fromDegrees(-68.57, 10.44, -68.20, 10.56),
      orientation: {
        heading: 0,
        pitch: -CesiumMath.PI_OVER_TWO,
        roll: 0,
      },
      duration: 2.4,
      easingFunction: CAMERA_FLIGHT_EASING,
      complete: () => {
        isFlyingRef.current = false
      },
      cancel: () => {
        isFlyingRef.current = false
      },
    })
  }, [])

  const focusRadarOverview = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    viewer.camera.cancelFlight()
    viewer.camera.lookAtTransform(Matrix4.IDENTITY)
    isFlyingRef.current = true
    viewer.camera.flyTo({
      destination: Rectangle.fromDegrees(-70.5, 8.5, -64.5, 12.5),
      orientation: {
        heading: 0,
        pitch: -CesiumMath.PI_OVER_TWO,
        roll: 0,
      },
      duration: 2.4,
      easingFunction: CAMERA_FLIGHT_EASING,
      complete: () => {
        isFlyingRef.current = false
      },
      cancel: () => {
        isFlyingRef.current = false
      },
    })
  }, [])

  const configureCameraControls = useCallback((step: TourStepId) => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    const controller = viewer.scene.screenSpaceCameraController
    const isFixedLookStep = step === 'epicenters_3d'
    controller.enableInputs = true
    controller.enableRotate = !isFixedLookStep
    controller.enableZoom = !isFixedLookStep
    controller.enableTranslate = !isFixedLookStep
    controller.enableTilt = !isFixedLookStep
    controller.enableLook = !isFixedLookStep
    controller.rotateEventTypes = isFixedLookStep ? [] : CameraEventType.LEFT_DRAG
    controller.zoomEventTypes = isFixedLookStep
      ? []
      : [CameraEventType.RIGHT_DRAG, CameraEventType.WHEEL, CameraEventType.PINCH]
    controller.translateEventTypes = isFixedLookStep
      ? []
      : CameraEventType.LEFT_DRAG
    controller.tiltEventTypes = isFixedLookStep
      ? []
      : [
          CameraEventType.MIDDLE_DRAG,
          CameraEventType.PINCH,
          {
            eventType: CameraEventType.LEFT_DRAG,
            modifier: KeyboardEventModifier.CTRL,
          },
          {
            eventType: CameraEventType.RIGHT_DRAG,
            modifier: KeyboardEventModifier.CTRL,
          },
        ]
    controller.lookEventTypes = isFixedLookStep
      ? []
      : [{
          eventType: CameraEventType.LEFT_DRAG,
          modifier: KeyboardEventModifier.SHIFT,
        }]
  }, [])

  const goToStep = useCallback(
    (newStep: TourStepId) => {
      if (newStep === 'epicenters_3d') {
        fringeDemoStoppedRef.current = true
        hideOverlayLayers()
      } else if (newStep === 'radar_zoom') {
        fringeDemoStoppedRef.current = true
        setIsGcovComparisonEnabled(false)
        setIsLosGeometryComparisonEnabled(false)
        setIsFaultModel3D(false)
        setShowFaultModel(true)
        setShowSurfaceDeformation(false)
        radarLayerRef.current = 'fringes'
        setRadarLayer('fringes')
      }
      lastCameraInteractionAtRef.current = 0
      setTourStep(newStep)
      // Dashboard is a full-screen overlay — no camera move needed
      if (newStep === 'dashboard') return
      configureCameraControls(newStep)
      setIsStepperExpanded(true)
      executeCameraMove(newStep, activeEpicenterIndex)
    },
    [
      executeCameraMove,
      activeEpicenterIndex,
      configureCameraControls,
      hideOverlayLayers,
    ],
  )

  const handleOpenDashboard = useCallback(() => {
    if (
      tourStep === 'wall'
      && !hasStartedTour
      && !hasConfirmedDashboardShortcut
    ) {
      const confirmed = window.confirm(
        translate('¿Seguro que quieres ir directamente al dashboard y saltarte la experiencia interactiva?'),
      )
      if (!confirmed) return
      setHasConfirmedDashboardShortcut(true)
    }

    goToStep('dashboard')
  }, [
    goToStep,
    hasConfirmedDashboardShortcut,
    hasStartedTour,
    tourStep,
  ])

  const handleNext = () => {
    const list: TourStepId[] = [
      'nisar_intro',
      'globe',
      'radar_zoom',
      'epicenters_3d',
      'dashboard',
    ]
    const currentIndex = list.indexOf(tourStep)
    if (currentIndex >= 0 && currentIndex < list.length - 1) {
      goToStep(list[currentIndex + 1])
    }
  }

  const handlePrev = () => {
    const list: TourStepId[] = [
      'nisar_intro',
      'globe',
      'radar_zoom',
      'epicenters_3d',
      'dashboard',
    ]
    const currentIndex = list.indexOf(tourStep)
    if (currentIndex > 0) {
      goToStep(list[currentIndex - 1])
    }
  }

  const handleRestart = () => {
    const viewer = viewerRef.current
    if (viewer && !viewer.isDestroyed()) {
      viewer.camera.lookAtTransform(Matrix4.IDENTITY)
    }
    orbitTargetRef.current = null
    isFlyingRef.current = false
    setIsStepperExpanded(true)
    setIsNisarIntroAnimationReady(false)
    setTourStep('wall')
  }

  const handleSelectEpicenter = (idx: number) => {
    setActiveEpicenterIndex(idx)
    configureCameraControls('epicenters_3d')
    executeCameraMove('epicenters_3d', idx)
  }

  const handleToggleFaultView = () => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    setShowFaultModel(true)
    viewer.camera.cancelFlight()
    viewer.camera.lookAtTransform(Matrix4.IDENTITY)
    orbitTargetRef.current = null
    isFlyingRef.current = true
    if (isFaultModel3D) {
      setIsFaultModel3D(false)
      viewer.camera.flyTo({
        destination: Rectangle.fromDegrees(-70.5, 8.5, -64.5, 12.5),
        orientation: {
          heading: 0,
          pitch: -CesiumMath.PI_OVER_TWO,
          roll: 0,
        },
        duration: EPICENTER_FLIGHT_DURATION,
        easingFunction: CAMERA_FLIGHT_EASING,
        complete: () => {
          isFlyingRef.current = false
        },
      })
      return
    }

    setIsFaultModel3D(true)
    viewer.camera.flyToBoundingSphere(
      new BoundingSphere(Cartesian3.fromDegrees(-67.57, 10.5, 0), 0),
      {
        offset: new HeadingPitchRange(
          CesiumMath.toRadians(18),
          CesiumMath.toRadians(-38),
          320_000,
        ),
        duration: EPICENTER_FLIGHT_DURATION,
        easingFunction: CAMERA_FLIGHT_EASING,
        complete: () => {
          isFlyingRef.current = false
        },
      },
    )
  }

  const handleToggleAutoPan = () => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    if (isAutoPanning) {
      viewer.camera.lookAtTransform(Matrix4.IDENTITY)
      setIsAutoPanning(false)
      isAutoPanningRef.current = false
    } else {
      // Resume: re-anchor to current epicenter target
      const ev = events[activeEpicenterIndex] || events[0]
      if (ev) {
        const target = Cartesian3.fromDegrees(ev.longitude, ev.latitude, 0)
        const offset = getCameraOrbitOffset(viewer.camera.positionWC, target)
        orbitTargetRef.current = target
        orbitHeadingRef.current = offset.heading
        orbitPitchRef.current = offset.pitch
        lastCameraInteractionAtRef.current = 0
        setIsAutoPanning(true)
        isAutoPanningRef.current = true
      }
    }
  }

  const activeVoiceSubtitle = VOICE_INTRO_SUBTITLES[voiceSubtitleIndex]?.text

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    viewer.useDefaultRenderLoop = tourStep !== 'dashboard'
    if (tourStep !== 'dashboard') viewer.scene.requestRender()
  }, [tourStep])

  // ----------------------------------------------------
  // Cesium Viewer Lifecycle
  // ----------------------------------------------------
  useEffect(() => {
    if (!isMapActive) return

    const container = containerRef.current
    if (!container) return

    const token = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim()
    nisarOrbitStartedAtRef.current = performance.now()
    if (token) {
      Ion.defaultAccessToken = token
    } else {
      console.error('Cesium ion token is missing. Set VITE_CESIUM_ION_TOKEN in .env.')
    }

    let viewer: Viewer
    try {
      viewer = new Viewer(container, {
        animation: false,
        baseLayer: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: true,
        navigationHelpButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        scene3DOnly: true,
        requestRenderMode: false,
        msaaSamples: 2,
        terrainProvider: new EllipsoidTerrainProvider(),
      })
    } catch (error) {
      console.error('Unable to initialize the Cesium viewer.', error)
      setIsProvisioning(false)
      return
    }
    viewerRef.current = viewer
    viewer.scene.splitPosition = comparisonPosition
    viewer.resolutionScale = 0.85
    let disposed = false
    const removeFiniteFaultLayers = () => {
      const dataSource = finiteFaultDataSourceRef.current
      const planDataSource = finiteFaultPlanDataSourceRef.current
      const points = surfaceDisplacementPointsRef.current
      if (dataSource) void viewer.dataSources.remove(dataSource, true)
      if (planDataSource) void viewer.dataSources.remove(planDataSource, true)
      if (points) viewer.scene.primitives.remove(points)
      finiteFaultDataSourceRef.current = null
      finiteFaultPlanDataSourceRef.current = null
      surfaceDisplacementPointsRef.current = null
    }
    let imagerySettled = false
    let removeProvisioningCheck = () => {}
    let provisioningTimeout = 0
    let provisioningFinished = false
    let readyRenderFrames = 0

    const finishProvisioning = () => {
      if (!isProvisioning || provisioningFinished || disposed) return
      provisioningFinished = true
      window.clearTimeout(provisioningTimeout)
      removeProvisioningCheck()
      setIsProvisioningLeaving(true)
      provisioningTimeout = window.setTimeout(() => {
        setIsProvisioning(false)
        setIsProvisioningLeaving(false)
      }, 700)
    }

    if (isProvisioning) {
      removeProvisioningCheck = viewer.scene.postRender.addEventListener(() => {
        if (imagerySettled && viewer.scene.globe.tilesLoaded && !isFlyingRef.current) {
          readyRenderFrames += 1
          if (readyRenderFrames >= 2) finishProvisioning()
        } else {
          readyRenderFrames = 0
        }
      })
      provisioningTimeout = window.setTimeout(
        finishProvisioning,
        PROVISIONING_TIMEOUT,
      )
    }

    viewer.scene.globe.enableLighting = true
    viewer.scene.globe.baseColor = Color.fromCssColorString('#12242d')
    viewer.scene.backgroundColor = Color.fromCssColorString('#040609')
    viewer.scene.globe.depthTestAgainstTerrain = true
    viewer.scene.globe.maximumScreenSpaceError = 3
    viewer.scene.globe.loadingDescendantLimit = 10

    // Optimize tile caching for better performance
    optimizeCesiumTileCache(viewer, 512)
    
    // Clear expired tiles from cache asynchronously
    void clearExpiredTiles()
    
    // Pre-warm tile cache for Venezuela region (10°N, -66°W)
    void prewarmTileCache(viewer, -66, 10)

    const cameraController = viewer.scene.screenSpaceCameraController
    cameraController.enableCollisionDetection = true
    cameraController.minimumZoomDistance = MINIMUM_CAMERA_HEIGHT
    cameraController.maximumZoomDistance = 32_000_000
    cameraController.maximumTiltAngle = MAXIMUM_CAMERA_TILT
    configureCameraControls('globe')

    let activeOrbitPointerId: number | null = null
    let previousPointerX = 0
    let previousPointerY = 0
    const startCameraOrbit = (event: PointerEvent) => {
      if (
        tourStepRef.current !== 'epicenters_3d' ||
        !event.isPrimary ||
        event.button !== 0 ||
        !orbitTargetRef.current
      ) {
        return
      }

      activeOrbitPointerId = event.pointerId
      previousPointerX = event.clientX
      previousPointerY = event.clientY
      lastCameraInteractionAtRef.current = performance.now()
      event.preventDefault()
    }
    const moveCameraOrbit = (event: PointerEvent) => {
      if (activeOrbitPointerId !== event.pointerId) return

      const target = orbitTargetRef.current
      if (!target) return

      const deltaX = event.clientX - previousPointerX
      const deltaY = event.clientY - previousPointerY
      previousPointerX = event.clientX
      previousPointerY = event.clientY
      lastCameraInteractionAtRef.current = performance.now()

      const range = Cartesian3.distance(viewer.camera.positionWC, target)
      orbitHeadingRef.current -= deltaX * CAMERA_DRAG_SENSITIVITY
      orbitPitchRef.current = CesiumMath.clamp(
        orbitPitchRef.current + deltaY * CAMERA_DRAG_SENSITIVITY,
        MIN_CAMERA_ORBIT_PITCH,
        MAX_CAMERA_ORBIT_PITCH,
      )
      viewer.camera.lookAt(
        target,
        new HeadingPitchRange(
          orbitHeadingRef.current,
          orbitPitchRef.current,
          Math.max(MINIMUM_CAMERA_HEIGHT, range),
        ),
      )
      lastOrbitFrameAtRef.current = 0
      event.preventDefault()
    }
    const endCameraOrbit = (event: PointerEvent) => {
      if (activeOrbitPointerId !== event.pointerId) return
      activeOrbitPointerId = null
      lastCameraInteractionAtRef.current = performance.now()
      event.preventDefault()
    }
    const canvasElement = viewer.canvas
    canvasElement.addEventListener('pointerdown', startCameraOrbit)
    canvasElement.addEventListener('pointermove', moveCameraOrbit)
    canvasElement.addEventListener('pointerup', endCameraOrbit)
    canvasElement.addEventListener('pointercancel', endCameraOrbit)

    // Add earthquake markers: perfectly anchored at geodetic center
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const epicenterAnimationsStartedAt = performance.now()
    events.forEach((event) => {
      const position = Cartesian3.fromDegrees(event.longitude, event.latitude, 0)
      viewer.entities.add({
        id: event.id,
        name: translate(event.place),
        position,
        billboard: {
          image: createPulseMarker(),
          width: 46,
          height: 46,
          verticalOrigin: VerticalOrigin.CENTER,
          horizontalOrigin: HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          scaleByDistance: new NearFarScalar(1.0e5, 1.0, 2.5e7, 0.48),
          scale: new CallbackProperty(() => {
            const step = tourStepRef.current
            if (step !== 'globe' && step !== 'epicenters_3d') return 1
            const isGlobalView = step === 'globe'
            const amplitude = reducedMotion ? 0.12 : isGlobalView ? 0.34 : 0.6
            const cycleDuration = reducedMotion ? 420 : isGlobalView ? 280 : 180
            return 1.2 + Math.sin((performance.now() - epicenterAnimationsStartedAt) / cycleDuration) * amplitude
          }, false),
        },
        label: {
          text: `${translate(event.place)} · M${event.magnitude.toFixed(1)}`,
          font: 'bold 11px Inter, sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.fromCssColorString('#040609'),
          outlineWidth: 3,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.TOP,
          horizontalOrigin: HorizontalOrigin.CENTER,
          pixelOffset: new Cartesian2(0, 16),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          distanceDisplayCondition: new DistanceDisplayCondition(0, 2_500_000),
          scaleByDistance: new NearFarScalar(4.0e4, 1.0, 2.5e6, 0.8),
        },
      })

      for (let waveIndex = 0; waveIndex < 3; waveIndex += 1) {
        const getWaveProgress = () => {
          const elapsedSeconds = (performance.now() - epicenterAnimationsStartedAt) / 1000
          const isGlobalView = tourStepRef.current === 'globe'
          const cycleDuration = reducedMotion
            ? 4.4
            : isGlobalView
              ? 3.2
              : 2.2
          return ((elapsedSeconds / cycleDuration + waveIndex / 3) % 1 + 1) % 1
        }
        const getWaveRadius = () => {
          const isGlobalView = tourStepRef.current === 'globe'
          const progress = getWaveProgress()
          return isGlobalView
            ? 35_000 + progress * 440_000
            : 2_500 + progress * 32_000
        }

        viewer.entities.add({
          position,
          ellipse: {
            show: new CallbackProperty(
              () => {
                const step = tourStepRef.current
                return step === 'globe' || step === 'epicenters_3d'
              },
              false,
            ),
            semiMajorAxis: new CallbackProperty(
              getWaveRadius,
              false,
            ),
            semiMinorAxis: new CallbackProperty(
              () => getWaveRadius() * 0.94,
              false,
            ),
            height: 0,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            material: new ColorMaterialProperty(
              new CallbackProperty(() => {
                const opacity = (reducedMotion ? 0.32 : 0.8) * (1 - getWaveProgress())
                return Color.fromCssColorString('#ff3b47').withAlpha(opacity)
              }, false),
            ),
            outline: true,
            outlineColor: new CallbackProperty(() => {
              const opacity = (reducedMotion ? 0.85 : 0.9) * (1 - getWaveProgress())
              return Color.fromCssColorString('#ff5964').withAlpha(opacity)
            }, false),
            outlineWidth: 4,
          },
        })
      }
    })

    const loadFiniteFaultLayers = async () => {
      try {
        const [faultResponse, displacementResponse] = await Promise.all([
          fetch(FINITE_FAULT_GEOJSON_URL),
          fetch(SURFACE_DEFORMATION_URL),
        ])
        if (!faultResponse.ok) {
          throw new Error(`GeoJSON HTTP ${faultResponse.status}`)
        }
        if (!displacementResponse.ok) {
          throw new Error(`DISP HTTP ${displacementResponse.status}`)
        }

        const [faultJson, displacementText] = await Promise.all([
          faultResponse.json(),
          displacementResponse.text(),
        ])
        const faultCollection = parseFiniteFaultCollection(faultJson)
        const displacementSamples = parseSurfaceDisplacement(displacementText)
        const [dataSource, planDataSource] = await Promise.all([
          GeoJsonDataSource.load(faultCollection, { clampToGround: false }),
          GeoJsonDataSource.load(projectFiniteFaultToSurface(faultCollection), {
            clampToGround: true,
          }),
        ])
        if (disposed || viewer.isDestroyed()) return

        const styleFaultEntities = (source: GeoJsonDataSource) => {
          source.entities.values.forEach((entity, index) => {
            const properties = entity.properties?.getValue(JulianDate.now())
            const slip = typeof properties?.slip === 'number' ? properties.slip : 0
            const fill = typeof properties?.fill === 'string' ? properties.fill : '#f8fafc'
            entity.name = `Subfalla ${index + 1} · ${slip.toFixed(3)} m`
            if (properties) entity.description = new ConstantProperty(finiteFaultDescription(properties))
            if (!entity.polygon) return
            entity.polygon.material = new ColorMaterialProperty(
              Color.fromCssColorString(fill).withAlpha(0.56),
            )
            entity.polygon.outline = new ConstantProperty(true)
            entity.polygon.outlineColor = new ConstantProperty(Color.WHITE.withAlpha(0.78))
          })
        }
        styleFaultEntities(dataSource)
        styleFaultEntities(planDataSource)
        const showFaultLayers = tourStepRef.current === 'radar_zoom' && showFaultModelRef.current
        dataSource.show = showFaultLayers && isFaultModel3DRef.current
        planDataSource.show = showFaultLayers && !isFaultModel3DRef.current
        finiteFaultDataSourceRef.current = dataSource
        finiteFaultPlanDataSourceRef.current = planDataSource
        await Promise.all([
          viewer.dataSources.add(dataSource),
          viewer.dataSources.add(planDataSource),
        ])

        const points = viewer.scene.primitives.add(new PointPrimitiveCollection())
        points.show =
          tourStepRef.current === 'radar_zoom' && showSurfaceDeformationRef.current
        displacementSamples.forEach((sample) => {
          points.add({
            position: Cartesian3.fromDegrees(sample.longitude, sample.latitude),
            pixelSize: 5 + Math.min(Math.abs(sample.verticalMeters * 1000) / 745 * 5, 5),
            color: Color.fromCssColorString(
              surfaceDisplacementColor(sample.verticalMeters),
            ).withAlpha(0.78),
            outlineColor: Color.WHITE.withAlpha(0.55),
            outlineWidth: 0.6,
            disableDepthTestDistance: 1_000_000,
          })
        })
        surfaceDisplacementPointsRef.current = points
        setFiniteFaultError(null)
        viewer.scene.requestRender()
      } catch (error) {
        if (disposed) return
        console.error('Unable to load the finite-fault visualization data.', error)
        setFiniteFaultError(translate('No se pudieron cargar las capas del modelo de falla finita.'))
      }
    }

    void loadFiniteFaultLayers()

    const nisarOrbit = viewer.entities.add({
      id: 'nisar-orbit',
      name: translate('Órbita ilustrativa de NISAR · 747 km · 98,4°'),
      show: false,
      polyline: {
        positions: createNisarOrbitPath(),
        width: 2,
        material: Color.fromCssColorString('#e2bd69').withAlpha(0.78),
        arcType: ArcType.NONE,
      },
    })
    const nisarSatellite = viewer.entities.add({
      id: 'nisar-satellite',
      name: 'NISAR',
      show: false,
      position: new CallbackPositionProperty(() => {
        const elapsedSeconds =
          (performance.now() - nisarOrbitStartedAtRef.current) / 1000
        const angle = (elapsedSeconds / NISAR_ORBIT_PERIOD_SECONDS) * CesiumMath.TWO_PI
        return getNisarOrbitPosition(angle)
      }, false),
      billboard: {
        image: createNisarOrbitMarker(),
        width: 48,
        height: 48,
        verticalOrigin: VerticalOrigin.CENTER,
        horizontalOrigin: HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new NearFarScalar(1.0e6, 1.15, 3.2e7, 0.8),
      },
      label: {
        text: 'NISAR',
        font: 'bold 13px Inter, sans-serif',
        fillColor: Color.WHITE,
        outlineColor: Color.fromCssColorString('#07111b'),
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        horizontalOrigin: HorizontalOrigin.CENTER,
        pixelOffset: new Cartesian2(0, -24),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new NearFarScalar(1.0e6, 1.0, 3.2e7, 0.8),
      },
    })

    // Initial camera view
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(-68.0, 10.5, 23_000_000),
      orientation: {
        heading: 0,
        pitch: -CesiumMath.PI_OVER_TWO,
        roll: 0,
      },
    })

    const explanationLabels = displacementZones.map((zone) =>
      viewer.entities.add({
        show: false,
        position: Cartesian3.fromDegrees(zone.longitude, zone.latitude),
        label: {
          text: translate('{{zone}}\nEscala saturada en ±40 cm LOS', {
            zone: zone.label,
          }),
          font: '600 13px sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 3,
          style: LabelStyle.FILL_AND_OUTLINE,
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#111a20').withAlpha(0.82),
          backgroundPadding: new Cartesian2(10, 7),
          pixelOffset: new Cartesian2(0, -18),
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      }),
    )

    const radarLayerLabels = radarLayerAnnotations.map((annotation) =>
      viewer.entities.add({
        show: false,
        position: Cartesian3.fromDegrees(annotation.longitude, annotation.latitude),
        label: {
          text: annotation.text,
          font: '600 13px sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 3,
          style: LabelStyle.FILL_AND_OUTLINE,
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#111a20').withAlpha(0.82),
          backgroundPadding: new Cartesian2(10, 7),
          pixelOffset: new Cartesian2(0, -18),
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      }),
    )

    const mw72Marker = viewer.entities.add({
      show: false,
      position: Cartesian3.fromDegrees(...faultOverlay.epicenterMw72),
      billboard: {
        image: createEpicenterStar(),
        width: 30,
        height: 30,
        verticalOrigin: VerticalOrigin.CENTER,
        horizontalOrigin: HorizontalOrigin.CENTER,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: 'Mw 7.2',
        font: 'bold 14px sans-serif',
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        showBackground: true,
        backgroundColor: Color.fromCssColorString('#111a20').withAlpha(0.82),
        backgroundPadding: new Cartesian2(8, 5),
        pixelOffset: new Cartesian2(0, -22),
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })

    const faultNameLabel = viewer.entities.add({
      show: false,
      position: Cartesian3.fromDegrees(-68.385, 10.565),
      label: {
        text: translate('Falla de Boconó'),
        font: '500 16px sans-serif',
        fillColor: Color.BLACK,
        showBackground: true,
        backgroundColor: Color.WHITE.withAlpha(0.94),
        backgroundPadding: new Cartesian2(5, 3),
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })

    const crackArrow = viewer.entities.add({
      show: false,
      polyline: {
        positions: Cartesian3.fromDegreesArray([
          -68.3925, 10.4467,
          -68.3661, 10.4885,
        ]),
        width: 7,
        material: new PolylineArrowMaterialProperty(Color.YELLOW),
        clampToGround: true,
      },
    })

    const seaCoherenceLabel = viewer.entities.add({
      show: false,
      position: Cartesian3.fromDegrees(-67.65, 11.55),
      label: {
        text: translate('Mar Caribe\nBaja coherencia: señal poco fiable'),
        font: '600 13px sans-serif',
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        showBackground: true,
        backgroundColor: Color.fromCssColorString('#111a20').withAlpha(0.82),
        backgroundPadding: new Cartesian2(10, 7),
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    })

    const updateAnnotationVisibility = () => {
      const height = viewer.camera.positionCartographic.height
      const isRadarLayerView = tourStepRef.current === 'radar_zoom'
      explanationLabels.forEach((label) => {
        label.show =
          isRadarLayerView
          && !isGcovComparisonEnabledRef.current
          && !isLosGeometryComparisonEnabledRef.current
          && radarLayerRef.current === 'displacement'
          && height <= EXPLANATION_REVEAL_HEIGHT
      })
      radarLayerLabels.forEach((label, index) => {
        label.show =
          isRadarLayerView
          && !isGcovComparisonEnabledRef.current
          && !isLosGeometryComparisonEnabledRef.current
          && radarLayerRef.current === radarLayerAnnotations[index].layer
          && height <= EXPLANATION_REVEAL_HEIGHT
      })
      seaCoherenceLabel.show =
        isRadarLayerView
        && !isGcovComparisonEnabledRef.current
        && !isLosGeometryComparisonEnabledRef.current
        && (radarLayerRef.current === 'fringes' || radarLayerRef.current === 'coherence')
        && height <= EXPLANATION_REVEAL_HEIGHT
    }

    const removeAnnotationCheck =
      viewer.scene.preRender.addEventListener(updateAnnotationVisibility)

    let isEarthView = false
    const updateSuitForZoom = () => {
      const height = viewer.camera.positionCartographic.height
      const nextIsEarthView = isEarthView
        ? height < ARROW_REVEAL_HEIGHT + SUIT_CHANGE_HYSTERESIS
        : height <= ARROW_REVEAL_HEIGHT
      if (nextIsEarthView === isEarthView) return

      isEarthView = nextIsEarthView
      setIsEarthView(nextIsEarthView)
    }
    const removeSuitCheck = viewer.scene.preRender.addEventListener(updateSuitForZoom)

    // PreRender Loop: smooth rotation without fighting flyTo
    const removePreRenderTick = viewer.scene.preRender.addEventListener(() => {
      const current = tourStepRef.current
      const showNisarOrbit = current === 'globe'
      nisarOrbit.show = showNisarOrbit
      nisarSatellite.show = showNisarOrbit
      if (isFlyingRef.current) return

      // Step 1: Slow planetary spin in deep space
      if (current === 'globe') {
        viewer.scene.camera.rotate(Cartesian3.UNIT_Z, 0.0004)
      }

      // Step 3: Buttery smooth local orbit around the epicenter
      if (current === 'epicenters_3d' && isAutoPanningRef.current && orbitTargetRef.current) {
        if (
          performance.now() - lastCameraInteractionAtRef.current <
          CAMERA_IDLE_RESUME_DELAY
        ) {
          lastOrbitFrameAtRef.current = 0
          return
        }

        const now = performance.now()
        const deltaSeconds =
          lastOrbitFrameAtRef.current === 0
            ? 0
            : Math.min((now - lastOrbitFrameAtRef.current) / 1000, 0.05)
        lastOrbitFrameAtRef.current = now
        orbitHeadingRef.current += CAMERA_ORBIT_SPEED * deltaSeconds
        const orbitDistance = Cartesian3.distance(
          viewer.camera.positionWC,
          orbitTargetRef.current,
        )
        viewer.camera.lookAt(
          orbitTargetRef.current,
          new HeadingPitchRange(
            orbitHeadingRef.current,
            orbitPitchRef.current,
            Math.max(MINIMUM_CAMERA_HEIGHT, orbitDistance),
          ),
        )
        orbitHeadingRef.current = viewer.camera.heading
      }
    })

    if (token) {
      let terrainRequested = false
      let terrainLoaded = false
      let terrainFailed = false
      let exaggerationActive = false

      const requestTerrain = () => {
        if (terrainRequested || terrainFailed) return

        terrainRequested = true
        createWorldTerrainAsync()
          .then((terrainProvider) => {
            if (disposed || viewer.isDestroyed()) return
            viewer.terrainProvider = terrainProvider
            terrainLoaded = true
            viewer.scene.verticalExaggeration = exaggerationActive
              ? TERRAIN_EXAGGERATION
              : 1
          })
          .catch((error: unknown) => {
            terrainFailed = true
            console.error('Unable to load Cesium World Terrain.', error)
          })
      }

      const updateTerrainForZoom = () => {
        const height = viewer.camera.positionCartographic.height

        const nextExaggerationActive =
          height <= EXAGGERATION_ON_HEIGHT
            ? true
            : height >= EXAGGERATION_OFF_HEIGHT
              ? false
              : exaggerationActive

        if (nextExaggerationActive !== exaggerationActive) {
          exaggerationActive = nextExaggerationActive
          if (terrainLoaded) {
            viewer.scene.verticalExaggeration = exaggerationActive
              ? TERRAIN_EXAGGERATION
              : 1
          }
        }
      }

      const removeFrameCheck = viewer.scene.preRender.addEventListener(updateTerrainForZoom)
      requestTerrain()

      const overlayLayers: OverlayLayers = {}
      const rectangleFor = (bounds: { west: number; south: number; east: number; north: number }) =>
        Rectangle.fromDegrees(bounds.west, bounds.south, bounds.east, bounds.north)
      const loadImage = (image: string, bounds: { west: number; south: number; east: number; north: number }) =>
        SingleTileImageryProvider.fromUrl(image, { rectangle: rectangleFor(bounds) })
      const initialLayers = Promise.allSettled([
        createWorldImageryAsync(),
        loadImage(displacementOverlay.image, displacementOverlay.bounds),
        loadImage(fringeOverlay.image, fringeOverlay.bounds),
        loadImage(coherenceOverlay.image, coherenceOverlay.bounds),
      ]).then(([imageryResult, displacementResult, fringesResult, coherenceResult]) => {
        if (disposed || viewer.isDestroyed()) return
        if (imageryResult.status === 'fulfilled') {
          viewer.imageryLayers.addImageryProvider(imageryResult.value)
        } else {
          console.error('Unable to load Cesium base imagery.', imageryResult.reason)
        }
        if (displacementResult.status === 'fulfilled') {
          const layer = viewer.imageryLayers.addImageryProvider(displacementResult.value)
          layer.alpha = radarLayerRef.current === 'displacement' ? DISPLACEMENT_OPACITY : 0
          overlayLayers.displacement = layer
        } else {
          console.error('Unable to load the displacement overlay.', displacementResult.reason)
        }
        if (fringesResult.status === 'fulfilled') {
          const layer = viewer.imageryLayers.addImageryProvider(fringesResult.value)
          layer.alpha = radarLayerRef.current === 'fringes' ? 1 : 0
          overlayLayers.fringes = layer
        } else {
          console.error('Unable to load the wrapped-phase overlay.', fringesResult.reason)
        }
        if (coherenceResult.status === 'fulfilled') {
          const layer = viewer.imageryLayers.addImageryProvider(coherenceResult.value)
          layer.alpha = radarLayerRef.current === 'coherence' ? 1 : 0
          overlayLayers.coherence = layer
        } else {
          console.error('Unable to load the coherence overlay.', coherenceResult.reason)
        }
        overlayLayersRef.current = overlayLayers
        imagerySettled = true
      })

      const loadDeferredLayers = async () => {
        await initialLayers
        await new Promise<void>((resolve) => window.setTimeout(resolve, 1200))
        if (disposed || viewer.isDestroyed()) return

        const [gradientT162AResult, gradientT54DResult, eastWestResult] =
          await Promise.allSettled([
            loadImage(faultOverlay.gradients.t162a.image, faultOverlay.gradients.t162a.bounds),
            loadImage(faultOverlay.gradients.t54d.image, faultOverlay.gradients.t54d.bounds),
            loadImage(deformationComponents.eastWest.image, deformationComponents.eastWest.bounds),
          ])
        if (disposed || viewer.isDestroyed()) return
        if (gradientT162AResult.status === 'fulfilled') {
          const layer = viewer.imageryLayers.addImageryProvider(gradientT162AResult.value)
          layer.alpha = radarLayerRef.current === 'phase_gradient_t162a' ? 1 : 0
          overlayLayers.gradientT162A = layer
        } else {
          console.error('Unable to load the T162A phase-gradient overlay.', gradientT162AResult.reason)
        }
        if (gradientT54DResult.status === 'fulfilled') {
          const layer = viewer.imageryLayers.addImageryProvider(gradientT54DResult.value)
          layer.alpha = radarLayerRef.current === 'phase_gradient_t54d' ? 1 : 0
          overlayLayers.gradientT54D = layer
        } else {
          console.error('Unable to load the T54D phase-gradient overlay.', gradientT54DResult.reason)
        }
        if (eastWestResult.status === 'fulfilled') {
          const layer = viewer.imageryLayers.addImageryProvider(eastWestResult.value)
          layer.alpha = radarLayerRef.current === 'east_west' ? 1 : 0
          overlayLayers.eastWest = layer
        } else {
          console.error('Unable to load the east-west displacement overlay.', eastWestResult.reason)
        }
        const showFaultOverlay =
          !isGcovComparisonEnabledRef.current
          && !isLosGeometryComparisonEnabledRef.current
          && (radarLayerRef.current === 'phase_gradient_t162a'
            || radarLayerRef.current === 'phase_gradient_t54d')
        mw72Marker.show = showFaultOverlay
        faultNameLabel.show = showFaultOverlay
        crackArrow.show = showFaultOverlay
        overlayLayers.mw72Marker = mw72Marker
        overlayLayers.faultNameLabel = faultNameLabel
        overlayLayers.crackArrow = crackArrow
        overlayLayersRef.current = overlayLayers

        await new Promise<void>((resolve) => window.setTimeout(resolve, 700))
        if (disposed || viewer.isDestroyed()) return
        const [
          verticalResult,
          losAscendingResult,
          losDescendingResult,
          gcovHHBeforeResult,
        ] = await Promise.allSettled([
          loadImage(deformationComponents.vertical.image, deformationComponents.vertical.bounds),
          loadImage(deformationComponents.losAscending.image, deformationComponents.losAscending.bounds),
          loadImage(deformationComponents.losDescending.image, deformationComponents.losDescending.bounds),
          loadImage(gcovOverlays.hhBefore.image, gcovOverlays.hhBefore.bounds),
        ])
        if (disposed || viewer.isDestroyed()) return
        if (verticalResult.status === 'fulfilled') {
          const layer = viewer.imageryLayers.addImageryProvider(verticalResult.value)
          layer.alpha = radarLayerRef.current === 'vertical' ? 1 : 0
          overlayLayers.vertical = layer
        } else {
          console.error('Unable to load the vertical displacement overlay.', verticalResult.reason)
        }
        if (losAscendingResult.status === 'fulfilled') {
          const layer = viewer.imageryLayers.addImageryProvider(losAscendingResult.value)
          layer.alpha = radarLayerRef.current === 'los_ascending' ? 1 : 0
          overlayLayers.losAscending = layer
        } else {
          console.error('Unable to load the ascending LOS overlay.', losAscendingResult.reason)
        }
        if (losDescendingResult.status === 'fulfilled') {
          const layer = viewer.imageryLayers.addImageryProvider(losDescendingResult.value)
          layer.alpha = radarLayerRef.current === 'los_descending' ? 1 : 0
          overlayLayers.losDescending = layer
        } else {
          console.error('Unable to load the descending LOS overlay.', losDescendingResult.reason)
        }
        if (gcovHHBeforeResult.status === 'fulfilled') {
          const layer = viewer.imageryLayers.addImageryProvider(gcovHHBeforeResult.value)
          layer.alpha = radarLayerRef.current === 'gcov_hh_before' ? 1 : 0
          layer.splitDirection = SplitDirection.NONE
          overlayLayers.gcovHHBefore = layer
        } else {
          console.error('Unable to load the HH 13 June overlay.', gcovHHBeforeResult.reason)
        }
        overlayLayersRef.current = overlayLayers

        await new Promise<void>((resolve) => window.setTimeout(resolve, 700))
        if (disposed || viewer.isDestroyed()) return
        const gcovResults = await Promise.allSettled([
          loadImage(gcovOverlays.hvBefore.image, gcovOverlays.hvBefore.bounds),
          loadImage(gcovOverlays.hhAfter.image, gcovOverlays.hhAfter.bounds),
          loadImage(gcovOverlays.hvAfter.image, gcovOverlays.hvAfter.bounds),
        ])
        if (disposed || viewer.isDestroyed()) return
        const gcovLayers = [
          ['gcovHVBefore', gcovResults[0], 'gcov_hv_before'],
          ['gcovHHAfter', gcovResults[1], 'gcov_hh_after'],
          ['gcovHVAfter', gcovResults[2], 'gcov_hv_after'],
        ] as const
        gcovLayers.forEach(([key, result, layerName]) => {
          if (result.status === 'rejected') {
            console.error(`Unable to load the ${layerName} overlay.`, result.reason)
            return
          }
          const layer = viewer.imageryLayers.addImageryProvider(result.value)
          layer.alpha = radarLayerRef.current === layerName ? 1 : 0
          layer.splitDirection = SplitDirection.NONE
          overlayLayers[key] = layer
        })
        overlayLayersRef.current = overlayLayers
      }

      void loadDeferredLayers().catch((error: unknown) => {
        console.error('Unable to load deferred map overlays.', error)
      })

      return () => {
        disposed = true
        window.clearTimeout(provisioningTimeout)
        removeProvisioningCheck()
        overlayLayersRef.current = null
        removeFiniteFaultLayers()
        canvasElement.removeEventListener('pointerdown', startCameraOrbit)
        canvasElement.removeEventListener('pointermove', moveCameraOrbit)
        canvasElement.removeEventListener('pointerup', endCameraOrbit)
        canvasElement.removeEventListener('pointercancel', endCameraOrbit)
        removeAnnotationCheck()
        removeSuitCheck()
        removeFrameCheck()
        removePreRenderTick()
        if (viewerRef.current === viewer) viewerRef.current = null
        viewer.destroy()
      }
    }

    return () => {
      disposed = true
      window.clearTimeout(provisioningTimeout)
      removeProvisioningCheck()
      overlayLayersRef.current = null
      removeFiniteFaultLayers()
      canvasElement.removeEventListener('pointerdown', startCameraOrbit)
      canvasElement.removeEventListener('pointermove', moveCameraOrbit)
      canvasElement.removeEventListener('pointerup', endCameraOrbit)
      canvasElement.removeEventListener('pointercancel', endCameraOrbit)
      removeAnnotationCheck()
      removeSuitCheck()
      removePreRenderTick()
      if (viewerRef.current === viewer) viewerRef.current = null
      viewer.destroy()
    }
  }, [events, configureCameraControls, isMapActive])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!isCoherenceLayerActive || !viewer || viewer.isDestroyed()) {
      setCoherenceProbe(null)
      return
    }

    const canvas = viewer.canvas
    let frameId = 0
    let requestId = 0
    let latestPointer: PointerEvent | null = null
    let lastPixelKey: string | null = null
    const positionReadout = (x: number, y: number) => {
      const readout = coherenceReadoutRef.current
      if (!readout) return
      readout.style.left = `${Math.max(8, Math.min(x + 16, window.innerWidth - 228))}px`
      readout.style.top = `${Math.max(8, Math.min(y + 16, window.innerHeight - 68))}px`
    }
    const onPointerMove = (event: PointerEvent) => {
      latestPointer = event
      positionReadout(event.clientX, event.clientY)
      if (frameId) return

      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        const pointer = latestPointer
        if (!pointer || viewer.isDestroyed()) return

        const rect = canvas.getBoundingClientRect()
        const pickedPosition = viewer.camera.pickEllipsoid(
          new Cartesian2(pointer.clientX - rect.left, pointer.clientY - rect.top),
          viewer.scene.globe.ellipsoid,
        )
        if (!pickedPosition) {
          if (lastPixelKey !== 'outside') {
            lastPixelKey = 'outside'
            requestId += 1
            setCoherenceProbe({
              status: 'empty',
              value: null,
              x: pointer.clientX,
              y: pointer.clientY,
            })
          }
          return
        }

        const cartographic = Cartographic.fromCartesian(pickedPosition, viewer.scene.globe.ellipsoid)
        const pixel = locateCoherencePixel(
          CesiumMath.toDegrees(cartographic.longitude),
          CesiumMath.toDegrees(cartographic.latitude),
        )
        if (!pixel) {
          if (lastPixelKey !== 'outside') {
            lastPixelKey = 'outside'
            requestId += 1
            setCoherenceProbe({
              status: 'empty',
              value: null,
              x: pointer.clientX,
              y: pointer.clientY,
            })
          }
          return
        }

        const pixelKey = `${pixel.row}:${pixel.column}`
        if (pixelKey === lastPixelKey) return
        lastPixelKey = pixelKey
        const currentRequestId = ++requestId
        setCoherenceProbe({
          status: 'loading',
          value: null,
          x: pointer.clientX,
          y: pointer.clientY,
        })

        void readCoherencePixel(pixel.row, pixel.column)
          .then((value) => {
            if (currentRequestId !== requestId) return
            setCoherenceProbe((current) => current && ({
              ...current,
              status: value === null ? 'empty' : 'value',
              value,
            }))
          })
          .catch((error: unknown) => {
            console.error('Unable to read coherence at the pointer location.', error)
            if (currentRequestId !== requestId) return
            setCoherenceProbe((current) => current && ({
              ...current,
              status: 'error',
              value: null,
            }))
          })
      })
    }
    const onPointerLeave = () => {
      latestPointer = null
      lastPixelKey = null
      requestId += 1
      if (frameId) window.cancelAnimationFrame(frameId)
      frameId = 0
      setCoherenceProbe(null)
    }

    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerleave', onPointerLeave)
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      if (frameId) window.cancelAnimationFrame(frameId)
      requestId += 1
      setCoherenceProbe(null)
    }
  }, [isCoherenceLayerActive])

  return (
    <>
      {/* 0. Introductory Wall Screen */}
      {tourStep === 'wall' && (
        <ParallaxComponent
          startTitleAnimation={startupComplete}
          introSoundEnabled={introSoundEnabled}
          onStart={() => {
            setHasStartedTour(true)
            setTourStep('typing')
          }}
          onOpenDashboard={handleOpenDashboard}
        />
      )}

      {/* 1. Dramatic Typing Screen */}
      {tourStep === 'typing' && (
        <TourTypingScreen
          introSoundEnabled={introSoundEnabled}
          onSkip={() => {
            startProvisioning()
            goToStep('nisar_intro')
          }}
          onComplete={() => {
            startProvisioning()
            goToStep('nisar_intro')
          }}
        />
      )}

      {isProvisioning && (
        <div
          className={`map-provisioning-loader${isProvisioningLeaving ? ' map-provisioning-loader--leaving' : ''}`}
          role="status"
          aria-live="polite"
        >
          <span className="map-provisioning-loader__spinner" aria-hidden="true" />
          <span>{PROVISIONING_MESSAGES[provisioningMessageIndex]}</span>
        </div>
      )}

      {/* 3D Cesium Map Canvas */}
      {isMapActive && (
        <CesiumCanvas
          className="cesium-map"
          ref={containerRef}
          aria-label={translate('Globo 3D con epicentros')}
        />
      )}

      {isTourUiVisible && (
        <AstronautArms
          gestureId={armGestureId}
          isEarthView={isEarthView}
        />
      )}

      {coherenceProbe && isCoherenceLayerActive && (
        <div
          ref={coherenceReadoutRef}
          className="coherence-pointer-readout"
          role="status"
          aria-live="polite"
          style={{
            left: `${Math.max(8, Math.min(coherenceProbe.x + 16, window.innerWidth - 228))}px`,
            top: `${Math.max(8, Math.min(coherenceProbe.y + 16, window.innerHeight - 68))}px`,
          }}
        >
          <strong>{translate('Coherencia')}</strong>
          <span>
            {coherenceProbe.status === 'loading'
              ? translate('Leyendo píxel...')
              : coherenceProbe.status === 'error'
                ? translate('No se pudo leer el raster')
                : coherenceProbe.value === null
                  ? translate('Sin dato en esta ubicación')
                  : `${coherenceProbe.value.toFixed(3)} (decimal) = ${(coherenceProbe.value * 100).toFixed(1)}%`}
          </span>
        </div>
      )}

      {isTourUiVisible && isVoiceIntroPlaying && (
        <div
          className={`voice-intro-waveform-overlay${isVoiceIntroOpening ? ' is-opening' : ''}${isVoiceIntroClosing ? ' is-closing' : ''}`}
          role="status"
          aria-live="polite"
          onAnimationEnd={(event) => {
            if (
              isVoiceIntroOpening
              && event.target === event.currentTarget
              && event.animationName === 'voice-signal-startup'
            ) {
              setIsVoiceIntroOpening(false)
            }
            if (
              isVoiceIntroClosing
              && event.target === event.currentTarget
              && event.animationName === 'voice-signal-shutdown'
            ) {
              finishVoiceIntroTransition()
            }
          }}
        >
          <Waveform
            bars={48}
            playing
            variant="success"
            intensity="high"
            size="large"
            label="AUDIO SIGNAL"
            className="voice-intro-waveform"
          />
          {activeVoiceSubtitle && (
            <p className="voice-intro-subtitle" aria-live="off">
              {activeVoiceSubtitle}
            </p>
          )}
          {isVoiceIntroClosing && (
            <span className="voice-intro-shutdown-flare" aria-hidden="true" />
          )}
        </div>
      )}

      {/* Interactive Tour Stepper / Wizard */}
      {isTourUiVisible
        && !isProvisioning
        && !isProvisioningLeaving
        && (tourStep !== 'nisar_intro' || isVoiceIntroComplete) && (
        <>
          {tourStep === 'nisar_intro' && !isStepperExpanded && <NisarSatellite />}
          <TourStepper
            currentStep={tourStep}
            animateNisarIntro={isNisarIntroAnimationReady}
            isExpanded={isStepperExpanded}
            events={events}
            onNext={handleNext}
            onPrev={handlePrev}
            onRestart={handleRestart}
            onSelectStep={goToStep}
            radarLayer={radarLayer}
            onRadarLayerChange={handleRadarLayerChange}
            comparisonBefore={comparisonBefore}
            comparisonPosition={comparisonPosition}
            isGcovComparisonEnabled={isGcovComparisonEnabled}
            isLosGeometryComparisonEnabled={isLosGeometryComparisonEnabled}
            onComparisonBeforeChange={handleComparisonBeforeChange}
            onComparisonAfterChange={setComparisonAfter}
            onComparisonPositionChange={setComparisonPosition}
            onGcovComparisonChange={handleGcovComparisonChange}
            onLosGeometryComparisonChange={handleLosGeometryComparisonChange}
            activeEpicenterIndex={activeEpicenterIndex}
            onSelectEpicenter={handleSelectEpicenter}
            isAutoPanning={isAutoPanning}
            onToggleAutoPan={handleToggleAutoPan}
            onStepButtonClick={() => setArmGestureId((id) => id + 1)}
            onDismissIntro={() => setIsStepperExpanded(false)}
            onFocusRupture={focusRuptureCorridor}
            onFocusRadarOverview={focusRadarOverview}
            onToggleFaultView={handleToggleFaultView}
            isFaultModel3D={isFaultModel3D}
            showFaultModel={showFaultModel}
            showSurfaceDeformation={showSurfaceDeformation}
            finiteFaultError={finiteFaultError}
            onToggleFaultModel={() => setShowFaultModel((visible) => !visible)}
            onToggleSurfaceDeformation={() =>
              setShowSurfaceDeformation((visible) => !visible)
            }
          />
        </>
      )}

      {/* Step 5: Analytical Dashboard */}
      {tourStep === 'dashboard' && (
        <EarthquakeDashboard events={events} />
      )}

    </>
  )
}
