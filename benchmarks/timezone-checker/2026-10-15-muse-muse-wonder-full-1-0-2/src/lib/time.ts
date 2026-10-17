export type TimeFormat = '12h' | '24h'
export type Mode = 'meeting' | 'base'

/** UTC offset in minutes for a timezone at a given instant (DST-aware, fractional-safe). */
export function getUtcOffsetMinutes(tz: string, date: Date = new Date()): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts: Record<string, number> = {}
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  // hour can be 24 in some engines at midnight
  const hour = parts.hour % 24
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, hour, parts.minute, parts.second)
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000)
}

export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`
}

/** Local time (minutes since midnight, 0–1439) in a city when it is `refHour`:00 in the reference. */
export function localMinutes(refHour: number, cityOffset: number, refOffset: number): number {
  const v = refHour * 60 + (cityOffset - refOffset)
  return ((v % 1440) + 1440) % 1440
}

export function isAwake(localMins: number, wake: number, sleep: number): boolean {
  const w = wake * 60
  const s = sleep * 60
  if (w === s) return true // full-day window
  if (w < s) return localMins >= w && localMins < s
  return localMins >= w || localMins < s // overnight
}

export function formatTime(hour: number, minute: number, format: TimeFormat): string {
  const h = ((hour % 24) + 24) % 24
  if (format === '24h') {
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }
  const suffix = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return minute === 0 ? `${h12}${suffix}` : `${h12}:${String(minute).padStart(2, '0')}${suffix}`
}

export function formatHour(hour: number, format: TimeFormat): string {
  return formatTime(hour, 0, format)
}

export function formatLocalMinutes(mins: number, format: TimeFormat): string {
  return formatTime(Math.floor(mins / 60), mins % 60, format)
}

/** Group sorted hours (0–23) into linear contiguous ranges: [start, endExclusive]. */
export function hoursToRanges(hours: number[]): Array<[number, number]> {
  const sorted = [...hours].sort((a, b) => a - b)
  const ranges: Array<[number, number]> = []
  for (const h of sorted) {
    const last = ranges[ranges.length - 1]
    if (last && h === last[1]) last[1] = h + 1
    else ranges.push([h, h + 1])
  }
  return ranges
}

export function formatRanges(hours: number[], format: TimeFormat): string[] {
  return hoursToRanges(hours).map(
    ([start, end]) => `${formatHour(start, format)} — ${formatHour(end, format)}`,
  )
}

export function currentTimeInTz(tz: string, format: TimeFormat, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: format === '12h',
    }).format(now).replace(/\s?(AM|PM)/i, (m) => m.trim().toLowerCase())
  } catch {
    return ''
  }
}

/** Current hour (0–23) in a timezone. */
export function currentHourInTz(tz: string, now: Date = new Date()): number {
  const v = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(now)
  return Number(v) % 24
}
