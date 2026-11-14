import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import proj4 from 'proj4'
import { fromFile } from 'geotiff'

const [phaseTiffPath, metadataPath, coherencePath, outputDirectory] = process.argv.slice(2)

if (!phaseTiffPath || !metadataPath || !coherencePath || !outputDirectory) {
  throw new Error(
    'Usage: node scripts/generate-observation-assets.mjs <phase.tif> <metadata.json> <coherence_u8.bin> <output-directory>',
  )
}

const metadata = JSON.parse(await readFile(resolve(metadataPath), 'utf8'))
const grid = metadata.map_view.display_grid
const source = metadata.georeferencing
const [pixelWidth, , left, , pixelHeight, top] =
  metadata.validation.geotiff_readback.phase.transform
const sourceWidth = source.width
const sourceHeight = source.height
const coherence = new Uint8Array(await readFile(resolve(coherencePath)))

if (coherence.length !== grid.width * grid.height) {
  throw new Error('The coherence preview dimensions do not match the display grid.')
}

proj4.defs('EPSG:32619', '+proj=utm +zone=19 +datum=WGS84 +units=m +no_defs +type=crs')
const toUtm = proj4('EPSG:4326', 'EPSG:32619')
const toLonLat = proj4('EPSG:32619', 'EPSG:4326')
const tiff = await fromFile(resolve(phaseTiffPath))
const image = await tiff.getImage()
const rasterBands = await image.readRasters({ samples: [0] })
const phase = rasterBands[0]

if (image.getWidth() !== sourceWidth || image.getHeight() !== sourceHeight) {
  throw new Error('The phase GeoTIFF dimensions do not match the observation metadata.')
}

const preview = new Float32Array(grid.width * grid.height)
for (let row = 0; row < grid.height; row++) {
  const latitude = grid.bounds.north
    - (row + 0.5) / grid.height * (grid.bounds.north - grid.bounds.south)

  for (let col = 0; col < grid.width; col++) {
    const index = row * grid.width + col
    const coherenceValue = coherence[index]
    if (coherenceValue === 255) {
      preview[index] = Number.NaN
      continue
    }

    const longitude = grid.bounds.west
      + (col + 0.5) / grid.width * (grid.bounds.east - grid.bounds.west)
    const [easting, northing] = toUtm.forward([longitude, latitude])
    const sourceCol = Math.floor((easting - left) / pixelWidth)
    const sourceRow = Math.floor((top - northing) / -pixelHeight)

    if (
      sourceCol < 0
      || sourceCol >= sourceWidth
      || sourceRow < 0
      || sourceRow >= sourceHeight
    ) {
      preview[index] = Number.NaN
      continue
    }

    const value = phase[sourceRow * sourceWidth + sourceCol]
    preview[index] = Number.isFinite(value) ? value : Number.NaN
  }
}

const profileEasting = 575_000
const profileCol = Math.round((profileEasting - left) / pixelWidth)
const profilePoints = []
for (let row = 0; row < sourceHeight; row++) {
  const index = row * sourceWidth + profileCol
  const northing = top + row * pixelHeight
  const [longitude, latitude] = toLonLat.forward([profileEasting, northing])
  const displayCol = Math.floor(
    (longitude - grid.bounds.west) / (grid.bounds.east - grid.bounds.west) * grid.width,
  )
  const displayRow = Math.floor(
    (grid.bounds.north - latitude) / (grid.bounds.north - grid.bounds.south) * grid.height,
  )
  const insideGrid =
    displayCol >= 0
    && displayCol < grid.width
    && displayRow >= 0
    && displayRow < grid.height
  const coherenceValue = insideGrid ? coherence[displayRow * grid.width + displayCol] : 255
  const isValid = coherenceValue !== 255 && Number.isFinite(phase[index])
  profilePoints.push({
    northing_km: northing / 1000,
    phase_radians: isValid ? phase[index] : null,
    coherence: isValid ? coherenceValue / 200 : null,
  })
}

await mkdir(resolve(outputDirectory), { recursive: true })
await writeFile(resolve(outputDirectory, 'phase_float32.bin'), Buffer.from(preview.buffer))
await writeFile(
  resolve(outputDirectory, 'phase_profile.json'),
  JSON.stringify({
    units: 'radians',
    easting_km: profileEasting / 1000,
    source_pixel_spacing_m: source.pixel_spacing.x,
    points: profilePoints,
  }),
)

console.log(`Wrote ${preview.length} display phase samples and ${profilePoints.length} profile samples.`)
