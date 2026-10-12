import { describe, expect, it } from 'vitest'
import { CITY_BY_ID, CITIES, citySearchScore, DEFAULT_CITY_IDS, REGIONS, searchKeywords, type City } from './cities'
import {
  analyzeOverlap,
  buildTimelines,
  isAwake,
  maskToRanges,
  rangeContains,
  rangeSegments,
  resolveCellStates,
  type BaseOverlap,
  type HourMask,
  type MeetingOverlap,
} from './schedule'
import { meetingShareText } from './share'

const AT = new Date('2026-09-23T12:00:00Z')
const DAY = { wakeHour: 7, sleepHour: 23 }

const cities = (...ids: string[]): City[] => ids.map((id) => CITY_BY_ID.get(id)!)
const maskOf = (...hours: number[]): HourMask => Array.from({ length: 24 }, (_, h) => hours.includes(h))
const hoursOf = (mask: HourMask) => mask.flatMap((on, h) => (on ? [h] : []))

describe('catalog', () => {
  it('spans every region with unique ids and valid zones', () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(30)
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length)
    for (const region of REGIONS) expect(CITIES.some((c) => c.region === region)).toBe(true)
    for (const city of CITIES) expect(() => new Intl.DateTimeFormat('en', { timeZone: city.timeZone })).not.toThrow()
    for (const id of DEFAULT_CITY_IDS) expect(CITY_BY_ID.has(id)).toBe(true)
  })

  it('gives every city a unique three-letter code', () => {
    for (const city of CITIES) expect(city.code).toMatch(/^[A-Z]{3}$/)
    expect(new Set(CITIES.map((c) => c.code)).size).toBe(CITIES.length)
  })
})

describe('citySearchScore', () => {
  const search = (query: string) =>
    CITIES.map((city) => ({ id: city.id, score: citySearchScore(city.name, query, searchKeywords(city)) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.id)

  it('matches by country and alias without fuzzy false positives', () => {
    expect(search('nepal')).toEqual(['kathmandu'])
    expect(search('bali')).toEqual(['denpasar'])
    expect(search('sf')).toEqual(['san-francisco'])
    expect(search('jnb')).toEqual(['johannesburg'])
  })

  it('ranks name matches first and ignores accents', () => {
    expect(search('san').slice(0, 2).sort()).toEqual(['san-francisco', 'santiago'])
    expect(search('sao')).toEqual(['sao-paulo'])
    expect(search('york')).toEqual(['new-york'])
    expect(search('oceania').sort()).toEqual(['auckland', 'sydney'])
  })
})

describe('isAwake', () => {
  it('uses a half-open window', () => {
    expect(isAwake(7 * 60, DAY)).toBe(true)
    expect(isAwake(22 * 60 + 59, DAY)).toBe(true)
    expect(isAwake(23 * 60, DAY)).toBe(false)
    expect(isAwake(6 * 60 + 30, DAY)).toBe(false)
  })

  it('supports overnight windows', () => {
    const night = { wakeHour: 22, sleepHour: 6 }
    expect(isAwake(23 * 60, night)).toBe(true)
    expect(isAwake(3 * 60, night)).toBe(true)
    expect(isAwake(6 * 60, night)).toBe(false)
    expect(isAwake(12 * 60, night)).toBe(false)
  })

  it('treats wake === sleep as always awake', () => {
    expect(isAwake(3 * 60, { wakeHour: 8, sleepHour: 8 })).toBe(true)
  })
})

describe('maskToRanges', () => {
  it('handles empty and full days', () => {
    expect(maskToRanges(maskOf())).toEqual([])
    expect(maskToRanges(Array(24).fill(true))).toEqual([{ start: 0, length: 24 }])
  })

  it('splits non-contiguous windows', () => {
    expect(maskToRanges(maskOf(7, 22))).toEqual([
      { start: 7, length: 1 },
      { start: 22, length: 1 },
    ])
  })

  it('merges windows that wrap past midnight', () => {
    expect(maskToRanges(maskOf(0, 1, 9, 10, 22, 23))).toEqual([
      { start: 9, length: 2 },
      { start: 22, length: 4 },
    ])
  })

  it('range helpers understand wrapping', () => {
    const wrap = { start: 22, length: 4 }
    expect(rangeContains(wrap, 1)).toBe(true)
    expect(rangeContains(wrap, 2)).toBe(false)
    expect(rangeSegments(wrap)).toEqual([
      { start: 22, length: 2 },
      { start: 0, length: 2 },
    ])
  })
})

describe('buildTimelines', () => {
  it('anchors every column to the reference city', () => {
    const [sf, denpasar, geneva] = buildTimelines(cities(...DEFAULT_CITY_IDS), AT, DAY)
    expect(sf!.slots[9]!.localMinutes).toBe(9 * 60)
    expect(geneva!.diffMinutes).toBe(9 * 60)
    expect(geneva!.slots[9]!.localMinutes).toBe(18 * 60)
    expect(denpasar!.slots[9]!.localMinutes).toBe(0)
    expect(denpasar!.slots[9]!.dayOffset).toBe(1)
    expect(denpasar!.slots[8]!.dayOffset).toBe(0)
  })

  it('carries fractional offsets into local times', () => {
    const [, mumbai] = buildTimelines(cities('san-francisco', 'mumbai'), AT, DAY)
    expect(mumbai!.diffMinutes).toBe(12 * 60 + 30)
    expect(mumbai!.slots[0]!.localMinutes).toBe(12 * 60 + 30)
    expect(mumbai!.slots[11]!.localMinutes).toBe(23 * 60 + 30)
    expect(mumbai!.slots[11]!.awake).toBe(false)
    expect(mumbai!.slots[12]!.dayOffset).toBe(1)
  })
})

describe('analyzeOverlap', () => {
  const defaults = buildTimelines(cities(...DEFAULT_CITY_IDS), AT, DAY)

  it('needs at least two cities', () => {
    expect(analyzeOverlap(defaults.slice(0, 1), 'meeting')).toBeNull()
  })

  it('meeting mode: hours when everyone is awake', () => {
    const overlap = analyzeOverlap(defaults, 'meeting') as MeetingOverlap
    expect(hoursOf(overlap.mask)).toEqual([7, 22])
    expect(overlap.hours).toBe(2)
    expect(overlap.ranges).toEqual([
      { start: 7, length: 1 },
      { start: 22, length: 1 },
    ])
    expect(overlap.fallback).toBeNull()
  })

  it('base mode: each city against the reference only', () => {
    const overlap = analyzeOverlap(defaults, 'base') as BaseOverlap
    const [denpasar, geneva] = overlap.pairs
    expect(hoursOf(denpasar!.mask)).toEqual([7, 16, 17, 18, 19, 20, 21, 22])
    expect(hoursOf(geneva!.mask)).toEqual([7, 8, 9, 10, 11, 12, 13, 22])
    expect(geneva!.ranges).toEqual([
      { start: 7, length: 7 },
      { start: 22, length: 1 },
    ])
  })

  it('suggests the best compromise when nobody-left-out is impossible', () => {
    const office = buildTimelines(cities(...DEFAULT_CITY_IDS), AT, { wakeHour: 9, sleepHour: 17 })
    const overlap = analyzeOverlap(office, 'meeting') as MeetingOverlap
    expect(overlap.hours).toBe(0)
    expect(overlap.fallback?.awake).toBe(2)
    expect(overlap.fallback?.windows).toEqual([{ start: 0, length: 2, asleep: [CITY_BY_ID.get('san-francisco')] }])
  })

  it('lists exactly who is asleep for every hour of each compromise window', () => {
    const ids = [...DEFAULT_CITY_IDS, 'kathmandu', 'johannesburg', 'sao-paulo', 'auckland', 'tehran', 'tokyo', 'london', 'new-york', 'honolulu']
    const crowd = buildTimelines(cities(...ids), AT, DAY)
    const { fallback } = analyzeOverlap(crowd, 'meeting') as MeetingOverlap
    expect(fallback).not.toBeNull()
    for (const window of fallback!.windows) {
      expect(window.asleep).toHaveLength(fallback!.total - fallback!.awake)
      for (let step = 0; step < window.length; step++) {
        const hour = (window.start + step) % 24
        const asleep = crowd.filter((t) => !t.slots[hour]!.awake).map((t) => t.city)
        expect(asleep).toEqual(window.asleep)
      }
    }
  })
})

describe('resolveCellStates', () => {
  const defaults = buildTimelines(cities(...DEFAULT_CITY_IDS), AT, DAY)

  it('meeting mode shares one overlap window across all rows', () => {
    const states = resolveCellStates(defaults, analyzeOverlap(defaults, 'meeting'))
    for (const row of states) {
      expect(row[7]).toBe('overlap')
      expect(row[22]).toBe('overlap')
      expect(row.filter((s) => s === 'overlap')).toHaveLength(2)
    }
    expect(states[0]![3]).toBe('asleep')
    expect(states[0]![12]).toBe('awake')
  })

  it('base mode highlights per city, and the base row shows the union', () => {
    const states = resolveCellStates(defaults, analyzeOverlap(defaults, 'base'))
    expect(states[1]![10]).toBe('asleep')
    expect(states[2]![10]).toBe('overlap')
    expect(states[1]![18]).toBe('overlap')
    expect(states[2]![18]).toBe('asleep')
    expect(states[0]![10]).toBe('overlap')
    expect(states[0]![18]).toBe('overlap')
    expect(states[0]![15]).toBe('awake')
  })

  it('without overlap analysis only awake/asleep are shown', () => {
    const [sf] = defaults
    expect(resolveCellStates([sf!], null)[0]).not.toContain('overlap')
  })
})

describe('share text', () => {
  it('lists every window in each city’s local time', () => {
    const defaults = buildTimelines(cities(...DEFAULT_CITY_IDS), AT, DAY)
    const text = meetingShareText(defaults, analyzeOverlap(defaults, 'meeting') as MeetingOverlap, '12h')
    expect(text).toBe(
      [
        'Everyone awake · 2 hours',
        '• San Francisco 7am — 8am · Denpasar 10pm — 11pm · Geneva 4pm — 5pm',
        '• San Francisco 10pm — 11pm · Denpasar 1pm — 2pm · Geneva 7am — 8am',
      ].join('\n'),
    )
  })
})
