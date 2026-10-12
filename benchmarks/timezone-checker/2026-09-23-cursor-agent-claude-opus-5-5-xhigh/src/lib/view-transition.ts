import { flushSync } from 'react-dom'

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Runs a state update inside a View Transition so elements with a `view-transition-name`
 * glide to their new position. Falls back to a plain update where unsupported.
 */
export function withViewTransition(update: () => void) {
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    update()
    return
  }
  document.startViewTransition(() => flushSync(update))
}

export const cityTransitionName = (cityId: string) => `city-${cityId}`
