import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * useState persisted to localStorage. `revive` validates/sanitizes whatever
 * was stored so corrupt or outdated payloads fall back to safe defaults.
 */
export function usePersistentState<T>(
  key: string,
  fallback: T,
  revive: (raw: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return revive(JSON.parse(raw));
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable (private mode, quota) — state still works in-memory
    }
  }, [key, value]);

  return [value, setValue];
}
