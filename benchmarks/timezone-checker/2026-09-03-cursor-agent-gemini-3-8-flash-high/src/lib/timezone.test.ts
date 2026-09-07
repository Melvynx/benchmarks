import { describe, it, expect } from 'vitest'
import {
  formatUtcOffset,
  wrapMinutes,
  localMinuteOfDay,
  formatWholeHour,
  formatCellHour,
  formatFullTime,
  getUtcOffsetMinutes,
} from './timezone'

describe('timezone utilities', () => {
  it('formats UTC offsets correctly', () => {
    expect(formatUtcOffset(0)).toBe('UTC±0')
    expect(formatUtcOffset(480)).toBe('UTC+8')
    expect(formatUtcOffset(-420)).toBe('UTC-7')
    expect(formatUtcOffset(330)).toBe('UTC+5:30')
    expect(formatUtcOffset(345)).toBe('UTC+5:45')
    expect(formatUtcOffset(210)).toBe('UTC+3:30')
  })

  it('wraps minutes correctly into [0, 1440)', () => {
    expect(wrapMinutes(0)).toBe(0)
    expect(wrapMinutes(1440)).toBe(0)
    expect(wrapMinutes(1500)).toBe(60)
    expect(wrapMinutes(-60)).toBe(1380)
  })

  it('calculates local minute of day from reference hour and offsets', () => {
    // Reference UTC-7 (San Francisco), Target UTC+8 (Denpasar) -> diff = +15 hours = +900 min
    // When ref is 7:00 (420 min) -> target is 7 + 15 = 22:00 (1320 min)
    const localMin = localMinuteOfDay(7, -420, 480)
    expect(localMin).toBe(1320) // 22:00

    // Mumbai UTC+5:30 (330 min) vs SF UTC-7 (-420 min) -> diff = 750 min = 12h30m
    // When ref is 9:00 -> Mumbai is 21:30 (1290 min)
    const mumbaiMin = localMinuteOfDay(9, -420, 330)
    expect(mumbaiMin).toBe(1290)
  })

  it('formats whole hours in 12h and 24h format', () => {
    expect(formatWholeHour(0, '12h')).toBe('12am')
    expect(formatWholeHour(7, '12h')).toBe('7am')
    expect(formatWholeHour(12, '12h')).toBe('12pm')
    expect(formatWholeHour(23, '12h')).toBe('11pm')

    expect(formatWholeHour(0, '24h')).toBe('00:00')
    expect(formatWholeHour(7, '24h')).toBe('07:00')
    expect(formatWholeHour(12, '24h')).toBe('12:00')
    expect(formatWholeHour(23, '24h')).toBe('23:00')
  })

  it('formats cell hours compact', () => {
    expect(formatCellHour(420, '12h')).toBe('7a')
    expect(formatCellHour(720, '12h')).toBe('12p')
    expect(formatCellHour(1290, '12h')).toBe('9:30p')

    expect(formatCellHour(420, '24h')).toBe('07')
    expect(formatCellHour(720, '24h')).toBe('12')
    expect(formatCellHour(1290, '24h')).toBe('21:30')
  })

  it('formats full times with AM/PM or 24h', () => {
    expect(formatFullTime(420, '12h')).toBe('7:00 AM')
    expect(formatFullTime(1290, '12h')).toBe('9:30 PM')
    expect(formatFullTime(420, '24h')).toBe('07:00')
    expect(formatFullTime(1290, '24h')).toBe('21:30')
  })

  it('computes UTC offset dynamically with Intl', () => {
    // San Francisco is either -420 (PDT) or -480 (PST)
    const sfOffset = getUtcOffsetMinutes('America/Los_Angeles')
    expect(sfOffset === -420 || sfOffset === -480).toBe(true)

    // Denpasar is UTC+8 (+480)
    expect(getUtcOffsetMinutes('Asia/Makassar')).toBe(480)

    // Kathmandu is UTC+5:45 (+345)
    expect(getUtcOffsetMinutes('Asia/Kathmandu')).toBe(345)
  })
})
