import { findCity } from './cities';
import type { Settings, TimeFormat } from './time';

export type Mode = 'meeting' | 'base';

export interface AppState {
  /** City ids. Index 0 is the reference city. */
  cities: string[];
  settings: Settings;
  mode: Mode;
}

const STORAGE_KEY = 'timezone-overlap:v1';

const DEFAULT_CITIES = ['san-francisco', 'denpasar', 'geneva'];

export function defaultState(): AppState {
  return {
    cities: [...DEFAULT_CITIES],
    settings: { wakeHour: 7, sleepHour: 23, format: '12h' },
    mode: 'meeting',
  };
}

const isHour = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 23;
const isFormat = (v: unknown): v is TimeFormat => v === '12h' || v === '24h';
const isMode = (v: unknown): v is Mode => v === 'meeting' || v === 'base';

/** Loads and sanitises persisted state. Anything unrecognised falls back to defaults. */
export function loadState(): AppState {
  const fallback = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<Record<keyof AppState, unknown>>;
    const rawCities = Array.isArray(parsed.cities) ? parsed.cities : fallback.cities;
    const cities = [...new Set(rawCities)].filter(
      (id): id is string => typeof id === 'string' && findCity(id) !== undefined,
    );

    const s = (parsed.settings ?? {}) as Record<string, unknown>;
    return {
      cities,
      settings: {
        wakeHour: isHour(s.wakeHour) ? s.wakeHour : fallback.settings.wakeHour,
        sleepHour: isHour(s.sleepHour) ? s.sleepHour : fallback.settings.sleepHour,
        format: isFormat(s.format) ? s.format : fallback.settings.format,
      },
      mode: isMode(parsed.mode) ? parsed.mode : fallback.mode,
    };
  } catch {
    return fallback;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or disabled (private mode). The app keeps working in memory.
  }
}
