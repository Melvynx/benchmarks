import { describe, expect, it } from 'vitest'
import {
  currentHour,
  formatClock,
  formatHour,
  formatUtcOffset,
  getHourParts,
  getUtcOffsetMinutes,
} from './time'

const summer = new Date('2026-09-29T12:00:00Z')
const winter = new Date('2026-01-15T12:00:00Z')

describe('getUtcOffsetMinutes', () => {
  it('handles whole-hour zones', () => {
    expect(getUtcOffsetMinutes('Asia/Makassar', summer)).toBe(8 * 60)
    expect(getUtcOffsetMinutes('Asia/Tokyo', winter)).toBe(9 * 60)
  })

  it('handles fractional offsets', () => {
    expect(getUtcOffsetMinutes('Asia/Kolkata', summer)).toBe(5 * 60 + 30)
    expect(getUtcOffsetMinutes('Asia/Kathmandu', summer)).toBe(5 * 60 + 45)
  })

  it('follows daylight saving time for the given date', () => {
    expect(getUtcOffsetMinutes('America/Los_Angeles', summer)).toBe(-7 * 60)
    expect(getUtcOffsetMinutes('America/Los_Angeles', winter)).toBe(-8 * 60)
    expect(getUtcOffsetMinutes('Europe/Zurich', summer)).toBe(2 * 60)
    expect(getUtcOffsetMinutes('Europe/Zurich', winter)).toBe(60)
  })

  it('does not break at midnight UTC', () => {
    expect(getUtcOffsetMinutes('Europe/London', new Date('2026-07-01T00:00:00Z'))).toBe(60)
    expect(getUtcOffsetMinutes('Pacific/Honolulu', new Date('2026-07-01T00:00:00Z'))).toBe(-600)
  })
})

describe('formatUtcOffset', () => {
  it.each([
    [-420, 'UTC-7'],
    [480, 'UTC+8'],
    [0, 'UTC+0'],
    [330, 'UTC+5:30'],
    [345, 'UTC+5:45'],
    [-570, 'UTC-9:30'],
  ])('%i -> %s', (minutes, label) => {
    expect(formatUtcOffset(minutes)).toBe(label)
  })
})

describe('hour formatting', () => {
  it('formats compact hour labels', () => {
    expect(formatHour(0, '12h')).toBe('12am')
    expect(formatHour(9, '12h')).toBe('9am')
    expect(formatHour(12, '12h')).toBe('12pm')
    expect(formatHour(23, '12h')).toBe('11pm')
    expect(formatHour(0, '24h')).toBe('00:00')
    expect(formatHour(9, '24h')).toBe('09:00')
  })

  it('splits grid cell labels into main and sub parts', () => {
    expect(getHourParts(7, 0, '12h')).toEqual({ main: '7', minutes: '', meridiem: 'am' })
    expect(getHourParts(0, 0, '12h')).toEqual({ main: '12', minutes: '', meridiem: 'am' })
    expect(getHourParts(13, 30, '12h')).toEqual({ main: '1', minutes: ':30', meridiem: 'pm' })
    expect(getHourParts(7, 0, '24h')).toEqual({ main: '07', minutes: '', meridiem: '' })
    expect(getHourParts(13, 45, '24h')).toEqual({ main: '13', minutes: ':45', meridiem: '' })
  })

  it('formats clocks and the current hour from a UTC minute count', () => {
    const utcMinutes = Date.UTC(2026, 8, 29, 19, 42) / 60_000
    expect(formatClock(utcMinutes, 120, '12h')).toBe('9:42 PM')
    expect(formatClock(utcMinutes, 120, '24h')).toBe('21:42')
    expect(formatClock(utcMinutes, 330, '12h')).toBe('1:12 AM')
    expect(currentHour(utcMinutes, -420)).toBe(12)
  })
})
