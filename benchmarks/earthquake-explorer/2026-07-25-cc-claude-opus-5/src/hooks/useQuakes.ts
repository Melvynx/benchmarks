import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchFeed, type FeedLevel, type FeedWindow, type Quake } from '../lib/usgs'

const REFRESH_MS = 60_000

interface FeedState {
  quakes: Quake[]
  loading: boolean
  error: string | null
  /** When USGS generated the feed we are currently showing. */
  updatedAt: number | null
}

export function useQuakes(level: FeedLevel, window: FeedWindow) {
  const [state, setState] = useState<FeedState>({
    quakes: [],
    loading: true,
    error: null,
    updatedAt: null,
  })
  const controllerRef = useRef<AbortController | null>(null)

  const load = useCallback(
    async (options: { silent?: boolean } = {}) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setState((s) => ({
        ...s,
        loading: true,
        error: options.silent ? s.error : null,
        // A feed switch clears the old points; a background refresh keeps them.
        quakes: options.silent ? s.quakes : [],
      }))

      try {
        const feed = await fetchFeed(level, window, controller.signal)
        if (controller.signal.aborted) return
        setState({
          quakes: feed.quakes,
          loading: false,
          error: null,
          updatedAt: feed.generated,
        })
      } catch (err) {
        if (controller.signal.aborted || (err as Error).name === 'AbortError') return
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Could not reach the USGS feed',
        }))
      }
    },
    [level, window],
  )

  useEffect(() => {
    void load()
    return () => controllerRef.current?.abort()
  }, [load])

  // Quiet background refresh so the map keeps up with new events.
  useEffect(() => {
    const id = setInterval(() => void load({ silent: true }), REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  const refresh = useCallback(() => void load({ silent: true }), [load])

  return { ...state, refresh }
}

/** A clock that advances often enough for relative times to stay honest. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
