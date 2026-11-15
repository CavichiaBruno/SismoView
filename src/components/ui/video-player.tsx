import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Maximize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react'
import { translate } from '../../i18n'
import './video-player.css'

type VideoPlayerProps = {
  src: string
  title: string
}

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  return `${Math.floor(safeSeconds / 60)}:${Math.floor(safeSeconds % 60).toString().padStart(2, '0')}`
}

export function VideoPlayer({ src, title }: VideoPlayerProps) {
  const playerRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const idleTimer = useRef<number | undefined>(undefined)
  const [playing, setPlaying] = useState(false)
  const [idle, setIdle] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [lastVolume, setLastVolume] = useState(0.7)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [hover, setHover] = useState<{ left: number; time: number } | null>(null)
  const [seekFlash, setSeekFlash] = useState<{ id: number; label: string } | null>(null)
  const [error, setError] = useState('')

  function wake() {
    setIdle(false)
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), 2200)
  }

  useEffect(() => {
    return () => window.clearTimeout(idleTimer.current)
  }, [])

  useEffect(() => {
    if (!seekFlash) return
    const timer = window.setTimeout(() => setSeekFlash(null), 700)
    return () => window.clearTimeout(timer)
  }, [seekFlash])

  function changeVolume(value: number) {
    const video = videoRef.current
    if (!video) return
    video.volume = value
    video.muted = false
    setVolume(value)
    if (value > 0) setLastVolume(value)
  }

  async function togglePlayback() {
    const video = videoRef.current
    if (!video) return
    if (!video.paused) {
      video.pause()
      return
    }
    try {
      await video.play()
      setError('')
    } catch (playError) {
      console.warn('No se pudo reproducir el vídeo.', playError)
      setError(translate('No se pudo reproducir el vídeo.'))
    }
  }

  function seekTo(seconds: number) {
    const video = videoRef.current
    if (!video || !duration) return
    video.currentTime = Math.max(0, Math.min(duration, seconds))
  }

  function seekBy(seconds: number) {
    seekTo((videoRef.current?.currentTime ?? 0) + seconds)
    setSeekFlash({ id: Date.now(), label: seconds > 0 ? `+${seconds}s` : `${seconds}s` })
    wake()
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === playerRef.current) {
        await document.exitFullscreen()
      } else if (playerRef.current?.requestFullscreen) {
        await playerRef.current.requestFullscreen()
      } else {
        throw new Error('Fullscreen API is unavailable')
      }
      setError('')
    } catch (fullscreenError) {
      console.warn('No se pudo activar la pantalla completa.', fullscreenError)
      setError(translate('No se pudo activar la pantalla completa.'))
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    if (target.closest('input') || (target.closest('button') && event.key === ' ')) return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const actions: Record<string, () => void> = {
      ' ': () => void togglePlayback(),
      k: () => void togglePlayback(),
      arrowleft: () => seekBy(-10),
      j: () => seekBy(-10),
      arrowright: () => seekBy(10),
      l: () => seekBy(10),
      m: () => changeVolume(volume === 0 ? lastVolume : 0),
      f: () => void toggleFullscreen(),
    }
    const action = actions[event.key.toLowerCase()]
    if (!action) return
    event.preventDefault()
    action()
    wake()
  }

  const progress = duration ? Math.min(time / duration, 1) * 100 : 0
  const hidden = playing && idle

  return (
    <section
      ref={playerRef}
      className="video-player"
      data-idle={hidden || undefined}
      aria-label={translate('Reproductor de vídeo')}
      aria-keyshortcuts="Space K J L ArrowLeft ArrowRight M F"
      tabIndex={0}
      onFocus={wake}
      onKeyDown={onKeyDown}
      onPointerMove={wake}
      onPointerLeave={() => {
        window.clearTimeout(idleTimer.current)
        if (playing) setIdle(true)
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster="/videos/thumbnail.png"
        preload="metadata"
        playsInline
        aria-label={title}
        onLoadedMetadata={(event) => {
          event.currentTarget.volume = volume
          setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)
        }}
        onDurationChange={(event) => {
          setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)
        }}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onPlay={() => { setPlaying(true); wake() }}
        onPause={() => { setPlaying(false); setIdle(false) }}
        onError={() => setError(translate('No se pudo reproducir el vídeo.'))}
      />
      <div className="video-player__shade" />
      <div className="video-player__top video-player__controls">
        <button type="button" className="video-player__button" aria-label={translate('Pantalla completa')} onClick={() => void toggleFullscreen()}>
          <Maximize size={16} />
        </button>
        <div className="video-player__volume">
          <input
            type="range" min="0" max="1" step="0.01" value={volume}
            aria-label={translate('Volumen')}
            style={{ background: `linear-gradient(to right, white ${volume * 100}%, #ffffff40 ${volume * 100}%)` }}
            onChange={(event) => changeVolume(Number(event.target.value))}
          />
          <button type="button" className="video-player__volume-button" aria-label={translate(volume === 0 ? 'Activar sonido del vídeo' : 'Silenciar')} onClick={() => changeVolume(volume === 0 ? lastVolume : 0)}>
            {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
      <div className="video-player__center video-player__controls">
        {seekFlash && <span key={seekFlash.id} className="video-player__flash">{seekFlash.label}</span>}
        <button type="button" className="video-player__button video-player__skip" aria-label={translate('Retroceder 10 segundos')} onClick={() => seekBy(-10)}>
          <RotateCcw size={20} />
        </button>
        <button type="button" className="video-player__button video-player__play" aria-label={translate(playing ? 'Pausar vídeo' : 'Reproducir vídeo')} onClick={() => void togglePlayback()}>
          {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
        </button>
        <button type="button" className="video-player__button video-player__skip" aria-label={translate('Avanzar 10 segundos')} onClick={() => seekBy(10)}>
          <RotateCw size={20} />
        </button>
      </div>
      <div className="video-player__bottom video-player__controls">
        <h3>{title}</h3>
        <div className="video-player__progress">
          {hover && <span className="video-player__tooltip" style={{ left: `${hover.left}%` }}>{formatTime(hover.time)}</span>}
          <input
            type="range" min="0" max={duration} step="0.01" value={Math.min(time, duration)}
            aria-label={translate('Progreso del vídeo')}
            aria-valuetext={translate('{{current}} de {{duration}}', { current: formatTime(time), duration: formatTime(duration) })}
            disabled={!duration}
            style={{ background: `linear-gradient(to right, white ${progress}%, #ffffff40 ${progress}%)` }}
            onChange={(event) => seekTo(Number(event.target.value))}
            onPointerLeave={() => setHover(null)}
            onPointerMove={(event) => {
              const box = event.currentTarget.getBoundingClientRect()
              const ratio = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width))
              setHover({ left: ratio * 100, time: ratio * duration })
            }}
          />
        </div>
        <div className="video-player__times"><span>{formatTime(time)}</span><span>{formatTime(duration)}</span></div>
        {error && <output className="video-player__error" role="status">{error}</output>}
      </div>
    </section>
  )
}
