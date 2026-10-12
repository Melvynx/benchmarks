import type { AwakeWindow, Mode } from '../types'
import { mod } from './time'

export const HOURS_PER_DAY = 24
export const HOURS: readonly number[] = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour)

/**
 * Whether a local hour falls in the awake window [wake, sleep).
 * `wake > sleep` is an overnight window; `wake === sleep` means always awake.
 */
export function isAwake(hour: number, { wake, sleep }: AwakeWindow): boolean {
  if (wake === sleep) return true
  return wake < sleep ? hour >= wake && hour < sleep : hour >= wake || hour < sleep
}

export function awakeHoursPerDay({ wake, sleep }: AwakeWindow): number {
  return wake === sleep ? HOURS_PER_DAY : mod(sleep - wake, HOURS_PER_DAY)
}

export interface LocalSlot {
  hour: number
  minute: number
  /** Local calendar day relative to the reference city's day: -1, 0 or +1. */
  dayShift: number
}

/** Local time in a city when it is `refHour`:00 in the reference city. */
export function getLocalSlot(refHour: number, offsetFromRefMinutes: number): LocalSlot {
  const total = refHour * 60 + offsetFromRefMinutes
  const within = mod(total, 24 * 60)
  return {
    hour: Math.floor(within / 60),
    minute: within % 60,
    dayShift: Math.floor(total / (24 * 60)),
  }
}

export type CellState = 'sleeping' | 'awake' | 'overlap'

export interface CellModel extends LocalSlot {
  refHour: number
  state: CellState
}

/** Inclusive `start`, exclusive `end`. Wraps past midnight when `end <= start`. */
export interface HourRange {
  start: number
  end: number
  hours: number
}

export interface OverlapSummary {
  hours: number
  ranges: HourRange[]
}

export interface Board {
  /** One row of 24 cells per city, index-aligned with the input offsets. */
  rows: CellModel[][]
  /** Meeting mode: a single shared summary. Base mode: one per non-reference city. Empty below 2 cities. */
  summaries: OverlapSummary[]
}

/** Collapse hourly flags into contiguous ranges, merging runs that wrap past midnight. */
export function toRanges(flags: readonly boolean[]): HourRange[] {
  const size = flags.length
  if (size === 0) return []
  const firstGap = flags.indexOf(false)
  if (firstGap === -1) return [{ start: 0, end: 0, hours: size }]

  const ranges: HourRange[] = []
  let start = -1
  for (let step = 1; step <= size; step++) {
    const hour = (firstGap + step) % size
    if (flags[hour]) {
      if (start === -1) start = hour
    } else if (start !== -1) {
      ranges.push({ start, end: hour, hours: mod(hour - start, size) })
      start = -1
    }
  }
  return ranges.sort((a, b) => a.start - b.start)
}

export function summarize(flags: readonly boolean[]): OverlapSummary {
  return { hours: flags.filter(Boolean).length, ranges: toRanges(flags) }
}

/**
 * Builds the 24-hour grid anchored to the first city (the reference).
 *
 * - meeting: an hour is overlap when every city is awake; all rows share it.
 * - base: each non-reference city is overlap when both it and the reference
 *   are awake; the reference row carries no overlap of its own.
 */
export function computeBoard(
  offsetsMinutes: readonly number[],
  awakeWindow: AwakeWindow,
  mode: Mode,
): Board {
  const slots = offsetsMinutes.map((offset) =>
    HOURS.map((refHour) => getLocalSlot(refHour, offset - offsetsMinutes[0])),
  )
  const awake = slots.map((row) => row.map((slot) => isAwake(slot.hour, awakeWindow)))

  let overlap: boolean[][]
  if (mode === 'meeting') {
    const shared = HOURS.map((hour) => awake.every((row) => row[hour]))
    overlap = awake.map(() => shared)
  } else {
    overlap = awake.map((row, index) =>
      HOURS.map((hour) => index > 0 && awake[0][hour] && row[hour]),
    )
  }

  const rows = slots.map((row, city) =>
    row.map(
      (slot, refHour): CellModel => ({
        ...slot,
        refHour,
        state: overlap[city][refHour] ? 'overlap' : awake[city][refHour] ? 'awake' : 'sleeping',
      }),
    ),
  )

  let summaries: OverlapSummary[] = []
  if (offsetsMinutes.length >= 2) {
    summaries = mode === 'meeting' ? [summarize(overlap[0])] : overlap.slice(1).map(summarize)
  }
  return { rows, summaries }
}
