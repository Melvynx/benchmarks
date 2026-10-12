import { describe, expect, it } from 'vitest'
import {
  formatBoundary,
  formatCellLabel,
  formatClock,
  formatHourOption,
  formatHours,
  formatRange,
  formatUtcOffset,
} from './format'

describe('formatCellLabel', () => {
  it('formats 12h labels with a meridiem', () => {
    expect(formatCellLabel(0, '12h')).toEqual({ hour: '12', minutes: null, suffix: 'AM' })
    expect(formatCellLabel(7 * 60, '12h')).toEqual({ hour: '7', minutes: null, suffix: 'AM' })
    expect(formatCellLabel(12 * 60, '12h')).toEqual({ hour: '12', minutes: null, suffix: 'PM' })
    expect(formatCellLabel(23 * 60, '12h')).toEqual({ hour: '11', minutes: null, suffix: 'PM' })
  })

  it('formats 24h labels zero-padded', () => {
    expect(formatCellLabel(0, '24h')).toEqual({ hour: '00', minutes: null, suffix: null })
    expect(formatCellLabel(9 * 60, '24h')).toEqual({ hour: '09', minutes: null, suffix: null })
    expect(formatCellLabel(23 * 60, '24h')).toEqual({ hour: '23', minutes: null, suffix: null })
  })

  it('keeps minutes for fractional offsets', () => {
    expect(formatCellLabel(13 * 60 + 30, '12h')).toEqual({ hour: '1', minutes: ':30', suffix: 'PM' })
    expect(formatCellLabel(4 * 60 + 45, '24h')).toEqual({ hour: '04', minutes: ':45', suffix: null })
  })
})

describe('formatClock and formatHourOption', () => {
  it('produces full readings', () => {
    expect(formatClock(21 * 60 + 30, '12h')).toBe('9:30 PM')
    expect(formatClock(0, '12h')).toBe('12:00 AM')
    expect(formatClock(21 * 60 + 30, '24h')).toBe('21:30')
    expect(formatHourOption(7, '12h')).toBe('7 AM')
    expect(formatHourOption(23, '24h')).toBe('23:00')
  })
})

describe('formatRange', () => {
  it('renders inclusive start to exclusive end', () => {
    expect(formatRange({ start: 9, end: 12 }, '12h')).toBe('9am — 12pm')
    expect(formatRange({ start: 7, end: 8 }, '12h')).toBe('7am — 8am')
    expect(formatRange({ start: 9, end: 12 }, '24h')).toBe('09:00 — 12:00')
  })

  it('wraps an end of 24 to midnight', () => {
    expect(formatBoundary(24, '12h')).toBe('12am')
    expect(formatRange({ start: 22, end: 24 }, '12h')).toBe('10pm — 12am')
    expect(formatRange({ start: 22, end: 24 }, '24h')).toBe('22:00 — 00:00')
  })
})

describe('formatUtcOffset', () => {
  it('shows sign, hours and optional minutes', () => {
    expect(formatUtcOffset(480)).toBe('UTC+8')
    expect(formatUtcOffset(-420)).toBe('UTC-7')
    expect(formatUtcOffset(330)).toBe('UTC+5:30')
    expect(formatUtcOffset(345)).toBe('UTC+5:45')
    expect(formatUtcOffset(-210)).toBe('UTC-3:30')
    expect(formatUtcOffset(0)).toBe('UTC+0')
  })
})

describe('formatHours', () => {
  it('pluralizes', () => {
    expect(formatHours(1)).toBe('1 hour')
    expect(formatHours(2)).toBe('2 hours')
    expect(formatHours(0)).toBe('0 hours')
  })
})
