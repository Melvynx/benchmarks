import { describe, expect, it } from 'vitest'
import {
  clockParts,
  formatClock,
  formatRelativeOffset,
  formatTimeRange,
  formatUtcOffset,
  getUtcOffsetMinutes,
  getZonedParts,
  mod,
} from './time'

const SEPTEMBER = new Date('2026-09-23T12:00:00Z')
const JANUARY = new Date('2026-01-15T12:00:00Z')

describe('getUtcOffsetMinutes', () => {
  it('handles DST by deriving the offset from the given date', () => {
    expect(getUtcOffsetMinutes('America/Los_Angeles', SEPTEMBER)).toBe(-7 * 60)
    expect(getUtcOffsetMinutes('America/Los_Angeles', JANUARY)).toBe(-8 * 60)
    expect(getUtcOffsetMinutes('Europe/Zurich', SEPTEMBER)).toBe(2 * 60)
    expect(getUtcOffsetMinutes('Europe/Zurich', JANUARY)).toBe(60)
    expect(getUtcOffsetMinutes('Australia/Sydney', JANUARY)).toBe(11 * 60)
  })

  it('supports fractional offsets', () => {
    expect(getUtcOffsetMinutes('Asia/Kolkata', SEPTEMBER)).toBe(5 * 60 + 30)
    expect(getUtcOffsetMinutes('Asia/Kathmandu', SEPTEMBER)).toBe(5 * 60 + 45)
    expect(getUtcOffsetMinutes('Asia/Tehran', SEPTEMBER)).toBe(3 * 60 + 30)
  })

  it('ignores sub-second precision', () => {
    expect(getUtcOffsetMinutes('Asia/Makassar', new Date('2026-09-23T12:00:00.999Z'))).toBe(8 * 60)
  })
})

describe('getZonedParts', () => {
  it('reports midnight as hour 0 and the local weekday', () => {
    const parts = getZonedParts('Asia/Makassar', new Date('2026-09-23T16:00:00Z'))
    expect(parts.hour).toBe(0)
    expect(parts.weekday).toBe(4)
  })
})

describe('formatting', () => {
  it('formats clocks in 12h and 24h', () => {
    expect(formatClock(0, '12h')).toBe('12am')
    expect(formatClock(12 * 60, '12h')).toBe('12pm')
    expect(formatClock(17 * 60 + 30, '12h')).toBe('5:30pm')
    expect(formatClock(7 * 60, '24h')).toBe('07:00')
    expect(formatClock(24 * 60 + 45, '24h')).toBe('00:45')
  })

  it('splits clock parts for grid cells', () => {
    expect(clockParts(23 * 60 + 45, '12h')).toEqual({ hour: '11', minute: '45', period: 'pm' })
    expect(clockParts(9 * 60, '24h')).toEqual({ hour: '09', minute: null, period: null })
  })

  it('formats ranges as inclusive start → exclusive end', () => {
    expect(formatTimeRange(9 * 60, 12 * 60, '12h')).toBe('9am — 12pm')
    expect(formatTimeRange(22 * 60, 24 * 60, '24h')).toBe('22:00 — 00:00')
  })

  it('formats offsets', () => {
    expect(formatUtcOffset(-420)).toBe('UTC−7')
    expect(formatUtcOffset(345)).toBe('UTC+5:45')
    expect(formatUtcOffset(0)).toBe('UTC+0')
    expect(formatRelativeOffset(900)).toBe('+15h')
    expect(formatRelativeOffset(-210)).toBe('−3:30h')
    expect(formatRelativeOffset(0)).toBe('±0h')
    expect(formatRelativeOffset(765, '')).toBe('+12:45')
  })

  it('mod stays positive', () => {
    expect(mod(-30, 1440)).toBe(1410)
  })
})
