export type TimeRange = 'hour' | 'day' | 'week' | 'month'
export type SortMode = 'significance' | 'newest' | 'magnitude' | 'depth'
export type ReviewFilter = 'all' | 'reviewed' | 'automatic'
export type AreaFilter = 'world' | 'ring-of-fire' | 'americas' | 'asia-pacific' | 'europe-africa'

export interface Earthquake {
  id: string
  magnitude: number | null
  place: string
  time: number
  updated: number
  longitude: number
  latitude: number
  depth: number | null
  felt: number | null
  significance: number | null
  alert: 'green' | 'yellow' | 'orange' | 'red' | null
  tsunami: boolean
  status: string | null
  type: string | null
  url: string
  detailUrl: string | null
  title: string
}

export interface UsgsFeatureCollection {
  type: 'FeatureCollection'
  metadata: {
    generated: number
    title: string
    count: number
    url: string
  }
  features: Array<{
    id: string
    properties: {
      mag: number | null
      place: string | null
      time: number
      updated: number
      felt: number | null
      alert: Earthquake['alert']
      tsunami: number
      sig: number | null
      status: string | null
      type: string | null
      url: string
      detail: string | null
      title: string | null
    }
    geometry: {
      type: 'Point'
      coordinates: [number, number, number?]
    }
  }>
}

export interface Filters {
  range: TimeRange
  minMagnitude: number
  maxDepth: number
  alert: 'all' | 'green' | 'yellow' | 'orange' | 'red'
  tsunamiOnly: boolean
  review: ReviewFilter
  area: AreaFilter
  query: string
  sort: SortMode
}
