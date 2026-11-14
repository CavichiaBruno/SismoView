export const terrainBlock = {
  grid: {
    width: 540,
    height: 240,
    resolution: 0.005,
    west: -69.5,
    south: 9.8,
    east: -66.8,
    north: 11,
    rowOrigin: 'north',
    noData: -32768,
  },
  displacementScale: 10,
  displacementUrl: '/terrain/displacement.bin',
  elevationUrl: '/terrain/elevation.bin',
  lineOfSight: {
    east: 0.6399827599525452,
    north: 0.13530538976192474,
    up: Math.sqrt(
      1 -
        0.6399827599525452 ** 2 -
        0.13530538976192474 ** 2,
    ),
    incidenceAngleDegrees: 41.07296371459961,
  },
  zones: [
    { name: 'Este', longitude: -67, latitude: 10.55 },
    { name: 'Centro', longitude: -68, latitude: 10.35 },
    { name: 'Oeste', longitude: -68.45, latitude: 10.45 },
  ],
} as const
