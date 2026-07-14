export type TimeRange = 'hour' | 'day' | 'week' | 'month'
export type DepthBand = 'all' | 'shallow' | 'intermediate' | 'deep'
export type AlertLevel = 'all' | 'green' | 'yellow' | 'orange' | 'red' | 'none'
export type ReviewStatus = 'all' | 'reviewed' | 'automatic'
export type TsunamiFilter = 'all' | 'yes' | 'no'
export type SortMode = 'significance' | 'magnitude' | 'newest' | 'depth'
export type AreaMode = 'world' | 'viewport'

export interface EarthquakeProperties {
  mag: number | null
  place: string | null
  time: number
  updated: number
  url: string
  detail: string
  felt: number | null
  cdi: number | null
  mmi: number | null
  alert: 'green' | 'yellow' | 'orange' | 'red' | null
  status: string
  tsunami: number
  sig: number
  net: string
  code: string
  ids: string
  sources: string
  types: string
  nst: number | null
  dmin: number | null
  rms: number | null
  gap: number | null
  magType: string | null
  type: string
  title: string
}

export interface EarthquakeFeature {
  type: 'Feature'
  properties: EarthquakeProperties
  geometry: {
    type: 'Point'
    coordinates: [number, number, number]
  }
  id: string
}

export interface EarthquakeFeed {
  type: 'FeatureCollection'
  metadata: {
    generated: number
    url: string
    title: string
    status: number
    api: string
    count: number
  }
  features: EarthquakeFeature[]
  bbox: [number, number, number, number, number, number]
}

export interface FilterState {
  range: TimeRange
  minMagnitude: number
  depth: DepthBand
  alert: AlertLevel
  tsunami: TsunamiFilter
  status: ReviewStatus
  query: string
  sort: SortMode
  area: AreaMode
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}
