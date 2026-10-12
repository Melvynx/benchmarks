import { useEffect, useMemo, useState } from "react";
import { CITIES, DEFAULT_CITY_IDS } from "./cities";
import type { HourFormat, Mode, Settings } from "./time";

const KEY = "tz-overlap:v1";

interface State {
  cityIds: string[];
  settings: Settings;
  mode: Mode;
}

const DEFAULTS: State = {
  cityIds: DEFAULT_CITY_IDS,
  settings: { wake: 7, sleep: 23, format: "12h" },
  mode: "meeting",
};

const hour = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 23 ? v : fallback;

function load(): State {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return DEFAULTS;
    const valid = new Set(CITIES.map((c) => c.id));
    const ids: string[] = Array.isArray(raw.cityIds)
      ? [...new Set<string>(raw.cityIds.filter((id: unknown): id is string => typeof id === "string" && valid.has(id)))]
      : DEFAULTS.cityIds;
    return {
      cityIds: ids,
      mode: raw.mode === "base" ? "base" : "meeting",
      settings: {
        wake: hour(raw.settings?.wake, 7),
        sleep: hour(raw.settings?.sleep, 23),
        format: raw.settings?.format === "24h" ? "24h" : "12h",
      },
    };
  } catch {
    return DEFAULTS;
  }
}

export function useStore() {
  const [state, setState] = useState<State>(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  return useMemo(
    () => ({
      ...state,
      setMode: (mode: Mode) => setState((s) => ({ ...s, mode })),
      setWake: (wake: number) => setState((s) => ({ ...s, settings: { ...s.settings, wake } })),
      setSleep: (sleep: number) => setState((s) => ({ ...s, settings: { ...s.settings, sleep } })),
      setFormat: (format: HourFormat) => setState((s) => ({ ...s, settings: { ...s.settings, format } })),
      addCity: (id: string) =>
        setState((s) => (s.cityIds.includes(id) ? s : { ...s, cityIds: [...s.cityIds, id] })),
      removeCity: (id: string) => setState((s) => ({ ...s, cityIds: s.cityIds.filter((c) => c !== id) })),
      promote: (id: string) =>
        setState((s) => ({ ...s, cityIds: [id, ...s.cityIds.filter((c) => c !== id)] })),
    }),
    [state],
  );
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    mq.addEventListener("change", on);
    on();
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}
