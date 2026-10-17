import { DEFAULT_CITY_IDS, getCity } from "@/lib/cities";
import type { TimeFormat } from "@/lib/format";
import type { Mode } from "@/lib/overlap";

export interface Preferences {
  /** Ordered city list; the first entry is the reference city. */
  cityIds: string[];
  mode: Mode;
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
}

export const DEFAULT_PREFERENCES: Preferences = {
  cityIds: [...DEFAULT_CITY_IDS],
  mode: "meeting",
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: "12h",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isHour = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23;

/** Field-by-field validation of persisted data; anything unusable falls back to its default. */
export function sanitizePreferences(raw: unknown): Preferences {
  const value = isRecord(raw) ? raw : {};
  const defaults = DEFAULT_PREFERENCES;

  const cityIds = Array.isArray(value.cityIds)
    ? [...new Set(value.cityIds.filter((id): id is string => typeof id === "string" && Boolean(getCity(id))))]
    : [...defaults.cityIds];

  return {
    cityIds,
    mode: value.mode === "meeting" || value.mode === "base" ? value.mode : defaults.mode,
    wakeHour: isHour(value.wakeHour) ? value.wakeHour : defaults.wakeHour,
    sleepHour: isHour(value.sleepHour) ? value.sleepHour : defaults.sleepHour,
    timeFormat: value.timeFormat === "12h" || value.timeFormat === "24h" ? value.timeFormat : defaults.timeFormat,
  };
}
