import { createDefaultState, parseState, type AppState } from './appState'

export const STORAGE_KEY = 'timezone-overlap:v1'

export function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? parseState(JSON.parse(raw)) : createDefaultState()
  } catch {
    return createDefaultState()
  }
}

export function saveState(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be full or disabled (private mode); the app keeps working in memory.
  }
}
