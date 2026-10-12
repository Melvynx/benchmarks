import { CITY_BY_ID } from '../data/cities';
import { DEFAULT_STATE, type AppState, type Mode, type TimeFormat } from '../types';

export const STORAGE_KEY = 'tz-overlap.v1';

function isHour(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23;
}

function isMode(value: unknown): value is Mode {
  return value === 'meeting' || value === 'base';
}

function isFormat(value: unknown): value is TimeFormat {
  return value === '12h' || value === '24h';
}

export function sanitize(input: unknown): AppState {
  if (!input || typeof input !== 'object') return cloneState(DEFAULT_STATE);
  const record = input as Record<string, unknown>;
  return {
    cityIds: Array.isArray(record.cityIds) ? uniqueCityIds(record.cityIds) : [...DEFAULT_STATE.cityIds],
    mode: isMode(record.mode) ? record.mode : DEFAULT_STATE.mode,
    wake: isHour(record.wake) ? record.wake : DEFAULT_STATE.wake,
    sleep: isHour(record.sleep) ? record.sleep : DEFAULT_STATE.sleep,
    format: isFormat(record.format) ? record.format : DEFAULT_STATE.format,
  };
}

function uniqueCityIds(values: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string' || !CITY_BY_ID.has(value) || seen.has(value)) continue;
    seen.add(value);
    ids.push(value);
  }
  return ids;
}

export function cloneState(state: AppState): AppState {
  return {
    cityIds: [...state.cityIds],
    mode: state.mode,
    wake: state.wake,
    sleep: state.sleep,
    format: state.format,
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneState(DEFAULT_STATE);
    return sanitize(JSON.parse(raw));
  } catch {
    return cloneState(DEFAULT_STATE);
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Private mode and quota failures leave the session in memory. */
  }
}
