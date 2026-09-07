import { CITY_BY_ID, DEFAULT_CITY_IDS } from '../data/cities'
import type { Mode } from '../lib/overlap'
import type { TimeFormat } from '../lib/time'

export type AppState = {
  cityIds: string[]
  mode: Mode
  wakeHour: number
  sleepHour: number
  timeFormat: TimeFormat
}

export const DEFAULT_STATE: AppState = {
  cityIds: DEFAULT_CITY_IDS,
  mode: 'meeting',
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
}

export type Action =
  | { type: 'add-city'; cityId: string }
  | { type: 'remove-city'; cityId: string }
  | { type: 'promote-city'; cityId: string }
  | { type: 'set-mode'; mode: Mode }
  | { type: 'set-wake'; hour: number }
  | { type: 'set-sleep'; hour: number }
  | { type: 'set-format'; format: TimeFormat }
  | { type: 'reset' }

const clampHour = (hour: number) => Math.min(23, Math.max(0, Math.round(hour)))

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'add-city': {
      if (!CITY_BY_ID.has(action.cityId) || state.cityIds.includes(action.cityId)) return state
      return { ...state, cityIds: [...state.cityIds, action.cityId] }
    }
    case 'remove-city':
      return { ...state, cityIds: state.cityIds.filter((id) => id !== action.cityId) }
    case 'promote-city': {
      if (!state.cityIds.includes(action.cityId) || state.cityIds[0] === action.cityId) return state
      return {
        ...state,
        cityIds: [action.cityId, ...state.cityIds.filter((id) => id !== action.cityId)],
      }
    }
    case 'set-mode':
      return { ...state, mode: action.mode }
    case 'set-wake':
      return { ...state, wakeHour: clampHour(action.hour) }
    case 'set-sleep':
      return { ...state, sleepHour: clampHour(action.hour) }
    case 'set-format':
      return { ...state, timeFormat: action.format }
    case 'reset':
      return DEFAULT_STATE
  }
}

export const STORAGE_KEY = 'timezone-overlap:v1'

/**
 * Persisted state is untrusted input — a stale schema or a hand-edited value
 * should degrade to the defaults rather than crash the app.
 */
export function sanitize(raw: unknown): AppState {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_STATE
  const value = raw as Partial<Record<keyof AppState, unknown>>

  const cityIds = Array.isArray(value.cityIds)
    ? [...new Set(value.cityIds.filter((id): id is string => typeof id === 'string' && CITY_BY_ID.has(id)))]
    : DEFAULT_STATE.cityIds

  const hour = (input: unknown, fallback: number) =>
    typeof input === 'number' && Number.isFinite(input) ? clampHour(input) : fallback

  return {
    cityIds,
    mode: value.mode === 'base' ? 'base' : 'meeting',
    wakeHour: hour(value.wakeHour, DEFAULT_STATE.wakeHour),
    sleepHour: hour(value.sleepHour, DEFAULT_STATE.sleepHour),
    timeFormat: value.timeFormat === '24h' ? '24h' : '12h',
  }
}

export function loadState(): AppState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? sanitize(JSON.parse(stored)) : DEFAULT_STATE
  } catch {
    return DEFAULT_STATE
  }
}

export function saveState(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private-mode or quota failures shouldn't break the session.
  }
}
