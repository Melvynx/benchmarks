/**
 * One palette for the whole app, so a blue blob in the dish and the blue line
 * in the chart are literally the same colour. The three series hues are the
 * validated categorical set (all six checks pass on both surfaces).
 */
export type Mode = 'light' | 'dark'

export const SERIES = {
  fruit: { light: '#00947a', dark: '#23ab92' },
  blue: { light: '#3f6bd8', dark: '#6285dd' },
  red: { light: '#d64533', dark: '#e05a4e' },
} as const

export type SeriesKey = keyof typeof SERIES

export const SERIES_LABEL: Record<SeriesKey, string> = {
  fruit: 'Fruit',
  blue: 'Blue blobs',
  red: 'Red blobs',
}

export function seriesColor(key: SeriesKey, mode: Mode): string {
  return SERIES[key][mode]
}

/** Garden colours. Not chart data, so these are free to be scenery. */
export type GardenTheme = {
  sky: string
  dishRim: string
  dishSide: string
  soil: string
  soilLight: string
  grass: string
  grassDark: string
  trunk: string
  trunkDark: string
  leaf: string
  leafDark: string
  leafLight: string
  shadow: string
}

export const GARDEN: Record<Mode, GardenTheme> = {
  light: {
    sky: '#eceadf',
    dishRim: '#c9b995',
    dishSide: '#b09c74',
    soil: '#8f7f5e',
    soilLight: '#a8916d',
    grass: '#9db56a',
    grassDark: '#7c9a52',
    trunk: '#7a5a3c',
    trunkDark: '#5e4530',
    leaf: '#5d8f4a',
    leafDark: '#436f36',
    leafLight: '#79ab5e',
    shadow: 'rgba(60, 48, 30, 0.22)',
  },
  dark: {
    sky: '#15161c',
    dishRim: '#4a4436',
    dishSide: '#3a3529',
    soil: '#2f2b21',
    soilLight: '#3b3529',
    grass: '#3f5230',
    grassDark: '#334527',
    trunk: '#4a3728',
    trunkDark: '#382a1e',
    leaf: '#3c6b34',
    leafDark: '#2b5027',
    leafLight: '#508a42',
    shadow: 'rgba(0, 0, 0, 0.35)',
  },
}

export function gardenTheme(mode: Mode): GardenTheme {
  return GARDEN[mode]
}
