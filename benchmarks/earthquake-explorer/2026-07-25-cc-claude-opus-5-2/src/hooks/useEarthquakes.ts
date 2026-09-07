import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFeed, type FeedResult, type WindowId } from "../lib/usgs";

export type FeedStatus = "loading" | "ready" | "error";

export interface FeedState {
  data: FeedResult | null;
  status: FeedStatus;
  error: string | null;
  /** True while a background refresh is in flight over already-rendered data. */
  refreshing: boolean;
  /** Local clock time of the last successful load. */
  lastLoadedAt: number | null;
  refresh: () => void;
}

const REFRESH_INTERVAL_MS = 60_000;

/**
 * Loads a USGS feed and keeps it fresh.
 *
 * Refreshes run on a timer, on window focus, and on demand. Background
 * refreshes never blank the view — the previous payload stays on screen until
 * the new one lands, and a failed refresh leaves the good data in place.
 */
export function useEarthquakes(windowId: WindowId): FeedState {
  const [data, setData] = useState<FeedResult | null>(null);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

  const requestRef = useRef<AbortController | null>(null);
  const windowRef = useRef(windowId);
  windowRef.current = windowId;

  const load = useCallback(async (id: WindowId, isBackground: boolean) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    if (isBackground) setRefreshing(true);
    else setStatus("loading");

    try {
      const result = await fetchFeed(id, controller.signal);
      if (controller.signal.aborted || windowRef.current !== id) return;
      setData(result);
      setStatus("ready");
      setError(null);
      setLastLoadedAt(Date.now());
    } catch (cause) {
      if (controller.signal.aborted) return;
      const message =
        cause instanceof Error ? cause.message : "Could not reach the USGS feed.";
      setError(message);
      // A failed background refresh keeps the last good payload on screen.
      setStatus((prev) => (isBackground && prev === "ready" ? "ready" : "error"));
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, []);

  // Reload whenever the selected window changes.
  useEffect(() => {
    setData(null);
    void load(windowId, false);
    return () => requestRef.current?.abort();
  }, [windowId, load]);

  // Poll, but only while the tab is visible.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void load(windowRef.current, true);
    };
    const timer = window.setInterval(tick, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load(windowRef.current, true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const refresh = useCallback(() => {
    void load(windowRef.current, true);
  }, [load]);

  return { data, status, error, refreshing, lastLoadedAt, refresh };
}

/** A clock that ticks slowly, so "3m ago" labels stay honest without churn. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
