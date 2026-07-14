import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFeed } from "../lib/api";
import type { FeedResult, Period } from "../types";

const AUTO_REFRESH_MS = 5 * 60 * 1000;

export type FeedState = {
  data: FeedResult | null;
  dataPeriod: Period | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
};

export function useFeed(period: Period): FeedState {
  const [data, setData] = useState<FeedResult | null>(null);
  const [dataPeriod, setDataPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generation = useRef(0);

  const load = useCallback((target: Period, hasData: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const gen = ++generation.current;
    if (hasData) setRefreshing(true);
    else {
      setLoading(true);
      setData(null);
      setDataPeriod(null);
    }
    fetchFeed(target, controller.signal)
      .then((result) => {
        if (gen !== generation.current) return;
        setData(result);
        setDataPeriod(target);
        setError(null);
      })
      .catch((err: unknown) => {
        if (gen !== generation.current || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Could not reach the USGS feed");
      })
      .finally(() => {
        if (gen !== generation.current) return;
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  // Load on period change; keep prior data visible only when it matches the period.
  useEffect(() => {
    load(period, false);
  }, [period, load]);

  const refresh = useCallback(() => {
    load(period, dataPeriod === period);
  }, [load, period, dataPeriod]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine !== false) {
        refreshRef.current();
      }
    }, AUTO_REFRESH_MS);
    const onOnline = () => refreshRef.current();
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { data, dataPeriod, loading, refreshing, error, refresh };
}

/** Ticks every `ms` so relative timestamps stay honest. Returns the current time. */
export function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}
