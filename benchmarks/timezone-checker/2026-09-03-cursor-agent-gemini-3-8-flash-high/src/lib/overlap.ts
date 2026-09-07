import type { City } from '@/data/cities'
import {
  currentHourAtOffset,
  formatWholeHour,
  getUtcOffsetMinutes,
  localMinuteOfDay,
  type TimeFormat,
} from './timezone'

export type Mode = 'meeting' | 'base'

export interface AwakeWindow {
  /** Hour (0–23) the awake window starts, inclusive. Default: 7 */
  wakeHour: number
  /** Hour (0–23) the awake window ends, exclusive. Default: 23 */
  sleepHour: number
}

export type CellState = 'sleeping' | 'awake' | 'overlap'

export interface HourCell {
  /** Hour of reference city (0–23) */
  referenceHour: number
  /** Local minute of day in this city at referenceHour */
  localMinute: number
  /** Visual state */
  state: CellState
  /** Is awake */
  isAwake: boolean
}

export interface CityRow {
  city: City
  offsetMinutes: number
  isReference: boolean
  cells: HourCell[]
}

export interface HourRange {
  /** Inclusive start hour in reference time (0–23) */
  start: number
  /** Exclusive end hour in reference time (1–24, or >24 if wrapped midnight) */
  end: number
}

export interface OverlapResult {
  hours: number[]
  ranges: HourRange[]
}

export interface Schedule {
  rows: CityRow[]
  referenceOffset: number
  currentReferenceHour: number | null
  meeting: OverlapResult
  perCity: Map<string, OverlapResult>
}

export const HOURS = Array.from({ length: 24 }, (_, i) => i)

/**
 * Checks if a local minute of day is within the awake window.
 * Supports overnight ranges (e.g. wake at 22, sleep at 6).
 */
export function isAwake(localMinute: number, { wakeHour, sleepHour }: AwakeWindow): boolean {
  const wake = wakeHour * 60
  const sleep = sleepHour * 60

  if (wake === sleep) {
    // 24 hours awake
    return true
  }

  if (wake < sleep) {
    return localMinute >= wake && localMinute < sleep
  }

  // Overnight window: e.g. wake at 22 (1320), sleep at 6 (360)
  return localMinute >= wake || localMinute < sleep
}

/**
 * Converts a list of hours (0–23) to inclusive start -> exclusive end ranges.
 * Merges across midnight if contiguous.
 */
export function hoursToRanges(hours: number[]): HourRange[] {
  if (hours.length === 0) return []
  const sorted = [...new Set(hours)].sort((a, b) => a - b)
  if (sorted.length === 24) return [{ start: 0, end: 24 }]

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

  // Check if wraps across midnight: first starts at 0 and last ends at 24
  if (ranges.length > 1) {
    const first = ranges[0]
    const last = ranges[ranges.length - 1]
    if (first.start === 0 && last.end === 24) {
      ranges.pop()
      ranges.shift()
      ranges.push({ start: last.start, end: 24 + first.end })
    }
  }

  return ranges
}

export function formatHourRange(range: HourRange, format: TimeFormat): string {
  if (range.start === 0 && range.end === 24) {
    return 'All day (24h)'
  }

  const startFormatted = formatWholeHour(range.start % 24, format)
  // Exclusive end hour:
  // e.g. if start=9, end=12, start is 9am, end is 12pm.
  // if start=22, end=26, start is 10pm, end is 2am.
  const endHour = range.end % 24
  const endFormatted = formatWholeHour(endHour, format)

  return `${startFormatted} — ${endFormatted}`
}

export function computeSchedule(
  cities: City[],
  window: AwakeWindow,
  mode: Mode,
  now: Date = new Date()
): Schedule {
  if (cities.length === 0) {
    return {
      rows: [],
      referenceOffset: 0,
      currentReferenceHour: null,
      meeting: { hours: [], ranges: [] },
      perCity: new Map(),
    }
  }

  const offsets = cities.map((c) => getUtcOffsetMinutes(c.timeZone, now))
  const referenceOffset = offsets[0]

  // Calculate awake status for every city at every reference hour (0..23)
  const awakeMatrix: boolean[][] = cities.map((_, cityIdx) => {
    return HOURS.map((refHour) => {
      const localMin = localMinuteOfDay(refHour, referenceOffset, offsets[cityIdx])
      return isAwake(localMin, window)
    })
  })

  const referenceAwake = awakeMatrix[0]

  // Meeting mode: hours where ALL cities are simultaneously awake
  const meetingHours = HOURS.filter((refHour) =>
    awakeMatrix.every((cityRow) => cityRow[refHour])
  )
  const meetingResult: OverlapResult = {
    hours: meetingHours,
    ranges: hoursToRanges(meetingHours),
  }

  // Base mode: each other city compared independently with reference city
  const perCity = new Map<string, OverlapResult>()
  for (let i = 1; i < cities.length; i++) {
    const sharedHours = HOURS.filter(
      (refHour) => referenceAwake[refHour] && awakeMatrix[i][refHour]
    )
    perCity.set(cities[i].id, {
      hours: sharedHours,
      ranges: hoursToRanges(sharedHours),
    })
  }

  // In base mode, reference row highlights hours where AT LEAST ONE other city overlaps
  const referenceBaseHours = new Set<number>()
  for (const res of perCity.values()) {
    for (const h of res.hours) {
      referenceBaseHours.add(h)
    }
  }

  const rows: CityRow[] = cities.map((city, cityIdx) => {
    const isReference = cityIdx === 0
    let highlightedHours: Set<number>

    if (mode === 'meeting') {
      highlightedHours = new Set(meetingHours)
    } else {
      if (isReference) {
        highlightedHours = referenceBaseHours
      } else {
        highlightedHours = new Set(perCity.get(city.id)?.hours ?? [])
      }
    }

    const cells: HourCell[] = HOURS.map((refHour) => {
      const awake = awakeMatrix[cityIdx][refHour]
      const qualifies = highlightedHours.has(refHour)

      let state: CellState
      if (!awake) {
        state = 'sleeping'
      } else if (qualifies) {
        state = 'overlap'
      } else {
        state = 'awake'
      }

      return {
        referenceHour: refHour,
        localMinute: localMinuteOfDay(refHour, referenceOffset, offsets[cityIdx]),
        state,
        isAwake: awake,
      }
    })

    return {
      city,
      offsetMinutes: offsets[cityIdx],
      isReference,
      cells,
    }
  })

  return {
    rows,
    referenceOffset,
    currentReferenceHour: currentHourAtOffset(referenceOffset, now),
    meeting: meetingResult,
    perCity,
  }
}
