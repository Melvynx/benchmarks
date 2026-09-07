import { useEffect, useRef, useState } from "react";

/**
 * Cycles an index from 0 to `count - 1` every `stepMs`.
 * Pauses while `paused` is true and stops entirely when `enabled` is false.
 * Returns the index, a progress value (0 to 1) within the current step,
 * and a setter to jump to a specific index.
 */
export function useIntervalSequence({
  count,
  stepMs,
  enabled = true,
  paused = false,
}: {
  count: number;
  stepMs: number;
  enabled?: boolean;
  paused?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const startedAt = useRef<number>(0);
  const elapsedBeforePause = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setProgress(1);
      return;
    }
    if (paused) return;

    let frame = 0;
    startedAt.current = performance.now() - elapsedBeforePause.current;

    const tick = (now: number) => {
      const elapsed = now - startedAt.current;
      const ratio = Math.min(elapsed / stepMs, 1);
      setProgress(ratio);
      if (ratio >= 1) {
        elapsedBeforePause.current = 0;
        startedAt.current = now;
        setIndex((current) => (current + 1) % count);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      elapsedBeforePause.current = performance.now() - startedAt.current;
    };
  }, [count, stepMs, enabled, paused]);

  const jumpTo = (next: number) => {
    elapsedBeforePause.current = 0;
    startedAt.current = performance.now();
    setProgress(0);
    setIndex(next);
  };

  return { index, progress, jumpTo };
}
