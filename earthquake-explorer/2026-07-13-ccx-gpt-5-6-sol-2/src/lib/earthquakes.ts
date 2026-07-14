import type { Earthquake, FilterState, GeoArea, MapBounds, TimeRange, UsgsFeature, UsgsFeatureCollection } from '../types/earthquake'

export const FEED_URLS: Record<TimeRange, string> = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
}

export const RANGE_LABELS: Record<TimeRange, string> = {
  hour: 'Past hour', day: 'Past day', week: '7 days', month: '30 days',
}

export const AREA_LABELS: Record<GeoArea, string> = {
  world: 'Worldwide', americas: 'Americas', pacific: 'Pacific Ring', asia: 'Asia',
  europe: 'Europe', africa: 'Africa', oceania: 'Oceania', viewport: 'Visible map',
}

export const DEFAULT_FILTERS: FilterState = {
  timeRange: 'day',
  minMagnitude: 1,
  maxDepth: 700,
  alerts: [],
  tsunamiOnly: false,
  reviewStatus: 'all',
  area: 'world',
  query: '',
  sort: 'significance',
}

export function normalizeFeature(feature: UsgsFeature): Earthquake {
  const [longitude, latitude, depth] = feature.geometry.coordinates
  const p = feature.properties
  return {
    id: feature.id,
    magnitude: p.mag,
    place: p.place || 'Location not reported',
    time: p.time,
    updated: p.updated,
    longitude,
    latitude,
    depth,
    felt: p.felt,
    cdi: p.cdi,
    mmi: p.mmi,
    alert: p.alert,
    status: p.status,
    tsunami: p.tsunami === 1,
    significance: p.sig,
    network: p.net,
    code: p.code,
    magnitudeType: p.magType,
    eventType: p.type,
    title: p.title,
    url: p.url,
    detailUrl: p.detail,
  }
}

export function parseCollection(value: unknown): { events: Earthquake[]; generatedAt: number } {
  if (!value || typeof value !== 'object') throw new Error('USGS returned an unreadable response.')
  const collection = value as UsgsFeatureCollection
  if (!Array.isArray(collection.features) || !collection.metadata?.generated) {
    throw new Error('USGS returned an unexpected data format.')
  }
  return { events: collection.features.map(normalizeFeature), generatedAt: collection.metadata.generated }
}

function inArea(event: Earthquake, area: GeoArea, bounds: MapBounds | null): boolean {
  const { latitude: lat, longitude: lon } = event
  if (area === 'world') return true
  if (area === 'viewport') {
    if (!bounds) return true
    const longitudeMatch = bounds.west <= bounds.east
      ? lon >= bounds.west && lon <= bounds.east
      : lon >= bounds.west || lon <= bounds.east
    return lat >= bounds.south && lat <= bounds.north && longitudeMatch
  }
  if (area === 'americas') return lat >= -60 && lat <= 85 && lon >= -170 && lon <= -30
  if (area === 'pacific') return (lon >= 120 || lon <= -65) && lat >= -60 && lat <= 70
  if (area === 'asia') return lat >= -10 && lat <= 80 && lon >= 25 && lon <= 180
  if (area === 'europe') return lat >= 34 && lat <= 72 && lon >= -25 && lon <= 45
  if (area === 'africa') return lat >= -38 && lat <= 38 && lon >= -20 && lon <= 55
  return lat >= -55 && lat <= 10 && (lon >= 105 || lon <= -110)
}

export function filterAndSort(events: Earthquake[], filters: FilterState, bounds: MapBounds | null): Earthquake[] {
  const query = filters.query.trim().toLocaleLowerCase()
  return events
    .filter((event) => (event.magnitude ?? -Infinity) >= filters.minMagnitude)
    .filter((event) => event.depth <= filters.maxDepth)
    .filter((event) => filters.alerts.length === 0 || filters.alerts.includes(event.alert ?? 'none'))
    .filter((event) => !filters.tsunamiOnly || event.tsunami)
    .filter((event) => filters.reviewStatus === 'all' || (filters.reviewStatus === 'reviewed' ? event.status === 'reviewed' : event.status !== 'reviewed'))
    .filter((event) => inArea(event, filters.area, bounds))
    .filter((event) => !query || `${event.place} ${event.title} ${event.network}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => {
      if (filters.sort === 'newest') return b.time - a.time
      if (filters.sort === 'magnitude') return (b.magnitude ?? -1) - (a.magnitude ?? -1)
      if (filters.sort === 'depth') return b.depth - a.depth
      if (filters.sort === 'felt') return (b.felt ?? -1) - (a.felt ?? -1)
      return b.significance - a.significance || (b.magnitude ?? -1) - (a.magnitude ?? -1)
    })
}

export function magnitudeBand(magnitude: number | null): 'minor' | 'light' | 'moderate' | 'strong' | 'major' | 'unknown' {
  if (magnitude === null) return 'unknown'
  if (magnitude >= 6) return 'major'
  if (magnitude >= 5) return 'strong'
  if (magnitude >= 4) return 'moderate'
  if (magnitude >= 2.5) return 'light'
  return 'minor'
}

export function magnitudeLabel(magnitude: number | null): string {
  if (magnitude === null) return 'Magnitude pending'
  const band = magnitudeBand(magnitude)
  return `${band.charAt(0).toUpperCase()}${band.slice(1)} magnitude`
}

export function formatMagnitude(magnitude: number | null): string {
  return magnitude === null ? '—' : magnitude.toFixed(1)
}

export function formatDepth(depth: number): string {
  return `${depth < 10 ? depth.toFixed(1) : Math.round(depth)} km`
}

export function formatRelativeTime(time: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - time) / 60_000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h ago`
}

export function formatDateTime(time: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium', timeStyle: 'long',
  }).format(new Date(time))
}

export function formatUtc(time: number): string {
  return new Intl.DateTimeFormat('en', {
    timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(time)) + ' UTC'
}

export function significanceLabel(value: number): string {
  if (value >= 600) return 'Highly significant'
  if (value >= 400) return 'Notable'
  if (value >= 250) return 'Above ordinary'
  return 'Routine activity'
}

export function depthClass(depth: number): 'shallow' | 'intermediate' | 'deep' {
  if (depth <= 70) return 'shallow'
  if (depth <= 300) return 'intermediate'
  return 'deep'
}

export function filterCount(filters: FilterState): number {
  return Number(filters.minMagnitude !== DEFAULT_FILTERS.minMagnitude)
    + Number(filters.maxDepth !== DEFAULT_FILTERS.maxDepth)
    + Number(filters.alerts.length > 0)
    + Number(filters.tsunamiOnly)
    + Number(filters.reviewStatus !== 'all')
    + Number(filters.area !== 'world')
    + Number(Boolean(filters.query.trim()))
}

export function filtersFromUrl(): { filters: FilterState; selectedId: string | null } {
  const params = new URLSearchParams(window.location.search)
  const timeRange = params.get('range') as TimeRange | null
  const minMagnitudeParam = params.get('minMag')
  const maxDepthParam = params.get('maxDepth')
  const sort = params.get('sort') as FilterState['sort'] | null
  const area = params.get('area') as GeoArea | null
  const review = params.get('review') as FilterState['reviewStatus'] | null
  const alerts = (params.get('alerts')?.split(',') ?? []).filter(Boolean) as FilterState['alerts']
  return {
    filters: {
      ...DEFAULT_FILTERS,
      timeRange: timeRange && timeRange in FEED_URLS ? timeRange : DEFAULT_FILTERS.timeRange,
      minMagnitude: minMagnitudeParam !== null && Number.isFinite(Number(minMagnitudeParam)) ? Number(minMagnitudeParam) : DEFAULT_FILTERS.minMagnitude,
      maxDepth: maxDepthParam !== null && Number.isFinite(Number(maxDepthParam)) ? Number(maxDepthParam) : DEFAULT_FILTERS.maxDepth,
      alerts,
      tsunamiOnly: params.get('tsunami') === '1',
      reviewStatus: review === 'reviewed' || review === 'automatic' ? review : 'all',
      area: area && area in AREA_LABELS ? area : 'world',
      query: params.get('q') ?? '',
      sort: sort && ['significance', 'newest', 'magnitude', 'depth', 'felt'].includes(sort) ? sort : 'significance',
    },
    selectedId: params.get('event'),
  }
}

export function writeUrlState(filters: FilterState, selectedId: string | null): void {
  const params = new URLSearchParams()
  if (filters.timeRange !== DEFAULT_FILTERS.timeRange) params.set('range', filters.timeRange)
  if (filters.minMagnitude !== DEFAULT_FILTERS.minMagnitude) params.set('minMag', String(filters.minMagnitude))
  if (filters.maxDepth !== DEFAULT_FILTERS.maxDepth) params.set('maxDepth', String(filters.maxDepth))
  if (filters.alerts.length) params.set('alerts', filters.alerts.join(','))
  if (filters.tsunamiOnly) params.set('tsunami', '1')
  if (filters.reviewStatus !== 'all') params.set('review', filters.reviewStatus)
  if (filters.area !== 'world') params.set('area', filters.area)
  if (filters.query.trim()) params.set('q', filters.query.trim())
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort)
  if (selectedId) params.set('event', selectedId)
  const next = params.toString() ? `?${params.toString()}` : window.location.pathname
  window.history.replaceState(null, '', next)
}
