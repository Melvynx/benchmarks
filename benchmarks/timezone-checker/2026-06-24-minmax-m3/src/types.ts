export interface City {
  id: string
  name: string
  country: string
  region: Region
  timezone: string
}

export type Region =
  | 'North America'
  | 'South America'
  | 'Europe'
  | 'Africa'
  | 'Middle East'
  | 'Asia'
  | 'Oceania'

export type Mode = 'meeting' | 'base'

export type TimeFormat = '12h' | '24h'

export interface Settings {
  wakeHour: number
  sleepHour: number
  timeFormat: TimeFormat
}

export interface AppState {
  cities: string[]
  mode: Mode
  settings: Settings
}

export interface OverlapInfo {
  hours: Set<number>
  ranges: Array<{ start: number; endExclusive: number }>
  totalHours: number
}

export interface CellState {
  localHour: number
  status: 'sleeping' | 'awake' | 'overlap'
}