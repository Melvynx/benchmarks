import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a media query. `useSyncExternalStore` gives a correct value on
 * the very first render, so the desktop and mobile layouts never flash.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Tailwind's `md` breakpoint — the line between the two grid layouts. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
