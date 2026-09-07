export const MINUTES_PER_DAY = 24 * 60

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getFormatter(timeZone: string): Intl.DateTimeFormat {
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
 * UTC offset of `timeZone` at the given instant, in minutes (east-positive).
 * Derived from Intl so DST is handled by the runtime's tz database.
 */
export function getUtcOffsetMinutes(timeZone: string, at: Date = new Date()): number {
  const parts = getFormatter(timeZone).formatToParts(at)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)

  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour') % 24,
    read('minute'),
    read('second'),
  )
  // Drop sub-second drift so the offset is an exact number of minutes.
  const instant = Math.floor(at.getTime() / 1000) * 1000
  return Math.round((asUtc - instant) / 60_000)
}

/** e.g. "UTC+5:30", "UTC-7", "UTC±0" */
export function formatUtcOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'UTC±0'
  const sign = offsetMinutes > 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`
}

/** Wrap a minute-of-day value into [0, 1440). */
export function wrapMinutes(minutes: number): number {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

/**
 * Local minute-of-day in a city when it is `referenceHour` o'clock in the
 * reference city.
 */
export function localMinuteOfDay(
  referenceHour: number,
  referenceOffset: number,
  cityOffset: number,
): number {
  return wrapMinutes(referenceHour * 60 + (cityOffset - referenceOffset))
}

export type TimeFormat = '12h' | '24h'

interface FormatHourOptions {
  /** Include ":mm" even when minutes are zero. */
  padded?: boolean
}

/** Format a minute-of-day value, e.g. 570 → "9:30am" / "09:30". */
export function formatMinuteOfDay(
  minuteOfDay: number,
  format: TimeFormat,
  { padded = false }: FormatHourOptions = {},
): string {
  const wrapped = wrapMinutes(minuteOfDay)
  const hours = Math.floor(wrapped / 60)
  const minutes = wrapped % 60
  const mm = String(minutes).padStart(2, '0')

  if (format === '24h') {
    return `${String(hours).padStart(2, '0')}:${mm}`
  }

  const suffix = hours < 12 ? 'am' : 'pm'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  const showMinutes = padded || minutes !== 0
  return `${hour12}${showMinutes ? `:${mm}` : ''}${suffix}`
}

/** Short label for a whole hour used in select options and axis headers. */
export function formatHour(hour: number, format: TimeFormat): string {
  return formatMinuteOfDay(hour * 60, format)
}

/** Dense label for grid cells, e.g. "9a", "9:30a", "14", "14:45". */
export function formatCompact(minuteOfDay: number, format: TimeFormat): string {
  const wrapped = wrapMinutes(minuteOfDay)
  const hours = Math.floor(wrapped / 60)
  const minutes = wrapped % 60
  const mm = minutes ? `:${String(minutes).padStart(2, '0')}` : ''
  if (format === '24h') return `${String(hours).padStart(2, '0')}${mm}`
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}${mm}${hours < 12 ? 'a' : 'p'}`
}

/** Current hour-of-day (0–23) in a zone with the given offset. */
export function currentHourAtOffset(offsetMinutes: number, now: Date = new Date()): number {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  return Math.floor(wrapMinutes(utcMinutes + offsetMinutes) / 60)
}
