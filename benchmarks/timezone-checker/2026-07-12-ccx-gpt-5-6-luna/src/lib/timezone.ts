import type { City } from '../data/cities'

export type TimeCell = {
  localMinutes: number
  localHour: number
  label: string
  awake: boolean
  overlap: boolean
}

const MINUTES_PER_DAY = 24 * 60

export function getOffsetMinutes(timezone: string, date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  }).formatToParts(date)
  const zoneName = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  const match = zoneName.match(/GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?/) || zoneName.match(/UTC(?:([+-])(\d{1,2})(?::(\d{2}))?)?/)

  if (match && !match[1]) return 0
  if (match) {
    const sign = match[1] === '-' ? -1 : 1
    return sign * ((Number(match[2]) * 60) + Number(match[3] ?? 0))
  }

  const localParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(localParts.find((part) => part.type === type)?.value ?? 0)
  const utcParts = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  }
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - Date.UTC(
    utcParts.year,
    utcParts.month - 1,
    utcParts.day,
    utcParts.hour,
    utcParts.minute,
  )
}

export function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'UTC'
  const sign = offsetMinutes > 0 ? '+' : '-'
  const absolute = Math.abs(offsetMinutes)
  const hours = Math.floor(absolute / 60)
  const minutes = absolute % 60
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`
}

export function formatHour(hour: number, format: '12h' | '24h', minutes = 0): string {
  const normalized = ((hour % 24) + 24) % 24
  if (format === '24h') return `${String(normalized).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  const meridiem = normalized >= 12 ? 'pm' : 'am'
  const displayHour = normalized % 12 || 12
  return minutes ? `${displayHour}:${String(minutes).padStart(2, '0')}${meridiem}` : `${displayHour}${meridiem}`
}

export function formatHourRange(start: number, end: number, format: '12h' | '24h'): string {
  return `${formatHour(start, format)} — ${formatHour(end % 24, format)}`
}

export function isAwake(hour: number, wakeHour: number, sleepHour: number): boolean {
  if (wakeHour === sleepHour) return true
  if (wakeHour < sleepHour) return hour >= wakeHour && hour < sleepHour
  return hour >= wakeHour || hour < sleepHour
}

export function getLocalMinutes(referenceHour: number, referenceOffset: number, cityOffset: number): number {
  return ((referenceHour * 60 + (cityOffset - referenceOffset)) % MINUTES_PER_DAY + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

export function getTimeCell(
  referenceHour: number,
  referenceOffset: number,
  cityOffset: number,
  wakeHour: number,
  sleepHour: number,
  overlap: boolean,
  format: '12h' | '24h',
): TimeCell {
  const localMinutes = getLocalMinutes(referenceHour, referenceOffset, cityOffset)
  const localHour = Math.floor(localMinutes / 60)
  const minutes = localMinutes % 60
  return {
    localMinutes,
    localHour,
    label: formatHour(localHour, format, minutes),
    awake: isAwake(localHour, wakeHour, sleepHour),
    overlap,
  }
}

export function getRanges(hours: number[]): Array<{ start: number; end: number }> {
  if (!hours.length) return []
  const sorted = [...hours].sort((a, b) => a - b)
  const ranges: Array<{ start: number; end: number }> = []
  let start = sorted[0]
  let previous = sorted[0]

  for (const hour of sorted.slice(1)) {
    if (hour === previous + 1) {
      previous = hour
      continue
    }
    ranges.push({ start, end: previous + 1 })
    start = hour
    previous = hour
  }
  ranges.push({ start, end: previous + 1 })

  if (ranges.length > 1 && ranges[0].start === 0 && ranges[ranges.length - 1].end === 24) {
    const last = ranges.pop()!
    const first = ranges.shift()!
    ranges.unshift({ start: last.start, end: first.end })
  }

  return ranges
}

export function getCityCellMap(
  city: City,
  referenceCity: City,
  offsets: Map<string, number>,
  wakeHour: number,
  sleepHour: number,
  overlapHours: Set<number>,
  format: '12h' | '24h',
): TimeCell[] {
  const cityOffset = offsets.get(city.id) ?? 0
  const referenceOffset = offsets.get(referenceCity.id) ?? 0
  return Array.from({ length: 24 }, (_, hour) => getTimeCell(
    hour,
    referenceOffset,
    cityOffset,
    wakeHour,
    sleepHour,
    overlapHours.has(hour),
    format,
  ))
}

export function countryFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split('')
    .map((letter) => String.fromCodePoint(letter.charCodeAt(0) + 127397))
    .join('')
}

export function getTodayLabel(date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(date)
}
