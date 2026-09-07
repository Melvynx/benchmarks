import type { City } from '../data/cities'

export type TimeFormat = '12h' | '24h'

export const MINUTES_PER_DAY = 24 * 60

const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>()

function offsetFormatter(timeZone: string) {
  let formatter = offsetFormatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    offsetFormatterCache.set(timeZone, formatter)
  }
  return formatter
}

/**
 * Offset of `timeZone` from UTC, in minutes, at the given instant.
 *
 * Derived by formatting the instant into the zone's wall clock and diffing it
 * against UTC. Because it is evaluated at a real date, DST is handled for free
 * and fractional zones (UTC+5:30, UTC+5:45) fall out naturally.
 */
export function getUtcOffsetMinutes(timeZone: string, at: Date): number {
  const parts = offsetFormatter(timeZone).formatToParts(at)
  const lookup: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') lookup[part.type] = Number(part.value)
  }
  const asUtc = Date.UTC(
    lookup.year,
    lookup.month - 1,
    lookup.day,
    lookup.hour,
    lookup.minute,
    lookup.second,
  )
  // Drop sub-second noise so the diff lands on a whole number of minutes.
  return Math.round((asUtc - at.getTime()) / 60_000 + at.getMilliseconds() / 60_000)
}

/** e.g. `UTC+5:45`, `UTC−7`, `UTC` */
export function formatUtcOffset(minutes: number): string {
  if (minutes === 0) return 'UTC'
  const sign = minutes < 0 ? '−' : '+'
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, '0')}` : ''}`
}

export type HourLabel = { value: string; meridiem: string | null }

/** Splits a wall-clock time into a big numeric part and a small `am`/`pm` tag. */
export function formatMinutesOfDay(minutesOfDay: number, format: TimeFormat): HourLabel {
  const hour = Math.floor(minutesOfDay / 60)
  const minute = minutesOfDay % 60
  const fraction = minute ? `:${String(minute).padStart(2, '0')}` : ''

  if (format === '24h') {
    return { value: `${String(hour).padStart(2, '0')}${fraction || ''}`, meridiem: null }
  }
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return { value: `${hour12}${fraction}`, meridiem: hour < 12 ? 'am' : 'pm' }
}

/** Compact single-string form used in summaries and labels: `9am`, `13:00`. */
export function formatHour(hour: number, format: TimeFormat): string {
  if (format === '24h') return `${String(hour % 24).padStart(2, '0')}:00`
  const h = hour % 24
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${h < 12 ? 'am' : 'pm'}`
}

/** Current wall-clock time in a zone, as minutes since local midnight. */
export function localMinutesNow(timeZone: string, now: Date): number {
  const offset = getUtcOffsetMinutes(timeZone, now)
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  return mod(utcMinutes + offset, MINUTES_PER_DAY)
}

export function mod(value: number, size: number): number {
  return ((value % size) + size) % size
}

/** `San Francisco` → `SF`, `Geneva` → `GEN`. Used for narrow mobile columns. */
export function shortCode(city: City): string {
  const words = city.name.split(/[\s-]+/).filter(Boolean)
  if (words.length > 1) return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase()
  return city.name.slice(0, 3).toUpperCase()
}
