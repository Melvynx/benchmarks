import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {
  // noop - subscription not needed for client detection
};

export function useIsMac(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () =>
      typeof navigator !== "undefined" &&
      navigator.userAgent.includes("Mac OS X"),
    () => false,
  );
}
