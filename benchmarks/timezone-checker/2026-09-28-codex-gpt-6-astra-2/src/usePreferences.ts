import { useEffect, useState } from 'react';
import { CITIES, DEFAULT_CITIES } from './cities';
import type { Mode, Settings } from './time';

export interface Preferences { cityIds: string[]; mode: Mode; settings: Settings }
export const STORAGE_KEY = 'gpt-6-overlap-v1';
export const DEFAULT_PREFERENCES: Preferences = {
  cityIds: DEFAULT_CITIES, mode: 'meeting', settings: { wake: 7, sleep: 23, format: '12h' },
};

export function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return DEFAULT_PREFERENCES;
    const validHour = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23;
    return {
      cityIds: Array.isArray(saved.cityIds) ? [...new Set<string>(saved.cityIds.filter((id: unknown) => CITIES.some(city => city.id === id)))] : DEFAULT_CITIES,
      mode: saved.mode === 'base' ? 'base' : 'meeting',
      settings: {
        wake: validHour(saved.settings?.wake) ? saved.settings.wake : 7,
        sleep: validHour(saved.settings?.sleep) ? saved.settings.sleep : 23,
        format: saved.settings?.format === '24h' ? '24h' : '12h',
      },
    };
  } catch { return DEFAULT_PREFERENCES; }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      setStorageAvailable(true);
    } catch { setStorageAvailable(false); }
  }, [preferences]);
  return { preferences, setPreferences, storageAvailable };
}
