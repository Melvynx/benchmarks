export type AppState = {
  cityIds: string[];
  mode: "meeting" | "base";
  wakeUp: number;
  sleepAt: number;
  use12h: boolean;
};

const STORAGE_KEY = "tz-checker-state";

export const DEFAULTS: AppState = {
  cityIds: ["san-francisco", "denpasar", "geneva"],
  mode: "meeting",
  wakeUp: 7,
  sleepAt: 23,
  use12h: true,
};

export function loadState(): AppState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable
  }
}
