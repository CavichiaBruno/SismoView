import { boconoMw72Epicenter } from './earthquakes'

const gradientBounds = {
  t162a: {
    west: -69.602778,
    south: 9.541667,
    east: -66.847222,
    north: 12.225,
  },
  t54d: {
    west: -69.875,
    south: 9.536111,
    east: -67.138889,
    north: 12.175,
  },
} as const

export const faultOverlay = {
  geojson: '/data/venezuela/faults/ruptura_bocono.geojson',
  gradients: {
    t162a: {
      image: '/data/venezuela/faults/gradiente_T162A.png',
      bounds: gradientBounds.t162a,
    },
    t54d: {
      image: '/data/venezuela/faults/gradiente_T54D.png',
      bounds: gradientBounds.t54d,
    },
  },
  epicenterMw72: boconoMw72Epicenter,
} as const
