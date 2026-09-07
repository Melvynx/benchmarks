export const SERIES = {
  fruit: '#3dba8a',
  blue: '#4d7cff',
  red: '#e85a4a',
} as const

export type SeriesKey = keyof typeof SERIES

export const SERIES_LABEL: Record<SeriesKey, string> = {
  fruit: 'Fruit',
  blue: 'Blue blobs',
  red: 'Red blobs',
}

export const GARDEN = {
  felt: '#16132a',
  dishRim: '#8aa392',
  dishRimLight: '#b4c9b8',
  dishSide: '#5e7366',
  dishInner: '#3d4a38',
  soil: '#4a3f2e',
  soilLight: '#5c4e38',
  moss: '#4f6b3e',
  mossDark: '#3a522e',
  mossLight: '#6a8a52',
  trunk: '#6a4a32',
  trunkDark: '#4e3424',
  leaf: '#4a7a3c',
  leafDark: '#35602c',
  leafLight: '#68a050',
  fruit: '#3dba8a',
  fruitLight: '#7eecc0',
  fruitDark: '#2a8a64',
  shadow: 'rgba(12, 8, 24, 0.42)',
  blue: '#4d7cff',
  blueDark: '#2a4ec4',
  blueLight: '#9bb6ff',
  red: '#e85a4a',
  redDark: '#b8382c',
  redLight: '#ff9a8c',
  ink: '#f4efe4',
}

export const ACTION_LABEL: Record<string, string> = {
  wander: 'wandering',
  seek: 'seeking fruit',
  eat: 'chewing',
  flee: 'fleeing',
  avoid: 'avoiding a crowd',
  gather: 'waiting by a tree',
  hunt: 'hunting',
  contact: 'in contact',
  rest: 'resting',
}
