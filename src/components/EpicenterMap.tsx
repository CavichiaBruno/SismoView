import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { Earthquake } from '../data/earthquakes'
import i18n, { translate } from '../i18n'
import {
  FINITE_FAULT_GEOJSON_URL,
  parseFiniteFaultCollection,
} from '../data/finiteFault'
import 'leaflet/dist/leaflet.css'
import './EpicenterMap.css'

interface Props {
  events: Earthquake[]
}

export function EpicenterMap({ events }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const modelBoundsRef = useRef<L.LatLngBounds | null>(null)
  const faultLayerRef = useRef<L.GeoJSON | null>(null)
  const showFaultModelRef = useRef(true)
  const [showFaultModel, setShowFaultModel] = useState(true)
  const [finiteFaultError, setFiniteFaultError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const mapFrameRef = useRef<HTMLDivElement>(null)
  const expandButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    showFaultModelRef.current = showFaultModel
    const map = mapRef.current
    const layer = faultLayerRef.current
    if (!map || !layer) return
    if (showFaultModel) layer.addTo(map)
    else map.removeLayer(layer)
  }, [showFaultModel])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = L.map(container, {
      scrollWheelZoom: true,
      zoomControl: true,
      minZoom: 6,
      maxZoom: 10,
      zoomSnap: 0.5,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    })
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'dash-epicenter-map__tiles',
      updateWhenIdle: false,
      updateWhenZooming: true,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    tileLayerRef.current = tiles
    mapRef.current = map
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ pan: false })
    })
    resizeObserver.observe(container)
    const epicenterPane = map.createPane('epicenterMarkers')
    epicenterPane.style.zIndex = '650'

    const markers = events.map((event) => {
      const marker = L.circleMarker([event.latitude, event.longitude], {
        radius: 8,
        color: '#f8fafc',
        weight: 2,
        fillColor: event.magnitude >= 7.4 ? '#fb7185' : '#facc15',
        fillOpacity: 1,
        pane: 'epicenterMarkers',
      }).addTo(map)

      const tooltip = document.createElement('span')
      tooltip.textContent = `M${event.magnitude.toFixed(1)} · ${translate(event.place)}`
      marker.bindTooltip(tooltip, {
        permanent: true,
        direction: 'top',
        offset: L.point(0, -8),
        className: 'dash-epicenter-map__tooltip',
      })

      return marker
    })

    const bounds = L.featureGroup(markers).getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.35), { maxZoom: 8 })
    } else {
      map.setView([10.5, -68], 7)
    }

    let disposed = false
    const loadFiniteFaultLayers = async () => {
      try {
        const faultResponse = await fetch(FINITE_FAULT_GEOJSON_URL)
        if (!faultResponse.ok) {
          throw new Error(`GeoJSON HTTP ${faultResponse.status}`)
        }

        const faultJson = await faultResponse.json()
        const faultCollection = parseFiniteFaultCollection(faultJson)
        if (disposed) return

        const faultLayer = L.geoJSON(faultCollection, {
          style: (feature) => {
            const fill = feature?.properties?.fill
            return {
              color: '#fff7ed',
              weight: 0.8,
              opacity: 0.85,
              fillColor: typeof fill === 'string' ? fill : '#f8fafc',
              fillOpacity: 0.78,
            }
          },
          onEachFeature: (feature, layer) => {
            const properties = feature.properties
            const slip = properties?.slip
            const ruptureTime = properties?.trup
            if (typeof slip !== 'number' || typeof ruptureTime !== 'number') return
            layer.bindTooltip(
              translate('Deslizamiento {{slip}} m · inicio {{time}} s', {
                slip: slip.toLocaleString(i18n.language.startsWith('en') ? 'en-US' : 'es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                time: ruptureTime.toLocaleString(i18n.language.startsWith('en') ? 'en-US' : 'es-ES', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }),
              }),
              { sticky: true, className: 'dash-epicenter-map__tooltip' },
            )
          },
        })

        faultLayerRef.current = faultLayer
        if (showFaultModelRef.current) faultLayer.addTo(map)

        const modelBounds = faultLayer.getBounds()
        if (!modelBounds.isValid()) {
          throw new Error('El GeoJSON de falla finita no contiene límites geográficos válidos.')
        }
        const eventBounds = L.featureGroup(markers).getBounds()
        modelBounds.extend(eventBounds).pad(0.1)
        modelBoundsRef.current = modelBounds
        map.fitBounds(modelBounds, { maxZoom: 8 })
        window.requestAnimationFrame(() => {
          if (!disposed) map.invalidateSize({ pan: false })
        })
        setFiniteFaultError(null)
      } catch (error) {
        if (disposed) return
        console.error('Unable to load finite-fault layers for the dashboard map.', error)
        setFiniteFaultError(translate('No se pudieron cargar las capas de falla finita.'))
      }
    }

    void loadFiniteFaultLayers()

    requestAnimationFrame(() => {
      if (disposed) return
      requestAnimationFrame(() => {
        if (!disposed) map.invalidateSize({ pan: false })
      })
    })

    return () => {
      disposed = true
      tiles.off()
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      tileLayerRef.current = null
      modelBoundsRef.current = null
      faultLayerRef.current = null
    }
  }, [events])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let secondFrameId = 0
    const frameId = window.requestAnimationFrame(() => {
      map.invalidateSize({ pan: false })
      secondFrameId = window.requestAnimationFrame(() => {
        const bounds = modelBoundsRef.current
        if (bounds) {
          map.fitBounds(bounds, {
            maxZoom: isExpanded ? 9 : 8,
            animate: false,
          })
        } else {
          tileLayerRef.current?.redraw()
        }
      })
    })
    return () => {
      window.cancelAnimationFrame(frameId)
      window.cancelAnimationFrame(secondFrameId)
    }
  }, [isExpanded])

  useEffect(() => {
    if (!isExpanded) return

    expandButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExpanded(false)
      if (event.key !== 'Tab') return

      const frame = mapFrameRef.current
      if (!frame) return
      const focusableElements = Array.from(
        frame.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      )
      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      if (!first || !last) return

      if (event.shiftKey && (document.activeElement === first || !frame.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !frame.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isExpanded])

  return (
    <>
      {isExpanded && (
        <button
          className="dash-epicenter-map__backdrop"
          type="button"
          aria-label={translate('Cerrar mapa ampliado')}
          onClick={() => setIsExpanded(false)}
        />
      )}
      <div
        ref={mapFrameRef}
        className={`dash-epicenter-map${isExpanded ? ' is-expanded' : ''}`}
        role={isExpanded ? 'dialog' : undefined}
        aria-modal={isExpanded ? true : undefined}
        aria-label={isExpanded ? translate('Mapa ampliado de falla finita y epicentros') : undefined}
      >
        <div className="dash-epicenter-map__layers" role="group" aria-label={translate('Capas del modelo de falla finita')}>
          <button
            className={showFaultModel ? 'is-active' : ''}
            type="button"
            aria-pressed={showFaultModel}
            onClick={() => setShowFaultModel((visible) => !visible)}
          >
            <span className="dash-epicenter-map__layer-swatch dash-epicenter-map__layer-swatch--slip" aria-hidden="true" />
            {translate('Falla finita · deslizamiento (m)')}
          </button>
        </div>
        <div className="dash-epicenter-map__legend" aria-label={translate('Leyenda de deslizamiento por subfalla')}>
          <span>{translate('Deslizamiento por subfalla')}</span>
          <div className="dash-epicenter-map__legend-scale dash-epicenter-map__legend-scale--slip" />
          <div className="dash-epicenter-map__legend-labels">
            <span>0 m</span>
            <span>{i18n.language.startsWith('en') ? '1.82 m' : '1,82 m'}</span>
          </div>
        </div>
        {finiteFaultError && (
          <div className="dash-epicenter-map__error" role="alert">{finiteFaultError}</div>
        )}
        <button
          ref={expandButtonRef}
          className="dash-epicenter-map__expand"
          type="button"
          aria-label={translate(isExpanded ? 'Reducir mapa' : 'Ampliar mapa')}
          title={translate(isExpanded ? 'Reducir mapa' : 'Ampliar mapa')}
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          {isExpanded ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
          <span>{translate(isExpanded ? 'Reducir' : 'Ampliar mapa')}</span>
        </button>
        <div
          className="dash-epicenter-map__viewport"
          ref={containerRef}
          role="application"
          aria-label={translate('Mapa OpenStreetMap con los epicentros y las capas del modelo de falla finita')}
        />
      </div>
    </>
  )
}
