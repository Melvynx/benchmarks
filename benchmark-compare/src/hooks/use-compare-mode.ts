import { useSyncExternalStore } from "react"

/**
 * Compare mode turns every app tile into a picker: plain clicks build the
 * comparison instead of opening one app.
 */
const listeners = new Set<() => void>()
let enabled = false

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setCompareMode(value: boolean) {
  enabled = value
  for (const listener of listeners) listener()
}

export function toggleCompareMode() {
  setCompareMode(!enabled)
}

export function useCompareMode() {
  return useSyncExternalStore(subscribe, () => enabled, () => false)
}
