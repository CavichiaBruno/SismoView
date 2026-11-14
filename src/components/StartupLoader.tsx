import { useState } from 'react'
import { BlackHoleHeroSection } from './BlackHole'
import StackLoader from './StackLoader'
import { LanguageSelector } from './LanguageSelector'
import { translate } from '../i18n'
import './StartupLoader.css'

type StartupLoaderProps = {
  visible: boolean
  leaving: boolean
  onComplete: () => void
  onExitComplete: () => void
  onSoundPreferenceChange: (enabled: boolean) => void
}

export function StartupLoader({
  visible,
  leaving,
  onComplete,
  onExitComplete,
  onSoundPreferenceChange,
}: StartupLoaderProps) {
  const [hasStarted, setHasStarted] = useState(false)
  const [typingAudio, setTypingAudio] = useState<HTMLAudioElement | null>(null)

  if (!visible) return null

  const handleStart = (enableSound: boolean) => {
    onSoundPreferenceChange(enableSound)
    if (enableSound) {
      const audio = new Audio('/sounds/typing.mp3')
      audio.volume = 0.2
      setTypingAudio(audio)
    }
    setHasStarted(true)
  }

  return (
    <div
      className={`startup-loader${leaving ? ' startup-loader--leaving' : ''}`}
      role={hasStarted ? 'status' : undefined}
      aria-live={hasStarted ? 'polite' : undefined}
      aria-label={hasStarted ? translate('Cargando NISAR Earth in Motion') : undefined}
      onTransitionEnd={(event) => {
        if (
          leaving
          && event.target === event.currentTarget
          && event.propertyName === 'opacity'
        ) {
          onExitComplete()
        }
      }}
    >
      {hasStarted ? (
        <StackLoader
          imageSize={1.2}
          duration={1}
          fadeOutDuration={0.8}
          backgroundColor="#fcfcfc"
          typingAudio={typingAudio}
          onComplete={onComplete}
        />
      ) : (
        <div className="startup-loader__start-screen">
          <BlackHoleHeroSection
            className="startup-loader__blackhole"
            steps={180}
            resolution={0.5}
            maxDpr={1}
            scrim="bottom"
            scrimStrength={0.55}
          />
          <div className="startup-loader__start-content">
            <h1 className="startup-loader__welcome-title">
              {translate('Bienvenido a SismoView')}
            </h1>
            <p className="startup-loader__welcome-subtitle">
              {translate('Caso de estudio: los terremotos de Venezuela')}
            </p>
            <p className="startup-loader__welcome-description">
              {translate('Explora los epicentros y las observaciones satelitales de NISAR en este recorrido interactivo.')}
            </p>
            <p className="startup-loader__sound-prompt">
              {translate('¿Quieres activar el sonido para disfrutar la experiencia completa?')}
            </p>
            <div className="startup-loader__start-actions">
              <LanguageSelector className="language-selector language-selector--startup" />
              <button
                className="startup-loader__start-button startup-loader__start-button--quiet"
                type="button"
                onClick={() => handleStart(false)}
              >
                {translate('Continuar sin sonido')}
              </button>
              <button
                className="startup-loader__start-button"
                type="button"
                onClick={() => handleStart(true)}
              >
                {translate('Activar sonido')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
