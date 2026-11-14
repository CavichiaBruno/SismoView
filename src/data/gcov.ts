export type GcovLayer =
  | 'gcov_hh_before'
  | 'gcov_hv_before'
  | 'gcov_hh_after'
  | 'gcov_hv_after'

export type DeformationComponentLayer =
  | 'east_west'
  | 'vertical'
  | 'los_ascending'
  | 'los_descending'

export type PhaseGradientLayer = 'phase_gradient_t162a' | 'phase_gradient_t54d'

export type RadarLayer =
  | 'displacement'
  | 'fringes'
  | 'coherence'
  | DeformationComponentLayer
  | PhaseGradientLayer
  | GcovLayer

const comparisonBounds = {
  west: -69.8241475594,
  south: 9.3452772333,
  east: -66.7041475594,
  north: 12.3552772333,
} as const

export const gcovOverlays = {
  hhBefore: {
    image: '/data/venezuela/gcov/gcov_hh_20260613.png',
    bounds: comparisonBounds,
  },
  hvBefore: {
    image: '/data/venezuela/gcov/gcov_hv_20260613.png',
    bounds: comparisonBounds,
  },
  hhAfter: {
    image: '/data/venezuela/gcov/gcov_hh_20260917.png',
    bounds: comparisonBounds,
  },
  hvAfter: {
    image: '/data/venezuela/gcov/gcov_hv_20260917.png',
    bounds: comparisonBounds,
  },
} as const
