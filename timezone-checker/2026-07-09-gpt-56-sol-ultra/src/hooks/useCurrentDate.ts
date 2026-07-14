import { useEffect, useState } from 'react';

const REFRESH_INTERVAL_MS = 60_000;

export function useCurrentDate(): Date {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const refreshDate = () => setCurrentDate(new Date());
    const intervalId = window.setInterval(refreshDate, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshDate);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshDate);
    };
  }, []);

  return currentDate;
}
