import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEarthquakeFeed, getTimeRange, UsgsFetchError } from "../lib/usgs";
import type { EarthquakeEvent, TimeRangeKey } from "../types/earthquake";

const AUTO_REFRESH_MS = 90_000;
const STALE_AFTER_MS = 5 * 60_000;

export interface EarthquakeFeedState {
  events: EarthquakeEvent[];
  status: "loading" | "ready" | "error";
  isRefreshing: boolean;
  error: string | null;
  fetchedAtMs: number | null;
  generatedAtMs: number | null;
  isStale: boolean;
  refresh: () => void;
}

export function useEarthquakes(range: TimeRangeKey): EarthquakeFeedState {
  const [events, setEvents] = useState<EarthquakeEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAtMs, setFetchedAtMs] = useState<number | null>(null);
  const [generatedAtMs, setGeneratedAtMs] = useState<number | null>(null);
  const [isStale, setIsStale] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const hasDataRef = useRef(false);

  const load = useCallback(
    async (rangeKey: TimeRangeKey) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (hasDataRef.current) setIsRefreshing(true);
      else setStatus("loading");
      setError(null);

      try {
        const feedUrl = getTimeRange(rangeKey).feedUrl;
        const result = await fetchEarthquakeFeed(feedUrl, controller.signal);
        if (controller.signal.aborted) return;
        setEvents(result.events);
        setGeneratedAtMs(result.generatedMs);
        setFetchedAtMs(Date.now());
        setStatus("ready");
        setIsStale(false);
        hasDataRef.current = true;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof UsgsFetchError ? err.message : "Something went wrong while loading earthquake data.";
        setError(message);
        if (!hasDataRef.current) setStatus("error");
        else setIsStale(true);
      } finally {
        if (!controller.signal.aborted) setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    hasDataRef.current = false;
    load(range);
  }, [range, load]);

  useEffect(() => {
    const id = window.setInterval(() => load(range), AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [range, load]);

  useEffect(() => {
    if (fetchedAtMs === null) return;
    const id = window.setInterval(() => {
      if (Date.now() - fetchedAtMs > STALE_AFTER_MS) setIsStale(true);
    }, 15_000);
    return () => window.clearInterval(id);
  }, [fetchedAtMs]);

  const refresh = useCallback(() => load(range), [load, range]);

  return { events, status, isRefreshing, error, fetchedAtMs, generatedAtMs, isStale, refresh };
}
