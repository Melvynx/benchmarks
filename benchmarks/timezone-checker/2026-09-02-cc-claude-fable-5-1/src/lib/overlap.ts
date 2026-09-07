import type { City } from './cities'
import { getUtcOffsetMinutes, isAwake, localMinutesAt } from './time'

export type Mode = 'meeting' | 'base'

export interface Settings {
  wakeHour: number
  sleepHour: number
  timeFormat: '12h' | '24h'
}

export type CellState = 'sleeping' | 'awake' | 'overlap'

export interface Cell {
  refHour: number
  localMinutes: number
  state: CellState
}

export interface CityRow {
  city: City
  offset: number
  isReference: boolean
  cells: Cell[]
  /** Reference-city hours that count as overlap for this row. */
  overlapHours: number[]
}

export interface HourRange {
  start: number
  /** Exclusive end; may exceed 23 when the range wraps past midnight (e.g. 22 → 26 means 10pm–2am). */
  end: number
}

export interface Schedule {
  rows: CityRow[]
  /** Meeting mode: shared overlap hours across all cities. */
  sharedOverlap: number[]
}

export const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function buildSchedule(cities: City[], settings: Settings, mode: Mode, now = new Date()): Schedule {
  if (cities.length === 0) return { rows: [], sharedOverlap: [] }
  const reference = cities[0]!
  const refOffset = getUtcOffsetMinutes(reference.timeZone, now)

  const awakeMatrix = cities.map((city) => {
    const offset = getUtcOffsetMinutes(city.timeZone, now)
    const locals = HOURS.map((h) => localMinutesAt(h, refOffset, offset))
    const awake = locals.map((m) => isAwake(m, settings.wakeHour, settings.sleepHour))
    return { city, offset, locals, awake }
  })

  const refAwake = awakeMatrix[0]!.awake
  const sharedOverlap = HOURS.filter((h) => awakeMatrix.every((c) => c.awake[h]))

  const rows: CityRow[] = awakeMatrix.map((entry, index) => {
    const isReference = index === 0
    let overlapHours: number[]
    if (cities.length < 2) {
      overlapHours = []
    } else if (mode === 'meeting') {
      overlapHours = sharedOverlap
    } else if (isReference) {
      // In base mode the reference highlights every hour where at least one other city overlaps with it.
      overlapHours = HOURS.filter((h) => refAwake[h] && awakeMatrix.slice(1).some((c) => c.awake[h]))
    } else {
      overlapHours = HOURS.filter((h) => refAwake[h] && entry.awake[h])
    }
    const overlapSet = new Set(overlapHours)
    const cells: Cell[] = HOURS.map((h) => ({
      refHour: h,
      localMinutes: entry.locals[h]!,
      state: overlapSet.has(h) ? 'overlap' : entry.awake[h] ? 'awake' : 'sleeping',
    }))
    return { city: entry.city, offset: entry.offset, isReference, cells, overlapHours }
  })

  return { rows, sharedOverlap }
}

/** Groups sorted hours into contiguous [start, end) ranges, merging a wrap across midnight. */
export function toRanges(hours: number[]): HourRange[] {
  if (hours.length === 0) return []
  const sorted = [...new Set(hours)].sort((a, b) => a - b)
  if (sorted.length === 24) return [{ start: 0, end: 24 }]

  const ranges: HourRange[] = []
  let start = sorted[0]!
  let prev = start
  for (const h of sorted.slice(1)) {
    if (h === prev + 1) {
      prev = h
      continue
    }
    ranges.push({ start, end: prev + 1 })
    start = h
    prev = h
  }
  ranges.push({ start, end: prev + 1 })

  // Merge a range ending at midnight with one starting at 0 → single wrapped range.
  if (ranges.length > 1 && ranges[0]!.start === 0 && ranges.at(-1)!.end === 24) {
    const first = ranges.shift()!
    const last = ranges.pop()!
    ranges.push({ start: last.start, end: 24 + first.end })
  }
  return ranges
}
