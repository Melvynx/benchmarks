import { CITY_BY_ID, DEFAULT_CITY_IDS } from '../data/cities';

export type Mode = 'meeting' | 'base';
export type TimeFormat = '12h' | '24h';

export interface Settings {
  /** Hour you wake up, 0–23. */
  wake: number;
  /** Hour you go to sleep, 0–23. May be earlier than `wake` (overnight window). */
  sleep: number;
  format: TimeFormat;
}

export interface AppState {
  cityIds: string[];
  mode: Mode;
  settings: Settings;
}

export const DEFAULT_STATE: AppState = {
  cityIds: [...DEFAULT_CITY_IDS],
  mode: 'meeting',
  settings: { wake: 7, sleep: 23, format: '12h' },
};

function clampHour(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23
    ? value
    : fallback;
}

/** Validates anything read back from localStorage; falls back field-by-field. */
export function sanitizeState(raw: unknown): AppState {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_STATE, cityIds: [...DEFAULT_STATE.cityIds], settings: { ...DEFAULT_STATE.settings } };
  }
  const record = raw as Record<string, unknown>;
  const cityIds = Array.isArray(record.cityIds)
    ? [...new Set(record.cityIds.filter((id): id is string => typeof id === 'string' && CITY_BY_ID.has(id)))]
    : [...DEFAULT_STATE.cityIds];
  const mode: Mode = record.mode === 'base' ? 'base' : 'meeting';
  const settingsRaw = (
    typeof record.settings === 'object' && record.settings !== null ? record.settings : {}
  ) as Record<string, unknown>;
  return {
    cityIds,
    mode,
    settings: {
      wake: clampHour(settingsRaw.wake, DEFAULT_STATE.settings.wake),
      sleep: clampHour(settingsRaw.sleep, DEFAULT_STATE.settings.sleep),
      format: settingsRaw.format === '24h' ? '24h' : '12h',
    },
  };
}
