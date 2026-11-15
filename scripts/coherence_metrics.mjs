import { fromFile } from 'geotiff'
import proj4 from 'proj4'

const rasterPath = process.argv[2] ?? 'public/data/venezuela/coherence.tif'
const tiff = await fromFile(rasterPath)
const image = await tiff.getImage()
const [originX, originY] = image.getOrigin()
const [pixelX, pixelY] = image.getResolution()
if (image.getGeoKeys().ProjectedCSTypeGeoKey !== 32619) {
  throw new Error('Expected the coherence raster in EPSG:32619.')
}

const values = await image.readRasters({ samples: [0], interleave: true })
const noData = image.getGDALNoData()
const width = image.getWidth()
const centers = [
  { name: 'San Felipe', lon: -68.53, lat: 10.44 },
  { name: 'Catia La Mar', lon: -67.194, lat: 10.622 },
].map((center) => ({
  ...center,
  coordinates: proj4('EPSG:4326', '+proj=utm +zone=19 +datum=WGS84 +units=m +no_defs', [center.lon, center.lat]),
  values: [],
}))
const accepted = []

for (let index = 0; index < values.length; index += 1) {
  const value = values[index]
  if (!Number.isFinite(value) || value < 0 || value > 1 || value === noData) continue
  if (value >= 0.4) accepted.push(value)
  const x = originX + (index % width + 0.5) * pixelX
  const y = originY + (Math.floor(index / width) + 0.5) * pixelY
  for (const center of centers) {
    const [centerX, centerY] = center.coordinates
    if ((x - centerX) ** 2 + (y - centerY) ** 2 <= 10_000 ** 2) {
      center.values.push(value)
    }
  }
}

function median(numbers) {
  if (!numbers.length) throw new Error('No valid pixels for median calculation.')
  numbers.sort((a, b) => a - b)
  const middle = Math.floor(numbers.length / 2)
  return numbers.length % 2 ? numbers[middle] : (numbers[middle - 1] + numbers[middle]) / 2
}

console.log(JSON.stringify({
  raster: rasterPath,
  rasterPixels: values.length,
  acceptedPixels: accepted.length,
  acceptedPercentOfRaster: 100 * accepted.length / values.length,
  acceptedMedian: median(accepted),
  epicenters: centers.map(({ name, values: pixels }) => ({
    name,
    radiusMeters: 10_000,
    validPixels: pixels.length,
    median: median(pixels),
  })),
}, null, 2))
