import { useEffect, useState } from 'react';

/**
 * Current time, refreshed on an interval — keeps the local clocks, the "now"
 * marker and the DST-derived offsets live while the app stays open.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
