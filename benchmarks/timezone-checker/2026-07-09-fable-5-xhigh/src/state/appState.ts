import { useEffect, useReducer } from 'react';
import type { AppState, Mode, TimeFormat } from '../types';
import { CITY_BY_ID, DEFAULT_CITY_IDS } from '../data/cities';

const STORAGE_KEY = 'claude-fable-5.timezone-overlap.v1';

export const DEFAULT_STATE: AppState = {
  cityIds: [...DEFAULT_CITY_IDS],
  mode: 'meeting',
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
};

export type Action =
  | { type: 'addCity'; cityId: string }
  | { type: 'removeCity'; cityId: string }
  | { type: 'setReference'; cityId: string }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setWakeHour'; hour: number }
  | { type: 'setSleepHour'; hour: number }
  | { type: 'setTimeFormat'; format: TimeFormat };

function isValidHour(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'addCity':
      if (!CITY_BY_ID.has(action.cityId) || state.cityIds.includes(action.cityId)) return state;
      return { ...state, cityIds: [...state.cityIds, action.cityId] };
    case 'removeCity':
      return { ...state, cityIds: state.cityIds.filter((id) => id !== action.cityId) };
    case 'setReference':
      if (!state.cityIds.includes(action.cityId)) return state;
      return { ...state, cityIds: [action.cityId, ...state.cityIds.filter((id) => id !== action.cityId)] };
    case 'setMode':
      return { ...state, mode: action.mode };
    case 'setWakeHour':
      return isValidHour(action.hour) ? { ...state, wakeHour: action.hour } : state;
    case 'setSleepHour':
      return isValidHour(action.hour) ? { ...state, sleepHour: action.hour } : state;
    case 'setTimeFormat':
      return { ...state, timeFormat: action.format };
  }
}

/** Validate persisted state field by field; anything malformed falls back to defaults. */
function sanitize(raw: unknown): AppState {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_STATE };
  const record = raw as Record<string, unknown>;
  const cityIds = Array.isArray(record.cityIds)
    ? [...new Set(record.cityIds.filter((id): id is string => typeof id === 'string' && CITY_BY_ID.has(id)))]
    : [...DEFAULT_CITY_IDS];
  return {
    cityIds,
    mode: record.mode === 'base' ? 'base' : 'meeting',
    wakeHour: isValidHour(record.wakeHour) ? record.wakeHour : DEFAULT_STATE.wakeHour,
    sleepHour: isValidHour(record.sleepHour) ? record.sleepHour : DEFAULT_STATE.sleepHour,
    timeFormat: record.timeFormat === '24h' ? '24h' : '12h',
  };
}

function loadInitialState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return { ...DEFAULT_STATE };
    return sanitize(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, null, loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable (private mode, quota) — the app works, it just won't persist.
    }
  }, [state]);

  return { state, dispatch };
}
