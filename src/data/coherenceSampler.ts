import { fromUrl, type TypedArray } from 'geotiff'
import proj4 from 'proj4'

const COHERENCE_RASTER_URL = '/data/venezuela/coherence.tif'
const COHERENCE_WIDTH = 4239
const COHERENCE_HEIGHT = 4149
const COHERENCE_PIXEL_SIZE = 80
const COHERENCE_BOUNDS = {
  left: 410400,
  bottom: 1033920,
  right: 749520,
  top: 1365840,
}
const ROW_CACHE_LIMIT = 64

proj4.defs(
  'EPSG:32619',
  '+proj=utm +zone=19 +datum=WGS84 +units=m +no_defs +type=crs',
)

type CoherenceImage = Awaited<
  ReturnType<Awaited<ReturnType<typeof fromUrl>>['getImage']>
>

let imagePromise: Promise<CoherenceImage> | undefined
const rowCache = new Map<number, Promise<TypedArray>>()

function loadImage() {
  imagePromise ??= fromUrl(COHERENCE_RASTER_URL)
    .then(async (tiff) => {
      const image = await tiff.getImage()
      const projectedCrs = image.getGeoKeys()?.ProjectedCSTypeGeoKey
      if (
        image.getWidth() !== COHERENCE_WIDTH
        || image.getHeight() !== COHERENCE_HEIGHT
        || projectedCrs !== 32619
      ) {
        throw new Error('The coherence GeoTIFF has unexpected dimensions or projection.')
      }
      return image
    })
    .catch((error: unknown) => {
      imagePromise = undefined
      throw error
    })

  return imagePromise
}

export function locateCoherencePixel(longitude: number, latitude: number) {
  const [easting, northing] = proj4('EPSG:4326', 'EPSG:32619', [longitude, latitude])
  const column = Math.floor((easting - COHERENCE_BOUNDS.left) / COHERENCE_PIXEL_SIZE)
  const row = Math.floor((COHERENCE_BOUNDS.top - northing) / COHERENCE_PIXEL_SIZE)

  if (
    column < 0
    || column >= COHERENCE_WIDTH
    || row < 0
    || row >= COHERENCE_HEIGHT
  ) {
    return null
  }

  return { row, column }
}

export async function readCoherencePixel(row: number, column: number) {
  if (
    !Number.isInteger(row)
    || !Number.isInteger(column)
    || row < 0
    || row >= COHERENCE_HEIGHT
    || column < 0
    || column >= COHERENCE_WIDTH
  ) {
    throw new RangeError('The requested coherence pixel is outside the raster.')
  }

  const image = await loadImage()
  let rowPromise = rowCache.get(row)
  if (rowPromise) {
    rowCache.delete(row)
    rowCache.set(row, rowPromise)
  } else {
    rowPromise = image.readRasters({
      window: [0, row, COHERENCE_WIDTH, row + 1],
      samples: [0],
      interleave: false,
    }).then((rasters) => {
      const data = rasters[0]
      if (!data) throw new Error(`The coherence raster row ${row} is empty.`)
      return data
    }).catch((error: unknown) => {
      rowCache.delete(row)
      throw error
    })
    rowCache.set(row, rowPromise)
    if (rowCache.size > ROW_CACHE_LIMIT) {
      const oldestRow = rowCache.keys().next().value
      if (oldestRow !== undefined) rowCache.delete(oldestRow)
    }
  }

  const value = Number((await rowPromise)[column])
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null
}
