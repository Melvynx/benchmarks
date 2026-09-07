import { describe, expect, it } from 'vitest'
import { getCity } from '@/data/cities'
import { computeSchedule, hoursToRanges, isAwake } from './overlap'

const city = (id: string) => {
  const found = getCity(id)
  if (!found) throw new Error(`Unknown city ${id}`)
  return found
}

// A fixed winter instant so DST does not change expectations.
const JANUARY = new Date('2026-01-15T12:00:00Z')
const DEFAULT_WINDOW = { wakeHour: 7, sleepHour: 23 }

describe('isAwake', () => {
  it('handles a daytime window as [wake, sleep)', () => {
    expect(isAwake(7 * 60, DEFAULT_WINDOW)).toBe(true)
    expect(isAwake(22 * 60 + 59, DEFAULT_WINDOW)).toBe(true)
    expect(isAwake(23 * 60, DEFAULT_WINDOW)).toBe(false)
    expect(isAwake(6 * 60 + 30, DEFAULT_WINDOW)).toBe(false)
  })

  it('handles overnight windows', () => {
    const night = { wakeHour: 22, sleepHour: 6 }
    expect(isAwake(23 * 60, night)).toBe(true)
    expect(isAwake(2 * 60, night)).toBe(true)
    expect(isAwake(6 * 60, night)).toBe(false)
    expect(isAwake(12 * 60, night)).toBe(false)
  })

  it('treats equal wake and sleep hours as always awake', () => {
    expect(isAwake(0, { wakeHour: 9, sleepHour: 9 })).toBe(true)
  })
})

describe('hoursToRanges', () => {
  it('groups contiguous hours into exclusive-end ranges', () => {
    expect(hoursToRanges([9, 10, 11, 14, 15])).toEqual([
      { start: 9, end: 12 },
      { start: 14, end: 16 },
    ])
  })

  it('merges windows that wrap around midnight', () => {
    expect(hoursToRanges([0, 1, 22, 23])).toEqual([{ start: 22, end: 26 }])
  })

  it('returns a full-day range for all 24 hours', () => {
    expect(hoursToRanges(Array.from({ length: 24 }, (_, i) => i))).toEqual([{ start: 0, end: 24 }])
  })

  it('returns nothing for no hours', () => {
    expect(hoursToRanges([])).toEqual([])
  })
})

describe('computeSchedule', () => {
  it('anchors every cell to the reference city and reports offsets', () => {
    const schedule = computeSchedule([city('san-francisco'), city('geneva')], DEFAULT_WINDOW, 'meeting', JANUARY)
    const [sf, geneva] = schedule.rows
    expect(sf.isReference).toBe(true)
    expect(sf.offsetMinutes).toBe(-8 * 60)
    expect(geneva.offsetMinutes).toBe(60)
    // 9am in SF is 6pm in Geneva during winter.
    expect(geneva.cells[9].localMinute).toBe(18 * 60)
  })

  it('supports fractional offsets', () => {
    const schedule = computeSchedule([city('london'), city('mumbai'), city('kathmandu')], DEFAULT_WINDOW, 'meeting', JANUARY)
    expect(schedule.rows[1].offsetMinutes).toBe(5 * 60 + 30)
    expect(schedule.rows[2].offsetMinutes).toBe(5 * 60 + 45)
    expect(schedule.rows[1].cells[9].localMinute).toBe(14 * 60 + 30)
  })

  it('finds the shared meeting window across all cities', () => {
    const schedule = computeSchedule(
      [city('san-francisco'), city('denpasar'), city('geneva')],
      DEFAULT_WINDOW,
      'meeting',
      JANUARY,
    )
    // SF awake 7–23. Geneva (+9h) awake at SF 22:00–14:00. Denpasar (+16h) awake at SF 15:00–07:00.
    // Only 22:00 SF (7am Geneva, 2pm Denpasar) satisfies all three.
    expect(schedule.meeting.hours).toEqual([22])
    expect(schedule.meeting.ranges).toEqual([{ start: 22, end: 23 }])
    for (const row of schedule.rows) {
      expect(row.cells[22].state).toBe('overlap')
      expect(row.cells.filter((cell) => cell.state === 'overlap')).toHaveLength(1)
    }
  })

  it('reports no overlap when awake windows never coincide', () => {
    const schedule = computeSchedule(
      [city('san-francisco'), city('geneva')],
      { wakeHour: 9, sleepHour: 17 },
      'meeting',
      JANUARY,
    )
    expect(schedule.meeting.hours).toEqual([])
  })

  it('computes independent per-city overlaps in base mode', () => {
    const schedule = computeSchedule(
      [city('san-francisco'), city('denpasar'), city('geneva')],
      DEFAULT_WINDOW,
      'base',
      JANUARY,
    )
    const geneva = schedule.perCity.get('geneva')!
    const denpasar = schedule.perCity.get('denpasar')!
    expect(geneva.hours).toEqual([7, 8, 9, 10, 11, 12, 13, 22])
    expect(geneva.ranges).toEqual([
      { start: 7, end: 14 },
      { start: 22, end: 23 },
    ])
    expect(denpasar.hours).toEqual([15, 16, 17, 18, 19, 20, 21, 22])

    const genevaRow = schedule.rows[2]
    expect(genevaRow.cells[9].state).toBe('overlap')
    expect(genevaRow.cells[15].state).toBe('sleeping')

    // Reference row lights up wherever at least one colleague is reachable.
    const referenceRow = schedule.rows[0]
    expect(referenceRow.cells[9].state).toBe('overlap')
    expect(referenceRow.cells[16].state).toBe('overlap')
    expect(referenceRow.cells[14].state).toBe('awake')
  })

  it('returns an empty schedule for no cities', () => {
    const schedule = computeSchedule([], DEFAULT_WINDOW, 'meeting', JANUARY)
    expect(schedule.rows).toEqual([])
    expect(schedule.currentReferenceHour).toBeNull()
  })
})
