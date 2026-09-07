/** Formatting helpers shared by the list, map popups and detail panel. */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function timeAgo(time: number, now = Date.now()): string {
  const diff = Math.max(0, now - time)
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  const days = Math.floor(diff / DAY)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

const absoluteFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function absoluteTime(time: number): string {
  return absoluteFormat.format(new Date(time))
}

export function utcTime(time: number): string {
  return `${new Date(time).toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

export function magnitude(mag: number): string {
  return mag.toFixed(1)
}

export function depth(km: number): string {
  return `${km.toFixed(km < 10 ? 1 : 0)} km`
}

export function coordinate(value: number, axis: 'lat' | 'lon'): string {
  const hemi = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W'
  return `${Math.abs(value).toFixed(3)}°${hemi}`
}

export function compactNumber(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`
  return `${(value / 1_000_000).toFixed(1)}M`
}

/**
 * Radiated seismic energy from the Gutenberg-Richter relation
 * log10(E) = 1.5*M + 4.8 (joules), expressed as tonnes of TNT.
 */
export function energyTntTonnes(mag: number): number {
  const joules = Math.pow(10, 1.5 * mag + 4.8)
  return joules / 4.184e9
}

export function formatTnt(mag: number): string {
  const tonnes = energyTntTonnes(mag)
  if (tonnes < 0.001) return `${(tonnes * 1_000_000).toFixed(0)} g of TNT`
  if (tonnes < 1) return `${(tonnes * 1000).toFixed(0)} kg of TNT`
  if (tonnes < 1000) return `${tonnes.toFixed(tonnes < 10 ? 1 : 0)} t of TNT`
  if (tonnes < 1_000_000) return `${(tonnes / 1000).toFixed(1)} kilotonnes of TNT`
  return `${(tonnes / 1_000_000).toFixed(1)} megatonnes of TNT`
}

/** Great-circle distance in kilometres. */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

/** Mercalli intensity as its conventional Roman numeral. */
export function mercalli(value: number): string {
  return ROMAN[Math.min(12, Math.max(1, Math.round(value)))] ?? 'I'
}

const MAG_TYPE_LABELS: Record<string, string> = {
  md: 'Duration',
  ml: 'Local (Richter)',
  ms: 'Surface wave',
  mw: 'Moment',
  mww: 'Moment (W-phase)',
  mwc: 'Moment (centroid)',
  mwb: 'Moment (body wave)',
  mwr: 'Moment (regional)',
  mb: 'Body wave',
  mb_lg: 'Lg body wave',
  mfa: 'Felt area',
  mh: 'Historical',
  mi: 'Integrated p-wave',
  mint: 'Intensity',
  me: 'Energy',
}

export function magTypeLabel(magType: string | null): string {
  if (!magType) return 'Unspecified'
  return MAG_TYPE_LABELS[magType.toLowerCase()] ?? magType.toUpperCase()
}
