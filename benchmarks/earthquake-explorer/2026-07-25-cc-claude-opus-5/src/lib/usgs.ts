/**
 * Access layer for the USGS real-time earthquake GeoJSON feeds.
 * https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
 */

export type FeedWindow = 'hour' | 'day' | 'week' | 'month'
export type FeedLevel = 'all' | '1.0' | '2.5' | '4.5' | 'significant'

export interface Quake {
  id: string
  mag: number
  place: string
  /** Millisecond epoch of the event origin. */
  time: number
  updated: number
  url: string
  felt: number | null
  /** Community Determined Intensity (reported shaking). */
  cdi: number | null
  /** Modified Mercalli Intensity (instrumental shaking estimate). */
  mmi: number | null
  alert: string | null
  status: string
  tsunami: number
  sig: number
  net: string
  magType: string | null
  type: string
  title: string
  /** Number of seismic stations used in the location solution. */
  nst: number | null
  /** Largest azimuthal gap between stations, in degrees. */
  gap: number | null
  /** Horizontal distance to the nearest station, in degrees. */
  dmin: number | null
  rms: number | null
  lon: number
  lat: number
  /** Depth below sea level, in kilometres. */
  depth: number
}

export interface QuakeFeed {
  quakes: Quake[]
  generated: number
  title: string
}

const BASE = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary'

export function feedUrl(level: FeedLevel, window: FeedWindow): string {
  return `${BASE}/${level}_${window}.geojson`
}

interface RawFeature {
  id?: string
  properties?: Record<string, unknown>
  geometry?: { coordinates?: unknown } | null
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/** Converts one raw GeoJSON feature into a Quake, or null when unusable. */
function toQuake(feature: RawFeature): Quake | null {
  const p = feature.properties ?? {}
  const coords = feature.geometry?.coordinates
  if (!Array.isArray(coords)) return null

  const lon = num(coords[0])
  const lat = num(coords[1])
  const mag = num(p.mag)
  const time = num(p.time)
  // A point without a real position, magnitude or time cannot be plotted or ranked.
  if (lon === null || lat === null || mag === null || time === null) return null
  if (!feature.id) return null

  return {
    id: feature.id,
    mag,
    place: str(p.place, 'Unknown location'),
    time,
    updated: num(p.updated) ?? time,
    url: str(p.url),
    felt: num(p.felt),
    cdi: num(p.cdi),
    mmi: num(p.mmi),
    alert: typeof p.alert === 'string' ? p.alert : null,
    status: str(p.status, 'automatic'),
    tsunami: num(p.tsunami) ?? 0,
    sig: num(p.sig) ?? 0,
    net: str(p.net),
    magType: typeof p.magType === 'string' ? p.magType : null,
    type: str(p.type, 'earthquake'),
    title: str(p.title, str(p.place, 'Unknown event')),
    nst: num(p.nst),
    gap: num(p.gap),
    dmin: num(p.dmin),
    rms: num(p.rms),
    lon,
    lat,
    depth: num(coords[2]) ?? 0,
  }
}

export async function fetchFeed(
  level: FeedLevel,
  window: FeedWindow,
  signal?: AbortSignal,
): Promise<QuakeFeed> {
  const res = await fetch(feedUrl(level, window), { signal })
  if (!res.ok) {
    throw new Error(`USGS feed responded ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as {
    features?: RawFeature[]
    metadata?: { generated?: number; title?: string }
  }
  const features = Array.isArray(json.features) ? json.features : []
  const quakes: Quake[] = []
  for (const feature of features) {
    const quake = toQuake(feature)
    if (quake) quakes.push(quake)
  }
  // Newest first: every list, chart and "latest" affordance depends on this order.
  quakes.sort((a, b) => b.time - a.time)
  return {
    quakes,
    generated: json.metadata?.generated ?? Date.now(),
    title: json.metadata?.title ?? 'USGS earthquakes',
  }
}
