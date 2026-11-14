import { RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const SIZE = 500
const CENTER = SIZE / 2
const RADIUS = 225

const MOMENT_TENSOR = {
  nn: 36.03,
  ee: -30.48,
  dd: -5.55,
  ne: 200.18,
  nd: -11.07,
  ed: 60.87,
} as const

const NODAL_PLANES = [
  { strike: 354.69, dip: 85.74 },
  { strike: 85.94, dip: 73.66 },
] as const

function amplitude(north: number, east: number, down: number) {
  const { nn, ee, dd, ne, nd, ed } = MOMENT_TENSOR
  return nn * north ** 2 + ee * east ** 2 + dd * down ** 2
    + 2 * (ne * north * east + nd * north * down + ed * east * down)
}

function project(azimuth: number, inclination: number): [number, number] {
  const radius = Math.SQRT2 * Math.sin(inclination / 2) * RADIUS
  return [CENTER + radius * Math.sin(azimuth), CENTER - radius * Math.cos(azimuth)]
}

function nodalPlanePath(strike: number, dip: number) {
  const strikeRad = strike * Math.PI / 180
  const dipRad = dip * Math.PI / 180
  const alongStrike = [Math.cos(strikeRad), Math.sin(strikeRad), 0]
  const downDip = [
    -Math.sin(strikeRad) * Math.cos(dipRad),
    Math.cos(strikeRad) * Math.cos(dipRad),
    Math.sin(dipRad),
  ]

  return Array.from({ length: 121 }, (_, index) => {
    const angle = Math.PI * index / 120
    const north = alongStrike[0] * Math.cos(angle) + downDip[0] * Math.sin(angle)
    const east = alongStrike[1] * Math.cos(angle) + downDip[1] * Math.sin(angle)
    const down = alongStrike[2] * Math.cos(angle) + downDip[2] * Math.sin(angle)
    const [x, y] = project(Math.atan2(east, north), Math.acos(Math.max(-1, Math.min(1, down))))
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join('')
}

const PLANE_PATHS = NODAL_PLANES.map(({ strike, dip }) => nodalPlanePath(strike, dip))

function MomentBeachball() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const image = context.createImageData(SIZE, SIZE)
    const pixels = image.data
    const compression = [106, 165, 255]
    const dilatation = [10, 26, 58]
    const samples = 2

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        let positive = 0
        let covered = 0

        for (let sy = 0; sy < samples; sy++) {
          for (let sx = 0; sx < samples; sx++) {
            const dx = (x + (sx + 0.5) / samples - CENTER) / RADIUS
            const dy = (y + (sy + 0.5) / samples - CENTER) / RADIUS
            const radius = Math.hypot(dx, dy)
            if (radius > 1) continue

            covered++
            const inclination = 2 * Math.asin(radius / Math.SQRT2)
            const azimuth = Math.atan2(dx, -dy)
            const sinInclination = Math.sin(inclination)
            const value = amplitude(
              sinInclination * Math.cos(azimuth),
              sinInclination * Math.sin(azimuth),
              Math.cos(inclination),
            )
            if (value > 0) positive++
          }
        }

        if (covered === 0) continue
        const compressionRatio = positive / covered
        const offset = (y * SIZE + x) * 4
        pixels[offset] = dilatation[0] + (compression[0] - dilatation[0]) * compressionRatio
        pixels[offset + 1] = dilatation[1] + (compression[1] - dilatation[1]) * compressionRatio
        pixels[offset + 2] = dilatation[2] + (compression[2] - dilatation[2]) * compressionRatio
        pixels[offset + 3] = 255 * covered / (samples * samples)
      }
    }

    context.putImageData(image, 0, 0)
  }, [])

  return (
    <div className="dash-tensor-beachball">
      <canvas ref={canvasRef} width={SIZE} height={SIZE} aria-hidden="true" />
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Mecanismo focal: falla transcurrente casi vertical">
        <circle cx={CENTER} cy={CENTER} r={RADIUS} className="dash-tensor-outline" />
        {PLANE_PATHS.map((path, index) => (
          <path key={index} d={path} pathLength="1" className="dash-tensor-plane" />
        ))}
        <g className="dash-tensor-cardinal">
          <text x={CENTER} y="30">N</text>
          <text x={CENTER + RADIUS + 27} y={CENTER + 5}>E</text>
        </g>
      </svg>
    </div>
  )
}

export function MomentTensorChart() {
  const [playback, setPlayback] = useState(0)

  return (
    <section className="dash-panel dash-tensor-card" aria-labelledby="moment-tensor-title">
      <div className="dash-tensor-heading">
        <div>
          <span className="dash-section-title">USGS · Tensor de momento</span>
          <h2 id="moment-tensor-title">Mecanismo focal</h2>
          <p>24 jun 2026 · us6000t7zp · hemisferio inferior</p>
        </div>
        <button
          className="dash-chart-replay"
          type="button"
          onClick={() => setPlayback((current) => current + 1)}
          aria-label="Repetir animación del mecanismo focal"
        >
          <RotateCcw width={14} height={14} />
          <span>Repetir</span>
        </button>
      </div>

      <MomentBeachball key={playback} />

      <div className="dash-tensor-metrics" aria-label="Parámetros del tensor de momento">
        <div><span>Magnitud</span><strong>Mww 7,5 ± 0,036</strong></div>
        <div><span>Profundidad</span><strong>23,5 km</strong></div>
        <div><span>Movimiento</span><strong>Transcurrente</strong></div>
      </div>

      <div className="dash-tensor-legend">
        <span><i className="dash-tensor-compression" /> Compresión</span>
        <span><i className="dash-tensor-dilatation" /> Dilatación</span>
      </div>

      <div className="dash-tensor-explanation">
        <h3>¿Qué nos dice este gráfico?</h3>
        <p>
          El patrón es compatible con una falla que se desplazó principalmente de lado.
          Las zonas azules indican compresión y las oscuras, dilatación. Las líneas blancas
          muestran dos posibles planos de ruptura; el tensor no permite saber por sí solo cuál se activó.
        </p>
      </div>
    </section>
  )
}
