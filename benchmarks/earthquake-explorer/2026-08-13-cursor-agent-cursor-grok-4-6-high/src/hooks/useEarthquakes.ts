import { useEffect, useRef, useState } from "react";

import { fetchFeed } from "../lib/usgs";
import type { FeedMeta, Quake, WindowId } from "../lib/types";

type Status = "loading" | "ready" | "error";

export function useEarthquakes(windowId: WindowId) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [quakes, setQuakes] = useState<Quake[]>([]);
  const [meta, setMeta] = useState<FeedMeta | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const first = quakes.length === 0 || meta === null;
    if (first) {
      setStatus("loading");
      setError(null);
    } else {
      setRefreshing(true);
    }

    fetchFeed(windowId, ac.signal)
      .then((result) => {
        if (ac.signal.aborted) return;
        setQuakes(result.quakes);
        setMeta(result.meta);
        setStatus("ready");
        setError(null);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Could not load USGS feed";
        if (first) {
          setStatus("error");
          setError(message);
        } else {
          setError(message);
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setRefreshing(false);
      });

    return () => ac.abort();
    // tick retriggers a refresh without resetting window
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowId, tick]);

  useEffect(() => {
    const ms = windowId === "hour" ? 60_000 : windowId === "day" ? 120_000 : 300_000;
    const id = window.setInterval(() => setTick((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [windowId]);

  return {
    status,
    error,
    quakes,
    meta,
    refreshing,
    refresh: () => setTick((n) => n + 1),
  };
}

export function useNow(interval = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
