export type Mode = "meeting" | "base";
export type TimeFormat = "12h" | "24h";

export interface AppState {
  cityIds: string[];
  mode: Mode;
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
}

const STORAGE_KEY = "tz-checker-state";

export const DEFAULT_STATE: AppState = {
  cityIds: ["san-francisco", "denpasar", "geneva"],
  mode: "meeting",
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: "12h",
};

export function loadState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    const parsed = JSON.parse(stored);
    return {
      cityIds: Array.isArray(parsed.cityIds) ? parsed.cityIds : DEFAULT_STATE.cityIds,
      mode: parsed.mode === "base" ? "base" : "meeting",
      wakeHour: typeof parsed.wakeHour === "number" ? parsed.wakeHour : DEFAULT_STATE.wakeHour,
      sleepHour: typeof parsed.sleepHour === "number" ? parsed.sleepHour : DEFAULT_STATE.sleepHour,
      timeFormat: parsed.timeFormat === "24h" ? "24h" : "12h",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}
