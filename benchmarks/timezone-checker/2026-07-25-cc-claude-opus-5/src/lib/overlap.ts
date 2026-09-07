import type { City } from '../data/cities'
import { getUtcOffsetMinutes, MINUTES_PER_DAY, mod } from './time'

export type Mode = 'meeting' | 'base'

export type AwakeWindow = {
  /** First awake hour, inclusive. */
  wakeHour: number
  /** First sleeping hour, exclusive end of the awake window. */
  sleepHour: number
}

export type CellState = 'sleeping' | 'awake' | 'overlap'

export type HourCell = {
  /** Column index — the hour of the day in the reference city. */
  refHour: number
  /** Wall clock in this city, as minutes since its local midnight. */
  localMinutes: number
  localHour: number
  /** −1, 0 or +1: calendar days away from the reference city's day. */
  dayShift: number
  awake: boolean
  state: CellState
}

export type CityRow = {
  city: City
  isReference: boolean
  offsetMinutes: number
  cells: HourCell[]
}

/** Half-open span of reference-city hours: `start` inclusive, `end` exclusive. */
export type HourRange = { start: number; end: number; length: number }

export type CityOverlap = {
  city: City
  hours: number
  ranges: HourRange[]
}

export type Board = {
  rows: CityRow[]
  /** Meeting mode: the window everyone shares. Empty in base mode. */
  meeting: { hours: number; ranges: HourRange[] }
  /** Base mode: one entry per non-reference city, versus the reference. Empty in meeting mode. */
  perCity: CityOverlap[]
}

/** Is `hour` inside the awake window? Handles overnight windows (22 → 6). */
export function isAwakeAt(hour: number, window: AwakeWindow): boolean {
  const length = mod(window.sleepHour - window.wakeHour, 24)
  if (length === 0) return false
  return mod(hour - window.wakeHour, 24) < length
}

/** Contiguous runs of `true`, merged across midnight when the day wraps. */
export function toRanges(flags: boolean[]): HourRange[] {
  if (flags.every(Boolean)) return [{ start: 0, end: 0, length: 24 }]
  if (flags.every((flag) => !flag)) return []

  const ranges: HourRange[] = []
  for (let hour = 0; hour < 24; hour += 1) {
    if (!flags[hour]) continue
    if (ranges.length && ranges[ranges.length - 1].end === hour) {
      ranges[ranges.length - 1].end = hour + 1
    } else {
      ranges.push({ start: hour, end: hour + 1, length: 0 })
    }
  }

  // A window that straddles midnight shows up as two runs at the edges; join them.
  const first = ranges[0]
  const last = ranges[ranges.length - 1]
  if (ranges.length > 1 && first.start === 0 && last.end === 24) {
    ranges.pop()
    ranges.shift()
    ranges.push({ start: last.start, end: first.end, length: 0 })
  }

  for (const range of ranges) range.length = mod(range.end - range.start, 24) || 24
  return ranges
}

export function countHours(ranges: HourRange[]): number {
  return ranges.reduce((total, range) => total + range.length, 0)
}

/**
 * Projects every city onto the reference city's 24-hour day and resolves each
 * cell to sleeping / awake / overlap for the active mode.
 */
export function buildBoard(
  cities: City[],
  window: AwakeWindow,
  mode: Mode,
  now: Date,
): Board {
  if (cities.length === 0) return { rows: [], meeting: { hours: 0, ranges: [] }, perCity: [] }

  const offsets = cities.map((city) => getUtcOffsetMinutes(city.timeZone, now))
  const referenceOffset = offsets[0]

  const rows: CityRow[] = cities.map((city, index) => {
    const delta = offsets[index] - referenceOffset
    const cells: HourCell[] = Array.from({ length: 24 }, (_, refHour) => {
      const absolute = refHour * 60 + delta
      const localMinutes = mod(absolute, MINUTES_PER_DAY)
      const localHour = Math.floor(localMinutes / 60)
      return {
        refHour,
        localMinutes,
        localHour,
        dayShift: Math.floor(absolute / MINUTES_PER_DAY),
        awake: isAwakeAt(localHour, window),
        state: 'sleeping',
      }
    })
    return { city, isReference: index === 0, offsetMinutes: offsets[index], cells }
  })

  const awakeAt = (rowIndex: number, hour: number) => rows[rowIndex].cells[hour].awake

  if (mode === 'meeting') {
    // Overlap needs someone to overlap with — a lone city is only ever awake.
    const shared = Array.from(
      { length: 24 },
      (_, hour) => rows.length > 1 && rows.every((row) => row.cells[hour].awake),
    )
    for (const row of rows) {
      for (const cell of row.cells) {
        cell.state = shared[cell.refHour] ? 'overlap' : cell.awake ? 'awake' : 'sleeping'
      }
    }
    const ranges = toRanges(shared)
    return { rows, meeting: { hours: countHours(ranges), ranges }, perCity: [] }
  }

  // Base mode: each city is compared only against the reference.
  const referenceShared = Array.from({ length: 24 }, () => false)
  const perCity: CityOverlap[] = []

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index]
    const shared = Array.from(
      { length: 24 },
      (_, hour) => awakeAt(0, hour) && awakeAt(index, hour),
    )
    for (const cell of row.cells) {
      cell.state = shared[cell.refHour] ? 'overlap' : cell.awake ? 'awake' : 'sleeping'
      if (shared[cell.refHour]) referenceShared[cell.refHour] = true
    }
    const ranges = toRanges(shared)
    perCity.push({ city: row.city, hours: countHours(ranges), ranges })
  }

  // The reference lights up wherever it matches at least one other city.
  for (const cell of rows[0].cells) {
    cell.state = referenceShared[cell.refHour] ? 'overlap' : cell.awake ? 'awake' : 'sleeping'
  }

  return { rows, meeting: { hours: 0, ranges: [] }, perCity }
}
