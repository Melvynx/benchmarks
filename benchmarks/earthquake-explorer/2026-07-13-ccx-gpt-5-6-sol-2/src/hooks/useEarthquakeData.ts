import { useCallback, useEffect, useRef, useState } from 'react'
import { FEED_URLS, parseCollection } from '../lib/earthquakes'
import type { Earthquake, TimeRange } from '../types/earthquake'

interface EarthquakeDataState {
  events: Earthquake[]
  generatedAt: number | null
  receivedAt: number | null
  loading: boolean
  refreshing: boolean
  error: string | null
}

const CACHE_KEY = 'tectonic:last-data'

function cacheKey(timeRange: TimeRange): string {
  return `${CACHE_KEY}:${timeRange}`
}

function readCache(timeRange: TimeRange): Pick<EarthquakeDataState, 'events' | 'generatedAt' | 'receivedAt'> | null {
  try {
    const raw = localStorage.getItem(cacheKey(timeRange))
    if (!raw) return null
    const cached = JSON.parse(raw) as Pick<EarthquakeDataState, 'events' | 'generatedAt' | 'receivedAt'>
    return Array.isArray(cached.events) ? cached : null
  } catch {
    return null
  }
}

export function useEarthquakeData(timeRange: TimeRange) {
  const [state, setState] = useState<EarthquakeDataState>(() => {
    const cached = readCache(timeRange)
    return {
      events: cached?.events ?? [],
      generatedAt: cached?.generatedAt ?? null,
      receivedAt: cached?.receivedAt ?? null,
      loading: !cached,
      refreshing: false,
      error: null,
    }
  })
  const requestRef = useRef<AbortController | null>(null)
  const firstLoadRef = useRef(true)

  const load = useCallback(async (background = false) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setState((current) => ({
      ...current,
      loading: !background && current.events.length === 0,
      refreshing: background || current.events.length > 0,
      error: null,
    }))

    try {
      const response = await fetch(FEED_URLS[timeRange], {
        signal: controller.signal,
        headers: { Accept: 'application/geo+json, application/json' },
      })
      if (!response.ok) throw new Error(`USGS request failed with status ${response.status}.`)
      const parsed = parseCollection(await response.json())
      const receivedAt = Date.now()
      const next = { ...parsed, receivedAt }
      try {
        localStorage.setItem(cacheKey(timeRange), JSON.stringify(next))
      } catch {
        // Large 30-day feeds can exceed storage quotas; live data remains available in memory.
      }
      setState({ ...next, loading: false, refreshing: false, error: null })
    } catch (error) {
      if (controller.signal.aborted) return
      setState((current) => ({
        ...current,
        loading: false,
        refreshing: false,
        error: error instanceof Error ? error.message : 'Live USGS data could not be loaded.',
      }))
    }
  }, [timeRange])

  useEffect(() => {
    const hasData = state.events.length > 0
    void load(hasData && firstLoadRef.current)
    firstLoadRef.current = false
    return () => requestRef.current?.abort()
    // state.events is intentionally excluded: loading should follow time-range changes only.
  }, [load])

  useEffect(() => {
    const refresh = () => void load(true)
    const interval = window.setInterval(refresh, 5 * 60_000)
    const onOnline = () => refresh()
    window.addEventListener('online', onOnline)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('online', onOnline)
    }
  }, [load])

  return { ...state, refresh: () => load(true) }
}
