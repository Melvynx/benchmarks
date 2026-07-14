import { describe, expect, it } from 'vitest'
import type { Earthquake, Filters } from './types'
import { applyFilters, formatDepth, formatMagnitude, inArea, magnitudeLabel, significanceLabel } from './utils'

const event = (overrides: Partial<Earthquake> = {}): Earthquake => ({
  id: 'test', magnitude: 5.2, place: '10 km S of Test City', time: 1000, updated: 1000,
  longitude: -122, latitude: 38, depth: 12, felt: 40, significance: 520, alert: null,
  tsunami: false, status: 'reviewed', type: 'earthquake', url: 'https://earthquake.usgs.gov',
  detailUrl: null, title: 'M 5.2 - Test City', ...overrides,
})

const filters: Filters = {
  range: 'week', minMagnitude: 0, maxDepth: 700, alert: 'all', tsunamiOnly: false,
  review: 'all', area: 'world', query: '', sort: 'significance',
}

describe('earthquake formatting', () => {
  it('handles missing values without misleading zeroes', () => {
    expect(formatMagnitude(null)).toBe('M—')
    expect(formatDepth(null)).toBe('Depth unavailable')
  })

  it('describes magnitude without implying damage', () => {
    expect(magnitudeLabel(4.8)).toBe('Notable earthquake')
    expect(magnitudeLabel(1.2)).toBe('Minor earthquake')
  })
})

describe('earthquake filtering', () => {
  it('combines magnitude, depth, query, review, and tsunami constraints', () => {
    const events = [event(), event({ id: 'deep', depth: 400 }), event({ id: 'small', magnitude: 2 }), event({ id: 'tsunami', tsunami: true, place: 'Test Coast' })]
    expect(applyFilters(events, { ...filters, minMagnitude: 4.5, maxDepth: 100, query: 'test', tsunamiOnly: true }).map(({ id }) => id)).toEqual(['tsunami'])
  })

  it('supports geographic area filtering', () => {
    expect(inArea(event(), 'americas')).toBe(true)
    expect(inArea(event(), 'europe-africa')).toBe(false)
  })
})

describe('significance interpretation', () => {
  it('elevates tsunami and high-alert events', () => {
    expect(significanceLabel(event({ tsunami: true }))).toContain('Notable')
    expect(significanceLabel(event({ alert: 'red' }))).toContain('Potentially concerning')
  })
})
