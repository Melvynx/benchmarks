import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {
  // noop - subscription not needed for client detection
};

export function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
