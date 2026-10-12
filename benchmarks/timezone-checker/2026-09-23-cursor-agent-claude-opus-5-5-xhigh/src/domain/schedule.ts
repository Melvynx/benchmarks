import type { City } from './cities'
import { getUtcOffsetMinutes, MINUTES_PER_DAY, mod } from './time'

export type Mode = 'meeting' | 'base'
export type CellState = 'asleep' | 'awake' | 'overlap'

export const HOURS: readonly number[] = Array.from({ length: 24 }, (_, hour) => hour)

export interface AwakeWindow {
  wakeHour: number
  sleepHour: number
}

/** Equal wake and sleep hours mean "awake around the clock". */
export function isAwake(localMinutes: number, { wakeHour, sleepHour }: AwakeWindow): boolean {
  if (wakeHour === sleepHour) return true
  const wake = wakeHour * 60
  const sleep = sleepHour * 60
  return wake < sleep
    ? localMinutes >= wake && localMinutes < sleep
    : localMinutes >= wake || localMinutes < sleep
}

export const awakeHours = ({ wakeHour, sleepHour }: AwakeWindow) =>
  wakeHour === sleepHour ? 24 : mod(sleepHour - wakeHour, 24)

export interface Slot {
  /** Column: the hour of the reference city's day. */
  refHour: number
  /** Local wall-clock time in this city at the start of the column, 0–1439. */
  localMinutes: number
  /** Local calendar day relative to the reference day: -1, 0 or +1. */
  dayOffset: number
  awake: boolean
}

export interface CityTimeline {
  city: City
  offsetMinutes: number
  /** Offset relative to the reference city. */
  diffMinutes: number
  slots: readonly Slot[]
}

/** The first city is the reference: every column is one hour of its day. */
export function buildTimelines(cities: readonly City[], at: Date, window: AwakeWindow): CityTimeline[] {
  const [reference] = cities
  if (!reference) return []
  const referenceOffset = getUtcOffsetMinutes(reference.timeZone, at)

  return cities.map((city) => {
    const offsetMinutes = city === reference ? referenceOffset : getUtcOffsetMinutes(city.timeZone, at)
    const diffMinutes = offsetMinutes - referenceOffset
    const slots = HOURS.map((refHour) => {
      const total = refHour * 60 + diffMinutes
      const localMinutes = mod(total, MINUTES_PER_DAY)
      return {
        refHour,
        localMinutes,
        dayOffset: Math.floor(total / MINUTES_PER_DAY),
        awake: isAwake(localMinutes, window),
      }
    })
    return { city, offsetMinutes, diffMinutes, slots }
  })
}

/** One boolean per reference hour. */
export type HourMask = readonly boolean[]

export const countHours = (mask: HourMask) => mask.reduce((sum, on) => sum + (on ? 1 : 0), 0)

/** A run of reference hours; may wrap past midnight (e.g. start 22, length 4 → 10pm–2am). */
export interface HourRange {
  start: number
  length: number
}

export const rangeEnd = (range: HourRange) => (range.start + range.length) % 24

export const rangeContains = (range: HourRange, hour: number) => mod(hour - range.start, 24) < range.length

/** Splits a wrapping range into at most two non-wrapping pieces, for layout. */
export function rangeSegments(range: HourRange): HourRange[] {
  const tail = range.start + range.length - 24
  if (tail <= 0) return [range]
  return [{ start: range.start, length: 24 - range.start }, { start: 0, length: tail }]
}

/**
 * Contiguous runs of `true`. The day is treated as a cycle, so hours 22–23 and 0–1
 * form a single 10pm–2am window rather than two fragments.
 */
export function maskToRanges(mask: HourMask): HourRange[] {
  const firstGap = mask.indexOf(false)
  if (firstGap === -1) return mask.length === 24 ? [{ start: 0, length: 24 }] : []

  const ranges: HourRange[] = []
  let current: HourRange | null = null
  for (let step = 1; step <= 24; step++) {
    const hour = (firstGap + step) % 24
    if (mask[hour]) {
      if (current) current.length++
      else current = { start: hour, length: 1 }
    } else if (current) {
      ranges.push(current)
      current = null
    }
  }
  return ranges.sort((a, b) => a.start - b.start)
}

export interface PartialWindow extends HourRange {
  asleep: City[]
}

export interface MeetingOverlap {
  mode: 'meeting'
  mask: HourMask
  ranges: HourRange[]
  hours: number
  /** When nobody-left-out is impossible: the hours where the most people are awake. */
  fallback: { awake: number; total: number; windows: PartialWindow[] } | null
}

export interface PairOverlap {
  timeline: CityTimeline
  mask: HourMask
  ranges: HourRange[]
  hours: number
}

export interface BaseOverlap {
  mode: 'base'
  pairs: PairOverlap[]
  /** Hours where the base city overlaps with at least one other city. */
  unionMask: HourMask
}

export type OverlapAnalysis = MeetingOverlap | BaseOverlap

/** Cuts a range wherever `keyOf` changes; a full-day range is rotated so a run crossing midnight stays whole. */
function splitRange(range: HourRange, keyOf: (hour: number) => string): HourRange[] {
  let { start } = range
  if (range.length === 24) {
    const cut = HOURS.find((hour) => keyOf(hour) !== keyOf(mod(hour - 1, 24)))
    if (cut === undefined) return [range]
    start = cut
  }
  const pieces: HourRange[] = []
  for (let step = 0; step < range.length; step++) {
    const hour = (start + step) % 24
    const last = pieces.at(-1)
    if (last && keyOf(hour) === keyOf(mod(hour - 1, 24))) last.length++
    else pieces.push({ start: hour, length: 1 })
  }
  return pieces
}

function meetingFallback(timelines: readonly CityTimeline[]): MeetingOverlap['fallback'] {
  const asleepAt = HOURS.map((hour) => timelines.filter((t) => !t.slots[hour]?.awake).map((t) => t.city))
  const best = timelines.length - Math.min(...asleepAt.map((cities) => cities.length))
  if (best < 2) return null

  // Each window has one fixed set of sleepers, so "k of n awake" holds for every hour of it.
  const sleepersKey = (hour: number) => (asleepAt[hour] ?? []).map((city) => city.id).join()
  const windows = maskToRanges(asleepAt.map((cities) => timelines.length - cities.length === best))
    .flatMap((range) => splitRange(range, sleepersKey))
    .map((range) => ({ ...range, asleep: asleepAt[range.start] ?? [] }))
    .sort((a, b) => a.start - b.start)
  return { awake: best, total: timelines.length, windows }
}

/** Overlap needs at least two cities; returns null otherwise. */
export function analyzeOverlap(timelines: readonly CityTimeline[], mode: Mode): OverlapAnalysis | null {
  const [reference, ...others] = timelines
  if (!reference || others.length === 0) return null

  if (mode === 'meeting') {
    const mask = HOURS.map((hour) => timelines.every((t) => t.slots[hour]?.awake))
    const hours = countHours(mask)
    return {
      mode,
      mask,
      ranges: maskToRanges(mask),
      hours,
      fallback: hours === 0 ? meetingFallback(timelines) : null,
    }
  }

  const pairs = others.map((timeline) => {
    const mask = HOURS.map((hour) => Boolean(reference.slots[hour]?.awake && timeline.slots[hour]?.awake))
    return { timeline, mask, ranges: maskToRanges(mask), hours: countHours(mask) }
  })
  const unionMask = HOURS.map((hour) => pairs.some((pair) => pair.mask[hour]))
  return { mode, pairs, unionMask }
}

/** Visual state of every cell, aligned with `timelines` (rows) and `HOURS` (columns). */
export function resolveCellStates(
  timelines: readonly CityTimeline[],
  analysis: OverlapAnalysis | null,
): CellState[][] {
  return timelines.map((timeline, row) => {
    const overlapMask: HourMask | undefined = !analysis
      ? undefined
      : analysis.mode === 'meeting'
        ? analysis.mask
        : row === 0
          ? analysis.unionMask
          : analysis.pairs[row - 1]?.mask

    return timeline.slots.map((slot) => {
      if (!slot.awake) return 'asleep'
      return overlapMask?.[slot.refHour] ? 'overlap' : 'awake'
    })
  })
}
