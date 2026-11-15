import React, { useEffect, useMemo, useRef, useState } from 'react'
import { PulsingBorderBackground } from './PulsingBorderBackground'
import { translate } from '../i18n'
import './TourTypingScreen.css'

interface TourTypingScreenProps {
  onComplete: () => void
  onSkip?: () => void
  introSoundEnabled?: boolean
  userHasInteracted?: boolean
}

const NARRATIVE_PARAGRAPHS = [
  translate('24 DE JUNIO DE 2026 · 14:04 VET (18:04 UTC)'),
  translate('Costa Centro-Norte y Cordillera de la Costa, Venezuela'),
  translate('En un intervalo de apenas 50 segundos, la tierra fue sacudida por un doblete sísmico histórico:'),
  translate('• 14:04 VET · San Felipe (Yaracuy) — Magnitud 7.2 Mw'),
  translate('• 14:05 VET · Catia La Mar (La Guaira) — Magnitud 7.5 Mw'),
  translate('Desde la órbita, NISAR ofrece otra perspectiva: comparar observaciones radar puede revelar cómo se movió la superficie hacia o desde el satélite.'),
]
const AUTO_CONTINUE_DELAY = 6000
const BETWEEN_LINES_DELAY = 350
const AUDIO_FADE_DURATION = 900
const TYPING_AUDIO_VOLUME = 0.4
const AMBIENCE_AUDIO_VOLUME = 0.1

const audioFadeFrames = new WeakMap<HTMLAudioElement, number>()

function fadeAudio(
  audio: HTMLAudioElement,
  targetVolume: number,
  onComplete?: () => void,
) {
  const previousFrame = audioFadeFrames.get(audio)
  if (previousFrame !== undefined) cancelAnimationFrame(previousFrame)

  const startVolume = audio.volume
  const clampedTargetVolume = Math.max(0, Math.min(1, targetVolume))
  const startedAt = performance.now()
  const animate = (now: number) => {
    const progress = Math.max(0, Math.min((now - startedAt) / AUDIO_FADE_DURATION, 1))
    audio.volume = Math.max(
      0,
      Math.min(1, startVolume + (clampedTargetVolume - startVolume) * progress),
    )

    if (progress < 1) {
      audioFadeFrames.set(audio, requestAnimationFrame(animate))
      return
    }

    audio.volume = clampedTargetVolume
    audioFadeFrames.delete(audio)
    onComplete?.()
  }

  audioFadeFrames.set(audio, requestAnimationFrame(animate))
}

function fadeOutAndStop(audio: HTMLAudioElement | null) {
  if (!audio || audio.paused) return

  fadeAudio(audio, 0, () => {
    audio.pause()
    audio.currentTime = 0
  })
}

interface TypingFrame {
  text: string
  delay: number
}

interface ScheduledTypingFrame extends TypingFrame {
  lineIndex: number
  at: number
}

function createTypingSequence(text: string): TypingFrame[] {
  const frames: TypingFrame[] = []

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const delay = character === '·' || character === ':' ? 65 : 35
    frames.push({ text: text.slice(0, index + 1), delay })
  }

  return frames
}

function createTypingTimeline(): ScheduledTypingFrame[] {
  let elapsed = 0
  const timeline: ScheduledTypingFrame[] = []

  NARRATIVE_PARAGRAPHS.forEach((text, lineIndex) => {
    const frames = createTypingSequence(text)

    frames.forEach((frame) => {
      elapsed += frame.delay
      timeline.push({ ...frame, lineIndex, at: elapsed })
    })

    if (lineIndex < NARRATIVE_PARAGRAPHS.length - 1) {
      elapsed += BETWEEN_LINES_DELAY
    }
  })

  return timeline
}

export const TourTypingScreen: React.FC<TourTypingScreenProps> = ({
  onComplete,
  onSkip,
  introSoundEnabled = false,
  userHasInteracted = false,
}) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(-1)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const animationFrameRef = useRef<number | null>(null)
  const introAudioRef = useRef<HTMLAudioElement | null>(null)
  const ambienceAudioRef = useRef<HTMLAudioElement | null>(null)
  const typingTimeline = useMemo(() => createTypingTimeline(), [])
  const currentFrame = typingTimeline[currentFrameIndex]
  const currentLineIndex = currentFrame?.lineIndex
    ?? (currentFrameIndex < 0 ? 0 : NARRATIVE_PARAGRAPHS.length)

  useEffect(() => {
    if (!introSoundEnabled || !userHasInteracted) return

    const audio = new Audio('/sounds/minimalist-text-typing.wav')
    audio.volume = 0
    audio.loop = true
    introAudioRef.current = audio

    const ambience = new Audio('/sounds/typing-ambience.wav')
    ambience.volume = 0
    ambience.loop = true
    ambienceAudioRef.current = ambience

    const playPromises = [
      audio.play().catch((error: unknown) => {
        if ((error as any)?.name !== 'AbortError') {
          console.warn('No se pudo reproducir el audio del texto tipeado.', error)
        }
      }),
      ambience.play().catch((error: unknown) => {
        if ((error as any)?.name !== 'AbortError') {
          console.warn('No se pudo reproducir el ambiente del texto tipeado.', error)
        }
      }),
    ]

    void Promise.all(playPromises).then(() => {
      fadeAudio(audio, TYPING_AUDIO_VOLUME)
      fadeAudio(ambience, AMBIENCE_AUDIO_VOLUME)
    })

    return () => {
      for (const track of [audio, ambience]) {
        const frame = audioFadeFrames.get(track)
        if (frame !== undefined) cancelAnimationFrame(frame)
        audioFadeFrames.delete(track)
        if (!track.paused) {
          track.pause()
        }
        track.currentTime = 0
      }
      introAudioRef.current = null
      ambienceAudioRef.current = null
    }
  }, [introSoundEnabled, userHasInteracted])

  useEffect(() => {
    if (currentLineIndex >= NARRATIVE_PARAGRAPHS.length) {
      fadeOutAndStop(introAudioRef.current)
      fadeOutAndStop(ambienceAudioRef.current)
    }
  }, [currentLineIndex])

  useEffect(() => {
    let isCancelled = false
    let nextFrameIndex = 0
    const startTime = performance.now()

    const tick = () => {
      if (isCancelled) return

      const elapsed = performance.now() - startTime

      while (
        nextFrameIndex < typingTimeline.length
        && typingTimeline[nextFrameIndex].at <= elapsed
      ) {
        setCurrentFrameIndex(nextFrameIndex)
        nextFrameIndex += 1
      }

      if (nextFrameIndex < typingTimeline.length) {
        animationFrameRef.current = requestAnimationFrame(tick)
      } else {
        setCurrentFrameIndex(typingTimeline.length)
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      isCancelled = true
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [typingTimeline])

  useEffect(() => {
    if (currentLineIndex >= NARRATIVE_PARAGRAPHS.length) {
      const timer = setTimeout(() => {
        setIsFadingOut(true)
        setTimeout(onComplete, 800)
      }, AUTO_CONTINUE_DELAY)
      return () => clearTimeout(timer)
    }
  }, [currentLineIndex, onComplete])

  const handleSkip = () => {
    fadeOutAndStop(introAudioRef.current)
    fadeOutAndStop(ambienceAudioRef.current)

    onSkip?.()
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    setIsFadingOut(true)
    setTimeout(onComplete, 1500)
  }

  return (
    <div className={`typing-backdrop ${isFadingOut ? 'is-fading' : ''}`}>
      <PulsingBorderBackground />
      {currentLineIndex >= NARRATIVE_PARAGRAPHS.length && (
        <div className="auto-continue" role="status">
          <svg
            aria-hidden="true"
            className="auto-continue__timer"
            viewBox="0 0 24 24"
          >
            <circle className="auto-continue__track" cx="12" cy="12" r="9" />
            <circle
              className="auto-continue__progress"
              cx="12"
              cy="12"
              r="9"
              style={{ animationDuration: `${AUTO_CONTINUE_DELAY}ms` }}
            />
          </svg>
          <span>{translate('Auto-continuar')}</span>
        </div>
      )}
      <div className="typing-container">
        <div className="typing-body">
          {NARRATIVE_PARAGRAPHS.slice(0, currentLineIndex).map((line, idx) => (
            <p
              key={idx}
              className={`typing-line ${idx === 0 ? 'time-stamp' : ''} ${
                idx === 3 || idx === 4 ? 'epicenter-highlight' : ''
              }`}
            >
              {line}
            </p>
          ))}

          {currentLineIndex < NARRATIVE_PARAGRAPHS.length && (
            <p
              className={`typing-line ${currentLineIndex === 0 ? 'time-stamp' : ''} ${
                currentLineIndex === 3 || currentLineIndex === 4 ? 'epicenter-highlight' : ''
              }`}
            >
              {currentFrame?.text ?? ''}
              <span className="typing-cursor">█</span>
            </p>
          )}
        </div>

        <div className="typing-footer">
          <button className="skip-btn" onClick={handleSkip} type="button">
            {translate('Saltar introducción')} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
