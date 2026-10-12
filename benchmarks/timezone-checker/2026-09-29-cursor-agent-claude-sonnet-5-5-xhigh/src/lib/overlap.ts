import type { City } from '../data/cities'
import type { AwakeWindow, Mode } from './types'

export const HOURS_PER_DAY = 24
const MINUTES_PER_DAY = HOURS_PER_DAY * 60

/** Half-open range of reference-city hours: `[start, end)`, `end` in 1..24. */
export interface HourRange {
  start: number
  end: number
}

export interface GridCity {
  city: City
  /** UTC offset in minutes at the time of calculation. */
  offsetMinutes: number
}

export interface GridCell {
  /** Column: the hour (0–23) it is in the reference city. */
  refHour: number
  /** Local time in this city at the start of that hour, minutes since local midnight. */
  localMinutes: number
  /** Local calendar day relative to the reference city's day (-1, 0, +1). */
  dayShift: number
  awake: boolean
  overlap: boolean
}

export interface GridRow extends GridCity {
  isReference: boolean
  cells: GridCell[]
}

export interface OverlapEntry {
  hours: number
  ranges: HourRange[]
}

export type OverlapSummary =
  | ({ mode: 'meeting' } & OverlapEntry)
  | { mode: 'base'; entries: (OverlapEntry & { city: City })[] }

export interface Grid {
  rows: GridRow[]
  /** Reference-hour columns shared by every city (meeting mode only). */
  sharedOverlap: boolean[]
  /** `null` until at least two cities are present. */
  summary: OverlapSummary | null
}

/**
 * Whether a local minute-of-day falls in the awake window. Handles overnight
 * windows (wake 22 → sleep 6). `wake === sleep` means awake all day.
 *
 * A grid column is judged by the local time at which it starts.
 */
export function isAwake(localMinutes: number, { wake, sleep }: AwakeWindow): boolean {
  const start = wake * 60
  const end = sleep * 60
  return start < end
    ? localMinutes >= start && localMinutes < end
    : localMinutes >= start || localMinutes < end
}

export function awakeHoursPerDay({ wake, sleep }: AwakeWindow): number {
  return wake < sleep ? sleep - wake : HOURS_PER_DAY - wake + sleep
}

export function toRanges(flags: readonly boolean[]): HourRange[] {
  const ranges: HourRange[] = []
  let start: number | null = null

  flags.forEach((flag, hour) => {
    if (flag && start === null) start = hour
    if (!flag && start !== null) {
      ranges.push({ start, end: hour })
      start = null
    }
  })
  if (start !== null) ranges.push({ start, end: flags.length })

  return ranges
}

const countTrue = (flags: readonly boolean[]) => flags.filter(Boolean).length

function summarize(flags: readonly boolean[]): OverlapEntry {
  return { hours: countTrue(flags), ranges: toRanges(flags) }
}

function buildCells(row: GridCity, reference: GridCity, window: AwakeWindow): GridCell[] {
  const delta = row.offsetMinutes - reference.offsetMinutes

  return Array.from({ length: HOURS_PER_DAY }, (_, refHour) => {
    const total = refHour * 60 + delta
    const localMinutes = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
    return {
      refHour,
      localMinutes,
      dayShift: Math.floor(total / MINUTES_PER_DAY),
      awake: isAwake(localMinutes, window),
      overlap: false,
    }
  })
}

/**
 * Builds the 24-column model. `cities[0]` is the reference city: every column
 * is an hour of *its* day and every other city is shifted relative to it.
 */
export function buildGrid(cities: readonly GridCity[], window: AwakeWindow, mode: Mode): Grid {
  const [reference] = cities
  if (!reference) return { rows: [], sharedOverlap: [], summary: null }

  const rows: GridRow[] = cities.map((entry, index) => ({
    ...entry,
    isReference: index === 0,
    cells: buildCells(entry, reference, window),
  }))

  if (rows.length < 2) return { rows, sharedOverlap: [], summary: null }

  const referenceRow = rows[0]!

  if (mode === 'meeting') {
    const sharedOverlap = referenceRow.cells.map((_, hour) => rows.every((row) => row.cells[hour]!.awake))
    rows.forEach((row) =>
      row.cells.forEach((cell) => {
        cell.overlap = sharedOverlap[cell.refHour]!
      }),
    )
    return { rows, sharedOverlap, summary: { mode, ...summarize(sharedOverlap) } }
  }

  const entries = rows.slice(1).map((row) => {
    const flags = row.cells.map((cell) => cell.awake && referenceRow.cells[cell.refHour]!.awake)
    row.cells.forEach((cell) => {
      cell.overlap = flags[cell.refHour]!
    })
    return { city: row.city, ...summarize(flags) }
  })

  return { rows, sharedOverlap: [], summary: { mode, entries } }
}
