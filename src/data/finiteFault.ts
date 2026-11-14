export const FINITE_FAULT_GEOJSON_URL = '/data/venezuela/finite-fault/FFM.geojson'
export const SURFACE_DEFORMATION_URL =
  '/data/venezuela/finite-fault/surface_deformation.disp'

export interface FiniteFaultFeature {
  type: 'Feature'
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  properties: {
    fill: string
    slip: number
    trup: number
    sf_moment: number
    rise: number
    rake: number
  }
}

export interface FiniteFaultCollection {
  type: 'FeatureCollection'
  features: FiniteFaultFeature[]
}

export interface SurfaceDisplacementSample {
  longitude: number
  latitude: number
  eastMeters: number
  northMeters: number
  verticalMeters: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseFiniteFaultCollection(value: unknown): FiniteFaultCollection {
  if (!isRecord(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
    throw new Error('El GeoJSON de falla finita no es un FeatureCollection válido.')
  }

  const features = value.features.map((feature, index): FiniteFaultFeature => {
    if (!isRecord(feature) || feature.type !== 'Feature') {
      throw new Error(`La subfalla ${index + 1} no es una entidad GeoJSON válida.`)
    }

    const geometry = feature.geometry
    const properties = feature.properties
    if (
      !isRecord(geometry)
      || geometry.type !== 'Polygon'
      || !Array.isArray(geometry.coordinates)
      || !isRecord(properties)
      || typeof properties.fill !== 'string'
      || typeof properties.slip !== 'number'
      || !Number.isFinite(properties.slip)
      || typeof properties.trup !== 'number'
      || !Number.isFinite(properties.trup)
      || typeof properties.sf_moment !== 'number'
      || !Number.isFinite(properties.sf_moment)
      || typeof properties.rise !== 'number'
      || !Number.isFinite(properties.rise)
      || typeof properties.rake !== 'number'
      || !Number.isFinite(properties.rake)
    ) {
      throw new Error(`La subfalla ${index + 1} tiene geometría o parámetros inválidos.`)
    }

    const coordinates = geometry.coordinates.map((ring) => {
      if (!Array.isArray(ring)) {
        throw new Error(`La geometría de la subfalla ${index + 1} no es válida.`)
      }
      return ring.map((position) => {
        if (
          !Array.isArray(position)
          || position.length < 2
          || !position.every((coordinate) =>
            typeof coordinate === 'number' && Number.isFinite(coordinate),
          )
        ) {
          throw new Error(`Las coordenadas de la subfalla ${index + 1} no son válidas.`)
        }
        return position
      })
    })

    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates },
      properties: {
        fill: properties.fill,
        slip: properties.slip,
        trup: properties.trup,
        sf_moment: properties.sf_moment,
        rise: properties.rise,
        rake: properties.rake,
      },
    }
  })

  return { type: 'FeatureCollection', features }
}

export function projectFiniteFaultToSurface(
  collection: FiniteFaultCollection,
): FiniteFaultCollection {
  return {
    type: 'FeatureCollection',
    features: collection.features.map((feature) => ({
      ...feature,
      geometry: {
        type: 'Polygon',
        coordinates: feature.geometry.coordinates.map((ring) =>
          ring.map(([longitude, latitude]) => [longitude, latitude]),
        ),
      },
    })),
  }
}

export function parseSurfaceDisplacement(text: string): SurfaceDisplacementSample[] {
  const samples: SurfaceDisplacementSample[] = []

  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return

    const values = trimmed.split(/\s+/).map(Number)
    if (values.length < 6 || !values.slice(0, 6).every(Number.isFinite)) {
      throw new Error(`La línea ${index + 1} del archivo DISP no contiene seis valores válidos.`)
    }

    const [longitude, latitude, , eastMeters, northMeters, verticalMeters] = values
    if (
      longitude === undefined
      || latitude === undefined
      || eastMeters === undefined
      || northMeters === undefined
      || verticalMeters === undefined
    ) {
      throw new Error(`La línea ${index + 1} del archivo DISP está incompleta.`)
    }

    samples.push({
      longitude: longitude > 180 ? longitude - 360 : longitude,
      latitude,
      eastMeters,
      northMeters,
      verticalMeters,
    })
  })

  if (samples.length === 0) {
    throw new Error('El archivo DISP no contiene muestras de deformación.')
  }

  return samples
}

function interpolateColor(start: number[], end: number[], amount: number) {
  const channels = start.map((value, index) =>
    Math.round(value + ((end[index] ?? value) - value) * amount),
  )
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export function surfaceDisplacementColor(verticalMeters: number) {
  const displacementMillimeters = verticalMeters * 1000
  const neutral = [248, 250, 252]

  if (displacementMillimeters < 0) {
    const amount = Math.min(Math.abs(displacementMillimeters) / 745, 1)
    return interpolateColor(neutral, [37, 99, 235], amount)
  }

  const amount = Math.min(displacementMillimeters / 270, 1)
  return interpolateColor(neutral, [225, 29, 72], amount)
}
