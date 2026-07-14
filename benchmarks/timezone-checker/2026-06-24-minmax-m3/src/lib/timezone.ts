import type { City, OverlapInfo, Settings } from '../types'

/**
 * Returns the offset in minutes from UTC for a given timezone at a given instant.
 * Fractional offsets are preserved (e.g. India +5:30 → 330, Nepal +5:45 → 345).
 */
export function getTimezoneOffsetMinutes(timezone: string, at: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(at)
  const lookup = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  let hour = parseInt(lookup('hour'), 10)
  if (hour === 24) hour = 0
  const minute = parseInt(lookup('minute'), 10)
  const second = parseInt(lookup('second'), 10)
  const month = parseInt(lookup('month'), 10) - 1
  const day = parseInt(lookup('day'), 10)
  const year = parseInt(lookup('year'), 10)

  const asUTC = Date.UTC(year, month, day, hour, minute, second)
  return Math.round((asUTC - at.getTime()) / 60000)
}

/**
 * Formats a UTC offset in minutes as a string like "UTC+5:30", "UTC-8", "UTC+5:45".
 */
export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  if (mins === 0) return `UTC${sign}${hours}`
  return `UTC${sign}${hours}:${mins.toString().padStart(2, '0')}`
}

/**
 * Returns the local hour (0–23) of `timezone` at the given instant.
 */
export function getLocalHour(timezone: string, at: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(at)
  const raw = parts.find((p) => p.type === 'hour')?.value ?? '0'
  const hour = parseInt(raw, 10)
  return hour === 24 ? 0 : hour
}

/**
 * Computes the UTC instant corresponding to a given hour-of-day in a reference timezone
 * for the current day in that timezone.
 */
export function getReferenceDayUtc(referenceTimezone: string, refHour: number, at: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: referenceTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(at)
  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10)
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10) - 1
  const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10)

  const offsetAtMidnight = getTimezoneOffsetMinutes(referenceTimezone, at)
  const midnightUtc = Date.UTC(year, month, day) - offsetAtMidnight * 60_000
  return new Date(midnightUtc + refHour * 3_600_000)
}

/**
 * Builds a 24-element array of the local hour for each reference hour 0..23 in a given timezone.
 */
export function buildLocalHourMap(referenceTimezone: string, targetTimezone: string, at: Date = new Date()): number[] {
  const result: number[] = []
  for (let h = 0; h < 24; h++) {
    const utc = getReferenceDayUtc(referenceTimezone, h, at)
    result.push(getLocalHour(targetTimezone, utc))
  }
  return result
}

/**
 * Returns true if `hour` falls inside the awake window.
 * Supports overnight ranges (e.g. wake=22, sleep=6).
 */
export function isAwake(hour: number, settings: Settings): boolean {
  const { wakeHour, sleepHour } = settings
  if (wakeHour === sleepHour) return false
  if (wakeHour < sleepHour) return hour >= wakeHour && hour < sleepHour
  return hour >= wakeHour || hour < sleepHour
}

/**
 * Computes overlap between reference city and a list of cities.
 * mode === 'meeting': hours when ALL cities are awake simultaneously.
 * mode === 'base': hours when the reference city AND a single other city are both awake.
 *
 * Returns a map keyed by the OTHER city's id. In meeting mode, there is a single entry
 * keyed '__all__'. Each entry holds the set of ref-hour indices (0..23) that qualify,
 * the contiguous ranges (inclusive start, exclusive end) and a total hour count.
 */
export function computeOverlap(
  referenceCity: City,
  otherCities: City[],
  settings: Settings,
  mode: 'meeting' | 'base',
  at: Date = new Date(),
): Record<string, OverlapInfo> {
  const refHours = buildLocalHourMap(referenceCity.timezone, referenceCity.timezone, at)
  const refIsAwake = refHours.map((h) => isAwake(h, settings))

  const result: Record<string, OverlapInfo> = {}

  if (mode === 'meeting') {
    const overlaps = new Set<number>()
    const cityLocalMaps: number[][] = otherCities.map((c) => buildLocalHourMap(referenceCity.timezone, c.timezone, at))
    for (let refHour = 0; refHour < 24; refHour++) {
      if (!refIsAwake[refHour]) continue
      const allAwake = cityLocalMaps.every((map) => isAwake(map[refHour], settings))
      if (allAwake) overlaps.add(refHour)
    }
    result['__all__'] = buildOverlapInfo(overlaps)
  } else {
    for (const city of otherCities) {
      const map = buildLocalHourMap(referenceCity.timezone, city.timezone, at)
      const overlaps = new Set<number>()
      for (let refHour = 0; refHour < 24; refHour++) {
        if (!refIsAwake[refHour]) continue
        if (!isAwake(map[refHour], settings)) continue
        overlaps.add(refHour)
      }
      result[city.id] = buildOverlapInfo(overlaps)
    }
  }

  return result
}

/**
 * Turns a set of overlap hours (0..23) into contiguous ranges (inclusive start, exclusive end).
 * End-exclusive values greater than 24 indicate the range wraps across midnight.
 */
export function buildOverlapInfo(hours: Set<number>): OverlapInfo {
  if (hours.size === 0) {
    return { hours, ranges: [], totalHours: 0 }
  }
  if (hours.size === 24) {
    return { hours, ranges: [{ start: 0, endExclusive: 24 }], totalHours: 24 }
  }

  // Find the first gap (start hour that's missing). Cyclic scan from there groups
  // every contiguous run of present hours, including wraparound (which yields a
  // single range with endExclusive > 24).
  let firstGapStart = -1
  for (let h = 0; h < 24; h++) {
    if (!hours.has(h)) {
      firstGapStart = h
      break
    }
  }
  if (firstGapStart === -1) {
    return { hours, ranges: [{ start: 0, endExclusive: 24 }], totalHours: 24 }
  }

  const ranges: Array<{ start: number; endExclusive: number }> = []
  let runStart = -1
  for (let i = 0; i < 24; i++) {
    const h = (firstGapStart + i) % 24
    if (hours.has(h)) {
      if (runStart === -1) runStart = h
    } else if (runStart !== -1) {
      ranges.push({ start: runStart, endExclusive: h })
      runStart = -1
    }
  }
  if (runStart !== -1) {
    // Run extended through the end of the cyclic scan → it wraps back to firstGapStart.
    ranges.push({ start: runStart, endExclusive: firstGapStart + 24 })
  }

  ranges.sort((a, b) => a.start - b.start)
  return { hours, ranges, totalHours: hours.size }
}

/**
 * Format a single hour (0..47, may exceed 24 to indicate wrap) as a display string.
 */
export function formatHourLabel(hour: number, use24h: boolean): string {
  const h = ((hour % 24) + 24) % 24
  if (use24h) return `${h.toString().padStart(2, '0')}:00`
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  if (h < 12) return `${h}am`
  return `${h - 12}pm`
}

/**
 * Format an inclusive-start, exclusive-end hour range as a string.
 * If endExclusive > 24 the range wraps (next day).
 */
export function formatHourRange(start: number, endExclusive: number, use24h: boolean): string {
  const wraps = endExclusive > 24
  if (endExclusive === 24 && !wraps) {
    return `${formatHourLabel(start, use24h)} — ${formatHourLabel(endExclusive, use24h)}`
  }
  if (wraps) {
    return `${formatHourLabel(start, use24h)} — ${formatHourLabel(endExclusive, use24h)} (next day)`
  }
  return `${formatHourLabel(start, use24h)} — ${formatHourLabel(endExclusive, use24h)}`
}