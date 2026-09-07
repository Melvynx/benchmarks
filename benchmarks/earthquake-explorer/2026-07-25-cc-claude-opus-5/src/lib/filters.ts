import type { Quake } from './usgs'

export type SortKey = 'time' | 'magnitude' | 'depth' | 'significance'
export type EventTypeFilter = 'all' | 'earthquake' | 'other'

export interface Filters {
  magRange: [number, number]
  depthRange: [number, number]
  /** Absolute epoch bounds from the timeline brush, or null for the whole feed. */
  timeRange: [number, number] | null
  query: string
  onlyTsunami: boolean
  onlyFelt: boolean
  onlyAlerted: boolean
  eventType: EventTypeFilter
  sort: SortKey
}

export const MAG_BOUNDS: [number, number] = [-1, 10]
export const DEPTH_BOUNDS: [number, number] = [0, 800]

export const DEFAULT_FILTERS: Filters = {
  magRange: [...MAG_BOUNDS] as [number, number],
  depthRange: [...DEPTH_BOUNDS] as [number, number],
  timeRange: null,
  query: '',
  onlyTsunami: false,
  onlyFelt: false,
  onlyAlerted: false,
  eventType: 'all',
  sort: 'time',
}

export function isDefaultFilters(f: Filters): boolean {
  return (
    f.magRange[0] === MAG_BOUNDS[0] &&
    f.magRange[1] === MAG_BOUNDS[1] &&
    f.depthRange[0] === DEPTH_BOUNDS[0] &&
    f.depthRange[1] === DEPTH_BOUNDS[1] &&
    f.timeRange === null &&
    f.query.trim() === '' &&
    !f.onlyTsunami &&
    !f.onlyFelt &&
    !f.onlyAlerted &&
    f.eventType === 'all'
  )
}

/** Count of filter facets that are currently narrowing the data. */
export function activeFilterCount(f: Filters): number {
  let n = 0
  if (f.magRange[0] > MAG_BOUNDS[0] || f.magRange[1] < MAG_BOUNDS[1]) n++
  if (f.depthRange[0] > DEPTH_BOUNDS[0] || f.depthRange[1] < DEPTH_BOUNDS[1]) n++
  if (f.timeRange) n++
  if (f.query.trim()) n++
  if (f.onlyTsunami) n++
  if (f.onlyFelt) n++
  if (f.onlyAlerted) n++
  if (f.eventType !== 'all') n++
  return n
}

const SORTERS: Record<SortKey, (a: Quake, b: Quake) => number> = {
  time: (a, b) => b.time - a.time,
  magnitude: (a, b) => b.mag - a.mag || b.time - a.time,
  depth: (a, b) => b.depth - a.depth || b.time - a.time,
  significance: (a, b) => b.sig - a.sig || b.time - a.time,
}

export const SORT_LABELS: Record<SortKey, string> = {
  time: 'Most recent',
  magnitude: 'Strongest',
  depth: 'Deepest',
  significance: 'Most significant',
}

export function applyFilters(quakes: Quake[], f: Filters): Quake[] {
  const query = f.query.trim().toLowerCase()
  const out: Quake[] = []

  for (const q of quakes) {
    if (q.mag < f.magRange[0] || q.mag > f.magRange[1]) continue
    if (q.depth < f.depthRange[0] || q.depth > f.depthRange[1]) continue
    if (f.timeRange && (q.time < f.timeRange[0] || q.time > f.timeRange[1])) continue
    if (f.onlyTsunami && q.tsunami !== 1) continue
    if (f.onlyFelt && !(q.felt && q.felt > 0)) continue
    if (f.onlyAlerted && !q.alert) continue
    if (f.eventType === 'earthquake' && q.type !== 'earthquake') continue
    if (f.eventType === 'other' && q.type === 'earthquake') continue
    if (query && !q.place.toLowerCase().includes(query)) continue
    out.push(q)
  }

  return out.sort(SORTERS[f.sort])
}

export interface Stats {
  count: number
  maxMag: number | null
  strongest: Quake | null
  latest: Quake | null
  medianDepth: number | null
  feltCount: number
  tsunamiCount: number
  significantCount: number
  /** Counts per magnitude band: <2, 2-3, 3-4, 4-5, 5-6, 6+ */
  bands: number[]
}

export const BAND_EDGES = [2, 3, 4, 5, 6]
export const BAND_LABELS = ['<2', '2–3', '3–4', '4–5', '5–6', '6+']

export function computeStats(quakes: Quake[]): Stats {
  if (quakes.length === 0) {
    return {
      count: 0,
      maxMag: null,
      strongest: null,
      latest: null,
      medianDepth: null,
      feltCount: 0,
      tsunamiCount: 0,
      significantCount: 0,
      bands: [0, 0, 0, 0, 0, 0],
    }
  }

  const bands = [0, 0, 0, 0, 0, 0]
  let strongest = quakes[0]
  let latest = quakes[0]
  let feltCount = 0
  let tsunamiCount = 0
  let significantCount = 0
  const depths: number[] = []

  for (const q of quakes) {
    if (q.mag > strongest.mag) strongest = q
    if (q.time > latest.time) latest = q
    if (q.felt && q.felt > 0) feltCount++
    if (q.tsunami === 1) tsunamiCount++
    if (q.sig >= 600) significantCount++
    depths.push(q.depth)

    let band = BAND_EDGES.length
    for (let i = 0; i < BAND_EDGES.length; i++) {
      if (q.mag < BAND_EDGES[i]) {
        band = i
        break
      }
    }
    bands[band]++
  }

  depths.sort((a, b) => a - b)
  const mid = Math.floor(depths.length / 2)
  const medianDepth =
    depths.length % 2 === 0 ? (depths[mid - 1] + depths[mid]) / 2 : depths[mid]

  return {
    count: quakes.length,
    maxMag: strongest.mag,
    strongest,
    latest,
    medianDepth,
    feltCount,
    tsunamiCount,
    significantCount,
    bands,
  }
}

export interface HistogramBin {
  start: number
  end: number
  count: number
  maxMag: number
  /** Counts per magnitude band, in BAND_LABELS order. */
  bands: number[]
}

/** Index of the magnitude band a value falls into. */
export function bandOf(mag: number): number {
  for (let i = 0; i < BAND_EDGES.length; i++) {
    if (mag < BAND_EDGES[i]) return i
  }
  return BAND_EDGES.length
}

/**
 * Buckets events over the feed's own time span so the timeline always fills
 * its width regardless of which feed window is loaded.
 */
export function buildHistogram(
  quakes: Quake[],
  domain: [number, number],
  binCount: number,
): HistogramBin[] {
  const [start, end] = domain
  const span = Math.max(1, end - start)
  const width = span / binCount
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    start: start + i * width,
    end: start + (i + 1) * width,
    count: 0,
    maxMag: -Infinity,
    bands: new Array<number>(BAND_LABELS.length).fill(0),
  }))

  for (const q of quakes) {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor((q.time - start) / width)))
    const bin = bins[index]
    bin.count++
    bin.bands[bandOf(q.mag)]++
    if (q.mag > bin.maxMag) bin.maxMag = q.mag
  }

  return bins
}
