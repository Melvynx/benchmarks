import { useEffect, useState } from 'react'

const MINUTE = 60_000

/** Current time, refreshed on every minute boundary and when the tab becomes visible again. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: number
    const schedule = () => {
      timer = window.setTimeout(() => {
        setNow(new Date())
        schedule()
      }, MINUTE - (Date.now() % MINUTE) + 50)
    }
    const refresh = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }
    schedule()
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return now
}
