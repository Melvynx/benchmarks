import type { City } from '@/data/cities'
import { currentHourAtOffset, getUtcOffsetMinutes, localMinuteOfDay } from './timezone'

export type Mode = 'meeting' | 'base'

export interface AwakeWindow {
  /** Hour (0–23) the awake window starts, inclusive. */
  wakeHour: number
  /** Hour (0–23) the awake window ends, exclusive. */
  sleepHour: number
}

export type CellState = 'sleeping' | 'awake' | 'overlap'

export interface HourCell {
  /** Hour of the reference city's day (0–23) this cell belongs to. */
  referenceHour: number
  /** Local minute-of-day in this city at that reference hour. */
  localMinute: number
  state: CellState
}

export interface CityRow {
  city: City
  offsetMinutes: number
  isReference: boolean
  cells: HourCell[]
}

export interface HourRange {
  /** Inclusive start hour in reference time. */
  start: number
  /** Exclusive end hour in reference time; may exceed 23 when wrapping midnight. */
  end: number
}

export interface OverlapResult {
  hours: number[]
  ranges: HourRange[]
}

export interface Schedule {
  rows: CityRow[]
  /** The hour it is right now in the reference city, or null when no cities are selected. */
  currentReferenceHour: number | null
  /** Meeting mode: overlap shared by every city. */
  meeting: OverlapResult
  /** Base mode: overlap of each non-reference city with the reference, keyed by city id. */
  perCity: Map<string, OverlapResult>
}

export const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

/**
 * Whether a local minute-of-day falls inside the awake window.
 * Supports overnight windows (wake 22 → sleep 6). Equal hours = always awake.
 */
export function isAwake(localMinute: number, { wakeHour, sleepHour }: AwakeWindow): boolean {
  const wake = wakeHour * 60
  const sleep = sleepHour * 60
  if (wake === sleep) return true
  if (wake < sleep) return localMinute >= wake && localMinute < sleep
  return localMinute >= wake || localMinute < sleep
}

/** Collapse a sorted list of hours into contiguous [start, end) ranges, merging across midnight. */
export function hoursToRanges(hours: number[]): HourRange[] {
  if (hours.length === 0) return []
  const sorted = [...new Set(hours)].sort((a, b) => a - b)
  if (sorted.length === 24) return [{ start: 0, end: 24 }]

  const ranges: HourRange[] = []
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

  // A range ending at midnight followed by one starting at 0 is one window that wraps.
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

function toResult(hours: number[]): OverlapResult {
  return { hours, ranges: hoursToRanges(hours) }
}

export function computeSchedule(
  cities: City[],
  window: AwakeWindow,
  mode: Mode,
  now: Date = new Date(),
): Schedule {
  if (cities.length === 0) {
    return { rows: [], currentReferenceHour: null, meeting: toResult([]), perCity: new Map() }
  }

  const offsets = cities.map((city) => getUtcOffsetMinutes(city.timeZone, now))
  const referenceOffset = offsets[0]

  const awakeMatrix = cities.map((_, index) =>
    HOURS.map((hour) => isAwake(localMinuteOfDay(hour, referenceOffset, offsets[index]), window)),
  )
  const referenceAwake = awakeMatrix[0]

  const meetingHours = HOURS.filter((hour) => awakeMatrix.every((row) => row[hour]))

  const perCity = new Map<string, OverlapResult>()
  for (let index = 1; index < cities.length; index++) {
    const hours = HOURS.filter((hour) => referenceAwake[hour] && awakeMatrix[index][hour])
    perCity.set(cities[index].id, toResult(hours))
  }

  // In base mode the reference row lights up wherever at least one colleague is reachable.
  const referenceBaseHours = new Set<number>()
  for (const result of perCity.values()) result.hours.forEach((hour) => referenceBaseHours.add(hour))

  const rows: CityRow[] = cities.map((city, index) => {
    const isReference = index === 0
    const highlighted: ReadonlySet<number> =
      mode === 'meeting'
        ? new Set(meetingHours)
        : isReference
          ? referenceBaseHours
          : new Set(perCity.get(city.id)?.hours ?? [])

    const cells: HourCell[] = HOURS.map((hour) => {
      const awake = awakeMatrix[index][hour]
      const state: CellState = !awake ? 'sleeping' : highlighted.has(hour) ? 'overlap' : 'awake'
      return {
        referenceHour: hour,
        localMinute: localMinuteOfDay(hour, referenceOffset, offsets[index]),
        state,
      }
    })

    return { city, offsetMinutes: offsets[index], isReference, cells }
  })

  return {
    rows,
    currentReferenceHour: currentHourAtOffset(referenceOffset, now),
    meeting: toResult(meetingHours),
    perCity,
  }
}
