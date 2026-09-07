import type { City } from '../data/cities'
import { getUtcOffsetMinutes, MINUTES_PER_DAY, mod } from './time'

export type Mode = 'meeting' | 'base'

export type AwakeWindow = {
  wakeHour: number
  sleepHour: number
}

export type CellState = 'sleeping' | 'awake' | 'overlap'

export type HourCell = {
  refHour: number
  localMinutes: number
  localHour: number
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

export type HourRange = { start: number; end: number; length: number }

export type CityOverlap = {
  city: City
  hours: number
  ranges: HourRange[]
}

export type Board = {
  rows: CityRow[]
  meeting: { hours: number; ranges: HourRange[] }
  perCity: CityOverlap[]
}

export function isAwakeAt(hour: number, window: AwakeWindow): boolean {
  const length = mod(window.sleepHour - window.wakeHour, 24)
  if (length === 0) return true
  return mod(hour - window.wakeHour, 24) < length
}

export function toRanges(flags: boolean[]): HourRange[] {
  if (flags.every(Boolean)) return [{ start: 0, end: 0, length: 24 }]
  if (flags.every((flag) => !flag)) return []

  const ranges: HourRange[] = []
  for (let hour = 0; hour < 24; hour += 1) {
    if (!flags[hour]) continue
    const last = ranges[ranges.length - 1]
    if (last && last.end === hour) {
      last.end = hour + 1
    } else {
      ranges.push({ start: hour, end: hour + 1, length: 0 })
    }
  }

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

export function buildBoard(
  cities: City[],
  window: AwakeWindow,
  mode: Mode,
  now: Date,
): Board {
  if (cities.length === 0) {
    return { rows: [], meeting: { hours: 0, ranges: [] }, perCity: [] }
  }

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
        state: 'sleeping' as const,
      }
    })
    return { city, isReference: index === 0, offsetMinutes: offsets[index], cells }
  })

  if (mode === 'meeting') {
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

  const referenceShared = Array.from({ length: 24 }, () => false)
  const perCity: CityOverlap[] = []

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index]
    const shared = Array.from(
      { length: 24 },
      (_, hour) => rows[0].cells[hour].awake && row.cells[hour].awake,
    )
    for (const cell of row.cells) {
      cell.state = shared[cell.refHour] ? 'overlap' : cell.awake ? 'awake' : 'sleeping'
      if (shared[cell.refHour]) referenceShared[cell.refHour] = true
    }
    const ranges = toRanges(shared)
    perCity.push({ city: row.city, hours: countHours(ranges), ranges })
  }

  if (rows[0]) {
    for (const cell of rows[0].cells) {
      cell.state = referenceShared[cell.refHour] ? 'overlap' : cell.awake ? 'awake' : 'sleeping'
    }
  }

  return { rows, meeting: { hours: 0, ranges: [] }, perCity }
}
