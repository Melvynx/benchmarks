export type Mode = 'meeting' | 'base'

export type TimeFormat = '12h' | '24h'

export type Region =
  | 'North America'
  | 'South America'
  | 'Europe'
  | 'Africa'
  | 'Middle East'
  | 'Asia'
  | 'Oceania'

export interface City {
  id: string
  name: string
  country: string
  region: Region
  /** IANA timezone identifier, e.g. "Europe/Zurich". */
  timeZone: string
  /** Extra search terms (e.g. "USA", "UK"). */
  aliases?: readonly string[]
}

/** Hours are integers 0–23. Overnight windows have `wake > sleep`. */
export interface AwakeWindow {
  wake: number
  sleep: number
}

export interface Settings extends AwakeWindow {
  timeFormat: TimeFormat
}

export interface AppState {
  cityIds: string[]
  mode: Mode
  settings: Settings
}
