import type { City } from './cities'

export type CityTime = {
  offsetMinutes: number
  offsetLabel: string
}

export type TimeFormat = '12h' | '24h'

export function getOffsetMinutes(timezone: string, instant = new Date()): number {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  }).formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  const match = label.match(/GMT([+-])(\d{2}):(\d{2})/)
  if (!match) return 0
  const sign = match[1] === '+' ? 1 : -1
  return sign * (Number(match[2]) * 60 + Number(match[3]))
}

export function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '−'
  const absolute = Math.abs(minutes)
  const hours = Math.floor(absolute / 60)
  const mins = absolute % 60
  return `UTC${sign}${String(hours).padStart(2, '0')}${mins ? `:${String(mins).padStart(2, '0')}` : ''}`
}

export function getCityTimes(cities: City[]): Record<string, CityTime> {
  const now = new Date()
  return Object.fromEntries(cities.map((city) => {
    const offsetMinutes = getOffsetMinutes(city.timezone, now)
    return [city.id, { offsetMinutes, offsetLabel: formatOffset(offsetMinutes) }]
  }))
}

export function localMinutesAtReferenceHour(referenceHour: number, cityOffset: number, referenceOffset: number): number {
  return ((referenceHour * 60 + cityOffset - referenceOffset) % 1440 + 1440) % 1440
}

export function isAwake(localMinutes: number, wakeHour: number, sleepHour: number): boolean {
  if (wakeHour === sleepHour) return false
  const wake = wakeHour * 60
  const sleep = sleepHour * 60
  return wake < sleep
    ? localMinutes >= wake && localMinutes < sleep
    : localMinutes >= wake || localMinutes < sleep
}

export function formatTime(hour: number, minute: number, format: TimeFormat): string {
  if (format === '24h') return `${String(hour).padStart(2, '0')}${minute ? `:${String(minute).padStart(2, '0')}` : ':00'}`
  const suffix = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour % 12 || 12
  return `${displayHour}${minute ? `:${String(minute).padStart(2, '0')}` : ''}${suffix}`
}

export function formatHourLabel(hour: number, format: TimeFormat): string {
  return format === '24h' ? String(hour).padStart(2, '0') : String(hour % 12 || 12)
}

export function getRanges(hours: boolean[]): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = []
  let start = -1
  for (let hour = 0; hour <= 24; hour += 1) {
    const active = hour < 24 && hours[hour]
    if (active && start === -1) start = hour
    if (!active && start !== -1) {
      ranges.push({ start, end: hour })
      start = -1
    }
  }
  return ranges
}

export function rangeLabel(range: { start: number; end: number }, format: TimeFormat): string {
  return `${formatTime(range.start % 24, 0, format)} – ${formatTime(range.end % 24, 0, format)}`
}

