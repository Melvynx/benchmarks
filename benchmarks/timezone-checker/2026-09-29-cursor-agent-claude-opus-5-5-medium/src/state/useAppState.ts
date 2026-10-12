import { useEffect, useMemo, useReducer } from "react";
import { getCity } from "../lib/cities";
import type { AppState, City, Mode, Settings } from "../types";

const STORAGE_KEY = "tz-overlap:v1";

export const DEFAULT_STATE: AppState = {
  cityIds: ["san-francisco", "denpasar", "geneva"],
  mode: "meeting",
  settings: { wakeHour: 7, sleepHour: 23, timeFormat: "12h" },
};

type Action =
  | { type: "add"; id: string }
  | { type: "remove"; id: string }
  | { type: "promote"; id: string }
  | { type: "mode"; mode: Mode }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "reset" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "add":
      if (!getCity(action.id) || state.cityIds.includes(action.id)) return state;
      return { ...state, cityIds: [...state.cityIds, action.id] };
    case "remove":
      return { ...state, cityIds: state.cityIds.filter((id) => id !== action.id) };
    case "promote":
      if (!state.cityIds.includes(action.id)) return state;
      return { ...state, cityIds: [action.id, ...state.cityIds.filter((id) => id !== action.id)] };
    case "mode":
      return { ...state, mode: action.mode };
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "reset":
      return DEFAULT_STATE;
  }
}

const isHour = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23;

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const settings: Partial<Settings> = parsed.settings ?? {};
    const cityIds = Array.isArray(parsed.cityIds)
      ? [...new Set(parsed.cityIds.filter((id): id is string => typeof id === "string" && !!getCity(id)))]
      : DEFAULT_STATE.cityIds;
    return {
      cityIds,
      mode: parsed.mode === "base" || parsed.mode === "meeting" ? parsed.mode : DEFAULT_STATE.mode,
      settings: {
        wakeHour: isHour(settings.wakeHour) ? settings.wakeHour : DEFAULT_STATE.settings.wakeHour,
        sleepHour: isHour(settings.sleepHour) ? settings.sleepHour : DEFAULT_STATE.settings.sleepHour,
        timeFormat:
          settings.timeFormat === "12h" || settings.timeFormat === "24h"
            ? settings.timeFormat
            : DEFAULT_STATE.settings.timeFormat,
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable (private mode quota, disabled cookies): state stays in memory.
    }
  }, [state]);

  const cities = useMemo(
    () => state.cityIds.map(getCity).filter((city): city is City => !!city),
    [state.cityIds],
  );

  const actions = useMemo(
    () => ({
      addCity: (id: string) => dispatch({ type: "add", id }),
      removeCity: (id: string) => dispatch({ type: "remove", id }),
      promoteCity: (id: string) => dispatch({ type: "promote", id }),
      setMode: (mode: Mode) => dispatch({ type: "mode", mode }),
      updateSettings: (patch: Partial<Settings>) => dispatch({ type: "settings", patch }),
      reset: () => dispatch({ type: "reset" }),
    }),
    [],
  );

  return { state, cities, ...actions };
}
