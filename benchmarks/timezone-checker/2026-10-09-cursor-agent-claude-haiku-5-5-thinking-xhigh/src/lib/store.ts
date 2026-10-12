import { useSyncExternalStore } from "react";
import {
  DEFAULT_STATE,
  STORAGE_KEY,
  addCity,
  parseAppState,
  promoteCity,
  removeCity,
  setMode,
  updateSettings,
  type AppSettings,
  type AppState,
  type Mode,
} from "./app-state";

let snapshot: AppState | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? DEFAULT_STATE : parseAppState(JSON.parse(raw));
  } catch {
    return DEFAULT_STATE;
  }
}

function getSnapshot(): AppState {
  snapshot ??= readFromStorage();
  return snapshot;
}

function getServerSnapshot(): AppState {
  return DEFAULT_STATE;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);

  // Keep other tabs in sync when this key changes elsewhere.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      snapshot = readFromStorage();
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(next: AppState): void {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage disabled or full: keep the in-memory state so the app still works.
  }
  listeners.forEach((listener) => listener());
}

function transition(reducer: (state: AppState) => AppState): void {
  const current = getSnapshot();
  const next = reducer(current);
  if (next !== current) commit(next);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Mutations are plain functions so they can be called from event handlers. */
export const appActions = {
  addCity: (cityId: string) => transition((state) => addCity(state, cityId)),
  removeCity: (cityId: string) => transition((state) => removeCity(state, cityId)),
  promoteCity: (cityId: string) => transition((state) => promoteCity(state, cityId)),
  setMode: (mode: Mode) => transition((state) => setMode(state, mode)),
  updateSettings: (patch: Partial<AppSettings>) =>
    transition((state) => updateSettings(state, patch)),
};
