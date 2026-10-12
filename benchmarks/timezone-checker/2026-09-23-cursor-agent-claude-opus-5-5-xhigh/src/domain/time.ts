export type TimeFormat = '12h' | '24h'

export const MINUTES_PER_DAY = 24 * 60

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Modulo that always lands in `[0, modulus)`, including for negative input. */
export const mod = (value: number, modulus: number) => ((value % modulus) + modulus) % modulus

const pad2 = (value: number) => String(value).padStart(2, '0')

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function zonedFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      weekday: 'short',
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

export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** 0 = Sunday */
  weekday: number
}

export function getZonedParts(timeZone: string, at: Date): ZonedParts {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const part of zonedFormatter(timeZone).formatToParts(at)) parts[part.type] = part.value
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS.indexOf(parts.weekday as (typeof WEEKDAYS)[number]),
  }
}

/**
 * UTC offset of `timeZone` at the instant `at`, in minutes (e.g. +330 for India).
 * Derived from the zone's wall clock, so DST and fractional offsets come for free.
 */
export function getUtcOffsetMinutes(timeZone: string, at: Date): number {
  const p = getZonedParts(timeZone, at)
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  const wholeSecond = Math.floor(at.getTime() / 1000) * 1000
  return Math.round((wallClockAsUtc - wholeSecond) / 60_000)
}

export function getZonedMinutesOfDay(timeZone: string, at: Date): number {
  const { hour, minute } = getZonedParts(timeZone, at)
  return hour * 60 + minute
}

export interface ClockParts {
  hour: string
  minute: string | null
  period: 'am' | 'pm' | null
}

export function clockParts(minutesOfDay: number, format: TimeFormat): ClockParts {
  const total = mod(Math.round(minutesOfDay), MINUTES_PER_DAY)
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  const minute = minutes === 0 ? null : pad2(minutes)
  if (format === '24h') return { hour: pad2(hours), minute, period: null }
  return { hour: String(hours % 12 || 12), minute, period: hours < 12 ? 'am' : 'pm' }
}

/** "9am", "5:30pm" in 12h; "09:00", "17:30" in 24h. */
export function formatClock(minutesOfDay: number, format: TimeFormat): string {
  const { hour, minute, period } = clockParts(minutesOfDay, format)
  if (format === '24h') return `${hour}:${minute ?? '00'}`
  return `${hour}${minute ? `:${minute}` : ''}${period}`
}

export const formatHour = (hour: number, format: TimeFormat) => formatClock(hour * 60, format)

/** Inclusive start, exclusive end: "9am — 12pm" covers 9, 10 and 11. */
export const formatTimeRange = (startMinutes: number, endMinutes: number, format: TimeFormat) =>
  `${formatClock(startMinutes, format)} — ${formatClock(endMinutes, format)}`

function splitOffset(minutes: number) {
  const abs = Math.abs(minutes)
  return { sign: minutes < 0 ? '−' : '+', hours: Math.floor(abs / 60), minutes: abs % 60 }
}

/** "−7", "+5:45", "+0" */
export function formatOffset(offsetMinutes: number): string {
  const { sign, hours, minutes } = splitOffset(offsetMinutes)
  return `${sign}${hours}${minutes ? `:${pad2(minutes)}` : ''}`
}

/** "UTC−7", "UTC+5:45", "UTC+0" */
export const formatUtcOffset = (offsetMinutes: number) => `UTC${formatOffset(offsetMinutes)}`

/** Offset relative to another zone: "+9h", "−3:30h", "±0h". */
export function formatRelativeOffset(diffMinutes: number, unit = 'h'): string {
  if (diffMinutes === 0) return `±0${unit}`
  return `${formatOffset(diffMinutes)}${unit}`
}

export const formatHours = (hours: number) => `${hours} ${hours === 1 ? 'hour' : 'hours'}`
