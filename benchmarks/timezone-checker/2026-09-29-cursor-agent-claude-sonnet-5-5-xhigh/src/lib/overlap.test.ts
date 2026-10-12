import { describe, expect, it } from 'vitest'
import { CITY_BY_ID } from '../data/cities'
import { awakeHoursPerDay, buildGrid, isAwake, toRanges, type GridCity } from './overlap'

const city = (id: string, offsetMinutes: number): GridCity => ({
  city: CITY_BY_ID.get(id)!,
  offsetMinutes,
})

const DEFAULT_WINDOW = { wake: 7, sleep: 23 }

// 2026-09-30: San Francisco UTC-7, Denpasar UTC+8, Geneva UTC+2.
const trio = () => [city('san-francisco', -420), city('denpasar', 480), city('geneva', 120)]

const hoursWhere = (flags: boolean[]) => flags.flatMap((flag, hour) => (flag ? [hour] : []))

describe('isAwake', () => {
  it('treats sleep as exclusive', () => {
    expect(isAwake(7 * 60, DEFAULT_WINDOW)).toBe(true)
    expect(isAwake(22 * 60 + 59, DEFAULT_WINDOW)).toBe(true)
    expect(isAwake(23 * 60, DEFAULT_WINDOW)).toBe(false)
    expect(isAwake(6 * 60 + 59, DEFAULT_WINDOW)).toBe(false)
  })

  it('supports overnight windows', () => {
    const night = { wake: 22, sleep: 6 }
    expect(isAwake(22 * 60, night)).toBe(true)
    expect(isAwake(23 * 60, night)).toBe(true)
    expect(isAwake(0, night)).toBe(true)
    expect(isAwake(5 * 60 + 59, night)).toBe(true)
    expect(isAwake(6 * 60, night)).toBe(false)
    expect(isAwake(12 * 60, night)).toBe(false)
  })

  it('treats a midnight sleep hour as end of day', () => {
    const window = { wake: 7, sleep: 0 }
    expect(isAwake(23 * 60, window)).toBe(true)
    expect(isAwake(0, window)).toBe(false)
    expect(isAwake(7 * 60, window)).toBe(true)
  })

  it('treats equal wake and sleep as awake all day', () => {
    for (let hour = 0; hour < 24; hour++) expect(isAwake(hour * 60, { wake: 9, sleep: 9 })).toBe(true)
  })
})

describe('awakeHoursPerDay', () => {
  it('counts regular, overnight and full-day windows', () => {
    expect(awakeHoursPerDay({ wake: 7, sleep: 23 })).toBe(16)
    expect(awakeHoursPerDay({ wake: 22, sleep: 6 })).toBe(8)
    expect(awakeHoursPerDay({ wake: 7, sleep: 0 })).toBe(17)
    expect(awakeHoursPerDay({ wake: 5, sleep: 5 })).toBe(24)
  })
})

describe('toRanges', () => {
  it('groups contiguous hours into half-open ranges', () => {
    const flags = Array.from({ length: 24 }, (_, hour) => [9, 10, 11, 15, 23].includes(hour))
    expect(toRanges(flags)).toEqual([
      { start: 9, end: 12 },
      { start: 15, end: 16 },
      { start: 23, end: 24 },
    ])
  })

  it('returns nothing when no hour qualifies and one range for a full day', () => {
    expect(toRanges(Array(24).fill(false))).toEqual([])
    expect(toRanges(Array(24).fill(true))).toEqual([{ start: 0, end: 24 }])
  })
})

describe('buildGrid: cells', () => {
  it('anchors columns to the reference city and shifts every other row', () => {
    const grid = buildGrid(trio(), DEFAULT_WINDOW, 'meeting')
    const [sf, denpasar, geneva] = grid.rows

    expect(sf!.isReference).toBe(true)
    expect(sf!.cells.map((cell) => cell.localMinutes / 60)).toEqual(Array.from({ length: 24 }, (_, hour) => hour))
    expect(denpasar!.cells[0]!.localMinutes / 60).toBe(15)
    expect(denpasar!.cells[9]!.localMinutes / 60).toBe(0)
    expect(geneva!.cells[0]!.localMinutes / 60).toBe(9)
  })

  it('keeps fractional offsets in the local time', () => {
    const grid = buildGrid([city('london', 60), city('mumbai', 330)], DEFAULT_WINDOW, 'meeting')
    expect(grid.rows[1]!.cells[9]!.localMinutes).toBe(13 * 60 + 30)
    expect(grid.rows[1]!.cells[0]!.localMinutes).toBe(4 * 60 + 30)
    expect(grid.rows[1]!.cells[2]!.awake).toBe(false)
    expect(grid.rows[1]!.cells[3]!.localMinutes).toBe(7 * 60 + 30)
    expect(grid.rows[1]!.cells[3]!.awake).toBe(true)
  })

  it('tracks the local calendar day relative to the reference city', () => {
    const grid = buildGrid([city('san-francisco', -420), city('auckland', 780)], DEFAULT_WINDOW, 'meeting')
    const auckland = grid.rows[1]!
    expect(auckland.cells[3]!.dayShift).toBe(0)
    expect(auckland.cells[4]!.dayShift).toBe(1)
    expect(auckland.cells[4]!.localMinutes).toBe(0)

    const flipped = buildGrid([city('auckland', 780), city('san-francisco', -420)], DEFAULT_WINDOW, 'meeting')
    expect(flipped.rows[1]!.cells[0]!.dayShift).toBe(-1)
    expect(flipped.rows[1]!.cells[0]!.localMinutes).toBe(4 * 60)
  })
})

describe('buildGrid: meeting mode', () => {
  it('finds the hours when every city is awake', () => {
    const grid = buildGrid(trio(), DEFAULT_WINDOW, 'meeting')

    expect(hoursWhere(grid.sharedOverlap)).toEqual([7, 22])
    expect(grid.summary).toEqual({
      mode: 'meeting',
      hours: 2,
      ranges: [
        { start: 7, end: 8 },
        { start: 22, end: 23 },
      ],
    })
  })

  it('marks the same columns as overlap on every row', () => {
    const grid = buildGrid(trio(), DEFAULT_WINDOW, 'meeting')
    for (const row of grid.rows) {
      expect(hoursWhere(row.cells.map((cell) => cell.overlap))).toEqual([7, 22])
    }
  })

  it('reports zero overlap', () => {
    const grid = buildGrid(trio(), { wake: 9, sleep: 23 }, 'meeting')
    expect(grid.summary).toEqual({ mode: 'meeting', hours: 0, ranges: [] })
    expect(grid.rows.every((row) => row.cells.every((cell) => !cell.overlap))).toBe(true)
  })

  it('handles overnight windows for every city', () => {
    const grid = buildGrid(
      [city('london', 60), city('paris', 120)],
      { wake: 22, sleep: 6 },
      'meeting',
    )
    // London hour h is Paris hour h+1, so Paris wakes an hour "earlier" and sleeps an hour "later".
    expect(hoursWhere(grid.sharedOverlap)).toEqual([0, 1, 2, 3, 4, 22, 23])
  })

  it('does not report overlap for a single city or an empty list', () => {
    const single = buildGrid([city('london', 60)], DEFAULT_WINDOW, 'meeting')
    expect(single.summary).toBeNull()
    expect(single.rows[0]!.cells.some((cell) => cell.overlap)).toBe(false)
    expect(buildGrid([], DEFAULT_WINDOW, 'meeting')).toEqual({ rows: [], sharedOverlap: [], summary: null })
  })
})

describe('buildGrid: base mode', () => {
  it('computes an independent overlap for each city against the reference', () => {
    const grid = buildGrid(trio(), DEFAULT_WINDOW, 'base')
    if (grid.summary?.mode !== 'base') throw new Error('expected base summary')

    const [denpasar, geneva] = grid.summary.entries
    expect(denpasar!.city.id).toBe('denpasar')
    expect(denpasar!.hours).toBe(8)
    expect(denpasar!.ranges).toEqual([
      { start: 7, end: 8 },
      { start: 16, end: 23 },
    ])
    expect(geneva!.city.id).toBe('geneva')
    expect(geneva!.hours).toBe(8)
    expect(geneva!.ranges).toEqual([
      { start: 7, end: 14 },
      { start: 22, end: 23 },
    ])
  })

  it('highlights per-row cells and leaves the reference row without overlap', () => {
    const grid = buildGrid(trio(), DEFAULT_WINDOW, 'base')
    expect(grid.rows[0]!.cells.some((cell) => cell.overlap)).toBe(false)
    expect(hoursWhere(grid.rows[1]!.cells.map((cell) => cell.overlap))).toEqual([7, 16, 17, 18, 19, 20, 21, 22])
    expect(hoursWhere(grid.rows[2]!.cells.map((cell) => cell.overlap))).toEqual([7, 8, 9, 10, 11, 12, 13, 22])
  })

  it('reports zero overlap per city, independently', () => {
    const grid = buildGrid(
      [city('san-francisco', -420), city('denpasar', 480), city('new-york', -240)],
      { wake: 9, sleep: 17 },
      'base',
    )
    if (grid.summary?.mode !== 'base') throw new Error('expected base summary')
    const [denpasar, newYork] = grid.summary.entries
    expect(denpasar!.hours).toBe(0)
    expect(denpasar!.ranges).toEqual([])
    expect(newYork!.ranges).toEqual([{ start: 9, end: 14 }])
  })
})
