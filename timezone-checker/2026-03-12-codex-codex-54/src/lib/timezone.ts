import type { TimeFormat, TimelineSlot, TimeWindow } from './types'

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const zonedDateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>()
const zonedDateFormatterCache = new Map<string, Intl.DateTimeFormat>()

function getZonedDateTimeFormatter(timeZone: string) {
  if (!zonedDateTimeFormatterCache.has(timeZone)) {
    zonedDateTimeFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        hour12: false,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    )
  }

  return zonedDateTimeFormatterCache.get(timeZone)!
}

function getZonedDateFormatter(timeZone: string) {
  if (!zonedDateFormatterCache.has(timeZone)) {
    zonedDateFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    )
  }

  return zonedDateFormatterCache.get(timeZone)!
}

function partsToRecord(parts: Intl.DateTimeFormatPart[]) {
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = partsToRecord(
    getZonedDateTimeFormatter(timeZone).formatToParts(date),
  )

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

export function getTimeZoneOffsetMinutes(timeZone: string, date: Date) {
  const parts = getZonedParts(date, timeZone)
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )

  return Math.round((asUtc - date.getTime()) / 60000)
}

export function zonedDateTimeToInstant(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
) {
  let utcTimestamp = Date.UTC(year, month - 1, day, hour, 0, 0, 0)
  let date = new Date(utcTimestamp)
  const initialOffset = getTimeZoneOffsetMinutes(timeZone, date)
  utcTimestamp -= initialOffset * 60000

  date = new Date(utcTimestamp)
  const adjustedOffset = getTimeZoneOffsetMinutes(timeZone, date)

  if (adjustedOffset !== initialOffset) {
    utcTimestamp -= (adjustedOffset - initialOffset) * 60000
  }

  return new Date(utcTimestamp)
}

export function buildReferenceTimeline(timeZone: string): TimelineSlot[] {
  const today = getZonedParts(new Date(), timeZone)

  return Array.from({ length: 24 }, (_, referenceHour) => ({
    referenceHour,
    instant: zonedDateTimeToInstant(
      timeZone,
      today.year,
      today.month,
      today.day,
      referenceHour,
    ),
  }))
}

export function isHourAwake(hour: number, wakeHour: number, sleepHour: number) {
  if (wakeHour === sleepHour) {
    return true
  }

  if (wakeHour < sleepHour) {
    return hour >= wakeHour && hour < sleepHour
  }

  return hour >= wakeHour || hour < sleepHour
}

export function formatOffsetLabel(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absoluteOffset = Math.abs(offsetMinutes)
  const hours = Math.floor(absoluteOffset / 60)
  const minutes = absoluteOffset % 60

  return minutes === 0
    ? `UTC${sign}${hours}`
    : `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`
}

export function formatHourBoundary(hour: number, timeFormat: TimeFormat) {
  const normalizedHour = hour % 24

  if (timeFormat === 24) {
    return `${String(normalizedHour).padStart(2, '0')}:00`
  }

  const suffix = normalizedHour < 12 ? 'am' : 'pm'
  const hour12 = normalizedHour % 12 || 12
  return `${hour12}${suffix}`
}

export function formatAxisHour(hour: number, timeFormat: TimeFormat) {
  if (timeFormat === 24) {
    return String(hour).padStart(2, '0')
  }

  const suffix = hour < 12 ? 'a' : 'p'
  const hour12 = hour % 12 || 12
  return `${hour12}${suffix}`
}

export function formatSelectHour(hour: number, timeFormat: TimeFormat) {
  if (timeFormat === 24) {
    return `${String(hour).padStart(2, '0')}:00`
  }

  const suffix = hour < 12 ? 'AM' : 'PM'
  const hour12 = hour % 12 || 12
  return `${hour12}:00 ${suffix}`
}

export function compressOverlapWindows(hours: boolean[]) {
  const windows: TimeWindow[] = []
  let start: number | null = null

  hours.forEach((isActive, index) => {
    if (isActive && start === null) {
      start = index
    }

    if (!isActive && start !== null) {
      windows.push({ start, end: index })
      start = null
    }
  })

  if (start !== null) {
    windows.push({ start, end: 24 })
  }

  return windows
}

export function countActiveHours(hours: boolean[]) {
  return hours.reduce((count, hour) => count + (hour ? 1 : 0), 0)
}

export function formatWindow(window: TimeWindow, timeFormat: TimeFormat) {
  return `${formatHourBoundary(window.start, timeFormat)} — ${formatHourBoundary(window.end, timeFormat)}`
}

export function formatReferenceDate(timeZone: string) {
  return getZonedDateFormatter(timeZone).format(new Date())
}
