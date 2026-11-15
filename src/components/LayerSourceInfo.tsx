import type { RadarLayer } from '../data/gcov'
import { translate } from '../i18n'
import coherenceMetricsUrl from '../../scripts/coherence_metrics.mjs?url'

export function LayerSourceInfo({ layer }: { layer: RadarLayer }) {
  const isGcov = layer.startsWith('gcov_')
  const isGunw = layer === 'fringes' || layer === 'displacement' || layer === 'coherence'
  const script = isGcov ? 'nisar_gcov_overlays.py' : isGunw ? 'nisar_gunw.py' : 'ucsd_los_fault_layers.py'
  const description = isGcov
    ? 'NISAR L2 GCOV · 13 jun y 17 sep 2026 · banda L, HH o HV · retrodispersión gamma-0 en dB. Misma cuadrícula y escala por polarización; no es desplazamiento.'
    : layer === 'coherence'
      ? 'Coherencia 0–1 · PNG local. El script examina el GUNW del 13–25 jun 2026, pero no documenta cómo se generó este PNG. Las métricas se calculan por separado a partir del GeoTIFF local.'
    : isGunw
      ? 'NISAR L2 GUNW · 13–25 jun 2026 · banda L, track 162 ascendente. Fase envuelta: ciclo; coherencia: 0–1; desplazamiento LOS: cm, relativo.'
      : 'UCSD · productos LOS NISAR, tracks 162 ascendente (13–25 jun) y 54 descendente (17–29 jun). LOS y componentes en mm; gradiente de fase sin unidades de desplazamiento.'

  return (
    <details className="layer-source-info">
      <summary>{translate('Ficha de la capa y fuentes')}</summary>
      <p>{translate(description)}</p>
      <a href={`https://github.com/CavichiaBruno/SismoView/blob/main/scripts/${script}`} target="_blank" rel="noreferrer">
        {translate('Ver script y productos de origen')} ↗
      </a>
      {' · '}
      <a href={isGunw || isGcov ? 'https://search.asf.alaska.edu/' : 'https://topex.ucsd.edu/VNZ_7.5/web/'} target="_blank" rel="noreferrer">
        {isGunw || isGcov ? 'ASF Vertex' : 'UCSD'} ↗
      </a>
      {layer === 'coherence' && (
        <>
          {' · '}
          <a href={coherenceMetricsUrl} download="coherence_metrics.mjs">
            {translate('Descargar cálculo')} ↓
          </a>
        </>
      )}
    </details>
  )
}
