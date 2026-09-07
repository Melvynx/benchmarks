import { useEffect, useState } from "react";

/**
 * A clock that ticks on the minute. Every offset in the app is derived from
 * this instant, so DST changes and the "now" marker stay honest without a
 * refresh.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: number;
    const tick = () => {
      // Align to the next minute boundary rather than drifting by 60s steps.
      const delay = 60_000 - (Date.now() % 60_000) + 150;
      timer = window.setTimeout(() => {
        setNow(new Date());
        tick();
      }, delay);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  return now;
}
