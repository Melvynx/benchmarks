import { describe, expect, it } from 'vitest'
import { getUtcOffsetMinutes } from '../lib/timezone'
import { CITIES, CITY_BY_ID, REGIONS, matchesCity } from './cities'

describe('city catalog', () => {
  it('has 34 cities covering every region', () => {
    expect(CITIES).toHaveLength(34)
    for (const region of REGIONS) {
      expect(CITIES.some((city) => city.region === region)).toBe(true)
    }
  })

  it('only uses time zones the runtime understands', () => {
    const now = new Date('2026-09-30T00:00:00Z')
    for (const city of CITIES) {
      expect(() => getUtcOffsetMinutes(city.timeZone, now), city.name).not.toThrow()
    }
  })

  it('includes fractional-offset cities', () => {
    const now = new Date('2026-09-30T00:00:00Z')
    const offsets = CITIES.map((city) => getUtcOffsetMinutes(city.timeZone, now))
    expect(offsets).toContain(330)
    expect(offsets).toContain(345)
  })
})

describe('matchesCity', () => {
  const find = (query: string) => CITIES.filter((city) => matchesCity(city, query)).map((city) => city.id)

  it('matches by city name, case-insensitively', () => {
    expect(find('geneva')).toEqual(['geneva'])
    expect(find('  TOKYO ')).toEqual(['tokyo'])
  })

  it('matches by country', () => {
    expect(find('switzerland')).toEqual(['geneva'])
    expect(find('united states')).toEqual(
      expect.arrayContaining(['san-francisco', 'new-york', 'chicago', 'denver', 'honolulu']),
    )
  })

  it('ignores diacritics', () => {
    expect(find('sao paulo')).toEqual(['sao-paulo'])
    expect(find('bogota')).toEqual(['bogota'])
  })

  it('returns everything for an empty query and nothing for nonsense', () => {
    expect(find('')).toHaveLength(CITIES.length)
    expect(find('zzzz')).toEqual([])
  })

  it('resolves ids through the lookup map', () => {
    expect(CITY_BY_ID.get('denpasar')?.timeZone).toBe('Asia/Makassar')
  })
})
