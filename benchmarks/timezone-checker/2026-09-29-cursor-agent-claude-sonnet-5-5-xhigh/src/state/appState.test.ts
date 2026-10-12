import { describe, expect, it } from 'vitest'
import { CITIES } from '../data/cities'
import { appReducer, createDefaultState, parseState, type AppState } from './appState'

const start = (): AppState => createDefaultState()

describe('defaults', () => {
  it('starts with the documented configuration', () => {
    expect(start()).toEqual({
      cityIds: ['san-francisco', 'denpasar', 'geneva'],
      settings: { wake: 7, sleep: 23, format: '12h' },
      mode: 'meeting',
    })
  })
})

describe('city actions', () => {
  it('appends new cities', () => {
    const next = appReducer(start(), { type: 'city/add', id: 'tokyo' })
    expect(next.cityIds).toEqual(['san-francisco', 'denpasar', 'geneva', 'tokyo'])
  })

  it('ignores duplicates and unknown ids', () => {
    const state = start()
    expect(appReducer(state, { type: 'city/add', id: 'geneva' })).toBe(state)
    expect(appReducer(state, { type: 'city/add', id: 'atlantis' })).toBe(state)
  })

  it('removes any city, including the reference, which hands the role to the next one', () => {
    const next = appReducer(start(), { type: 'city/remove', id: 'san-francisco' })
    expect(next.cityIds).toEqual(['denpasar', 'geneva'])
  })

  it('allows removing every city', () => {
    let state = start()
    for (const id of state.cityIds) state = appReducer(state, { type: 'city/remove', id })
    expect(state.cityIds).toEqual([])
  })

  it('promotes a city to the front and keeps the others in order', () => {
    const next = appReducer(start(), { type: 'city/promote', id: 'geneva' })
    expect(next.cityIds).toEqual(['geneva', 'san-francisco', 'denpasar'])
  })

  it('does nothing when promoting the reference city', () => {
    const state = start()
    expect(appReducer(state, { type: 'city/promote', id: 'san-francisco' })).toBe(state)
  })
})

describe('settings and mode', () => {
  it('applies partial setting changes', () => {
    const next = appReducer(start(), { type: 'settings/patch', patch: { wake: 22, sleep: 6 } })
    expect(next.settings).toEqual({ wake: 22, sleep: 6, format: '12h' })
  })

  it('rejects invalid hours by keeping the previous value', () => {
    const next = appReducer(start(), { type: 'settings/patch', patch: { wake: 24, sleep: -1 } })
    expect(next.settings).toEqual(start().settings)
  })

  it('switches mode', () => {
    expect(appReducer(start(), { type: 'mode/set', mode: 'base' }).mode).toBe('base')
  })

  it('resets everything', () => {
    let state = appReducer(start(), { type: 'mode/set', mode: 'base' })
    state = appReducer(state, { type: 'settings/patch', patch: { format: '24h' } })
    expect(appReducer(state, { type: 'reset' })).toEqual(start())
  })
})

describe('parseState', () => {
  it('falls back to defaults for garbage', () => {
    expect(parseState(null)).toEqual(start())
    expect(parseState('nope')).toEqual(start())
    expect(parseState(42)).toEqual(start())
  })

  it('round-trips a valid state', () => {
    const state: AppState = {
      cityIds: ['tokyo', 'geneva'],
      settings: { wake: 22, sleep: 6, format: '24h' },
      mode: 'base',
    }
    expect(parseState(JSON.parse(JSON.stringify(state)))).toEqual(state)
  })

  it('drops unknown and duplicate ids and repairs invalid fields individually', () => {
    const parsed = parseState({
      cityIds: ['tokyo', 'atlantis', 'tokyo', 7, 'geneva'],
      settings: { wake: 99, sleep: 5, format: 'martian' },
      mode: 'party',
    })
    expect(parsed).toEqual({
      cityIds: ['tokyo', 'geneva'],
      settings: { wake: 7, sleep: 5, format: '12h' },
      mode: 'meeting',
    })
  })

  it('keeps an intentionally empty city list', () => {
    expect(parseState({ ...start(), cityIds: [] }).cityIds).toEqual([])
  })
})

describe('catalog', () => {
  it('has about 34 unique cities', () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(30)
    expect(new Set(CITIES.map((city) => city.id)).size).toBe(CITIES.length)
  })
})
