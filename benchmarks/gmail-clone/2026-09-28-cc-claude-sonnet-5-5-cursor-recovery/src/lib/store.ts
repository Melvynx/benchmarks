import { useSyncExternalStore } from 'react';
import type { MailState } from './types';
import { buildSeed, DEFAULT_SETTINGS } from '../data/seed';

const KEY = 'mail.state.v1';
export const STATE_VERSION = 3;

export function createSeedState(now = Date.now()): MailState {
  const s = buildSeed(now);
  return {
    version: STATE_VERSION,
    seededAt: now,
    threads: Object.fromEntries(s.threads.map((t) => [t.id, t])),
    labels: s.labels,
    contacts: s.contacts,
    settings: { ...DEFAULT_SETTINGS },
    recentSearches: [],
    pending: [],
  };
}

function hasStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function load(): MailState {
  if (hasStorage()) {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MailState;
        if (parsed && parsed.version === STATE_VERSION && parsed.threads) {
          parsed.settings = {
            ...DEFAULT_SETTINGS,
            ...parsed.settings,
            categoriesEnabled: { ...DEFAULT_SETTINGS.categoriesEnabled, ...parsed.settings?.categoriesEnabled },
          };
          parsed.pending ??= [];
          parsed.recentSearches ??= [];
          return parsed;
        }
      }
    } catch {
      /* fall through to seed */
    }
  }
  return createSeedState();
}

let state: MailState = load();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function persistNow() {
  saveTimer = undefined;
  if (!hasStorage()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded: keep running in memory */
  }
}

function schedulePersist() {
  if (saveTimer) return;
  saveTimer = setTimeout(persistNow, 250);
}

export function getState(): MailState {
  return state;
}

export function setState(updater: (s: MailState) => MailState) {
  const next = updater(state);
  if (next === state) return;
  state = next;
  schedulePersist();
  listeners.forEach((l) => l());
}

export function replaceState(next: MailState) {
  state = next;
  persistNow();
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useMail(): MailState {
  return useSyncExternalStore(subscribe, getState, getState);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      persistNow();
    }
  });
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue) as MailState;
      if (parsed.version === STATE_VERSION) {
        state = parsed;
        listeners.forEach((l) => l());
      }
    } catch {
      /* ignore */
    }
  });
}

export function flushPersist() {
  if (saveTimer) clearTimeout(saveTimer);
  persistNow();
}
