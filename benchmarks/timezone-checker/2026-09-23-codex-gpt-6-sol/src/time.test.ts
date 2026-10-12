import { describe, expect, it } from 'vitest'
import { CITY_BY_ID } from './cities'
import { buildSchedule, formatOffset, getOffsetMinutes, getRanges, isAwake } from './time'

const city = (id: string) => CITY_BY_ID.get(id)!
const settings = { wakeHour: 7, sleepHour: 23, timeFormat: '12h' as const }

describe('timezone calculations', () => {
  it('uses the offset in effect on the current date, including DST and quarter-hour zones', () => {
    expect(formatOffset(getOffsetMinutes('America/Los_Angeles', new Date('2026-09-23T12:00:00Z')))).toBe('UTC−07:00')
    expect(formatOffset(getOffsetMinutes('America/Los_Angeles', new Date('2026-01-23T12:00:00Z')))).toBe('UTC−08:00')
    expect(formatOffset(getOffsetMinutes('Asia/Kathmandu', new Date('2026-09-23T12:00:00Z')))).toBe('UTC+05:45')
  })

  it('supports overnight awake hours and treats equal wake and sleep as all day', () => {
    expect(isAwake({ hour: 23, minute: 30 }, 22, 6)).toBe(true)
    expect(isAwake({ hour: 5, minute: 45 }, 22, 6)).toBe(true)
    expect(isAwake({ hour: 6, minute: 0 }, 22, 6)).toBe(false)
    expect(isAwake({ hour: 15, minute: 0 }, 8, 8)).toBe(true)
  })

  it('keeps fractional local minutes in every reference hour', () => {
    const schedule = buildSchedule([city('geneva'), city('mumbai'), city('kathmandu')], settings, 'meeting', new Date('2026-09-23T12:00:00Z'))
    expect(schedule.rows[0].cells.every((cell, hour) => cell.local?.hour === hour)).toBe(true)
    expect(schedule.rows[1].cells.every(cell => cell.local?.minute === 30)).toBe(true)
    expect(schedule.rows[2].cells.every(cell => cell.local?.minute === 45)).toBe(true)
  })

  it('does not invent a reference hour skipped by a spring clock change', () => {
    const schedule = buildSchedule([city('san-francisco'), city('geneva')], settings, 'meeting', new Date('2026-03-08T12:00:00Z'))
    expect(schedule.clockChangeDay).toBe(true)
    expect(schedule.rows.every(row => row.cells[2].skipped && row.cells[2].local === null)).toBe(true)
    expect(schedule.meetingHours[2]).toBe(false)
  })

  it('flags a repeated fall clock hour in a 24-column day', () => {
    const schedule = buildSchedule([city('san-francisco'), city('geneva')], settings, 'meeting', new Date('2026-11-01T12:00:00Z'))
    expect(schedule.clockChangeDay).toBe(true)
    expect(schedule.rows[0].cells[1].local?.hour).toBe(1)
  })

  it('finds zero overlap for incompatible awake windows', () => {
    const schedule = buildSchedule([city('san-francisco'), city('denpasar')], { ...settings, wakeHour: 9, sleepHour: 17 }, 'meeting', new Date('2026-09-23T12:00:00Z'))
    expect(schedule.meetingHours.some(Boolean)).toBe(false)
  })

  it('highlights one shared set in meeting mode and independent sets in base mode', () => {
    const cities = [city('san-francisco'), city('denpasar'), city('geneva')]
    const now = new Date('2026-09-23T12:00:00Z')
    const meeting = buildSchedule(cities, settings, 'meeting', now)
    expect(meeting.meetingHours.filter(Boolean)).toHaveLength(2)
    expect(meeting.rows.every(row => row.cells[7].overlap)).toBe(true)
    expect(meeting.rows.every(row => row.cells[22].overlap)).toBe(true)

    const base = buildSchedule(cities, settings, 'base', now)
    expect(base.baseHours.denpasar.filter(Boolean).length).toBeGreaterThan(1)
    expect(base.baseHours.geneva.filter(Boolean).length).toBeGreaterThan(1)
    expect(base.rows[1].cells[16].overlap).toBe(true)
    expect(base.rows[2].cells[16].overlap).toBe(false)
    expect(base.rows[0].cells[16].overlap).toBe(true)
  })

  it('returns separate inclusive-start, exclusive-end windows', () => {
    const hours = Array(24).fill(false)
    for (const hour of [0, 1, 7, 8, 23]) hours[hour] = true
    expect(getRanges(hours)).toEqual([{ start: 0, end: 2 }, { start: 7, end: 9 }, { start: 23, end: 24 }])
  })
})
