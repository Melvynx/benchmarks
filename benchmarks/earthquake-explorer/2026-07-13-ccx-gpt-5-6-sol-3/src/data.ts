import type { EarthquakeFeature, EarthquakeFeed, FilterState, MapBounds, TimeRange } from './types'

export const FEEDS: Record<TimeRange, string> = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
}

export const RANGE_LABELS: Record<TimeRange, string> = {
  hour: 'Past hour',
  day: 'Past 24 hours',
  week: 'Past 7 days',
  month: 'Past 30 days',
}

export const RANGE_MS: Record<TimeRange, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
}

export const DEFAULT_FILTERS: FilterState = {
  range: 'week',
  minMagnitude: 2.5,
  depth: 'all',
  alert: 'all',
  tsunami: 'all',
  status: 'all',
  query: '',
  sort: 'significance',
  area: 'world',
}

export function parseUrlState(): { filters: FilterState; selectedId: string | null } {
  const params = new URLSearchParams(window.location.search)
  const range = params.get('range')
  const depth = params.get('depth')
  const alert = params.get('alert')
  const tsunami = params.get('tsunami')
  const status = params.get('status')
  const sort = params.get('sort')
  const area = params.get('area')
  const magnitude = params.has('mag') ? Number(params.get('mag')) : Number.NaN

  return {
    filters: {
      range: range === 'hour' || range === 'day' || range === 'month' ? range : 'week',
      minMagnitude: Number.isFinite(magnitude) && magnitude >= -1 && magnitude <= 10 ? magnitude : DEFAULT_FILTERS.minMagnitude,
      depth: depth === 'shallow' || depth === 'intermediate' || depth === 'deep' ? depth : 'all',
      alert: alert === 'green' || alert === 'yellow' || alert === 'orange' || alert === 'red' || alert === 'none' ? alert : 'all',
      tsunami: tsunami === 'yes' || tsunami === 'no' ? tsunami : 'all',
      status: status === 'reviewed' || status === 'automatic' ? status : 'all',
      query: params.get('q') ?? '',
      sort: sort === 'magnitude' || sort === 'newest' || sort === 'depth' ? sort : 'significance',
      area: area === 'viewport' ? 'viewport' : 'world',
    },
    selectedId: params.get('event'),
  }
}

export function writeUrlState(filters: FilterState, selectedId: string | null) {
  const params = new URLSearchParams()
  if (filters.range !== DEFAULT_FILTERS.range) params.set('range', filters.range)
  if (filters.minMagnitude !== DEFAULT_FILTERS.minMagnitude) params.set('mag', String(filters.minMagnitude))
  if (filters.depth !== 'all') params.set('depth', filters.depth)
  if (filters.alert !== 'all') params.set('alert', filters.alert)
  if (filters.tsunami !== 'all') params.set('tsunami', filters.tsunami)
  if (filters.status !== 'all') params.set('status', filters.status)
  if (filters.query) params.set('q', filters.query)
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort)
  if (filters.area !== 'world') params.set('area', filters.area)
  if (selectedId) params.set('event', selectedId)
  const query = params.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
}

export function inBounds(event: EarthquakeFeature, bounds: MapBounds | null) {
  if (!bounds) return true
  const [longitude, latitude] = event.geometry.coordinates
  const longitudeMatches = bounds.west <= bounds.east
    ? longitude >= bounds.west && longitude <= bounds.east
    : longitude >= bounds.west || longitude <= bounds.east
  return latitude >= bounds.south && latitude <= bounds.north && longitudeMatches
}

export function filterEvents(events: EarthquakeFeature[], filters: FilterState, bounds: MapBounds | null) {
  const query = filters.query.trim().toLocaleLowerCase()
  const filtered = events.filter((event) => {
    const magnitude = event.properties.mag ?? -10
    const depth = event.geometry.coordinates[2]
    const alert = event.properties.alert ?? 'none'
    const reviewed = event.properties.status.toLowerCase() === 'reviewed'

    if (event.properties.mag == null ? filters.minMagnitude > -1 : magnitude < filters.minMagnitude) return false
    if (filters.depth === 'shallow' && depth >= 70) return false
    if (filters.depth === 'intermediate' && (depth < 70 || depth >= 300)) return false
    if (filters.depth === 'deep' && depth < 300) return false
    if (filters.alert !== 'all' && alert !== filters.alert) return false
    if (filters.tsunami === 'yes' && event.properties.tsunami !== 1) return false
    if (filters.tsunami === 'no' && event.properties.tsunami === 1) return false
    if (filters.status === 'reviewed' && !reviewed) return false
    if (filters.status === 'automatic' && reviewed) return false
    if (query && !(event.properties.place ?? event.properties.title).toLocaleLowerCase().includes(query)) return false
    if (filters.area === 'viewport' && !inBounds(event, bounds)) return false
    return true
  })

  return filtered.sort((a, b) => {
    if (filters.sort === 'magnitude') return (b.properties.mag ?? -10) - (a.properties.mag ?? -10)
    if (filters.sort === 'newest') return b.properties.time - a.properties.time
    if (filters.sort === 'depth') return b.geometry.coordinates[2] - a.geometry.coordinates[2]
    return b.properties.sig - a.properties.sig || (b.properties.mag ?? -10) - (a.properties.mag ?? -10)
  })
}

export function formatMagnitude(magnitude: number | null) {
  return magnitude == null ? '—' : magnitude.toFixed(1)
}

export function formatDepth(depth: number) {
  if (!Number.isFinite(depth)) return 'Depth unavailable'
  return `${depth < 10 ? depth.toFixed(1) : Math.round(depth)} km deep`
}

export function formatRelativeTime(timestamp: number, now = Date.now()) {
  const delta = Math.max(0, now - timestamp)
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 1) return 'moments ago'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(timestamp)
}

export function formatUtc(timestamp: number) {
  return new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  }).format(timestamp)
}

export function magnitudeLabel(magnitude: number | null) {
  if (magnitude == null) return 'Magnitude unavailable'
  if (magnitude < 2.5) return 'Usually not felt'
  if (magnitude < 4) return 'Often felt nearby'
  if (magnitude < 5) return 'Light shaking possible'
  if (magnitude < 6) return 'Potentially damaging locally'
  if (magnitude < 7) return 'Strong earthquake'
  return 'Major earthquake'
}

export function depthBand(depth: number) {
  if (depth < 70) return 'Shallow'
  if (depth < 300) return 'Intermediate'
  return 'Deep'
}

export function percentileContext(event: EarthquakeFeature, events: EarthquakeFeature[]) {
  if (!events.length) return 'Context unavailable'
  const below = events.filter((item) => item.properties.sig < event.properties.sig).length
  const percentile = Math.max(1, Math.round((below / events.length) * 100))
  if (percentile >= 95) return `Among the most significant ${Math.max(1, 100 - percentile)}% in this view`
  if (percentile >= 75) return 'More significant than most events in this view'
  if (percentile >= 40) return 'Within the typical range for this view'
  return 'Lower significance than most events in this view'
}

export function loadCachedFeed(range: TimeRange): EarthquakeFeed | null {
  try {
    const raw = localStorage.getItem(`seismic-field:${range}`)
    return raw ? JSON.parse(raw) as EarthquakeFeed : null
  } catch {
    return null
  }
}

export function cacheFeed(range: TimeRange, feed: EarthquakeFeed) {
  try {
    localStorage.setItem(`seismic-field:${range}`, JSON.stringify(feed))
  } catch {
    // Storage may be unavailable; live data remains usable.
  }
}
