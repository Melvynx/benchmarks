import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedMeta, Quake, WindowId } from './types';
import { loadFeed } from './usgs';

export type FeedStatus = 'loading' | 'ready' | 'error';

type FeedState = {
  status: FeedStatus;
  quakes: Quake[];
  meta: FeedMeta | null;
  error: string | null;
};

const INITIAL: FeedState = {
  status: 'loading',
  quakes: [],
  meta: null,
  error: null,
};

function errorMessage(err: unknown, timedOut: boolean): string {
  if (timedOut) return 'USGS took too long to answer.';
  if (err instanceof Error) {
    if (err.message.startsWith('USGS')) return err.message;
    if (/failed to fetch|network|load failed/i.test(err.message)) return 'Could not reach USGS.';
    return err.message;
  }
  return 'Could not reach USGS.';
}

export function useQuakeFeed(windowId: WindowId) {
  const [state, setState] = useState<FeedState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (mode: 'replace' | 'refresh') => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, 45_000);

    if (mode === 'replace') setState(INITIAL);

    try {
      const result = await loadFeed(windowId, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setState({ status: 'ready', quakes: result.quakes, meta: result.meta, error: null });
    } catch (err) {
      if (ctrl.signal.aborted && !timedOut) return;
      setState((current) => ({
        status: current.quakes.length > 0 ? 'ready' : 'error',
        quakes: current.quakes,
        meta: current.meta,
        error: errorMessage(err, timedOut),
      }));
    } finally {
      window.clearTimeout(timer);
    }
  }, [windowId]);

  useEffect(() => {
    void load('replace');
    const timer = window.setInterval(() => {
      void load('refresh');
    }, 60_000);
    return () => {
      window.clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [load]);

  const refresh = useCallback(() => {
    void load('refresh');
  }, [load]);

  return { ...state, refresh };
}
