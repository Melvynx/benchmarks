import { useCallback, useEffect, useMemo, useState } from "react";
import { CITY_CATALOG, DEFAULT_CITY_IDS, getCityById } from "../data/cities";
import type { AppMode } from "../lib/timeEngine";
import { computeGrid } from "../lib/timeEngine";

const STORAGE_KEY = "tz-overlap-composer-v1";

export interface PersistedShape {
  cityIds: string[];
  mode: AppMode;
  wakeHour: number;
  sleepHour: number;
  use12h: boolean;
}

const defaultPersisted: PersistedShape = {
  cityIds: [...DEFAULT_CITY_IDS],
  mode: "meeting",
  wakeHour: 7,
  sleepHour: 23,
  use12h: true,
};

function load(): PersistedShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPersisted;
    const p = JSON.parse(raw) as Partial<PersistedShape>;
    const cityIds = Array.isArray(p.cityIds)
      ? p.cityIds.filter((id) => getCityById(id))
      : defaultPersisted.cityIds;
    return {
      cityIds: cityIds.length ? cityIds : [...DEFAULT_CITY_IDS],
      mode: p.mode === "base" ? "base" : "meeting",
      wakeHour:
        typeof p.wakeHour === "number" && p.wakeHour >= 0 && p.wakeHour <= 23
          ? p.wakeHour
          : defaultPersisted.wakeHour,
      sleepHour:
        typeof p.sleepHour === "number" && p.sleepHour >= 0 && p.sleepHour <= 23
          ? p.sleepHour
          : defaultPersisted.sleepHour,
      use12h: typeof p.use12h === "boolean" ? p.use12h : defaultPersisted.use12h,
    };
  } catch {
    return defaultPersisted;
  }
}

function save(p: PersistedShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function useAppState() {
  const [persisted, setPersisted] = useState<PersistedShape>(() =>
    typeof window === "undefined" ? defaultPersisted : load(),
  );

  useEffect(() => {
    save(persisted);
  }, [persisted]);

  const cities = useMemo(() => {
    return persisted.cityIds
      .map((id) => getCityById(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }, [persisted.cityIds]);

  const refCity = cities[0];
  const setMode = useCallback((mode: AppMode) => {
    setPersisted((s) => ({ ...s, mode }));
  }, []);

  const setWakeHour = useCallback((wakeHour: number) => {
    setPersisted((s) => ({ ...s, wakeHour }));
  }, []);

  const setSleepHour = useCallback((sleepHour: number) => {
    setPersisted((s) => ({ ...s, sleepHour }));
  }, []);

  const setUse12h = useCallback((use12h: boolean) => {
    setPersisted((s) => ({ ...s, use12h }));
  }, []);

  const addCity = useCallback((id: string) => {
    setPersisted((s) => {
      if (s.cityIds.includes(id)) return s;
      return { ...s, cityIds: [...s.cityIds, id] };
    });
  }, []);

  const removeCity = useCallback((id: string) => {
    setPersisted((s) => {
      if (s.cityIds.length <= 1) return s;
      return { ...s, cityIds: s.cityIds.filter((x) => x !== id) };
    });
  }, []);

  const promoteToReference = useCallback((id: string) => {
    setPersisted((s) => {
      if (!s.cityIds.includes(id)) return s;
      const rest = s.cityIds.filter((x) => x !== id);
      return { ...s, cityIds: [id, ...rest] };
    });
  }, []);

  const grid = useMemo(() => {
    if (!refCity || cities.length === 0) return null;
    return computeGrid(
      cities,
      refCity,
      persisted.mode,
      persisted.wakeHour,
      persisted.sleepHour,
    );
  }, [
    cities,
    refCity,
    persisted.mode,
    persisted.wakeHour,
    persisted.sleepHour,
  ]);

  return {
    persisted,
    cities,
    refCity,
    grid,
    catalog: CITY_CATALOG,
    setMode,
    setWakeHour,
    setSleepHour,
    setUse12h,
    addCity,
    removeCity,
    promoteToReference,
  };
}
