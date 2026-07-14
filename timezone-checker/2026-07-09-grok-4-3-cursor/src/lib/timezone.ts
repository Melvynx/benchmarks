import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export function padHour(hour: number): string {
  return String(hour).padStart(2, '0')
}

/** Local hour in `targetTz` when it is `refHour` in `refTz` on the given date. */
export function getLocalHour(
  refTz: string,
  refHour: number,
  targetTz: string,
  now: Date = new Date(),
): number {
  const refDate = formatInTimeZone(now, refTz, 'yyyy-MM-dd')
  const utcInstant = fromZonedTime(`${refDate}T${padHour(refHour)}:00:00`, refTz)
  return Number(formatInTimeZone(utcInstant, targetTz, 'H'))
}

/** Current UTC offset label for a timezone, e.g. "UTC−7" or "UTC+5:30". */
export function getUtcOffsetLabel(timeZone: string, now: Date = new Date()): string {
  const raw = formatInTimeZone(now, timeZone, 'xxx') // +05:30, -07:00
  const match = raw.match(/^([+-])(\d{2}):(\d{2})$/)
  if (!match) return `UTC${raw}`

  const sign = match[1] === '+' ? '+' : '−'
  const hours = Number(match[2])
  const minutes = Number(match[3])
  if (minutes === 0) return `UTC${sign}${hours}`
  return `UTC${sign}${hours}:${padHour(minutes)}`
}

export function isAwake(localHour: number, wakeHour: number, sleepHour: number): boolean {
  if (wakeHour === sleepHour) return true
  if (wakeHour < sleepHour) {
    return localHour >= wakeHour && localHour < sleepHour
  }
  // Overnight window (e.g. 22 → 6)
  return localHour >= wakeHour || localHour < sleepHour
}

export function formatHour(hour: number, format: '12h' | '24h'): string {
  if (format === '24h') return padHour(hour)
  const period = hour < 12 ? 'am' : 'pm'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}${period}`
}

export function formatHourRange(
  start: number,
  endExclusive: number,
  format: '12h' | '24h',
): string {
  return `${formatHour(start, format)} — ${formatHour(endExclusive % 24, format)}`
}

export type HourRange = { start: number; end: number }

/** Collapse sorted unique hours into [start, end) ranges. */
export function hoursToRanges(hours: number[]): HourRange[] {
  if (hours.length === 0) return []
  const sorted = [...new Set(hours)].sort((a, b) => a - b)
  const ranges: HourRange[] = []
  let start = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const h = sorted[i]
    if (h === prev + 1) {
      prev = h
      continue
    }
    ranges.push({ start, end: prev + 1 })
    start = h
    prev = h
  }
  ranges.push({ start, end: prev + 1 })
  return ranges
}
