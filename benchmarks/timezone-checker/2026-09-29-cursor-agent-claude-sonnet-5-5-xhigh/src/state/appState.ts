import { CITY_BY_ID, DEFAULT_CITY_IDS } from '../data/cities'
import type { Mode, Settings, TimeFormat } from '../lib/types'

export interface AppState {
  /** Ordered city ids. The first one is the reference city. */
  cityIds: string[]
  settings: Settings
  mode: Mode
}

export type AppAction =
  | { type: 'city/add'; id: string }
  | { type: 'city/remove'; id: string }
  | { type: 'city/promote'; id: string }
  | { type: 'cities/reset' }
  | { type: 'mode/set'; mode: Mode }
  | { type: 'settings/patch'; patch: Partial<Settings> }
  | { type: 'reset' }

export const DEFAULT_SETTINGS: Settings = { wake: 7, sleep: 23, format: '12h' }

export const createDefaultState = (): AppState => ({
  cityIds: [...DEFAULT_CITY_IDS],
  settings: { ...DEFAULT_SETTINGS },
  mode: 'meeting',
})

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'city/add':
      if (!CITY_BY_ID.has(action.id) || state.cityIds.includes(action.id)) return state
      return { ...state, cityIds: [...state.cityIds, action.id] }

    case 'city/remove':
      if (!state.cityIds.includes(action.id)) return state
      return { ...state, cityIds: state.cityIds.filter((id) => id !== action.id) }

    case 'city/promote':
      if (!state.cityIds.includes(action.id) || state.cityIds[0] === action.id) return state
      return { ...state, cityIds: [action.id, ...state.cityIds.filter((id) => id !== action.id)] }

    case 'cities/reset':
      return { ...state, cityIds: [...DEFAULT_CITY_IDS] }

    case 'mode/set':
      return state.mode === action.mode ? state : { ...state, mode: action.mode }

    case 'settings/patch':
      return { ...state, settings: sanitizeSettings({ ...state.settings, ...action.patch }, state.settings) }

    case 'reset':
      return createDefaultState()
  }
}

const isHour = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23

const isFormat = (value: unknown): value is TimeFormat => value === '12h' || value === '24h'

const isMode = (value: unknown): value is Mode => value === 'meeting' || value === 'base'

function sanitizeSettings(input: Partial<Record<keyof Settings, unknown>>, fallback: Settings): Settings {
  return {
    wake: isHour(input.wake) ? input.wake : fallback.wake,
    sleep: isHour(input.sleep) ? input.sleep : fallback.sleep,
    format: isFormat(input.format) ? input.format : fallback.format,
  }
}

/** Coerces untrusted persisted data into a valid state, falling back per field. */
export function parseState(raw: unknown): AppState {
  const fallback = createDefaultState()
  if (typeof raw !== 'object' || raw === null) return fallback
  const input = raw as Record<string, unknown>

  const cityIds = Array.isArray(input.cityIds)
    ? [...new Set(input.cityIds.filter((id): id is string => typeof id === 'string' && CITY_BY_ID.has(id)))]
    : fallback.cityIds

  const settings =
    typeof input.settings === 'object' && input.settings !== null
      ? sanitizeSettings(input.settings as Record<string, unknown>, fallback.settings)
      : fallback.settings

  return { cityIds, settings, mode: isMode(input.mode) ? input.mode : fallback.mode }
}
