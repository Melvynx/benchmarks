import { describe, expect, it } from 'vitest'
import { getCity } from './cities'
import { buildSchedule, toRanges } from './overlap'
import { formatCellTime, formatUtcOffset, getUtcOffsetMinutes, isAwake, localMinutesAt } from './time'

const c = (id: string) => getCity(id)!
const defaults = { wakeHour: 7, sleepHour: 23, timeFormat: '12h' as const }
// Fixed instant: 2026-01-15T12:00Z (no DST in northern hemisphere).
const winter = new Date('2026-01-15T12:00:00Z')
const summer = new Date('2026-07-15T12:00:00Z')

describe('offsets', () => {
  it('handles DST by date', () => {
    expect(getUtcOffsetMinutes('America/Los_Angeles', winter)).toBe(-480)
    expect(getUtcOffsetMinutes('America/Los_Angeles', summer)).toBe(-420)
  })
  it('supports fractional offsets', () => {
    expect(getUtcOffsetMinutes('Asia/Kolkata', winter)).toBe(330)
    expect(getUtcOffsetMinutes('Asia/Kathmandu', winter)).toBe(345)
  })
  it('formats offsets', () => {
    expect(formatUtcOffset(330)).toBe('UTC+5:30')
    expect(formatUtcOffset(-480)).toBe('UTC−8')
    expect(formatUtcOffset(0)).toBe('UTC±0')
  })
})

describe('awake window', () => {
  it('handles a normal window', () => {
    expect(isAwake(7 * 60, 7, 23)).toBe(true)
    expect(isAwake(22 * 60 + 59, 7, 23)).toBe(true)
    expect(isAwake(23 * 60, 7, 23)).toBe(false)
    expect(isAwake(3 * 60, 7, 23)).toBe(false)
  })
  it('handles an overnight window', () => {
    expect(isAwake(23 * 60, 22, 6)).toBe(true)
    expect(isAwake(2 * 60, 22, 6)).toBe(true)
    expect(isAwake(6 * 60, 22, 6)).toBe(false)
    expect(isAwake(12 * 60, 22, 6)).toBe(false)
  })
  it('local time in Mumbai when it is 9am in SF (winter)', () => {
    const m = localMinutesAt(9, -480, 330)
    expect(m).toBe(22 * 60 + 30)
    expect(formatCellTime(m, '12h')).toBe('10:30p')
    expect(formatCellTime(m, '24h')).toBe('22:30')
  })
})

describe('meeting mode', () => {
  it('finds the shared window for the defaults', () => {
    const s = buildSchedule([c('san-francisco'), c('denpasar'), c('geneva')], defaults, 'meeting', winter)
    // SF −8, Denpasar +8 (16h ahead), Geneva +1 (9h ahead).
    // Denpasar awake in SF hours: local = h+16 → awake when 7≤(h+16)%24<23 → h∈{15..22} ∪ {0..6}... wait: (h+16)%24 in [7,23) → h ∈ [15,24)∪[0,7) → h∈{15..23,0..6}.
    // Geneva: local=h+9 in [7,23) → h ∈ {0..13} ∪ {22,23}.
    // SF: h∈{7..22}. Intersection: {7..13}∩({15..23,0..6}) = ∅ ; {22}∩... → 22 ∈ Geneva? 22+9=31%24=7 ✓; 22 ∈ Denpasar? 22+16=38%24=14 ✓; SF ✓ → {22}
    expect(s.sharedOverlap).toEqual([22])
    expect(s.rows.every((r) => r.overlapHours.length === 1)).toBe(true)
    expect(s.rows[0]!.cells[22]!.state).toBe('overlap')
    expect(s.rows[0]!.cells[3]!.state).toBe('sleeping')
    expect(s.rows[0]!.cells[9]!.state).toBe('awake')
  })
  it('returns no overlap when there is none', () => {
    const s = buildSchedule([c('san-francisco'), c('tokyo')], { ...defaults, wakeHour: 9, sleepHour: 12 }, 'meeting', winter)
    expect(s.sharedOverlap).toEqual([])
  })
})

describe('base mode', () => {
  it('computes per-city overlap against the reference', () => {
    const s = buildSchedule([c('london'), c('new-york'), c('tokyo')], defaults, 'base', winter)
    const ny = s.rows[1]!
    const tokyo = s.rows[2]!
    // NY is 5h behind London: NY awake at London hours 12..23 (local 7..18) and 0..3 (local 19..22). London awake 7..22 → 12..22.
    expect(ny.overlapHours).toEqual([12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22])
    // Tokyo is 9h ahead: awake when (h+9)%24 in [7,23) → h ∈ {22,23,0..13}. ∩ London 7..22 → 7..13, 22.
    expect(tokyo.overlapHours).toEqual([7, 8, 9, 10, 11, 12, 13, 22])
    expect(ny.overlapHours).not.toEqual(tokyo.overlapHours)
  })
})

describe('ranges', () => {
  it('splits non-contiguous hours', () => {
    expect(toRanges([7, 8, 9, 10, 11, 12, 13, 22])).toEqual([
      { start: 7, end: 14 },
      { start: 22, end: 23 },
    ])
  })
  it('merges across midnight', () => {
    expect(toRanges([0, 1, 22, 23])).toEqual([{ start: 22, end: 26 }])
  })
  it('handles full day and empty', () => {
    expect(toRanges([])).toEqual([])
    expect(toRanges(Array.from({ length: 24 }, (_, i) => i))).toEqual([{ start: 0, end: 24 }])
  })
})
