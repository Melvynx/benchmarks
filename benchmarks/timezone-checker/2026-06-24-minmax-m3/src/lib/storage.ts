import type { AppState, Settings, Mode } from '../types'
import { DEFAULT_CITY_IDS } from '../data/cities'

const STORAGE_KEY = 'timezone-checker:v1'

export const DEFAULT_SETTINGS: Settings = {
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
}

export const DEFAULT_STATE: AppState = {
  cities: DEFAULT_CITY_IDS,
  mode: 'meeting',
  settings: DEFAULT_SETTINGS,
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      cities: Array.isArray(parsed.cities) ? parsed.cities.filter((c) => typeof c === 'string') : DEFAULT_STATE.cities,
      mode: parsed.mode === 'base' ? 'base' : 'meeting',
      settings: {
        wakeHour: clampHour(parsed.settings?.wakeHour ?? DEFAULT_SETTINGS.wakeHour),
        sleepHour: clampHour(parsed.settings?.sleepHour ?? DEFAULT_SETTINGS.sleepHour),
        timeFormat: parsed.settings?.timeFormat === '24h' ? '24h' : '12h',
      },
    }
  } catch {
    return DEFAULT_STATE
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore quota errors.
  }
}

function clampHour(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.wakeHour
  return Math.min(23, Math.max(0, Math.round(n)))
}

export type { Mode }