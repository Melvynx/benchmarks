import { useEffect, useState } from 'react';
import { AppMode, AvailabilitySettings, PersistedState } from '../types';
import { CITY_BY_ID, DEFAULT_CITY_IDS } from '../data/cities';

const STORAGE_KEY = 'timezone-overlap-checker:v1';

export const DEFAULT_SETTINGS: AvailabilitySettings = {
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
};

export const DEFAULT_STATE: PersistedState = {
  cityIds: DEFAULT_CITY_IDS,
  mode: 'meeting',
  settings: DEFAULT_SETTINGS,
};

function loadInitialState(): PersistedState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;

    // Validate cityIds against catalog & deduplicate
    const validCityIds: string[] = [];
    if (Array.isArray(parsed.cityIds)) {
      for (const id of parsed.cityIds) {
        if (typeof id === 'string' && CITY_BY_ID.has(id) && !validCityIds.includes(id)) {
          validCityIds.push(id);
        }
      }
    }

    const mode: AppMode =
      parsed.mode === 'base' || parsed.mode === 'meeting' ? parsed.mode : 'meeting';

    const wakeHour =
      typeof parsed.settings?.wakeHour === 'number' &&
      parsed.settings.wakeHour >= 0 &&
      parsed.settings.wakeHour <= 23
        ? Math.floor(parsed.settings.wakeHour)
        : DEFAULT_SETTINGS.wakeHour;

    const sleepHour =
      typeof parsed.settings?.sleepHour === 'number' &&
      parsed.settings.sleepHour >= 0 &&
      parsed.settings.sleepHour <= 23
        ? Math.floor(parsed.settings.sleepHour)
        : DEFAULT_SETTINGS.sleepHour;

    const timeFormat =
      parsed.settings?.timeFormat === '24h' || parsed.settings?.timeFormat === '12h'
        ? parsed.settings.timeFormat
        : DEFAULT_SETTINGS.timeFormat;

    return {
      cityIds: Array.isArray(parsed.cityIds) ? validCityIds : DEFAULT_CITY_IDS,
      mode,
      settings: {
        wakeHour,
        sleepHour,
        timeFormat,
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useScheduleState() {
  const [state, setState] = useState<PersistedState>(loadInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const setMode = (mode: AppMode) => {
    setState((prev) => ({ ...prev, mode }));
  };

  const updateSettings = (partial: Partial<AvailabilitySettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
    }));
  };

  const addCity = (cityId: string) => {
    if (!CITY_BY_ID.has(cityId)) return;
    setState((prev) => {
      if (prev.cityIds.includes(cityId)) return prev;
      return {
        ...prev,
        cityIds: [...prev.cityIds, cityId],
      };
    });
  };

  const removeCity = (cityId: string) => {
    setState((prev) => ({
      ...prev,
      cityIds: prev.cityIds.filter((id) => id !== cityId),
    }));
  };

  const promoteCityToRef = (cityId: string) => {
    setState((prev) => {
      const idx = prev.cityIds.indexOf(cityId);
      if (idx <= 0) return prev; // already first or not found
      const nextIds = [cityId, ...prev.cityIds.filter((id) => id !== cityId)];
      return {
        ...prev,
        cityIds: nextIds,
      };
    });
  };

  const resetToDefaults = () => {
    setState(DEFAULT_STATE);
  };

  return {
    state,
    setMode,
    updateSettings,
    addCity,
    removeCity,
    promoteCityToRef,
    resetToDefaults,
  };
}
