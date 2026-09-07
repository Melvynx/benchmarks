import { useEffect, useState } from 'react'

/** A clock that ticks slowly, so relative timestamps stay honest. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    const onFocus = () => setNow(Date.now())
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [intervalMs])
  return now
}
