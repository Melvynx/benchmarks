import { useEffect, useState } from 'react';

import { CITY_BY_ID, DEFAULT_CITY_IDS } from '../data/cities';
import type { AppState } from '../types';

const STORAGE_KEY = 'timezone-overlap-checker:v1';

export const DEFAULT_APP_STATE: AppState = {
  version: 1,
  cityIds: [...DEFAULT_CITY_IDS],
  mode: 'meeting',
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
};

function isValidHour(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 23;
}

function sanitizeState(value: unknown): AppState {
  if (!value || typeof value !== 'object') return DEFAULT_APP_STATE;

  const candidate = value as Partial<AppState>;
  const validCityIds = Array.isArray(candidate.cityIds)
    ? [...new Set(candidate.cityIds.filter((id): id is string => typeof id === 'string'))].filter(
        (id) => CITY_BY_ID.has(id),
      )
    : DEFAULT_APP_STATE.cityIds;

  return {
    version: 1,
    cityIds: validCityIds,
    mode: candidate.mode === 'base' ? 'base' : 'meeting',
    wakeHour: isValidHour(candidate.wakeHour) ? candidate.wakeHour : DEFAULT_APP_STATE.wakeHour,
    sleepHour: isValidHour(candidate.sleepHour)
      ? candidate.sleepHour
      : DEFAULT_APP_STATE.sleepHour,
    timeFormat: candidate.timeFormat === '24h' ? '24h' : '12h',
  };
}

function readInitialState(): AppState {
  try {
    const savedState = window.localStorage.getItem(STORAGE_KEY);
    return savedState ? sanitizeState(JSON.parse(savedState) as unknown) : DEFAULT_APP_STATE;
  } catch {
    return DEFAULT_APP_STATE;
  }
}

export function usePersistentAppState() {
  const [state, setState] = useState<AppState>(readInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The app remains fully usable when storage is blocked or unavailable.
    }
  }, [state]);

  return [state, setState] as const;
}
