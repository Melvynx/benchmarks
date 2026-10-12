import { useSyncExternalStore } from 'react';

let current = new Date();
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function tick() {
  current = new Date();
  listeners.forEach((listener) => listener());
}

function scheduleNextMinute() {
  const delay = 60_000 - (Date.now() % 60_000) + 50;
  timer = setTimeout(() => {
    tick();
    scheduleNextMinute();
  }, delay);
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') tick();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    current = new Date();
    scheduleNextMinute();
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };
}

const getSnapshot = () => current;

/** Current time, shared across components and refreshed on every minute boundary. */
export function useNow(): Date {
  return useSyncExternalStore(subscribe, getSnapshot);
}
