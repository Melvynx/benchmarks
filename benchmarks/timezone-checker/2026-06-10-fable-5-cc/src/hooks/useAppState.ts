import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { DEFAULT_STATE, sanitizeState, type AppState } from '../lib/appState';

const STORAGE_KEY = 'fable-5-timezone-checker:v1';

/** App state backed by localStorage — a fresh browser session starts with the defaults. */
export function useAppState(): [AppState, Dispatch<SetStateAction<AppState>>] {
  const [state, setState] = useState<AppState>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return sanitizeState(JSON.parse(raw));
    } catch {
      // Corrupted or inaccessible storage — fall through to defaults.
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be unavailable (private mode); the app still works in-memory.
    }
  }, [state]);

  return [state, setState];
}
