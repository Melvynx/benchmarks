import type { AreaFilter, Earthquake, Filters, SortMode } from './types'

export const RANGE_LABELS = { hour: 'Past hour', day: 'Past day', week: '7 days', month: '30 days' } as const

export function formatMagnitude(value: number | null) {
  return value == null ? 'M—' : `M${value.toFixed(1)}`
}

export function formatDepth(value: number | null) {
  return value == null ? 'Depth unavailable' : `${value.toFixed(value < 10 ? 1 : 0)} km deep`
}

export function formatRelativeTime(timestamp: number, now = Date.now()) {
  const seconds = Math.round((timestamp - now) / 1000)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second')
  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour')
  return formatter.format(Math.round(hours / 24), 'day')
}

export function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
  }).format(timestamp)
}

export function formatLocalTime(timestamp: number, longitude: number) {
  const offsetHours = Math.max(-12, Math.min(14, Math.round(longitude / 15)))
  const shifted = new Date(timestamp + offsetHours * 3_600_000)
  const sign = offsetHours >= 0 ? '+' : '−'
  return `${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hourCycle: 'h12', timeZone: 'UTC' }).format(shifted)} UTC${sign}${Math.abs(offsetHours)}`
}

export function magnitudeClass(magnitude: number | null) {
  if (magnitude == null) return 'unknown'
  if (magnitude >= 6) return 'major'
  if (magnitude >= 4.5) return 'strong'
  if (magnitude >= 2.5) return 'moderate'
  return 'minor'
}

export function magnitudeLabel(magnitude: number | null) {
  if (magnitude == null) return 'Magnitude unavailable'
  if (magnitude >= 7) return 'Major earthquake'
  if (magnitude >= 6) return 'Strong earthquake'
  if (magnitude >= 4.5) return 'Notable earthquake'
  if (magnitude >= 2.5) return 'Light earthquake'
  return 'Minor earthquake'
}

export function significanceLabel(event: Earthquake) {
  if (event.alert === 'red' || event.alert === 'orange' || (event.significance ?? 0) >= 1000) return 'Potentially concerning — follow official sources'
  if (event.tsunami || event.alert === 'yellow' || (event.magnitude ?? 0) >= 5.5 || (event.significance ?? 0) >= 600) return 'Notable — worth closer attention'
  return 'Within ordinary recent activity'
}

export function inArea(event: Earthquake, area: AreaFilter) {
  const { latitude: lat, longitude: lon } = event
  switch (area) {
    case 'world': return true
    case 'americas': return lon >= -170 && lon <= -30
    case 'asia-pacific': return lon >= 90 || lon <= -150
    case 'europe-africa': return lon > -30 && lon < 90
    case 'ring-of-fire':
      return (lon <= -100 && lat > -60) || (lon >= 100 && (lat > -60 && lat < 70)) || (lon <= -150 && lat < 0)
  }
}

export function applyFilters(events: Earthquake[], filters: Filters) {
  const query = filters.query.trim().toLocaleLowerCase()
  const filtered = events.filter((event) => {
    if ((event.magnitude ?? -Infinity) < filters.minMagnitude) return false
    if ((event.depth ?? Infinity) > filters.maxDepth) return false
    if (filters.alert !== 'all' && event.alert !== filters.alert) return false
    if (filters.tsunamiOnly && !event.tsunami) return false
    if (filters.review !== 'all') {
      const isReviewed = event.status === 'reviewed'
      if (filters.review === 'reviewed' ? !isReviewed : isReviewed) return false
    }
    if (!inArea(event, filters.area)) return false
    if (query && !event.place.toLocaleLowerCase().includes(query)) return false
    return true
  })
  return filtered.sort(sortComparator(filters.sort))
}

function sortComparator(sort: SortMode) {
  return (a: Earthquake, b: Earthquake) => {
    if (sort === 'newest') return b.time - a.time
    if (sort === 'magnitude') return (b.magnitude ?? -Infinity) - (a.magnitude ?? -Infinity)
    if (sort === 'depth') return (a.depth ?? Infinity) - (b.depth ?? Infinity)
    return (b.significance ?? -Infinity) - (a.significance ?? -Infinity) || (b.magnitude ?? -Infinity) - (a.magnitude ?? -Infinity)
  }
}

export function buildUrl(filters: Filters, selectedId: string | null) {
  const params = new URLSearchParams()
  if (filters.range !== 'week') params.set('range', filters.range)
  if (filters.minMagnitude > 0) params.set('minMag', String(filters.minMagnitude))
  if (filters.maxDepth < 700) params.set('depth', String(filters.maxDepth))
  if (filters.alert !== 'all') params.set('alert', filters.alert)
  if (filters.tsunamiOnly) params.set('tsunami', '1')
  if (filters.review !== 'all') params.set('review', filters.review)
  if (filters.area !== 'world') params.set('area', filters.area)
  if (filters.query) params.set('q', filters.query)
  if (filters.sort !== 'significance') params.set('sort', filters.sort)
  if (selectedId) params.set('event', selectedId)
  const query = params.toString()
  return `${window.location.pathname}${query ? `?${query}` : ''}`
}

export function readUrlFilters(): Partial<Filters> & { selectedId?: string } {
  const params = new URLSearchParams(window.location.search)
  const range = params.get('range')
  const alert = params.get('alert')
  const review = params.get('review')
  const area = params.get('area')
  const sort = params.get('sort')
  return {
    ...(range && ['hour', 'day', 'week', 'month'].includes(range) ? { range: range as Filters['range'] } : {}),
    ...(params.has('minMag') ? { minMagnitude: Number(params.get('minMag')) || 0 } : {}),
    ...(params.has('depth') ? { maxDepth: Number(params.get('depth')) || 700 } : {}),
    ...(alert && ['all', 'green', 'yellow', 'orange', 'red'].includes(alert) ? { alert: alert as Filters['alert'] } : {}),
    tsunamiOnly: params.get('tsunami') === '1',
    ...(review && ['all', 'reviewed', 'automatic'].includes(review) ? { review: review as Filters['review'] } : {}),
    ...(area && ['world', 'ring-of-fire', 'americas', 'asia-pacific', 'europe-africa'].includes(area) ? { area: area as Filters['area'] } : {}),
    query: params.get('q') || '',
    ...(sort && ['significance', 'newest', 'magnitude', 'depth'].includes(sort) ? { sort: sort as Filters['sort'] } : {}),
    selectedId: params.get('event') || undefined,
  }
}

export function activeFilterCount(filters: Filters) {
  return Number(filters.minMagnitude > 0) + Number(filters.maxDepth < 700) + Number(filters.alert !== 'all') + Number(filters.tsunamiOnly) + Number(filters.review !== 'all') + Number(filters.area !== 'world') + Number(Boolean(filters.query))
}
