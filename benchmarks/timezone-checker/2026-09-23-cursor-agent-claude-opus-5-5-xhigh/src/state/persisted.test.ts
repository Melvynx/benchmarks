import { describe, expect, it } from 'vitest'
import { createDefaultState, sanitizeState } from './persisted'

describe('sanitizeState', () => {
  it('falls back to defaults for garbage', () => {
    expect(sanitizeState(null)).toEqual(createDefaultState())
    expect(sanitizeState('nope')).toEqual(createDefaultState())
  })

  it('keeps valid values and drops unknown or duplicate cities', () => {
    const state = sanitizeState({
      cityIds: ['tokyo', 'atlantis', 'tokyo', 42, 'mumbai'],
      mode: 'base',
      settings: { wakeHour: 22, sleepHour: 6, timeFormat: '24h' },
    })
    expect(state).toEqual({
      cityIds: ['tokyo', 'mumbai'],
      mode: 'base',
      settings: { wakeHour: 22, sleepHour: 6, timeFormat: '24h' },
    })
  })

  it('rejects out-of-range settings individually', () => {
    const state = sanitizeState({ cityIds: [], mode: 'party', settings: { wakeHour: 24, sleepHour: 1.5, timeFormat: 'x' } })
    expect(state.cityIds).toEqual([])
    expect(state.mode).toBe('meeting')
    expect(state.settings).toEqual(createDefaultState().settings)
  })
})
