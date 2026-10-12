import { getCity } from '../data/cities'
import type { AppState, Mode, TimeFormat } from '../types'
import { DEFAULT_STATE } from './reducer'

export const STORAGE_KEY = 'timezone-overlap:v1'

const isHour = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23

const isMode = (value: unknown): value is Mode => value === 'meeting' || value === 'base'

const isTimeFormat = (value: unknown): value is TimeFormat => value === '12h' || value === '24h'

/** Rebuilds a valid state from untrusted JSON, falling back to defaults field by field. */
export function parseState(raw: string | null): AppState {
  if (!raw) return DEFAULT_STATE
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return DEFAULT_STATE
  }
  if (typeof data !== 'object' || data === null) return DEFAULT_STATE
  const record = data as Record<string, unknown>
  const settings = (typeof record.settings === 'object' && record.settings !== null
    ? record.settings
    : {}) as Record<string, unknown>

  // An intentionally emptied list is kept; a list of only unknown ids is corrupt, so use defaults.
  const saved = Array.isArray(record.cityIds) ? record.cityIds : null
  const known = saved
    ? [...new Set(saved.filter((id): id is string => typeof id === 'string' && !!getCity(id)))]
    : []
  const cityIds = saved && (known.length > 0 || saved.length === 0) ? known : DEFAULT_STATE.cityIds

  return {
    cityIds,
    mode: isMode(record.mode) ? record.mode : DEFAULT_STATE.mode,
    settings: {
      wake: isHour(settings.wake) ? settings.wake : DEFAULT_STATE.settings.wake,
      sleep: isHour(settings.sleep) ? settings.sleep : DEFAULT_STATE.settings.sleep,
      timeFormat: isTimeFormat(settings.timeFormat) ? settings.timeFormat : DEFAULT_STATE.settings.timeFormat,
    },
  }
}

export function loadState(): AppState {
  try {
    return parseState(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT_STATE
  }
}

export function saveState(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable or full (private mode); the app keeps working in memory.
  }
}
