import { CITY_BY_ID, DEFAULT_CITY_IDS } from '../domain/cities'
import type { Mode } from '../domain/schedule'
import type { TimeFormat } from '../domain/time'

export interface Settings {
  wakeHour: number
  sleepHour: number
  timeFormat: TimeFormat
}

export interface PersistedState {
  /** Ordered; the first city is the reference. */
  cityIds: string[]
  mode: Mode
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = { wakeHour: 7, sleepHour: 23, timeFormat: '12h' }

export const createDefaultState = (): PersistedState => ({
  cityIds: [...DEFAULT_CITY_IDS],
  mode: 'meeting',
  settings: { ...DEFAULT_SETTINGS },
})

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}

const isHour = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23

/** Storage is user-editable and outlives catalog changes, so never trust it blindly. */
export function sanitizeState(raw: unknown): PersistedState {
  const defaults = createDefaultState()
  const input = asRecord(raw)
  const settings = asRecord(input.settings)

  const cityIds = Array.isArray(input.cityIds)
    ? [...new Set(input.cityIds.filter((id): id is string => typeof id === 'string' && CITY_BY_ID.has(id)))]
    : defaults.cityIds

  return {
    cityIds,
    mode: input.mode === 'meeting' || input.mode === 'base' ? input.mode : defaults.mode,
    settings: {
      wakeHour: isHour(settings.wakeHour) ? settings.wakeHour : defaults.settings.wakeHour,
      sleepHour: isHour(settings.sleepHour) ? settings.sleepHour : defaults.settings.sleepHour,
      timeFormat:
        settings.timeFormat === '12h' || settings.timeFormat === '24h'
          ? settings.timeFormat
          : defaults.settings.timeFormat,
    },
  }
}
