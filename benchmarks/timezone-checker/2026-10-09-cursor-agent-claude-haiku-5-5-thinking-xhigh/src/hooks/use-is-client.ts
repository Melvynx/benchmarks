import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and hydration, true once mounted in the browser. Gates
 * anything that depends on localStorage or the current time so server HTML
 * never disagrees with the first client render.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
