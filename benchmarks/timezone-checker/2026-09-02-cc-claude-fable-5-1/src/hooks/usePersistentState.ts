import { useEffect, useState } from 'react'
import { DEFAULT_CITY_IDS, getCity } from '../lib/cities'
import type { Mode, Settings } from '../lib/overlap'

export interface AppState {
  cityIds: string[]
  mode: Mode
  settings: Settings
}

const STORAGE_KEY = 'tz-overlap:v1'

export const DEFAULT_STATE: AppState = {
  cityIds: [...DEFAULT_CITY_IDS],
  mode: 'meeting',
  settings: { wakeHour: 7, sleepHour: 23, timeFormat: '12h' },
}

const isHour = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 23

/** Validate persisted JSON defensively; fall back to defaults for any malformed field. */
function sanitize(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') return DEFAULT_STATE
  const r = raw as Partial<Record<keyof AppState, unknown>>
  const cityIds = Array.isArray(r.cityIds)
    ? [...new Set(r.cityIds.filter((id): id is string => typeof id === 'string' && !!getCity(id)))]
    : DEFAULT_STATE.cityIds
  const mode: Mode = r.mode === 'base' ? 'base' : 'meeting'
  const s = (r.settings ?? {}) as Partial<Settings>
  const settings: Settings = {
    wakeHour: isHour(s.wakeHour) ? s.wakeHour : DEFAULT_STATE.settings.wakeHour,
    sleepHour: isHour(s.sleepHour) ? s.sleepHour : DEFAULT_STATE.settings.sleepHour,
    timeFormat: s.timeFormat === '24h' ? '24h' : '12h',
  }
  return { cityIds, mode, settings }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? sanitize(JSON.parse(raw)) : DEFAULT_STATE
  } catch {
    return DEFAULT_STATE
  }
}

export function usePersistentState() {
  const [state, setState] = useState<AppState>(load)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable (private mode quota, etc.) — keep in-memory state */
    }
  }, [state])
  return [state, setState] as const
}
