import { CITY_BY_ID, DEFAULT_CITY_IDS } from '../data/cities';
import type { AppState, Mode, TimeFormat } from '../types';

export const STORAGE_KEY = 'tz-overlap-v1';

export function defaultState(): AppState {
  return {
    cityIds: [...DEFAULT_CITY_IDS],
    mode: 'meeting',
    wake: 7,
    sleep: 23,
    format: '12',
  };
}

function readHour(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback;
}

function readCityIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_CITY_IDS];
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !CITY_BY_ID.has(item) || ids.includes(item)) continue;
    ids.push(item);
  }
  return ids;
}

export function parseState(raw: string | null): AppState {
  const fallback = defaultState();
  if (!raw) return fallback;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return fallback;
    const record = data as Record<string, unknown>;
    const mode: Mode = record.mode === 'base' || record.mode === 'meeting' ? record.mode : fallback.mode;
    const format: TimeFormat = record.format === '24' || record.format === '12' ? record.format : fallback.format;
    return {
      cityIds: readCityIds(record.cityIds),
      mode,
      wake: readHour(record.wake, fallback.wake),
      sleep: readHour(record.sleep, fallback.sleep),
      format,
    };
  } catch {
    return fallback;
  }
}

function browserStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadState(): AppState {
  try {
    return parseState(browserStorage()?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  try {
    browserStorage()?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota and private-mode failures.
  }
}
