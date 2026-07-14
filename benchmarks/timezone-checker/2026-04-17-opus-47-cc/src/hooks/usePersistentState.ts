import { useEffect, useRef, useState } from "react";

/**
 * A useState-like hook that mirrors its value into localStorage under `key`.
 * Reads on mount, writes on every change. Silently ignores storage errors so
 * private-mode / quota failures never crash the app.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  validate?: (raw: unknown) => T | undefined,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed = JSON.parse(raw);
      if (validate) {
        const validated = validate(parsed);
        return validated === undefined ? initial : validated;
      }
      return parsed as T;
    } catch {
      return initial;
    }
  });

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / private-mode errors
    }
  }, [key, value]);

  return [value, setValue];
}
