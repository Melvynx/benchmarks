/**
 * The colour system.
 *
 * Every point on the map, every swatch in the list and every legend entry is
 * driven from the ramps below, so the map and the UI can never disagree about
 * what a colour means. Each mode encodes one variable:
 *
 *   magnitude - released energy, dim/cool for micro events to white-hot for great ones
 *   depth     - shallow (damaging, warm) to deep (remote, cool), the usual seismological convention
 *   recency   - how long ago it happened, bright for minutes-old and dark for weeks-old
 *   alert     - the USGS PAGER impact level, using PAGER's own green/yellow/orange/red
 */

export type ColorMode = 'magnitude' | 'depth' | 'recency' | 'alert'

export interface Stop {
  value: number
  color: string
}

export interface LegendEntry {
  color: string
  label: string
  /** Optional second line, e.g. the plain-language meaning of a band. */
  note?: string
}

/**
 * Tuned so the 2-6 band — where nearly every recorded event lives — gets most
 * of the ramp. A hotter ramp would paint the whole Pacific one shade of red.
 */
export const MAGNITUDE_STOPS: Stop[] = [
  { value: -1, color: '#2dd4bf' },
  { value: 1.5, color: '#4ade80' },
  { value: 3, color: '#bef264' },
  { value: 4, color: '#fde047' },
  { value: 5, color: '#fb923c' },
  { value: 6, color: '#f43f5e' },
  { value: 7, color: '#e879f9' },
  { value: 8.5, color: '#fce7f3' },
]

export const DEPTH_STOPS: Stop[] = [
  { value: 0, color: '#ff5964' },
  { value: 35, color: '#ff9f45' },
  { value: 70, color: '#ffe066' },
  { value: 150, color: '#63e6be' },
  { value: 300, color: '#38bdf8' },
  { value: 700, color: '#8b8cf9' },
]

/** Recency stops are in hours before "now". */
export const RECENCY_STOPS: Stop[] = [
  { value: 0, color: '#ffffff' },
  { value: 1, color: '#fde68a' },
  { value: 6, color: '#fb923c' },
  { value: 24, color: '#e11d48' },
  { value: 24 * 7, color: '#7c3aed' },
  { value: 24 * 30, color: '#3f3a67' },
]

export const ALERT_COLORS: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
}

export const NO_ALERT_COLOR = '#64748b'

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

/** Samples a stop list at `value`, clamping past both ends. */
export function sampleRamp(stops: Stop[], value: number): string {
  if (!Number.isFinite(value)) return stops[0].color
  if (value <= stops[0].value) return stops[0].color
  const last = stops[stops.length - 1]
  if (value >= last.value) return last.color

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    if (value <= b.value) {
      const t = (value - a.value) / (b.value - a.value)
      const ca = hexToRgb(a.color)
      const cb = hexToRgb(b.color)
      return rgbToHex([
        ca[0] + (cb[0] - ca[0]) * t,
        ca[1] + (cb[1] - ca[1]) * t,
        ca[2] + (cb[2] - ca[2]) * t,
      ])
    }
  }
  return last.color
}

export function magnitudeColor(mag: number): string {
  return sampleRamp(MAGNITUDE_STOPS, mag)
}

export function depthColor(km: number): string {
  return sampleRamp(DEPTH_STOPS, km)
}

export function recencyColor(time: number, now: number): string {
  return sampleRamp(RECENCY_STOPS, (now - time) / 3_600_000)
}

export function alertColor(alert: string | null): string {
  return alert ? (ALERT_COLORS[alert] ?? NO_ALERT_COLOR) : NO_ALERT_COLOR
}

export function colorFor(
  mode: ColorMode,
  quake: { mag: number; depth: number; time: number; alert: string | null },
  now: number,
): string {
  switch (mode) {
    case 'depth':
      return depthColor(quake.depth)
    case 'recency':
      return recencyColor(quake.time, now)
    case 'alert':
      return alertColor(quake.alert)
    default:
      return magnitudeColor(quake.mag)
  }
}

export const COLOR_MODE_META: Record<
  ColorMode,
  { label: string; title: string; caption: string }
> = {
  magnitude: {
    label: 'Magnitude',
    title: 'Magnitude',
    caption: 'Energy released. Each whole step is ~32× more energy.',
  },
  depth: {
    label: 'Depth',
    title: 'Depth below surface',
    caption: 'Shallow quakes shake the surface hardest.',
  },
  recency: {
    label: 'Recency',
    title: 'Time since the event',
    caption: 'Brighter points happened more recently.',
  },
  alert: {
    label: 'PAGER alert',
    title: 'USGS PAGER impact alert',
    caption: 'Modelled likely losses. Only issued for notable events.',
  },
}

export const MAGNITUDE_LEGEND: LegendEntry[] = [
  { color: magnitudeColor(1), label: 'M < 2', note: 'Not felt' },
  { color: magnitudeColor(2.5), label: 'M 2 – 3', note: 'Rarely felt' },
  { color: magnitudeColor(3.5), label: 'M 3 – 4', note: 'Felt nearby' },
  { color: magnitudeColor(4.5), label: 'M 4 – 5', note: 'Felt widely' },
  { color: magnitudeColor(5.5), label: 'M 5 – 6', note: 'Damaging' },
  { color: magnitudeColor(6.5), label: 'M 6 – 7', note: 'Destructive' },
  { color: magnitudeColor(8), label: 'M 7 +', note: 'Major to great' },
]

export const DEPTH_LEGEND: LegendEntry[] = [
  { color: depthColor(5), label: '0 – 20 km', note: 'Shallow crust' },
  { color: depthColor(35), label: '20 – 50 km', note: 'Lower crust' },
  { color: depthColor(70), label: '50 – 100 km', note: 'Upper mantle' },
  { color: depthColor(150), label: '100 – 200 km', note: 'Intermediate' },
  { color: depthColor(300), label: '200 – 400 km', note: 'Deep slab' },
  { color: depthColor(700), label: '400 km +', note: 'Very deep' },
]

export const RECENCY_LEGEND: LegendEntry[] = [
  { color: RECENCY_STOPS[0].color, label: 'Under 1 hour' },
  { color: RECENCY_STOPS[1].color, label: '1 – 6 hours' },
  { color: RECENCY_STOPS[2].color, label: '6 – 24 hours' },
  { color: RECENCY_STOPS[3].color, label: '1 – 7 days' },
  { color: RECENCY_STOPS[4].color, label: '1 – 4 weeks' },
]

export const ALERT_LEGEND: LegendEntry[] = [
  { color: ALERT_COLORS.red, label: 'Red', note: '1,000+ likely deaths' },
  { color: ALERT_COLORS.orange, label: 'Orange', note: '100 – 999 likely deaths' },
  { color: ALERT_COLORS.yellow, label: 'Yellow', note: '1 – 99 likely deaths' },
  { color: ALERT_COLORS.green, label: 'Green', note: 'No significant losses' },
  { color: NO_ALERT_COLOR, label: 'Not assessed', note: 'Below PAGER threshold' },
]

export const LEGENDS: Record<ColorMode, LegendEntry[]> = {
  magnitude: MAGNITUDE_LEGEND,
  depth: DEPTH_LEGEND,
  recency: RECENCY_LEGEND,
  alert: ALERT_LEGEND,
}

/**
 * MapLibre paint expression for the active colour mode. `now` is baked in for
 * recency so the ramp stays anchored to the moment of the last data refresh.
 */
export function colorExpression(mode: ColorMode, now: number): unknown {
  if (mode === 'alert') {
    const match: unknown[] = ['match', ['get', 'alert']]
    for (const [name, color] of Object.entries(ALERT_COLORS)) {
      match.push(name, color)
    }
    match.push(NO_ALERT_COLOR)
    return match
  }

  if (mode === 'recency') {
    const expr: unknown[] = [
      'interpolate',
      ['linear'],
      ['/', ['-', now, ['get', 'time']], 3600000],
    ]
    for (const stop of RECENCY_STOPS) expr.push(stop.value, stop.color)
    return expr
  }

  const stops = mode === 'depth' ? DEPTH_STOPS : MAGNITUDE_STOPS
  const property = mode === 'depth' ? 'depth' : 'mag'
  const expr: unknown[] = ['interpolate', ['linear'], ['get', property]]
  for (const stop of stops) expr.push(stop.value, stop.color)
  return expr
}

/** CSS gradient string used for the continuous bar under each legend. */
export function rampGradient(mode: ColorMode): string {
  const stops =
    mode === 'depth' ? DEPTH_STOPS : mode === 'recency' ? RECENCY_STOPS : MAGNITUDE_STOPS
  const span = stops[stops.length - 1].value - stops[0].value
  const parts = stops.map(
    (s) => `${s.color} ${(((s.value - stops[0].value) / span) * 100).toFixed(1)}%`,
  )
  return `linear-gradient(90deg, ${parts.join(', ')})`
}
