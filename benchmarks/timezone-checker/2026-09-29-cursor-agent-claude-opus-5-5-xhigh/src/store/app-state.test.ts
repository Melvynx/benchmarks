import { describe, expect, it } from 'vitest';
import { createDefaultState, sanitizeState } from './app-state';

describe('sanitizeState', () => {
  it('provides first-visit defaults', () => {
    expect(createDefaultState()).toEqual({
      cityIds: ['san-francisco', 'denpasar', 'geneva'],
      mode: 'meeting',
      settings: { wakeHour: 7, sleepHour: 23, timeFormat: '12h' },
    });
  });

  it('keeps valid persisted state', () => {
    const state = {
      cityIds: ['tokyo', 'london'],
      mode: 'base',
      settings: { wakeHour: 22, sleepHour: 6, timeFormat: '24h' },
    };
    expect(sanitizeState(state)).toEqual(state);
  });

  it('drops unknown or duplicate cities and invalid settings', () => {
    expect(
      sanitizeState({
        cityIds: ['tokyo', 'atlantis', 'tokyo', 42],
        mode: 'party',
        settings: { wakeHour: 25, sleepHour: 3.5, timeFormat: 'metric' },
      }),
    ).toEqual({
      cityIds: ['tokyo'],
      mode: 'meeting',
      settings: { wakeHour: 7, sleepHour: 23, timeFormat: '12h' },
    });
  });

  it('falls back to defaults for garbage', () => {
    expect(sanitizeState(null)).toEqual(createDefaultState());
    expect(sanitizeState('nope')).toEqual(createDefaultState());
  });

  it('respects an intentionally empty city list', () => {
    expect(sanitizeState({ cityIds: [] }).cityIds).toEqual([]);
  });
});
