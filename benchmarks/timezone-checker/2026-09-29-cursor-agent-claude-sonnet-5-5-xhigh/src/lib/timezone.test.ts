import { describe, expect, it } from 'vitest'
import { currentHourAtOffset, getUtcOffsetMinutes } from './timezone'

const at = (iso: string) => new Date(iso)

describe('getUtcOffsetMinutes', () => {
  it('follows daylight saving time', () => {
    expect(getUtcOffsetMinutes('America/Los_Angeles', at('2026-07-01T12:00:00Z'))).toBe(-420)
    expect(getUtcOffsetMinutes('America/Los_Angeles', at('2026-01-15T12:00:00Z'))).toBe(-480)
    expect(getUtcOffsetMinutes('Europe/Zurich', at('2026-07-01T12:00:00Z'))).toBe(120)
    expect(getUtcOffsetMinutes('Europe/Zurich', at('2026-01-15T12:00:00Z'))).toBe(60)
  })

  it('handles southern hemisphere DST', () => {
    expect(getUtcOffsetMinutes('Australia/Sydney', at('2026-01-15T12:00:00Z'))).toBe(660)
    expect(getUtcOffsetMinutes('Australia/Sydney', at('2026-07-01T12:00:00Z'))).toBe(600)
  })

  it('supports fractional offsets', () => {
    expect(getUtcOffsetMinutes('Asia/Kolkata', at('2026-09-30T00:00:00Z'))).toBe(330)
    expect(getUtcOffsetMinutes('Asia/Kathmandu', at('2026-09-30T00:00:00Z'))).toBe(345)
  })

  it('has no DST for zones that do not observe it', () => {
    expect(getUtcOffsetMinutes('Asia/Makassar', at('2026-01-15T00:00:00Z'))).toBe(480)
    expect(getUtcOffsetMinutes('Asia/Makassar', at('2026-07-15T00:00:00Z'))).toBe(480)
  })

  it('switches exactly at the transition instant', () => {
    expect(getUtcOffsetMinutes('America/New_York', at('2026-03-08T06:59:59Z'))).toBe(-300)
    expect(getUtcOffsetMinutes('America/New_York', at('2026-03-08T07:00:00Z'))).toBe(-240)
  })
})

describe('currentHourAtOffset', () => {
  it('returns the wall-clock hour at a fixed offset', () => {
    const now = at('2026-09-30T00:08:41Z')
    expect(currentHourAtOffset(-420, now)).toBe(17)
    expect(currentHourAtOffset(480, now)).toBe(8)
    expect(currentHourAtOffset(330, now)).toBe(5)
  })

  it('wraps across midnight in both directions', () => {
    expect(currentHourAtOffset(-420, at('2026-09-30T03:00:00Z'))).toBe(20)
    expect(currentHourAtOffset(780, at('2026-09-30T23:30:00Z'))).toBe(12)
  })
})
