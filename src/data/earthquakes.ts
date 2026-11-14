export type Earthquake = {
  id: string
  place: string
  state: string
  magnitude: number
  longitude: number
  latitude: number
}

export const boconoMw72Epicenter = [-68.53, 10.44] as const

export const earthquakes: Earthquake[] = [
  {
    id: 'yunare',
    place: '17 km O de Catia La Mar',
    state: 'La Guaira',
    magnitude: 7.5,
    longitude: -67.194,
    latitude: 10.622,
  },
  {
    id: 'san-felipe',
    place: '20 km E de San Felipe',
    state: 'Yaracuy',
    magnitude: 7.2,
    longitude: boconoMw72Epicenter[0],
    latitude: boconoMw72Epicenter[1],
  },
]
