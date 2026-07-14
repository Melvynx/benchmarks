import { useCallback, useEffect, useMemo, useState } from "react";
import { CITY_BY_ID, DEFAULT_CITY_IDS } from "./data/cities";
import type { TimeFormat } from "./lib/format";
import type { Mode } from "./lib/overlap";

const STORAGE_KEY = "tz-overlap-checker:v1";

export interface AppState {
  cityIds: string[];
  mode: Mode;
  wake: number;
  sleep: number;
  timeFormat: TimeFormat;
}

const DEFAULT_STATE: AppState = {
  cityIds: DEFAULT_CITY_IDS,
  mode: "meeting",
  wake: 7,
  sleep: 23,
  timeFormat: "12h",
};

function clampHour(n: unknown, fallback: number): number {
  const v = Math.trunc(Number(n));
  return Number.isFinite(v) && v >= 0 && v <= 23 ? v : fallback;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;

    // Keep only known cities, drop duplicates, preserve order.
    const seen = new Set<string>();
    const cityIds = (Array.isArray(parsed.cityIds) ? parsed.cityIds : [])
      .filter((id) => typeof id === "string" && CITY_BY_ID[id] && !seen.has(id) && seen.add(id));

    return {
      cityIds: cityIds.length ? cityIds : DEFAULT_STATE.cityIds,
      mode: parsed.mode === "base" ? "base" : "meeting",
      wake: clampHour(parsed.wake, DEFAULT_STATE.wake),
      sleep: clampHour(parsed.sleep, DEFAULT_STATE.sleep),
      timeFormat: parsed.timeFormat === "24h" ? "24h" : "12h",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [state]);

  const addCity = useCallback((id: string) => {
    setState((s) => (s.cityIds.includes(id) ? s : { ...s, cityIds: [...s.cityIds, id] }));
  }, []);

  const removeCity = useCallback((id: string) => {
    setState((s) => ({ ...s, cityIds: s.cityIds.filter((c) => c !== id) }));
  }, []);

  /** Promote a city to reference: move it to the front of the list. */
  const setReference = useCallback((id: string) => {
    setState((s) => {
      if (!s.cityIds.includes(id) || s.cityIds[0] === id) return s;
      return { ...s, cityIds: [id, ...s.cityIds.filter((c) => c !== id)] };
    });
  }, []);

  const setMode = useCallback((mode: Mode) => setState((s) => ({ ...s, mode })), []);
  const setWake = useCallback((wake: number) => setState((s) => ({ ...s, wake })), []);
  const setSleep = useCallback((sleep: number) => setState((s) => ({ ...s, sleep })), []);
  const setTimeFormat = useCallback(
    (timeFormat: TimeFormat) => setState((s) => ({ ...s, timeFormat })),
    [],
  );

  const cities = useMemo(
    () => state.cityIds.map((id) => CITY_BY_ID[id]).filter(Boolean),
    [state.cityIds],
  );

  return {
    state,
    cities,
    addCity,
    removeCity,
    setReference,
    setMode,
    setWake,
    setSleep,
    setTimeFormat,
  };
}
