import { CITY_CATALOG, DEFAULT_CITY_IDS } from '../data/cities'
import type { Mode, TimeFormat } from './time'

export interface PersistedState {
  cityIds: string[]
  wake: number
  sleep: number
  format: TimeFormat
  mode: Mode
}

export const DEFAULT_STATE: PersistedState = {
  cityIds: [...DEFAULT_CITY_IDS],
  wake: 7,
  sleep: 23,
  format: '12h',
  mode: 'meeting',
}

const KEY = 'tz-overlap-state-v1'

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    const validIds = new Set(CITY_CATALOG.map((c) => c.id))
    const cityIds = Array.isArray(parsed.cityIds)
      ? [...new Set(parsed.cityIds.filter((id) => typeof id === 'string' && validIds.has(id)))]
      : []
    const isHour = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 23 && Number.isInteger(v)
    return {
      cityIds: cityIds.length ? cityIds : [...DEFAULT_CITY_IDS],
      wake: isHour(parsed.wake) ? parsed.wake : 7,
      sleep: isHour(parsed.sleep) ? parsed.sleep : 23,
      format: parsed.format === '24h' ? '24h' : '12h',
      mode: parsed.mode === 'base' ? 'base' : 'meeting',
    }
  } catch {
    return DEFAULT_STATE
  }
}

export function saveState(state: PersistedState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage unavailable (private mode quotas etc.) — app still works in-memory
  }
}
