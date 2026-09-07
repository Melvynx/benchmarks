import type { HourRange } from './overlap'
import { formatHour, type TimeFormat } from './time'

export function formatRange(range: HourRange, format: TimeFormat): string {
  if (range.length === 24) return 'all day'
  return `${formatHour(range.start, format)}–${formatHour(range.end, format)}`
}

export function hourLabel(count: number): string {
  return count === 1 ? '1 hour' : `${count} hours`
}
