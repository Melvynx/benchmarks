import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { parseHash, useHash } from "./router";
import { computeCounts, viewThreads } from "./selectors";
import { useMail } from "./store";
import type { View } from "./types";
import { useUI } from "./ui";

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
  );
}

export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
export const useIsNarrow = () => useMediaQuery("(max-width: 1023px)");

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useIsDark() {
  const theme = useMail((s) => s.settings.theme);
  const sys = useMediaQuery("(prefers-color-scheme: dark)");
  return theme === "dark" || (theme === "system" && sys);
}

export function useApplyTheme() {
  const dark = useIsDark();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#111214" : "#f6f8fc");
  }, [dark]);
  return dark || systemDark();
}

export function useRoute() {
  const hash = useHash();
  return useMemo(() => parseHash(hash), [hash]);
}

/** With category tabs enabled, the plain Inbox shows the Primary tab. */
export function useEffectiveView(view: View): View {
  const inboxType = useMail((s) => s.settings.inboxType);
  return useMemo(() => {
    if (view.kind === "folder" && view.id === "inbox" && inboxType === "default") return { kind: "category", id: "primary" };
    return view;
  }, [view, inboxType]);
}

export function useViewThreads(view: View) {
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const labels = useMail((s) => s.labels);
  const now = useUI((s) => s.now);
  return useMemo(() => viewThreads(view, threads, messages, labels, now), [view, threads, messages, labels, now]);
}

export function useCounts() {
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const now = useUI((s) => s.now);
  return useMemo(() => computeCounts(threads, messages, now), [threads, messages, now]);
}

export function useDebouncedValue<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}
