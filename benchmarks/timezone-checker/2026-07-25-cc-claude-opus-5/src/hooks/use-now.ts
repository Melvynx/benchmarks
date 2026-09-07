import { useEffect, useState } from 'react'

/**
 * A clock that re-renders on the minute boundary. Keeps the "now" marker and
 * every DST-derived offset honest without polling every second.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timeout: number
    const schedule = () => {
      const msToNextMinute = 60_000 - (Date.now() % 60_000)
      timeout = window.setTimeout(() => {
        setNow(new Date())
        schedule()
      }, msToNextMinute + 50)
    }
    schedule()
    return () => window.clearTimeout(timeout)
  }, [])

  return now
}
