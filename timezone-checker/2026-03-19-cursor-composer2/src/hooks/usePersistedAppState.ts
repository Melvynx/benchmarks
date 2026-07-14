import { useEffect, useReducer, type Dispatch } from 'react'
import { initialPersistedState, reducer, saveState, type Action, type PersistedState } from '../state/appState'

export function usePersistedAppState(): [PersistedState, Dispatch<Action>] {
  const [state, dispatch] = useReducer(reducer, undefined, initialPersistedState)

  useEffect(() => {
    saveState(state)
  }, [state])

  return [state, dispatch]
}
