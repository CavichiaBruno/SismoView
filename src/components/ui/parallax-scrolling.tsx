'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import './parallax-scrolling.css'
import { TiltedGridHero } from './tilted-grid-hero'
import GlowButton from './glow-button'
import { LanguageSelector } from '../LanguageSelector'
import { translate } from '../../i18n'

const observationImages = [
  {
    src: '/parallax/sar-interferogram.jpg',
    alt: 'Visualización SAR de un cambio en la superficie terrestre',
  },
  {
    src: '/parallax/nisar-integration.jpg',
    alt: 'Satélite NISAR durante su integración en tierra',
  },
  {
    src: '/parallax/nisar-orbit.png',
    alt: 'Representación artística del satélite NISAR en órbita sobre la Tierra',
  },
]

type CrackPoint = [number, number]

function randomFromSeed(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function tearLine(
  seed = 11,
  from = -800,
  to = 1800,
  step = 9,
  centerX = 500,
  centerY = 318,
  angle = -7,
): CrackPoint[] {
  const random = randomFromSeed(seed)
  const slope = Math.tan((angle * Math.PI) / 180)
  const points: CrackPoint[] = []

  for (let x = from; x <= to; x += step) {
    const fibre = (random() - 0.5) * 5
    const tooth = random() < 0.09 ? (random() - 0.5) * 26 : 0
    const wander =
      Math.sin(x * 0.019 + seed) * 10 +
      Math.sin(x * 0.053 + seed * 2) * 4
    points.push([
      x,
      centerY + (x - centerX) * slope + wander + fibre + tooth,
    ])
  }

  return points
}

function smooth(start: number, end: number, value: number) {
  const progress = Math.max(0, Math.min(1, (value - start) / (end - start)))
  return progress * progress * (3 - 2 * progress)
}

function crackPath(points: CrackPoint[]) {
  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join('')
}

type ParallaxComponentProps = {
  startTitleAnimation: boolean
  introSoundEnabled: boolean
  onStart?: () => void
  onOpenDashboard?: () => void
}

export function ParallaxComponent({
  startTitleAnimation,
  introSoundEnabled,
  onStart,
  onOpenDashboard,
}: ParallaxComponentProps) {
  const parallaxRef = useRef<HTMLDivElement>(null)
  const introAudioRef = useRef<HTMLAudioElement | null>(null)
  const introAudioStartedRef = useRef(false)
  const introAudioFadedRef = useRef(false)
  const cameraShakePlayedRef = useRef(false)
  const titleCrackLine = useMemo(() => tearLine(), [])
  const [waveActive, setWaveActive] = useState(false)
  const [cameraShakeActive, setCameraShakeActive] = useState(false)
  const [titleCrackActive, setTitleCrackActive] = useState(false)
  const [crackProgress, setCrackProgress] = useState(0)

  useEffect(() => {
    if (!startTitleAnimation) return
    setWaveActive(true)

    if (!cameraShakePlayedRef.current) {
      cameraShakePlayedRef.current = true
      setCameraShakeActive(true)
      setTitleCrackActive(true)
    }

    if (introAudioStartedRef.current) return
    introAudioStartedRef.current = true

    if (!introSoundEnabled) return

    const audio = new Audio('/sounds/cracking-earthquake.mp3')
    audio.volume = 0.35
    introAudioRef.current = audio
    void audio.play().catch((error: unknown) => {
      console.warn('No se pudo reproducir el sonido de la introducción.', error)
    })

    return () => {
      audio.pause()
      audio.currentTime = 0
      introAudioRef.current = null
    }
  }, [introSoundEnabled, startTitleAnimation])

  useEffect(() => {
    if (!titleCrackActive) return

    const finalProgress = 0.179
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCrackProgress(finalProgress)
      return
    }

    const startedAt = performance.now()
    let animationFrame = 0
    const animateCrack = (now: number) => {
      const progress = Math.min((now - startedAt) / 1000, 1)
      setCrackProgress(finalProgress * progress)
      if (progress < 1) animationFrame = requestAnimationFrame(animateCrack)
    }

    animationFrame = requestAnimationFrame(animateCrack)
    return () => cancelAnimationFrame(animationFrame)
  }, [titleCrackActive])

  useEffect(() => {
    const scrollElement = parallaxRef.current
    const contentElement = scrollElement?.querySelector<HTMLElement>(
      '.parallax__scroll-content',
    )
    const layersElement = scrollElement?.querySelector<HTMLElement>(
      '[data-parallax-layers]',
    )
    const observationsElement = scrollElement?.querySelector<HTMLElement>(
      '.parallax__observations',
    )

    if (!scrollElement || !contentElement || !layersElement || !observationsElement) return

    gsap.registerPlugin(ScrollTrigger)

    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: observationsElement,
        scroller: scrollElement,
        start: 'top 15%',
        once: true,
        onEnter: () => {
          const audio = introAudioRef.current
          if (!audio || introAudioFadedRef.current) return

          introAudioFadedRef.current = true
          gsap.to(audio, {
            volume: 0,
            duration: 1.5,
            onComplete: () => {
              audio.pause()
              audio.currentTime = 0
              introAudioRef.current = null
            },
          })
        },
      })

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: layersElement,
          scroller: scrollElement,
          start: '0% 0%',
          end: '100% 0%',
          scrub: 0,
        },
      })

      const layers = [
        { layer: '1', yPercent: 70 },
        { layer: '2', yPercent: 55 },
        { layer: '3', yPercent: 40 },
        { layer: '4', yPercent: 10 },
      ]

      layers.forEach((layer, index) => {
        timeline.to(
          layersElement.querySelectorAll(
            `[data-parallax-layer="${layer.layer}"]`,
          ),
          { yPercent: layer.yPercent, ease: 'none' },
          index === 0 ? undefined : '<',
        )
      })
    }, scrollElement)

    const lenis = new Lenis({
      wrapper: scrollElement,
      content: contentElement,
    })
    const updateScrollTrigger = () => ScrollTrigger.update()
    const updateLenis = (time: number) => lenis.raf(time * 1000)

    lenis.on('scroll', updateScrollTrigger)
    gsap.ticker.add(updateLenis)
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.off('scroll', updateScrollTrigger)
      gsap.ticker.remove(updateLenis)
      context.revert()
      lenis.destroy()
    }
  }, [])

  const crackReach = smooth(0.03, 0.2, crackProgress) * 620
  const crack = titleCrackLine.filter(
    ([x]) => Math.abs(x - 500) <= crackReach,
  )

  return (
    <div className="parallax" ref={parallaxRef}>
      <LanguageSelector className="language-selector language-selector--parallax" />
      <div className="parallax__scroll-content">
        <section className="parallax__header" aria-label="Parallax introduction">
          <div className="parallax__visuals">
            <div className="parallax__black-line-overflow" />
            <div
              data-parallax-layers
              className={`parallax__layers${cameraShakeActive ? ' is-camera-shaking' : ''}`}
            >
              <img
                src="/parallax/layer-1-revised.png?v=2"
                loading="eager"
                fetchPriority="high"
                width="2000"
                data-parallax-layer="1"
                alt=""
                className="parallax__layer-img"
              />
              <div data-parallax-layer="3" className="parallax__layer-title">
                <h1
                  className={`parallax__title${waveActive ? ' is-wave-animating' : ''}`}
                  onMouseEnter={(event) => {
                    if (waveActive) return
                    event.currentTarget.style.removeProperty('--sismo-wave-offset')
                    setWaveActive(true)
                  }}
                  onAnimationEnd={(event) => {
                    event.currentTarget.style.setProperty(
                      '--sismo-wave-offset',
                      '100',
                    )
                    setWaveActive(false)
                  }}
                >
                  SISMOVIEW
                  <svg
                    className="parallax__title-crack"
                    viewBox="0 218 1000 200"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    {crack.length > 1 && (
                      <path
                        d={crackPath(crack)}
                        fill="none"
                        stroke="#1d0f07"
                        strokeWidth={2.4}
                        strokeLinejoin="bevel"
                      />
                    )}
                  </svg>
                </h1>
              </div>
              <img
                src="/parallax/layer-4.webp"
                loading="eager"
                width="2000"
                data-parallax-layer="4"
                alt=""
                className="parallax__layer-img"
              />
            </div>
            <div className="parallax__fade" />
          </div>
        </section>
        <TiltedGridHero
          images={observationImages.map((image) => ({
            ...image,
            alt: translate(image.alt),
          }))}
          className="parallax__observations"
          axis={74}
          tileHeight={30}
          speed={5}
        >
          <img
            className="parallax__team-logo"
            src="/parallax/luckycode-space-apps.png"
            alt="NASA Space Apps Zaragoza · LuckyCode Team"
          />
          <div className="tilted-grid-hero__content">
            <div className="parallax__observations-copy">
              <p className="tilted-grid-hero__eyebrow">
                {translate('NISAR · Observación de la Tierra')}
              </p>
              <h2 className="tilted-grid-hero__title">
                {translate('Cada señal revela el movimiento del terreno.')}
              </h2>
              <p className="tilted-grid-hero__caption">
                {translate('Desplazamiento, fase y coherencia: distintas lecturas de una misma superficie en transformación.')}
              </p>
              {(onStart || onOpenDashboard) && (
                <div className="parallax__actions">
                  {onStart && (
                    <GlowButton
                      className="parallax__content-button parallax__content-button--primary"
                      onClick={onStart}
                      type="button"
                      colors={['#168cff', '#73ceff']}
                    >
                      {translate('Iniciar recorrido')}
                      <span aria-hidden="true">→</span>
                    </GlowButton>
                  )}
                  {onOpenDashboard && (
                    <button
                      className="parallax__content-button parallax__content-button--secondary"
                      onClick={onOpenDashboard}
                      type="button"
                    >
                      {translate('Ir al dashboard')}
                      <span aria-hidden="true">↗</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </TiltedGridHero>
      </div>
    </div>
  )
}
