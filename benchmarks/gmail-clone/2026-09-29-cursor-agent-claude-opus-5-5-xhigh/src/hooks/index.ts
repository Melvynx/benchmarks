import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Route } from '../lib/router';
import { computeCounts, computeList, type ListContext } from '../lib/mailbox';
import { useMail } from '../store/mail';
import { useSettings } from '../store/settings';

export function useNow(interval = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const MOBILE_QUERY = '(max-width: 767px)';
export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);
export const isMobileNow = () => window.matchMedia(MOBILE_QUERY).matches;

export function useResolvedDark(): boolean {
  const theme = useSettings((s) => s.theme);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  return theme === 'dark' || (theme === 'system' && systemDark);
}

export function getListContext(now = Date.now()): ListContext {
  const s = useSettings.getState();
  return { labels: useMail.getState().labels, now, inboxType: s.inboxType, categories: s.categories };
}

export function useListContext(): ListContext {
  const labels = useMail((s) => s.labels);
  const inboxType = useSettings((s) => s.inboxType);
  const categories = useSettings((s) => s.categories);
  const now = useNow(15_000);
  return useMemo(() => ({ labels, now, inboxType, categories }), [labels, now, inboxType, categories]);
}

export function useThreadList(route: Route) {
  const threads = useMail((s) => s.threads);
  const ctx = useListContext();
  const key = JSON.stringify({ ...route, threadId: undefined });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => computeList(threads, route, ctx), [threads, key, ctx]);
}

export function useCounts() {
  const threads = useMail((s) => s.threads);
  const ctx = useListContext();
  return useMemo(() => computeCounts(threads, ctx), [threads, ctx]);
}

export function useElementWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width];
}

export function useOnClickOutside(refs: Array<React.RefObject<HTMLElement | null>>, handler: () => void, active = true) {
  const saved = useRef(handler);
  saved.current = handler;
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      if (refs.some((r) => r.current?.contains(e.target as Node))) return;
      saved.current();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
