export type FeedKey = 'hour' | 'day' | 'week' | 'month'

export type AlertLevel = 'green' | 'yellow' | 'orange' | 'red'

/** Alert filter values — 'none' matches events with no PAGER alert assigned. */
export type AlertFilter = AlertLevel | 'none'

export type DepthBand = 'shallow' | 'intermediate' | 'deep'

export type ReviewFilter = 'any' | 'reviewed' | 'automatic'

export type SortKey = 'time' | 'mag' | 'sig' | 'depth'

/** Normalized USGS event. */
export interface Quake {
  id: string
  mag: number | null
  place: string
  time: number
  updated: number
  url: string
  felt: number | null
  cdi: number | null
  mmi: number | null
  alert: AlertLevel | null
  status: 'reviewed' | 'automatic' | 'deleted' | 'unknown'
  tsunami: boolean
  sig: number | null
  net: string
  nst: number | null
  gap: number | null
  magType: string | null
  type: string
  title: string
  lng: number
  lat: number
  depth: number | null
}

export interface MapBounds {
  west: number
  south: number
  east: number
  north: number
}

export interface MapViewState {
  lng: number
  lat: number
  zoom: number
}

export type MapAction =
  | { kind: 'fit'; bounds: [[number, number], [number, number]]; nonce: number }
  | { kind: 'fly'; lng: number; lat: number; zoom: number; nonce: number }
  | { kind: 'reveal'; id: string; nonce: number }

export interface FilterState {
  /** Minimum magnitude; -1 means "all" (USGS includes negative magnitudes). */
  minMag: number
  /** Selected depth bands; empty array = all depths. */
  depthBands: DepthBand[]
  /** Selected alert levels ('none' = no alert assigned); empty array = all. */
  alerts: AlertFilter[]
  tsunamiOnly: boolean
  review: ReviewFilter
  /** Restrict the event stream / timeline / stats to the current map view. */
  inViewOnly: boolean
}

export interface FeedMeta {
  key: FeedKey
  label: string
  short: string
  url: string
  windowMs: number
  refreshMs: number
  binMs: number
}
