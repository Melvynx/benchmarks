import { useEffect, useState } from 'react'

/** Current time, refreshed on every minute boundary and when the tab becomes visible again. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: number | undefined
    const tick = () => {
      setNow(new Date())
      schedule()
    }
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 25)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick()
    }

    schedule()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return now
}
