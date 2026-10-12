import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const MOBILE_QUERY = '(max-width: 720px)';
export const TABLET_QUERY = '(max-width: 1100px)';

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}

/** Re-renders periodically so relative times and snooze states stay fresh. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useOutsideClick<T extends HTMLElement>(onOutside: () => void, active = true) {
  const ref = useRef<T>(null);
  const cb = useRef(onOutside);
  cb.current = onOutside;
  useEffect(() => {
    if (!active) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb.current();
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [active]);
  return ref;
}

export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (...args: A) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => latest.current(...args), ms);
  };
}

export function useSystemDark() {
  return useMediaQuery('(prefers-color-scheme: dark)');
}
