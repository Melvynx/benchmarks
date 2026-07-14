export type Mode = 'meeting' | 'base'

export type TimeFormat = 12 | 24

export interface City {
  id: string
  name: string
  country: string
  timeZone: string
  region: string
}

export interface TimelineSlot {
  referenceHour: number
  instant: Date
}

export interface TimeWindow {
  start: number
  end: number
}

export interface GridCell {
  referenceHour: number
  localHour: number
  isAwake: boolean
  isOverlap: boolean
}

export interface CityRow {
  city: City
  isReference: boolean
  offsetLabel: string
  cells: GridCell[]
}

export interface SummaryLine {
  city?: City
  count: number
  windows: TimeWindow[]
}

export interface AppState {
  selectedCityIds: string[]
  wakeHour: number
  sleepHour: number
  timeFormat: TimeFormat
  mode: Mode
}
