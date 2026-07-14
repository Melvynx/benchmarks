import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchEarthquakes } from './api'
import type { Earthquake, TimeRange } from './types'

interface CacheEntry { events: Earthquake[]; generatedAt: number; fetchedAt: number }

export function useEarthquakes(range: TimeRange) {
  const [events, setEvents] = useState<Earthquake[]>([])
  const [generatedAt, setGeneratedAt] = useState<number | null>(null)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const eventsRef = useRef<Earthquake[]>([])

  const load = useCallback(async (background = false) => {
    controller.current?.abort()
    controller.current = new AbortController()
    if (background || eventsRef.current.length) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const result = await fetchEarthquakes(range, controller.current.signal)
      const now = Date.now()
      eventsRef.current = result.events
      setEvents(result.events)
      setGeneratedAt(result.generatedAt)
      setFetchedAt(now)
      localStorage.setItem(`faultline-cache-${range}`, JSON.stringify({ ...result, fetchedAt: now }))
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError(caught instanceof Error ? caught.message : 'Unable to reach USGS')
      if (!eventsRef.current.length) {
        try {
          const raw = localStorage.getItem(`faultline-cache-${range}`)
          if (raw) {
            const cached = JSON.parse(raw) as CacheEntry
            eventsRef.current = cached.events
            setEvents(cached.events)
            setGeneratedAt(cached.generatedAt)
            setFetchedAt(cached.fetchedAt)
          }
        } catch { /* Ignore invalid local cache. */ }
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [range])

  useEffect(() => {
    void load(false)
    const interval = window.setInterval(() => void load(true), 5 * 60_000)
    return () => {
      window.clearInterval(interval)
      controller.current?.abort()
    }
  }, [load])

  return { events, generatedAt, fetchedAt, loading, refreshing, error, refresh: () => load(true) }
}
