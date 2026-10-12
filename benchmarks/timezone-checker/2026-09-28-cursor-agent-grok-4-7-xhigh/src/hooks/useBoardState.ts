import { useEffect, useReducer } from 'react';
import { reducer } from '../lib/reducer';
import { STORAGE_KEY, loadState, sanitize, saveState } from '../lib/storage';

export function useBoardState() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        dispatch({ type: 'hydrate', state: sanitize(JSON.parse(event.newValue)) });
      } catch {
        /* Ignore malformed writes from another tab. */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { state, dispatch };
}
