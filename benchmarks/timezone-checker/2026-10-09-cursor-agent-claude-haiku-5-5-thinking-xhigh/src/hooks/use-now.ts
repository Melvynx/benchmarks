import { useEffect, useState } from "react";

/**
 * Current time, refreshed on an interval so offsets and "now" markers stay
 * correct across DST changes in long-lived tabs. Only call from client-only
 * components: the initial value reads the clock.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
