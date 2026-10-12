import { CITIES, DEFAULT_CITY_IDS } from './cities.ts';
import type { Mode, Settings } from './time';

export interface AppState {
  cityIds: string[];
  settings: Settings;
  mode: Mode;
}
export const STORAGE_KEY = 'common-ground-v1';
export const DEFAULT_STATE: AppState = {
  cityIds: DEFAULT_CITY_IDS,
  settings: { wake: 7, sleep: 23, format: '12h' },
  mode: 'meeting',
};

export function loadState(): AppState {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!stored || !Array.isArray(stored.cityIds)) return DEFAULT_STATE;
    const cityIds = [
      ...new Set<string>(
        stored.cityIds.filter((id: unknown) => CITIES.some((city) => city.id === id)),
      ),
    ];
    const validHour = (value: unknown, fallback: number) =>
      typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23
        ? value
        : fallback;
    return {
      cityIds,
      mode: stored.mode === 'base' ? 'base' : 'meeting',
      settings: {
        wake: validHour(stored.settings?.wake, 7),
        sleep: validHour(stored.settings?.sleep, 23),
        format: stored.settings?.format === '24h' ? '24h' : '12h',
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
