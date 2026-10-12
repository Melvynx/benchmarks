import { describe, expect, it } from 'vitest'
import { awakeHoursPerDay, computeBoard, getLocalSlot, isAwake, toRanges } from './overlap'

const DEFAULT_WINDOW = { wake: 7, sleep: 23 }
const H = 60

// San Francisco (reference), Denpasar, Geneva on 2026-09-29.
const DEFAULT_OFFSETS = [-7 * H, 8 * H, 2 * H]

const overlapHours = (row: { state: string }[]) =>
  row.flatMap((cell, hour) => (cell.state === 'overlap' ? [hour] : []))

describe('isAwake', () => {
  it('treats the window as wake inclusive, sleep exclusive', () => {
    expect(isAwake(6, DEFAULT_WINDOW)).toBe(false)
    expect(isAwake(7, DEFAULT_WINDOW)).toBe(true)
    expect(isAwake(22, DEFAULT_WINDOW)).toBe(true)
    expect(isAwake(23, DEFAULT_WINDOW)).toBe(false)
    expect(isAwake(0, DEFAULT_WINDOW)).toBe(false)
  })

  it('supports overnight windows', () => {
    const night = { wake: 22, sleep: 6 }
    expect([21, 22, 23, 0, 5, 6, 12].map((h) => isAwake(h, night))).toEqual([
      false, true, true, true, true, false, false,
    ])
  })

  it('treats wake === sleep as awake all day', () => {
    expect(Array.from({ length: 24 }, (_, h) => isAwake(h, { wake: 9, sleep: 9 })).every(Boolean)).toBe(true)
    expect(awakeHoursPerDay({ wake: 9, sleep: 9 })).toBe(24)
    expect(awakeHoursPerDay(DEFAULT_WINDOW)).toBe(16)
    expect(awakeHoursPerDay({ wake: 22, sleep: 6 })).toBe(8)
  })
})

describe('getLocalSlot', () => {
  it('shifts whole hours and tracks the calendar day', () => {
    expect(getLocalSlot(9, 15 * H)).toEqual({ hour: 0, minute: 0, dayShift: 1 })
    expect(getLocalSlot(0, 15 * H)).toEqual({ hour: 15, minute: 0, dayShift: 0 })
    expect(getLocalSlot(3, -10 * H)).toEqual({ hour: 17, minute: 0, dayShift: -1 })
  })

  it('keeps minutes for fractional offsets', () => {
    expect(getLocalSlot(0, 12 * H + 30)).toEqual({ hour: 12, minute: 30, dayShift: 0 })
    expect(getLocalSlot(12, 12 * H + 45)).toEqual({ hour: 0, minute: 45, dayShift: 1 })
  })
})

describe('toRanges', () => {
  const flags = (...hours: number[]) => Array.from({ length: 24 }, (_, h) => hours.includes(h))

  it('returns nothing when there is no overlap', () => {
    expect(toRanges(flags())).toEqual([])
  })

  it('uses inclusive start and exclusive end', () => {
    expect(toRanges(flags(9, 10, 11))).toEqual([{ start: 9, end: 12, hours: 3 }])
  })

  it('splits non-contiguous windows', () => {
    expect(toRanges(flags(7, 22))).toEqual([
      { start: 7, end: 8, hours: 1 },
      { start: 22, end: 23, hours: 1 },
    ])
  })

  it('merges a run that wraps past midnight', () => {
    expect(toRanges(flags(22, 23, 0, 1))).toEqual([{ start: 22, end: 2, hours: 4 }])
  })

  it('reports a full day as a single range', () => {
    expect(toRanges(flags(...Array.from({ length: 24 }, (_, h) => h)))).toEqual([
      { start: 0, end: 0, hours: 24 },
    ])
  })

  it('handles a range ending at the last hour', () => {
    expect(toRanges(flags(20, 21, 22, 23))).toEqual([{ start: 20, end: 0, hours: 4 }])
  })
})

describe('computeBoard - meeting mode', () => {
  const board = computeBoard(DEFAULT_OFFSETS, DEFAULT_WINDOW, 'meeting')

  it('builds 24 cells per city, anchored to the reference city', () => {
    expect(board.rows).toHaveLength(3)
    board.rows.forEach((row) => expect(row).toHaveLength(24))
    expect(board.rows[0].map((cell) => cell.hour)).toEqual(Array.from({ length: 24 }, (_, h) => h))
    expect(board.rows[1][0].hour).toBe(15)
    expect(board.rows[2][0].hour).toBe(9)
  })

  it('shares one overlap window across every row', () => {
    expect(overlapHours(board.rows[0])).toEqual([7, 22])
    expect(overlapHours(board.rows[1])).toEqual([7, 22])
    expect(overlapHours(board.rows[2])).toEqual([7, 22])
  })

  it('produces a single summary with separate ranges', () => {
    expect(board.summaries).toEqual([
      {
        hours: 2,
        ranges: [
          { start: 7, end: 8, hours: 1 },
          { start: 22, end: 23, hours: 1 },
        ],
      },
    ])
  })

  it('marks sleeping vs awake-without-overlap cells', () => {
    // Geneva is 9h ahead of SF: SF 12am -> Geneva 9am (awake, but Denpasar is not).
    expect(board.rows[2][0].state).toBe('awake')
    // SF 3am -> Geneva 12pm awake, SF 3am is sleeping for SF.
    expect(board.rows[0][3].state).toBe('sleeping')
    // SF 15:00 -> Denpasar 6:00, sleeping there.
    expect(board.rows[1][15].state).toBe('sleeping')
  })
})

describe('computeBoard - zero overlap', () => {
  it('returns an empty summary when awake windows never intersect', () => {
    const board = computeBoard([0, 12 * H], { wake: 8, sleep: 16 }, 'meeting')
    expect(board.summaries).toEqual([{ hours: 0, ranges: [] }])
    expect(board.rows.flat().some((cell) => cell.state === 'overlap')).toBe(false)
  })
})

describe('computeBoard - base mode', () => {
  const board = computeBoard(DEFAULT_OFFSETS, DEFAULT_WINDOW, 'base')

  it('computes each city against the reference independently', () => {
    expect(overlapHours(board.rows[1])).toEqual([7, 16, 17, 18, 19, 20, 21, 22])
    expect(overlapHours(board.rows[2])).toEqual([7, 8, 9, 10, 11, 12, 13, 22])
  })

  it('keeps the reference row free of overlap highlighting', () => {
    expect(overlapHours(board.rows[0])).toEqual([])
    expect(board.rows[0][12].state).toBe('awake')
    expect(board.rows[0][3].state).toBe('sleeping')
  })

  it('returns one summary per non-reference city', () => {
    expect(board.summaries).toHaveLength(2)
    expect(board.summaries[0]).toEqual({
      hours: 8,
      ranges: [
        { start: 7, end: 8, hours: 1 },
        { start: 16, end: 23, hours: 7 },
      ],
    })
    expect(board.summaries[1]).toEqual({
      hours: 8,
      ranges: [
        { start: 7, end: 14, hours: 7 },
        { start: 22, end: 23, hours: 1 },
      ],
    })
  })

  it('warns individually when one city has no overlap', () => {
    // With an 8h window, +3h still overlaps for 5 hours but +12h never does.
    const mixed = computeBoard([0, 3 * H, 12 * H], { wake: 8, sleep: 16 }, 'base')
    expect(mixed.summaries[0].hours).toBe(5)
    expect(mixed.summaries[1]).toEqual({ hours: 0, ranges: [] })
  })
})

describe('computeBoard - edge cases', () => {
  it('has no summaries with fewer than two cities', () => {
    expect(computeBoard([0], DEFAULT_WINDOW, 'meeting').summaries).toEqual([])
    expect(computeBoard([0], DEFAULT_WINDOW, 'base').summaries).toEqual([])
    expect(computeBoard([], DEFAULT_WINDOW, 'meeting')).toEqual({ rows: [], summaries: [] })
  })

  it('supports fractional offsets by anchoring to the local start time', () => {
    // Mumbai (+5:30) against SF (-7) is 12h30 ahead: SF 6am -> 6:30pm, SF noon -> 12:30am next day.
    const board = computeBoard([-7 * H, 5 * H + 30], DEFAULT_WINDOW, 'base')
    expect(board.rows[1][6]).toMatchObject({ hour: 18, minute: 30, dayShift: 0, state: 'awake' })
    expect(board.rows[1][12]).toMatchObject({ hour: 0, minute: 30, dayShift: 1, state: 'sleeping' })
  })

  it('supports overnight awake windows', () => {
    const board = computeBoard([0, 0], { wake: 22, sleep: 6 }, 'meeting')
    expect(board.summaries[0]).toEqual({ hours: 8, ranges: [{ start: 22, end: 6, hours: 8 }] })
  })
})
