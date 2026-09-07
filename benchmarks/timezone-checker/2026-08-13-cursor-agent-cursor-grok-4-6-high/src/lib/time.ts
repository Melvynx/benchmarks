export type TimeFormat = '12h' | '24h'

export const MINUTES_PER_DAY = 24 * 60

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function offsetFormatter(timeZone: string) {
  let formatter = formatterCache.get(timeZone)
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
    formatterCache.set(timeZone, formatter)
  }
  return formatter
}

/** UTC offset in minutes at `at`. DST and fractional zones fall out of the wall-clock diff. */
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
  return Math.round((asUtc - at.getTime()) / 60_000 + at.getMilliseconds() / 60_000)
}

export function formatUtcOffset(minutes: number): string {
  if (minutes === 0) return 'UTC'
  const sign = minutes < 0 ? '−' : '+'
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, '0')}` : ''}`
}

export function mod(value: number, size: number): number {
  return ((value % size) + size) % size
}

export function localMinutesNow(timeZone: string, now: Date): number {
  const offset = getUtcOffsetMinutes(timeZone, now)
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  return mod(utcMinutes + offset, MINUTES_PER_DAY)
}

export type HourParts = {
  value: string
  meridiem: string | null
  minute: number
}

export function formatMinutesOfDay(minutesOfDay: number, format: TimeFormat): HourParts {
  const hour = Math.floor(minutesOfDay / 60)
  const minute = minutesOfDay % 60
  const fraction = minute ? `:${String(minute).padStart(2, '0')}` : ''

  if (format === '24h') {
    return {
      value: `${String(hour).padStart(2, '0')}${fraction}`,
      meridiem: null,
      minute,
    }
  }

  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return {
    value: `${hour12}${fraction}`,
    meridiem: hour < 12 ? 'am' : 'pm',
    minute,
  }
}

export function formatHour(hour: number, format: TimeFormat): string {
  const h = mod(hour, 24)
  if (format === '24h') return `${String(h).padStart(2, '0')}:00`
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${h < 12 ? 'am' : 'pm'}`
}

export function cityCode(name: string): string {
  const words = name.split(/[\s-]+/).filter(Boolean)
  if (words.length > 1) return words.map((word) => word[0]).join('').slice(0, 3).toUpperCase()
  return name.slice(0, 3).toUpperCase()
}
