import { useEffect, useReducer } from 'react'
import { reducer } from '../state/reducer'
import { loadState, saveState } from '../state/storage'

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  return [state, dispatch] as const
}
