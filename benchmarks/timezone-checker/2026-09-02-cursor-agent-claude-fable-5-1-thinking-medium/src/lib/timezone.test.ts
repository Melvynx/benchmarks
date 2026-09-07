import { describe, expect, it } from 'vitest'
import {
  currentHourAtOffset,
  formatCompact,
  formatMinuteOfDay,
  formatUtcOffset,
  getUtcOffsetMinutes,
  localMinuteOfDay,
} from './timezone'

describe('getUtcOffsetMinutes', () => {
  it('follows DST for the same zone across the year', () => {
    expect(getUtcOffsetMinutes('America/Los_Angeles', new Date('2026-01-15T12:00:00Z'))).toBe(-480)
    expect(getUtcOffsetMinutes('America/Los_Angeles', new Date('2026-07-15T12:00:00Z'))).toBe(-420)
  })

  it('returns fractional offsets', () => {
    expect(getUtcOffsetMinutes('Asia/Kolkata', new Date('2026-01-15T12:00:00Z'))).toBe(330)
    expect(getUtcOffsetMinutes('Asia/Kathmandu', new Date('2026-01-15T12:00:00Z'))).toBe(345)
  })
})

describe('formatUtcOffset', () => {
  it('formats whole, fractional, negative and zero offsets', () => {
    expect(formatUtcOffset(60)).toBe('UTC+1')
    expect(formatUtcOffset(330)).toBe('UTC+5:30')
    expect(formatUtcOffset(-420)).toBe('UTC-7')
    expect(formatUtcOffset(0)).toBe('UTC±0')
  })
})

describe('localMinuteOfDay', () => {
  it('shifts and wraps around midnight', () => {
    expect(localMinuteOfDay(9, -480, 60)).toBe(18 * 60)
    expect(localMinuteOfDay(20, -480, 480)).toBe(12 * 60)
    expect(localMinuteOfDay(1, 60, -480)).toBe(16 * 60)
  })
})

describe('formatting', () => {
  it('formats 12h and 24h labels', () => {
    expect(formatMinuteOfDay(0, '12h')).toBe('12am')
    expect(formatMinuteOfDay(12 * 60, '12h')).toBe('12pm')
    expect(formatMinuteOfDay(9 * 60 + 30, '12h')).toBe('9:30am')
    expect(formatMinuteOfDay(9 * 60 + 30, '24h')).toBe('09:30')
    expect(formatMinuteOfDay(21 * 60, '24h')).toBe('21:00')
  })

  it('formats compact cell labels', () => {
    expect(formatCompact(9 * 60, '12h')).toBe('9a')
    expect(formatCompact(14 * 60 + 45, '12h')).toBe('2:45p')
    expect(formatCompact(0, '24h')).toBe('00')
    expect(formatCompact(5 * 60 + 30, '24h')).toBe('05:30')
  })
})

describe('currentHourAtOffset', () => {
  it('derives the local hour from UTC and offset', () => {
    const at = new Date('2026-01-15T23:30:00Z')
    expect(currentHourAtOffset(0, at)).toBe(23)
    expect(currentHourAtOffset(60, at)).toBe(0)
    expect(currentHourAtOffset(-480, at)).toBe(15)
  })
})
