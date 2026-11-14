import { useEffect, useState } from 'react'
import './NisarSatellite.css'

const ASSET_BASE = import.meta.env.BASE_URL

export function NisarSatellite() {
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [minimumLoadingTimePassed, setMinimumLoadingTimePassed] = useState(false)
  const [isEntranceReady, setIsEntranceReady] = useState(false)
  const isLoading = !isModelLoaded || !minimumLoadingTimePassed

  useEffect(() => {
    const timeout = window.setTimeout(() => setMinimumLoadingTimePassed(true), 1000)
    const entranceTimeout = window.setTimeout(() => setIsEntranceReady(true), 700)
    return () => {
      window.clearTimeout(timeout)
      window.clearTimeout(entranceTimeout)
    }
  }, [])

  return (
    <section
      className={`nisar-experience${isEntranceReady ? ' nisar-experience--entering' : ''}`}
      aria-label="Explora el satélite NISAR"
    >
      <div className="nisar-model-stage">
        <iframe
          className="nisar-context-model"
          title="Observatorio NISAR"
          src={`${ASSET_BASE}observatorio-nisar.html`}
          onLoad={() => setIsModelLoaded(true)}
        />
        {isLoading && (
          <div className="nisar-skeleton-loader" role="status" aria-label="Cargando modelo 3D de NISAR">
            <span className="nisar-loading-indicator" aria-hidden="true" />
            <span className="nisar-loading-label">Cargando NISAR</span>
          </div>
        )}
      </div>
    </section>
  )
}
