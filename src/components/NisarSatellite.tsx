import { useEffect, useState } from 'react'
import i18n, { translate } from '../i18n'
import './NisarSatellite.css'

const ASSET_BASE = import.meta.env.BASE_URL

export function NisarSatellite({ isIntroExpanded = false }: { isIntroExpanded?: boolean }) {
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
      className={`nisar-experience${isEntranceReady ? ' nisar-experience--entering' : ''}${isIntroExpanded ? ' nisar-experience--intro-expanded' : ''}`}
      aria-label={translate('Explora el satélite NISAR')}
    >
      <div className="nisar-model-stage">
        <iframe
          className="nisar-context-model"
          title={translate('Observatorio NISAR')}
          src={`${ASSET_BASE}observatorio-nisar.html?lang=${i18n.language.startsWith('en') ? 'en' : 'es'}`}
          onLoad={() => setIsModelLoaded(true)}
        />
        {isLoading && (
          <div className="nisar-skeleton-loader" role="status" aria-label={translate('Cargando modelo 3D de NISAR')}>
            <span className="nisar-loading-indicator" aria-hidden="true" />
            <span className="nisar-loading-label">{translate('Cargando NISAR')}</span>
          </div>
        )}
      </div>
    </section>
  )
}
