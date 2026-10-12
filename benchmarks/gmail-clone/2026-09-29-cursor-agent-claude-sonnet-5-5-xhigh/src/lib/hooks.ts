import { useEffect, useState, useSyncExternalStore } from 'react';

export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useIsMobile(): boolean {
  return useMedia('(max-width: 700px)');
}

export function useIsCompact(): boolean {
  return useMedia('(max-width: 960px)');
}

export function useIsWide(): boolean {
  return useMedia('(min-width: 1180px)');
}
