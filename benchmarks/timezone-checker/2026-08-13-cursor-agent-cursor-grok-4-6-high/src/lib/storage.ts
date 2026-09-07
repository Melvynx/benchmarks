import { CITY_BY_ID, DEFAULT_CITY_IDS } from '../data/cities'
import type { Mode } from './overlap'
import type { TimeFormat } from './time'

export const STORAGE_KEY = 'timezone-overlap:v1'

export type PersistedState = {
  cityIds: string[]
  mode: Mode
  wakeHour: number
  sleepHour: number
  timeFormat: TimeFormat
}

export const DEFAULT_STATE: PersistedState = {
  cityIds: [...DEFAULT_CITY_IDS],
  mode: 'meeting',
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
}

function clampHour(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 23) {
    return null
  }
  return value
}

export function parseState(raw: unknown): PersistedState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STATE, cityIds: [...DEFAULT_STATE.cityIds] }

  const data = raw as Record<string, unknown>
  const cityIds = Array.isArray(data.cityIds)
    ? [...new Set(data.cityIds.filter((id): id is string => typeof id === 'string' && CITY_BY_ID.has(id)))]
    : [...DEFAULT_STATE.cityIds]

  const mode: Mode = data.mode === 'base' ? 'base' : 'meeting'
  const wakeHour = clampHour(data.wakeHour) ?? DEFAULT_STATE.wakeHour
  const sleepHour = clampHour(data.sleepHour) ?? DEFAULT_STATE.sleepHour
  const timeFormat: TimeFormat = data.timeFormat === '24h' ? '24h' : '12h'

  return { cityIds, mode, wakeHour, sleepHour, timeFormat }
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE, cityIds: [...DEFAULT_STATE.cityIds] }
    return parseState(JSON.parse(raw) as unknown)
  } catch {
    return { ...DEFAULT_STATE, cityIds: [...DEFAULT_STATE.cityIds] }
  }
}

export function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private mode or quota: keep working in-memory.
  }
}
