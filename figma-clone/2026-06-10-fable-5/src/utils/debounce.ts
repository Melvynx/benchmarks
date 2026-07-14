export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  flush(): void;
  cancel(): void;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: A | null = null;

  const debounced = (...args: A): void => {
    lastArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) fn(...lastArgs);
      lastArgs = null;
    }, waitMs);
  };
  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      if (lastArgs) fn(...lastArgs);
      lastArgs = null;
    }
  };
  debounced.cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };
  return debounced;
}
