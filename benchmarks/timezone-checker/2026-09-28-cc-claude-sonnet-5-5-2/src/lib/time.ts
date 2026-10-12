import type { TimeFormat } from '../types'

const MINUTES_PER_DAY = 24 * 60

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formatterCache.set(timeZone, formatter)
  }
  return formatter
}

/**
 * UTC offset of an IANA timezone at a given instant, in minutes east of UTC.
 * Derived from the wall clock the platform reports, so DST and fractional
 * offsets (India +5:30, Nepal +5:45) come out right.
 */
export function getUtcOffsetMinutes(timeZone: string, at: Date): number {
  const parts = getPartsFormatter(timeZone).formatToParts(at)
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value)
  const wallClockAsUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour') % 24,
    read('minute'),
    read('second'),
  )
  const instant = Math.floor(at.getTime() / 1000) * 1000
  return Math.round((wallClockAsUtc - instant) / 60_000)
}

/** "UTC-7", "UTC+8", "UTC+5:30", "UTC+0" */
export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+'
  const abs = Math.abs(offsetMinutes)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  return `UTC${sign}${hours}${minutes ? `:${pad2(minutes)}` : ''}`
}

/** Compact hour label used in summaries and selects: "9am", "12pm" or "09:00". */
export function formatHour(hour: number, format: TimeFormat): string {
  if (format === '24h') return `${pad2(hour)}:00`
  return `${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`
}

export interface HourParts {
  /** Large digits shown in a grid cell. */
  main: string
  /** ":30" for fractional offsets, otherwise empty. */
  minutes: string
  /** "am" / "pm" in 12h format, otherwise empty. */
  meridiem: string
}

export function getHourParts(hour: number, minute: number, format: TimeFormat): HourParts {
  const minutes = minute ? `:${pad2(minute)}` : ''
  if (format === '24h') return { main: pad2(hour), minutes, meridiem: '' }
  return { main: String(hour % 12 || 12), minutes, meridiem: hour < 12 ? 'am' : 'pm' }
}

/** "7:42 PM" or "19:42" */
export function formatTimeOfDay(hour: number, minute: number, format: TimeFormat): string {
  if (format === '24h') return `${pad2(hour)}:${pad2(minute)}`
  return `${hour % 12 || 12}:${pad2(minute)} ${hour < 12 ? 'AM' : 'PM'}`
}

/** Wall-clock time in a zone at a UTC minute count. */
export function formatClock(utcMinutes: number, offsetMinutes: number, format: TimeFormat): string {
  const local = mod(utcMinutes + offsetMinutes, MINUTES_PER_DAY)
  return formatTimeOfDay(Math.floor(local / 60), local % 60, format)
}

/** Hour (0–23) it currently is in a zone with the given offset. */
export function currentHour(utcMinutes: number, offsetMinutes: number): number {
  return Math.floor(mod(utcMinutes + offsetMinutes, MINUTES_PER_DAY) / 60)
}
