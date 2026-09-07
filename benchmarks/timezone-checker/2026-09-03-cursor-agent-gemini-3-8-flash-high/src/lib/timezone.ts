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
 * Derived dynamically from Intl so DST is automatically handled by the runtime engine.
 */
export function getUtcOffsetMinutes(timeZone: string, at: Date = new Date()): number {
  try {
    const parts = getFormatter(timeZone).formatToParts(at)
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0)

    const asUtc = Date.UTC(
      read('year'),
      read('month') - 1,
      read('day'),
      read('hour') % 24,
      read('minute'),
      read('second')
    )
    const instant = Math.floor(at.getTime() / 1000) * 1000
    return Math.round((asUtc - instant) / 60_000)
  } catch {
    return 0
  }
}

/** Format offset: e.g. "UTC+5:30", "UTC-7", "UTC±0" */
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
  cityOffset: number
): number {
  return wrapMinutes(referenceHour * 60 + (cityOffset - referenceOffset))
}

export type TimeFormat = '12h' | '24h'

/** Format hour for column headers or settings, e.g. "7am" or "07:00" */
export function formatWholeHour(hour: number, format: TimeFormat): string {
  const h = ((hour % 24) + 24) % 24
  if (format === '24h') {
    return `${String(h).padStart(2, '0')}:00`
  }
  const suffix = h < 12 ? 'am' : 'pm'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${suffix}`
}

/** Compact label for grid cells, e.g. "9a", "12p", "9:30a" or "09", "12", "09:30" */
export function formatCellHour(minuteOfDay: number, format: TimeFormat): string {
  const wrapped = wrapMinutes(minuteOfDay)
  const hour = Math.floor(wrapped / 60)
  const minutes = wrapped % 60
  const mm = String(minutes).padStart(2, '0')

  if (format === '24h') {
    if (minutes !== 0) {
      return `${String(hour).padStart(2, '0')}:${mm}`
    }
    return String(hour).padStart(2, '0')
  }

  const suffix = hour < 12 ? 'a' : 'p'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  if (minutes !== 0) {
    return `${hour12}:${mm}${suffix}`
  }
  return `${hour12}${suffix}`
}

/** Full time string for tooltip or detail, e.g. "9:30 AM" or "09:30" */
export function formatFullTime(minuteOfDay: number, format: TimeFormat): string {
  const wrapped = wrapMinutes(minuteOfDay)
  const hour = Math.floor(wrapped / 60)
  const minutes = wrapped % 60
  const mm = String(minutes).padStart(2, '0')

  if (format === '24h') {
    return `${String(hour).padStart(2, '0')}:${mm}`
  }

  const suffix = hour < 12 ? 'AM' : 'PM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${mm} ${suffix}`
}

/** Get the current whole hour in reference city */
export function currentHourAtOffset(offsetMinutes: number, at: Date = new Date()): number {
  const utcMinutes = at.getUTCHours() * 60 + at.getUTCMinutes()
  const localMinutes = wrapMinutes(utcMinutes + offsetMinutes)
  return Math.floor(localMinutes / 60)
}
