import { describe, it, expect } from 'vitest'
import {
  isAwake,
  hoursToRanges,
  formatHourRange,
  computeSchedule,
} from './overlap'
import { getCity } from '@/data/cities'

describe('overlap utilities', () => {
  it('identifies awake state for standard daytime window (7am-11pm)', () => {
    const window = { wakeHour: 7, sleepHour: 23 }
    // 6:59 is sleeping (419 min)
    expect(isAwake(419, window)).toBe(false)
    // 7:00 is awake (420 min)
    expect(isAwake(420, window)).toBe(true)
    // 12:00 is awake (720 min)
    expect(isAwake(720, window)).toBe(true)
    // 22:59 is awake (1379 min)
    expect(isAwake(1379, window)).toBe(true)
    // 23:00 is sleeping (1380 min)
    expect(isAwake(1380, window)).toBe(false)
    // 2:00 is sleeping (120 min)
    expect(isAwake(120, window)).toBe(false)
  })

  it('identifies awake state for overnight window (e.g. 22:00 to 06:00)', () => {
    const window = { wakeHour: 22, sleepHour: 6 }
    // 21:59 is sleeping (1319 min)
    expect(isAwake(1319, window)).toBe(false)
    // 22:00 is awake (1320 min)
    expect(isAwake(1320, window)).toBe(true)
    // 00:30 is awake (30 min)
    expect(isAwake(30, window)).toBe(true)
    // 05:59 is awake (359 min)
    expect(isAwake(359, window)).toBe(true)
    // 06:00 is sleeping (360 min)
    expect(isAwake(360, window)).toBe(false)
    // 12:00 is sleeping (720 min)
    expect(isAwake(720, window)).toBe(false)
  })

  it('handles 24h awake window when wake == sleep', () => {
    const window = { wakeHour: 8, sleepHour: 8 }
    expect(isAwake(0, window)).toBe(true)
    expect(isAwake(480, window)).toBe(true)
    expect(isAwake(1400, window)).toBe(true)
  })

  it('converts hours to inclusive-exclusive ranges', () => {
    expect(hoursToRanges([])).toEqual([])
    expect(hoursToRanges([9, 10, 11])).toEqual([{ start: 9, end: 12 }])
    expect(hoursToRanges([9, 10, 14, 15])).toEqual([
      { start: 9, end: 11 },
      { start: 14, end: 16 },
    ])
  })

  it('handles ranges wrapping midnight', () => {
    // 22, 23, 0, 1
    const ranges = hoursToRanges([22, 23, 0, 1])
    expect(ranges).toEqual([{ start: 22, end: 26 }])
    expect(formatHourRange(ranges[0], '12h')).toBe('10pm — 2am')
  })

  it('formats ranges correctly', () => {
    expect(formatHourRange({ start: 9, end: 12 }, '12h')).toBe('9am — 12pm')
    expect(formatHourRange({ start: 9, end: 12 }, '24h')).toBe('09:00 — 12:00')
    expect(formatHourRange({ start: 0, end: 24 }, '12h')).toBe('All day (24h)')
  })

  it('computes schedule for default cities in Meeting and Base modes', () => {
    const cities = ['san-francisco', 'denpasar', 'geneva']
      .map((id) => getCity(id)!)
      .filter(Boolean)

    const window = { wakeHour: 7, sleepHour: 23 }
    const now = new Date('2026-09-03T12:00:00Z')

    // Meeting mode
    const meetingSched = computeSchedule(cities, window, 'meeting', now)
    expect(meetingSched.rows).toHaveLength(3)
    expect(meetingSched.rows[0].isReference).toBe(true)
    expect(meetingSched.rows[0].city.id).toBe('san-francisco')

    // Meeting overlap should have hours
    expect(meetingSched.meeting.hours.length).toBeGreaterThan(0)
    for (const h of meetingSched.meeting.hours) {
      // Every city's cell at this hour must be 'overlap'
      for (const row of meetingSched.rows) {
        expect(row.cells[h].state).toBe('overlap')
      }
    }

    // Base mode
    const baseSched = computeSchedule(cities, window, 'base', now)
    expect(baseSched.rows).toHaveLength(3)
    expect(baseSched.perCity.size).toBe(2)
    expect(baseSched.perCity.has('denpasar')).toBe(true)
    expect(baseSched.perCity.has('geneva')).toBe(true)
  })
})
