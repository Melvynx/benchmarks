import { useCallback, useEffect, useState } from 'react';
import { cityById, DEFAULT_CITY_IDS } from '../data/cities';
import type { Mode } from '../lib/overlap';
import type { TimeFormat } from '../lib/time';

export interface AppState {
  cityIds: string[];
  mode: Mode;
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
}

const STORAGE_KEY = 'tz-overlap-checker/v1';

const DEFAULT_STATE: AppState = {
  cityIds: DEFAULT_CITY_IDS,
  mode: 'meeting',
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
};

const isValidHour = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 23;

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const cityIds = Array.isArray(parsed.cityIds)
      ? [...new Set(parsed.cityIds.filter((id) => cityById.has(id)))]
      : DEFAULT_STATE.cityIds;
    return {
      cityIds: cityIds.length > 0 ? cityIds : DEFAULT_STATE.cityIds,
      mode: parsed.mode === 'base' ? 'base' : 'meeting',
      wakeHour: isValidHour(parsed.wakeHour) ? parsed.wakeHour : DEFAULT_STATE.wakeHour,
      sleepHour: isValidHour(parsed.sleepHour) ? parsed.sleepHour : DEFAULT_STATE.sleepHour,
      timeFormat: parsed.timeFormat === '24h' ? '24h' : '12h',
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable (private mode quota, etc.) — state stays in memory.
    }
  }, [state]);

  const addCity = useCallback((id: string) => {
    setState((s) => (s.cityIds.includes(id) ? s : { ...s, cityIds: [...s.cityIds, id] }));
  }, []);

  const removeCity = useCallback((id: string) => {
    setState((s) => ({ ...s, cityIds: s.cityIds.filter((c) => c !== id) }));
  }, []);

  const promoteCity = useCallback((id: string) => {
    setState((s) =>
      s.cityIds[0] === id || !s.cityIds.includes(id)
        ? s
        : { ...s, cityIds: [id, ...s.cityIds.filter((c) => c !== id)] },
    );
  }, []);

  const setMode = useCallback((mode: Mode) => setState((s) => ({ ...s, mode })), []);
  const setWakeHour = useCallback((wakeHour: number) => setState((s) => ({ ...s, wakeHour })), []);
  const setSleepHour = useCallback(
    (sleepHour: number) => setState((s) => ({ ...s, sleepHour })),
    [],
  );
  const setTimeFormat = useCallback(
    (timeFormat: TimeFormat) => setState((s) => ({ ...s, timeFormat })),
    [],
  );

  return { state, addCity, removeCity, promoteCity, setMode, setWakeHour, setSleepHour, setTimeFormat };
}
