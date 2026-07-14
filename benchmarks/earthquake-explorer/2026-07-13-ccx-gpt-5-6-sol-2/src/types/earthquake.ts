export type TimeRange = 'hour' | 'day' | 'week' | 'month'
export type SortMode = 'significance' | 'newest' | 'magnitude' | 'depth' | 'felt'
export type AlertLevel = 'green' | 'yellow' | 'orange' | 'red' | 'none'
export type ReviewStatus = 'reviewed' | 'automatic' | 'all'
export type GeoArea = 'world' | 'americas' | 'pacific' | 'asia' | 'europe' | 'africa' | 'oceania' | 'viewport'

export interface UsgsFeatureCollection {
  type: 'FeatureCollection'
  metadata: {
    generated: number
    url: string
    title: string
    status: number
    api?: string
    count: number
  }
  features: UsgsFeature[]
}

export interface UsgsFeature {
  type: 'Feature'
  id: string
  properties: {
    mag: number | null
    place: string | null
    time: number
    updated: number
    tz: number | null
    url: string
    detail: string
    felt: number | null
    cdi: number | null
    mmi: number | null
    alert: Exclude<AlertLevel, 'none'> | null
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
  geometry: {
    type: 'Point'
    coordinates: [number, number, number]
  }
}

export interface Earthquake {
  id: string
  magnitude: number | null
  place: string
  time: number
  updated: number
  longitude: number
  latitude: number
  depth: number
  felt: number | null
  cdi: number | null
  mmi: number | null
  alert: Exclude<AlertLevel, 'none'> | null
  status: string
  tsunami: boolean
  significance: number
  network: string
  code: string
  magnitudeType: string | null
  eventType: string
  title: string
  url: string
  detailUrl: string
}

export interface FilterState {
  timeRange: TimeRange
  minMagnitude: number
  maxDepth: number
  alerts: AlertLevel[]
  tsunamiOnly: boolean
  reviewStatus: ReviewStatus
  area: GeoArea
  query: string
  sort: SortMode
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}
