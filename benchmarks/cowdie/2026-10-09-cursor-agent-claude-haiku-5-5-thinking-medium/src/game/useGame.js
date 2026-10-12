import { useCallback, useEffect, useReducer, useRef } from 'react';
import { emit } from './events.js';
import { STORAGE_KEY, loadState, reducer } from './state.js';

const TICK_MS = 250;
const SAVE_EVERY_MS = 2000;

const PET_LINES = ['Hehe!', 'Moo~!', 'That tickles!', 'Hug me again!', '♥'];

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Game clock: decays stats and drives busy/mood timers.
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick', now: Date.now() }), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Persist (throttled) and flush on tab close.
  const lastSave = useRef(0);
  useEffect(() => {
    const save = () => {
      const s = stateRef.current;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ stats: s.stats, sleeping: s.sleeping, savedAt: Date.now() }),
      );
      lastSave.current = Date.now();
    };
    if (Date.now() - lastSave.current > SAVE_EVERY_MS) save();
    const throttle = setInterval(save, SAVE_EVERY_MS);
    window.addEventListener('pagehide', save);
    return () => {
      clearInterval(throttle);
      window.removeEventListener('pagehide', save);
    };
  }, [state.stats, state.sleeping]);

  const blockedReason = useCallback(() => {
    const s = stateRef.current;
    const now = Date.now();
    if (s.sleeping) return 'Shh... Cowdie is napping.';
    if (s.busyUntil > now) return null;
    return '';
  }, []);

  const feed = useCallback(
    (id) => {
      const reason = blockedReason();
      if (reason === null) return;
      if (reason) return dispatch({ type: 'note', text: reason, now: Date.now() });
      dispatch({ type: 'feed', id, now: Date.now() });
      emit('feed', { id });
    },
    [blockedReason],
  );

  const play = useCallback(() => {
    const reason = blockedReason();
    if (reason === null) return;
    if (reason) return dispatch({ type: 'note', text: reason, now: Date.now() });
    dispatch({ type: 'play', now: Date.now() });
    emit('play');
  }, [blockedReason]);

  const wash = useCallback(() => {
    const reason = blockedReason();
    if (reason === null) return;
    if (reason) return dispatch({ type: 'note', text: reason, now: Date.now() });
    dispatch({ type: 'wash', now: Date.now() });
    emit('wash');
  }, [blockedReason]);

  const pet = useCallback(() => {
    const text = PET_LINES[Math.floor(Math.random() * PET_LINES.length)];
    dispatch({ type: 'pet', text, now: Date.now() });
    emit('pet');
  }, []);

  const toggleSleep = useCallback(() => {
    dispatch({ type: 'sleep', now: Date.now() });
  }, []);

  return { state, feed, play, wash, pet, toggleSleep };
}
