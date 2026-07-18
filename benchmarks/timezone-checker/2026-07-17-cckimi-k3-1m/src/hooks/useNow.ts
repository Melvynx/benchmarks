import { useEffect, useState } from 'react';

/**
 * Ticking clock (ms timestamp) that refreshes on an interval and whenever
 * the tab becomes visible again, so live clocks/offsets never go stale.
 */
export function useNow(intervalMs = 20000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    const onVisible = () => {
      if (!document.hidden) setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return now;
}
