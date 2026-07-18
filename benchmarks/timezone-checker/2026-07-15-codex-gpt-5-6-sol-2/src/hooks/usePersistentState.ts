import { useEffect, useState } from "react";
import { CITY_BY_ID, DEFAULT_CITY_IDS } from "../data/cities";
import type { Mode, TimeFormat } from "../lib/timezone";

export type AppState = {
  cityIds: string[];
  mode: Mode;
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
};

const STORAGE_KEY = "gpt-5-6-sol:timezone-checker:v1";

export const DEFAULT_STATE: AppState = {
  cityIds: DEFAULT_CITY_IDS,
  mode: "meeting",
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: "12h",
};

function validHour(value: unknown, fallback: number) {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 23
    ? Number(value)
    : fallback;
}

function restoreState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const cityIds = Array.isArray(parsed.cityIds)
      ? [...new Set(parsed.cityIds.filter((id): id is string => typeof id === "string" && CITY_BY_ID.has(id)))]
      : DEFAULT_STATE.cityIds;
    return {
      cityIds,
      mode: parsed.mode === "base" ? "base" : "meeting",
      wakeHour: validHour(parsed.wakeHour, DEFAULT_STATE.wakeHour),
      sleepHour: validHour(parsed.sleepHour, DEFAULT_STATE.sleepHour),
      timeFormat: parsed.timeFormat === "24h" ? "24h" : "12h",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function usePersistentState() {
  const [state, setState] = useState<AppState>(restoreState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The app remains usable when storage is unavailable.
    }
  }, [state]);

  return [state, setState] as const;
}
