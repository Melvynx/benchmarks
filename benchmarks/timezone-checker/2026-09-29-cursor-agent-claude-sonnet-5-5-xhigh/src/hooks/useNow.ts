import { useEffect, useState } from 'react'

/** Current date, refreshed on an interval so offsets follow DST changes and the "now" marker stays accurate. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
