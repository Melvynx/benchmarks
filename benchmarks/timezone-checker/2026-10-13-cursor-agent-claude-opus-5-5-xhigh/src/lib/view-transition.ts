import { flushSync } from "react-dom";

/**
 * Runs a state update inside the View Transitions API so reordered rows glide into place.
 * Falls back to a plain update when unsupported or when the user prefers reduced motion.
 */
export function withViewTransition(update: () => void): void {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof document.startViewTransition !== "function" || reducedMotion) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}
