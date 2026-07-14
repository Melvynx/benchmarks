import type { AppMode } from '../lib/gridModel'
import { CITY_CATALOG, DEFAULT_CITY_IDS, getCityById } from '../data/cities'

const STORAGE_KEY = 'timezone-overlap-composer-v1'

export interface Settings {
  wakeHour: number
  sleepHour: number
  use24h: boolean
}

export interface PersistedState {
  mode: AppMode
  cityIds: string[]
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = {
  wakeHour: 7,
  sleepHour: 23,
  use24h: false,
}

export const DEFAULT_STATE: PersistedState = {
  mode: 'meeting',
  cityIds: [...DEFAULT_CITY_IDS],
  settings: { ...DEFAULT_SETTINGS },
}

function sanitizeCityIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [...DEFAULT_CITY_IDS]
  const valid = new Set(CITY_CATALOG.map((c) => c.id))
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (typeof id !== 'string' || !valid.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out.length > 0 ? out : [...DEFAULT_CITY_IDS]
}

function clampHour(n: unknown, fallback: number): number {
  if (typeof n !== 'number' || !Number.isInteger(n)) return fallback
  return Math.min(23, Math.max(0, n))
}

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE, cityIds: [...DEFAULT_CITY_IDS], settings: { ...DEFAULT_SETTINGS } }
    const p = JSON.parse(raw) as Partial<PersistedState>
    return {
      mode: p.mode === 'base' ? 'base' : 'meeting',
      cityIds: sanitizeCityIds(p.cityIds),
      settings: {
        wakeHour: clampHour(p.settings?.wakeHour, DEFAULT_SETTINGS.wakeHour),
        sleepHour: clampHour(p.settings?.sleepHour, DEFAULT_SETTINGS.sleepHour),
        use24h: Boolean(p.settings?.use24h),
      },
    }
  } catch {
    return { ...DEFAULT_STATE, cityIds: [...DEFAULT_CITY_IDS], settings: { ...DEFAULT_SETTINGS } }
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

export type Action =
  | { type: 'SET_MODE'; mode: AppMode }
  | { type: 'ADD_CITY'; id: string }
  | { type: 'REMOVE_CITY'; id: string }
  | { type: 'PROMOTE_CITY'; id: string }
  | { type: 'SET_SETTINGS'; partial: Partial<Settings> }

export function reducer(state: PersistedState, action: Action): PersistedState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode }
    case 'ADD_CITY': {
      if (state.cityIds.includes(action.id)) return state
      if (!getCityById(action.id)) return state
      return { ...state, cityIds: [...state.cityIds, action.id] }
    }
    case 'REMOVE_CITY': {
      const next = state.cityIds.filter((id) => id !== action.id)
      return { ...state, cityIds: next.length > 0 ? next : state.cityIds }
    }
    case 'PROMOTE_CITY': {
      if (!state.cityIds.includes(action.id)) return state
      const rest = state.cityIds.filter((id) => id !== action.id)
      return { ...state, cityIds: [action.id, ...rest] }
    }
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.partial,
          wakeHour:
            action.partial.wakeHour !== undefined
              ? clampHour(action.partial.wakeHour, state.settings.wakeHour)
              : state.settings.wakeHour,
          sleepHour:
            action.partial.sleepHour !== undefined
              ? clampHour(action.partial.sleepHour, state.settings.sleepHour)
              : state.settings.sleepHour,
        },
      }
    default:
      return state
  }
}

export function initialPersistedState(): PersistedState {
  return load()
}
