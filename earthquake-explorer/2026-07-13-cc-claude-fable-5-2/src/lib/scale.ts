import type { AlertLevel, DepthBand, Quake } from '../types'

/**
 * Shared magnitude scale — used identically by the map, list badges,
 * timeline and legend so magnitude reads the same everywhere.
 * Thresholds: <2 micro · 2–4 light · 4–5.5 moderate · 5.5–7 strong · 7+ major
 */
export const MAG_BREAKS = [2, 4, 5.5, 7] as const

export const MAG_COLORS = ['#96a39d', '#d3b45f', '#ef8f36', '#f2543d', '#ff2d55'] as const

export const MAG_BUCKETS = [
  { label: 'Micro', range: '< 2', color: MAG_COLORS[0] },
  { label: 'Light', range: '2 – 3.9', color: MAG_COLORS[1] },
  { label: 'Moderate', range: '4 – 5.4', color: MAG_COLORS[2] },
  { label: 'Strong', range: '5.5 – 6.9', color: MAG_COLORS[3] },
  { label: 'Major', range: '7 +', color: MAG_COLORS[4] },
] as const

export function magBucketIndex(mag: number | null): number {
  if (mag == null) return 0
  let i = 0
  for (const b of MAG_BREAKS) {
    if (mag >= b) i++
  }
  return i
}

export function magColor(mag: number | null): string {
  return MAG_COLORS[magBucketIndex(mag)]
}

export function magBucketLabel(mag: number | null): string {
  return MAG_BUCKETS[magBucketIndex(mag)].label
}

export function fmtMag(mag: number | null): string {
  if (mag == null) return '—'
  return mag.toFixed(1)
}

/** Circle radius in px for a magnitude — mirrors the map's interpolation. */
export function magRadius(mag: number | null): number {
  const m = mag ?? 0
  if (m <= 0) return 3
  if (m >= 8) return 26
  const stops: Array<[number, number]> = [
    [0, 3],
    [2, 4],
    [3, 6],
    [4, 8],
    [5, 11],
    [6, 15],
    [7, 20],
    [8, 26],
  ]
  for (let i = 1; i < stops.length; i++) {
    if (m <= stops[i][0]) {
      const [x0, y0] = stops[i - 1]
      const [x1, y1] = stops[i]
      return y0 + ((m - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return 26
}

export const DEPTH_BANDS: Array<{ key: DepthBand; label: string; hint: string }> = [
  { key: 'shallow', label: 'Shallow', hint: '0 – 70 km' },
  { key: 'intermediate', label: 'Intermediate', hint: '70 – 300 km' },
  { key: 'deep', label: 'Deep', hint: '300 + km' },
]

export function depthBand(depth: number | null): DepthBand | null {
  if (depth == null) return null
  if (depth < 70) return 'shallow'
  if (depth < 300) return 'intermediate'
  return 'deep'
}

export function depthBandLabel(depth: number | null): string {
  const band = depthBand(depth)
  if (!band) return 'Unknown depth'
  return DEPTH_BANDS.find((b) => b.key === band)?.label ?? 'Unknown depth'
}

export const ALERT_META: Record<AlertLevel, { color: string; label: string; desc: string }> = {
  green: {
    color: '#57b874',
    label: 'Green',
    desc: 'PAGER estimate: little or no impact on people or structures expected.',
  },
  yellow: {
    color: '#e3c74f',
    label: 'Yellow',
    desc: 'PAGER estimate: localized impact possible; some casualties or damage cannot be ruled out.',
  },
  orange: {
    color: '#ef8f36',
    label: 'Orange',
    desc: 'PAGER estimate: significant impact likely; a regional response may be needed.',
  },
  red: {
    color: '#f2543d',
    label: 'Red',
    desc: 'PAGER estimate: high impact likely; a national or international response may be needed.',
  },
}

/**
 * Split a USGS place string like "103 km SSE of Suva, Fiji" into
 * a distance prefix and the locality so lists can emphasize the locality.
 */
export function splitPlace(place: string): { prefix: string | null; locality: string } {
  const idx = place.indexOf(' of ')
  if (idx > 0 && idx < 40) {
    return { prefix: place.slice(0, idx + 3), locality: place.slice(idx + 4) }
  }
  return { prefix: null, locality: place }
}

/** Human label for a non-earthquake event type, or null for plain earthquakes. */
export function eventTypeLabel(q: Quake): string | null {
  if (q.type === 'earthquake') return null
  return q.type.replace(/_/g, ' ')
}
