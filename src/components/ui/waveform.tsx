"use client"

import * as React from "react"
import { cn } from "../../lib/utils"
import "./waveform.css"

interface WaveformProps extends React.HTMLAttributes<HTMLDivElement> {
  bars?: number
  playing?: boolean
  variant?: "default" | "success" | "warning" | "danger"
  label?: string
  intensity?: "low" | "medium" | "high"
  size?: "default" | "large"
  audioSrc?: string
}

const variantColor: Record<NonNullable<WaveformProps["variant"]>, string> = {
  default: "bg-primary",
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
}

const variantGlow: Record<NonNullable<WaveformProps["variant"]>, string> = {
  default: "shadow-[0_0_6px_var(--primary)]",
  success: "shadow-[0_0_6px_rgba(34,197,94,0.5)]",
  warning: "shadow-[0_0_6px_rgba(245,158,11,0.5)]",
  danger: "shadow-[0_0_6px_rgba(239,68,68,0.5)]",
}

const intensityRange = {
  low: { min: 0.2, max: 0.58 },
  medium: { min: 0.28, max: 0.8 },
  high: { min: 0.38, max: 1 },
}

export function Waveform({
  bars = 24,
  playing = true,
  variant = "default",
  label,
  intensity = "medium",
  size = "default",
  audioSrc,
  className,
  ...props
}: WaveformProps) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const range = intensityRange[intensity]

  React.useEffect(() => {
    if (!playing) {
      audioRef.current?.pause()
      return
    }

    if (audioSrc && audioRef.current) {
      void audioRef.current.play().catch((error: unknown) => {
        console.warn("No se pudo reproducir el audio de la forma de onda.", error)
      })
    }

    return () => {
      audioRef.current?.pause()
    }
  }, [playing, audioSrc])

  return (
    <div
      data-slot="tron-waveform"
      data-size={size}
      className={cn(
        "relative overflow-hidden rounded border border-primary/30 bg-card/80 p-3 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.03)_2px,rgba(0,0,0,0.03)_4px)]" />

      {label && (
        <div className="waveform__header mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-foreground/80">
            {label}
          </span>
          <span
            data-waveform-status
            className={cn(
              "text-[9px] uppercase tracking-widest",
              playing ? "animate-pulse text-green-500" : "text-foreground/40",
            )}
          >
            {playing ? "LIVE" : "IDLE"}
          </span>
        </div>
      )}

      <div
        className="waveform__bars flex items-end justify-center gap-[2px]"
      >
        {Array.from({ length: bars }, (_, index) => {
          const heightRatio =
            range.min
            + (range.max - range.min)
              * (0.25 + 0.75 * Math.abs(Math.sin(index * 0.72 + 0.35)))
          return (
          <div
            key={index}
            className={cn(
              "waveform__bar w-1.5 rounded-t-sm",
              variantColor[variant],
              playing && variantGlow[variant],
              playing && "waveform__bar--playing",
            )}
            style={{
              height: `${heightRatio * 100}%`,
              animationDelay: `${(index % 11) * -0.13}s`,
              animationDuration: `${0.65 + (index % 7) * 0.1}s`,
            }}
          />
          )
        })}
      </div>

      {audioSrc && <audio ref={audioRef} src={audioSrc} loop preload="auto" />}

      <div className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-primary/50" />
      <div className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-primary/50" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-primary/50" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-primary/50" />
    </div>
  )
}

export default Waveform
