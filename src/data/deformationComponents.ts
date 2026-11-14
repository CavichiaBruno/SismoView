export const deformationComponents = {
  eastWest: {
    image: '/data/venezuela/deformation/este_oeste_completo.png',
    bounds: {
      west: -69.2025,
      south: 9.8475,
      east: -66.1975,
      north: 11.0025,
    },
    minMm: -618.801991147022,
    maxMm: 618.801991147022,
  },
  vertical: {
    image: '/data/venezuela/deformation/vertical_completo.png',
    bounds: {
      west: -69.2025,
      south: 9.8475,
      east: -66.1975,
      north: 11.0025,
    },
    minMm: -124.59041952543475,
    maxMm: 124.59041952543475,
  },
  losAscending: {
    image: '/data/venezuela/deformation/los_asc_mosaico.png',
    bounds: {
      west: -69.2025,
      south: 9.8475,
      east: -66.1975,
      north: 11.0025,
    },
    minMm: -417.30483502228424,
    maxMm: 417.30483502228424,
  },
  losDescending: {
    image: '/data/venezuela/deformation/los_desc_mosaico.png',
    bounds: {
      west: -69.2025,
      south: 9.8475,
      east: -66.1975,
      north: 11.0025,
    },
    minMm: -343.56986335049845,
    maxMm: 343.56986335049845,
  },
} as const
