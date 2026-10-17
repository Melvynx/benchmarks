import { useEffect, useState, useSyncExternalStore } from "react";
import { useMail } from "../lib/store";

function mq(query: string) {
  const m = window.matchMedia(query);
  return {
    subscribe: (cb: () => void) => {
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    get: () => m.matches,
  };
}

const mobile = mq("(max-width: 767px)");
const tablet = mq("(max-width: 1099px)");
const compactNav = mq("(max-width: 1023px)");
const dark = mq("(prefers-color-scheme: dark)");

export const useIsMobile = () => useSyncExternalStore(mobile.subscribe, mobile.get, () => false);
export const useIsNarrow = () => useSyncExternalStore(tablet.subscribe, tablet.get, () => false);
/** Tablet widths where the nav rail stays collapsed and expands as an overlay. */
export const useCompactNav = () => useSyncExternalStore(compactNav.subscribe, compactNav.get, () => false);
const usePrefersDark = () => useSyncExternalStore(dark.subscribe, dark.get, () => false);

/** Re-renders every `ms` so relative timestamps stay fresh. */
export function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useThemeClass() {
  const theme = useMail((s) => s.settings.theme);
  const prefersDark = usePrefersDark();
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#111214" : "#f6f8fc");
  }, [isDark]);
  return isDark;
}
