import type { HourRange } from './overlap'
import { HOURS_PER_DAY } from './overlap'
import type { TimeFormat } from './types'

const pad = (value: number) => String(value).padStart(2, '0')

const to12Hour = (hour: number) => hour % 12 || 12

export interface HourLabel {
  /** "9", "12" or zero-padded "09" in 24h. */
  hour: string
  /** ":30" for fractional-offset cities, otherwise null. */
  minutes: string | null
  /** "AM" / "PM" in 12h mode, otherwise null. */
  suffix: 'AM' | 'PM' | null
}

/** Short label for a grid cell, from minutes since local midnight. */
export function formatCellLabel(localMinutes: number, format: TimeFormat): HourLabel {
  const hour = Math.floor(localMinutes / 60)
  const minute = localMinutes % 60
  const minutes = minute ? `:${pad(minute)}` : null

  if (format === '24h') return { hour: pad(hour), minutes, suffix: null }
  return { hour: String(to12Hour(hour)), minutes, suffix: hour < 12 ? 'AM' : 'PM' }
}

/** Full clock reading: "9:30 PM" or "21:30". */
export function formatClock(localMinutes: number, format: TimeFormat): string {
  const hour = Math.floor(localMinutes / 60)
  const minute = pad(localMinutes % 60)
  if (format === '24h') return `${pad(hour)}:${minute}`
  return `${to12Hour(hour)}:${minute} ${hour < 12 ? 'AM' : 'PM'}`
}

/** Hour picker option: "7 AM" or "07:00". */
export function formatHourOption(hour: number, format: TimeFormat): string {
  return format === '24h' ? `${pad(hour)}:00` : `${to12Hour(hour)} ${hour < 12 ? 'AM' : 'PM'}`
}

/** Range boundary as used in summaries: "9am" or "09:00". Hour 24 wraps to midnight. */
export function formatBoundary(hour: number, format: TimeFormat): string {
  const wrapped = hour % HOURS_PER_DAY
  return format === '24h' ? `${pad(wrapped)}:00` : `${to12Hour(wrapped)}${wrapped < 12 ? 'am' : 'pm'}`
}

export function formatRange({ start, end }: HourRange, format: TimeFormat): string {
  return `${formatBoundary(start, format)} — ${formatBoundary(end, format)}`
}

export function isFullDay({ start, end }: HourRange): boolean {
  return end - start === HOURS_PER_DAY
}

/** "UTC+8", "UTC-7", "UTC+5:30". */
export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+'
  const absolute = Math.abs(offsetMinutes)
  const hours = Math.floor(absolute / 60)
  const minutes = absolute % 60
  return `UTC${sign}${hours}${minutes ? `:${pad(minutes)}` : ''}`
}

export function formatHours(count: number): string {
  return `${count} ${count === 1 ? 'hour' : 'hours'}`
}

export function formatDayShift(dayShift: number): string | null {
  if (dayShift === 0) return null
  const days = Math.abs(dayShift)
  const unit = days === 1 ? 'day' : 'days'
  return dayShift > 0 ? `+${days} ${unit}` : `-${days} ${unit}`
}
