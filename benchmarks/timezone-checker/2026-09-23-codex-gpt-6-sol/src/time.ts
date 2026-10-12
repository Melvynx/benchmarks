import type { City } from './cities.ts'

export type TimeFormat = '12h' | '24h'
export type Mode = 'meeting' | 'base'
export type Settings = { wakeHour: number; sleepHour: number; timeFormat: TimeFormat }
export type LocalTime = { hour: number; minute: number; year: number; month: number; day: number }
export type HourCell = { local: LocalTime | null; awake: boolean; overlap: boolean; skipped: boolean }
export type CityRow = { city: City; cells: HourCell[]; offsetMinutes: number }
export type HourRange = { start: number; end: number }
export type Schedule = {
  rows: CityRow[]
  referenceDate: LocalTime | null
  clockChangeDay: boolean
  meetingHours: boolean[]
  baseHours: Record<string, boolean[]>
}

const zonedFormatters = new Map<string, Intl.DateTimeFormat>()

function zonedFormatter(timeZone: string) {
  let formatter = zonedFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
    zonedFormatters.set(timeZone, formatter)
  }
  return formatter
}

export function getLocalTime(timeZone: string, instant: Date): LocalTime {
  const parts = Object.fromEntries(
    zonedFormatter(timeZone).formatToParts(instant)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)]),
  )
  return {
    year: parts.year, month: parts.month, day: parts.day,
    hour: parts.hour, minute: parts.minute,
  }
}

export function getOffsetMinutes(timeZone: string, instant: Date): number {
  const local = getLocalTime(timeZone, instant)
  const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute)
  const instantMinute = Math.floor(instant.getTime() / 60_000) * 60_000
  return (localAsUtc - instantMinute) / 60_000
}

function instantForReferenceHour(date: LocalTime, hour: number, timeZone: string): Date | null {
  const desiredWallTime = Date.UTC(date.year, date.month - 1, date.day, hour)
  let instant = desiredWallTime
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const corrected = desiredWallTime - getOffsetMinutes(timeZone, new Date(instant)) * 60_000
    if (corrected === instant) break
    instant = corrected
  }
  const result = new Date(instant)
  const actual = getLocalTime(timeZone, result)
  return actual.year === date.year && actual.month === date.month && actual.day === date.day && actual.hour === hour && actual.minute === 0
    ? result
    : null
}

export function isAwake(local: Pick<LocalTime, 'hour' | 'minute'>, wakeHour: number, sleepHour: number): boolean {
  if (wakeHour === sleepHour) return true
  const minuteOfDay = local.hour * 60 + local.minute
  const wake = wakeHour * 60
  const sleep = sleepHour * 60
  return wake < sleep
    ? minuteOfDay >= wake && minuteOfDay < sleep
    : minuteOfDay >= wake || minuteOfDay < sleep
}

export function getRanges(hours: boolean[]): HourRange[] {
  const ranges: HourRange[] = []
  let start = -1
  for (let hour = 0; hour <= 24; hour += 1) {
    if (hour < 24 && hours[hour] && start === -1) start = hour
    if ((hour === 24 || !hours[hour]) && start !== -1) {
      ranges.push({ start, end: hour })
      start = -1
    }
  }
  return ranges
}

export function formatClock(hour: number, minute: number, format: TimeFormat, compact = false): string {
  if (hour === 24) return format === '24h' ? '24:00' : '12am +1'
  const minutes = minute ? `:${String(minute).padStart(2, '0')}` : ''
  if (format === '24h') return compact && !minute ? String(hour).padStart(2, '0') : `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  const displayHour = hour % 12 || 12
  return `${displayHour}${minutes}${hour < 12 ? 'am' : 'pm'}`
}

export function formatCellTime(local: LocalTime, format: TimeFormat): string {
  if (format === '24h') return local.minute ? formatClock(local.hour, local.minute, format) : formatClock(local.hour, 0, format, true)
  return formatClock(local.hour, local.minute, format).replace('am', 'a').replace('pm', 'p')
}

export function formatRange(range: HourRange, format: TimeFormat): string {
  return `${formatClock(range.start, 0, format)} — ${formatClock(range.end, 0, format)}`
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+'
  const absolute = Math.abs(minutes)
  return `UTC${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
}

export function buildSchedule(cities: City[], settings: Settings, mode: Mode, now: Date): Schedule {
  if (!cities.length) return { rows: [], referenceDate: null, clockChangeDay: false, meetingHours: [], baseHours: {} }

  const referenceDate = getLocalTime(cities[0].timeZone, now)
  const instants = Array.from({ length: 24 }, (_, hour) => instantForReferenceHour(referenceDate, hour, cities[0].timeZone))
  const clockChangeDay = instants.some((instant, hour) =>
    instant === null || (hour > 0 && instants[hour - 1] !== null && instant.getTime() - instants[hour - 1]!.getTime() !== 3_600_000),
  )
  const rows: CityRow[] = cities.map(city => ({
    city,
    offsetMinutes: getOffsetMinutes(city.timeZone, now),
    cells: instants.map(instant => {
      if (!instant) return { local: null, awake: false, overlap: false, skipped: true }
      const local = getLocalTime(city.timeZone, instant)
      return { local, awake: isAwake(local, settings.wakeHour, settings.sleepHour), overlap: false, skipped: false }
    }),
  }))

  const meetingHours = Array.from({ length: 24 }, (_, hour) => rows.every(row => row.cells[hour].awake))
  const baseHours: Record<string, boolean[]> = {}

  rows.slice(1).forEach(row => {
    baseHours[row.city.id] = row.cells.map((cell, hour) => cell.awake && rows[0].cells[hour].awake)
  })

  rows.forEach((row, rowIndex) => {
    row.cells.forEach((cell, hour) => {
      cell.overlap = mode === 'meeting'
        ? rows.length > 1 && meetingHours[hour]
        : rowIndex === 0
          ? rows.slice(1).some(other => baseHours[other.city.id][hour])
          : baseHours[row.city.id][hour]
    })
  })

  return { rows, referenceDate, clockChangeDay, meetingHours, baseHours }
}
