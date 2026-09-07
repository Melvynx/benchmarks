import { describe, expect, it } from 'vitest'
import { CITY_BY_ID } from '../data/cities'
import { buildBoard, isAwakeAt, toRanges } from './overlap'
import { formatUtcOffset, getUtcOffsetMinutes } from './time'

const city = (id: string) => CITY_BY_ID.get(id)!
const DEFAULT_WINDOW = { wakeHour: 7, sleepHour: 23 }

// Northern-hemisphere summer: US/EU on DST, southern hemisphere off it.
const JULY = new Date('2026-07-15T12:00:00Z')
// Northern-hemisphere winter: the DST picture inverts.
const JANUARY = new Date('2026-01-15T12:00:00Z')

describe('isAwakeAt', () => {
  it('treats the sleep hour as an exclusive end', () => {
    expect(isAwakeAt(7, DEFAULT_WINDOW)).toBe(true)
    expect(isAwakeAt(22, DEFAULT_WINDOW)).toBe(true)
    expect(isAwakeAt(23, DEFAULT_WINDOW)).toBe(false)
    expect(isAwakeAt(6, DEFAULT_WINDOW)).toBe(false)
  })

  it('supports overnight windows', () => {
    const nightShift = { wakeHour: 22, sleepHour: 6 }
    expect(isAwakeAt(22, nightShift)).toBe(true)
    expect(isAwakeAt(0, nightShift)).toBe(true)
    expect(isAwakeAt(5, nightShift)).toBe(true)
    expect(isAwakeAt(6, nightShift)).toBe(false)
    expect(isAwakeAt(12, nightShift)).toBe(false)
  })

  it('treats an empty window as never awake', () => {
    expect(isAwakeAt(9, { wakeHour: 9, sleepHour: 9 })).toBe(false)
  })
})

describe('toRanges', () => {
  const flagsFrom = (hours: number[]) =>
    Array.from({ length: 24 }, (_, hour) => hours.includes(hour))

  it('returns half-open ranges', () => {
    expect(toRanges(flagsFrom([9, 10, 11]))).toEqual([{ start: 9, end: 12, length: 3 }])
  })

  it('keeps non-contiguous windows separate', () => {
    expect(toRanges(flagsFrom([2, 3, 14, 15, 16]))).toEqual([
      { start: 2, end: 4, length: 2 },
      { start: 14, end: 17, length: 3 },
    ])
  })

  it('merges a window that straddles midnight', () => {
    expect(toRanges(flagsFrom([22, 23, 0, 1]))).toEqual([{ start: 22, end: 2, length: 4 }])
  })

  it('collapses a full day into a single range', () => {
    expect(toRanges(Array.from({ length: 24 }, () => true))).toEqual([
      { start: 0, end: 0, length: 24 },
    ])
  })

  it('returns nothing when there is no overlap', () => {
    expect(toRanges(flagsFrom([]))).toEqual([])
  })
})

describe('getUtcOffsetMinutes', () => {
  it('handles fractional offsets', () => {
    expect(getUtcOffsetMinutes('Asia/Kolkata', JULY)).toBe(330)
    expect(getUtcOffsetMinutes('Asia/Kathmandu', JULY)).toBe(345)
    expect(formatUtcOffset(345)).toBe('UTC+5:45')
  })

  it('follows DST in both hemispheres', () => {
    expect(getUtcOffsetMinutes('America/Los_Angeles', JULY)).toBe(-420) // PDT
    expect(getUtcOffsetMinutes('America/Los_Angeles', JANUARY)).toBe(-480) // PST
    expect(getUtcOffsetMinutes('Australia/Sydney', JULY)).toBe(600) // AEST
    expect(getUtcOffsetMinutes('Australia/Sydney', JANUARY)).toBe(660) // AEDT
  })

  it('renders a negative offset with a real minus sign', () => {
    expect(formatUtcOffset(-420)).toBe('UTC−7')
    expect(formatUtcOffset(0)).toBe('UTC')
  })
})

describe('buildBoard', () => {
  const defaults = [city('san-francisco'), city('denpasar'), city('geneva')]

  it('projects each city onto the reference day', () => {
    const board = buildBoard([city('san-francisco'), city('geneva')], DEFAULT_WINDOW, 'meeting', JULY)
    // July: SF is UTC−7, Geneva UTC+2 — nine hours ahead.
    const geneva = board.rows[1]
    expect(geneva.cells[0].localHour).toBe(9)
    expect(geneva.cells[15].localHour).toBe(0)
    expect(geneva.cells[15].dayShift).toBe(1)
  })

  it('handles fractional offsets in cell labels', () => {
    const board = buildBoard([city('london'), city('kathmandu')], DEFAULT_WINDOW, 'meeting', JULY)
    // July: London UTC+1, Kathmandu UTC+5:45 — a 4h45m gap.
    expect(board.rows[1].cells[0].localMinutes).toBe(4 * 60 + 45)
    expect(board.rows[1].cells[0].localHour).toBe(4)
  })

  it('finds the window shared by all cities in meeting mode', () => {
    const board = buildBoard(defaults, DEFAULT_WINDOW, 'meeting', JULY)
    expect(board.meeting.hours).toBeGreaterThan(0)
    // Every green cell must line up on the same reference hours in every row.
    const green = board.rows.map((row) =>
      row.cells.filter((cell) => cell.state === 'overlap').map((cell) => cell.refHour),
    )
    expect(green[1]).toEqual(green[0])
    expect(green[2]).toEqual(green[0])
    expect(green[0].length).toBe(board.meeting.hours)
  })

  it('reports zero overlap when no hour works for everyone', () => {
    const board = buildBoard(
      [city('san-francisco'), city('mumbai')],
      { wakeHour: 9, sleepHour: 17 },
      'meeting',
      JULY,
    )
    expect(board.meeting.hours).toBe(0)
    expect(board.meeting.ranges).toEqual([])
    expect(board.rows.every((row) => row.cells.every((cell) => cell.state !== 'overlap'))).toBe(true)
  })

  it('gives every city its own window in base mode', () => {
    const board = buildBoard(defaults, DEFAULT_WINDOW, 'base', JULY)
    expect(board.perCity).toHaveLength(2)
    expect(board.meeting.hours).toBe(0)

    const [denpasar, geneva] = board.perCity
    // Bali and Geneva sit on opposite sides of San Francisco's day.
    expect(denpasar.ranges).not.toEqual(geneva.ranges)

    for (const entry of board.perCity) {
      const row = board.rows.find((candidate) => candidate.city.id === entry.city.id)!
      expect(row.cells.filter((cell) => cell.state === 'overlap')).toHaveLength(entry.hours)
    }
  })

  it('lights the base row wherever it matches at least one other city', () => {
    const board = buildBoard(defaults, DEFAULT_WINDOW, 'base', JULY)
    const reference = board.rows[0]
    for (let hour = 0; hour < 24; hour += 1) {
      const matchedSomeone = board.rows
        .slice(1)
        .some((row) => row.cells[hour].state === 'overlap')
      expect(reference.cells[hour].state === 'overlap').toBe(matchedSomeone)
    }
  })

  it('changes the whole board when the reference city changes', () => {
    const asIs = buildBoard(defaults, DEFAULT_WINDOW, 'base', JULY)
    const promoted = buildBoard(
      [defaults[1], defaults[0], defaults[2]],
      DEFAULT_WINDOW,
      'base',
      JULY,
    )
    // Column 0 is midnight for whichever city is the reference.
    expect(asIs.rows[0].city.id).toBe('san-francisco')
    expect(asIs.rows[0].cells[0].localHour).toBe(0)
    // Once Denpasar is the reference, San Francisco is 15 hours behind it.
    expect(promoted.rows[0].isReference).toBe(true)
    expect(promoted.rows[1].city.id).toBe('san-francisco')
    expect(promoted.rows[1].cells[0].localHour).toBe(9)
    expect(promoted.rows[1].cells[0].dayShift).toBe(-1)
    expect(promoted.perCity.map((entry) => entry.city.id)).toEqual(['san-francisco', 'geneva'])
  })

  it('never marks a sleeping cell as overlap', () => {
    for (const mode of ['meeting', 'base'] as const) {
      const board = buildBoard(defaults, { wakeHour: 22, sleepHour: 6 }, mode, JANUARY)
      for (const row of board.rows) {
        for (const cell of row.cells) {
          if (cell.state === 'overlap') expect(cell.awake).toBe(true)
          if (!cell.awake) expect(cell.state).toBe('sleeping')
        }
      }
    }
  })

  it('never claims overlap for a lone city', () => {
    for (const mode of ['meeting', 'base'] as const) {
      const board = buildBoard([city('geneva')], DEFAULT_WINDOW, mode, JULY)
      expect(board.meeting.hours).toBe(0)
      expect(board.perCity).toEqual([])
      expect(board.rows[0].cells.some((cell) => cell.state === 'overlap')).toBe(false)
      expect(board.rows[0].cells.filter((cell) => cell.state === 'awake')).toHaveLength(16)
    }
  })

  it('survives an empty board', () => {
    expect(buildBoard([], DEFAULT_WINDOW, 'meeting', JULY).rows).toEqual([])
  })
})
