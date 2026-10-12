import { useEffect, useReducer } from 'react'
import { appReducer } from './appState'
import { loadState, saveState } from './storage'

export function useAppState() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  return [state, dispatch] as const
}
