import { useSyncExternalStore } from 'react';
import type { Category, FolderId } from '../types';

export type SettingsTab = 'general' | 'labels' | 'inbox' | 'advanced';

export type Route =
  | { view: 'folder'; folder: FolderId; threadId?: string }
  | { view: 'category'; category: Exclude<Category, 'primary'>; threadId?: string }
  | { view: 'label'; labelId: string; threadId?: string }
  | { view: 'search'; query: string; threadId?: string }
  | { view: 'settings'; tab: SettingsTab };

const FOLDERS: FolderId[] = ['inbox', 'starred', 'snoozed', 'important', 'sent', 'scheduled', 'drafts', 'all', 'spam', 'trash'];

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const parts = raw.split('/');
  const [head, a, b] = parts;
  if (head === 'settings') {
    const tab = (['general', 'labels', 'inbox', 'advanced'] as SettingsTab[]).includes(a as SettingsTab) ? (a as SettingsTab) : 'general';
    return { view: 'settings', tab };
  }
  if (head === 'category' && (a === 'social' || a === 'promotions' || a === 'updates')) {
    return { view: 'category', category: a, threadId: b || undefined };
  }
  if (head === 'label' && a) return { view: 'label', labelId: decodeURIComponent(a), threadId: b || undefined };
  if (head === 'search') return { view: 'search', query: decodeURIComponent(a ?? ''), threadId: b || undefined };
  if (FOLDERS.includes(head as FolderId)) return { view: 'folder', folder: head as FolderId, threadId: a || undefined };
  return { view: 'folder', folder: 'inbox' };
}

export function toHash(r: Route): string {
  const t = 'threadId' in r && r.threadId ? `/${r.threadId}` : '';
  switch (r.view) {
    case 'folder':
      return `#${r.folder}${t}`;
    case 'category':
      return `#category/${r.category}${t}`;
    case 'label':
      return `#label/${encodeURIComponent(r.labelId)}${t}`;
    case 'search':
      return `#search/${encodeURIComponent(r.query)}${t}`;
    case 'settings':
      return `#settings/${r.tab}`;
  }
}

export function navigate(r: Route, opts: { replace?: boolean } = {}) {
  const hash = toHash(r);
  if (hash === window.location.hash) return;
  if (opts.replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

export function listOf(r: Route): Route {
  if (r.view === 'settings') return r;
  const { threadId: _drop, ...rest } = r;
  return rest as Route;
}

export function withThread(r: Route, threadId: string): Route {
  if (r.view === 'settings') return { view: 'folder', folder: 'inbox', threadId };
  return { ...r, threadId } as Route;
}

export function sameList(a: Route, b: Route): boolean {
  return toHash(listOf(a)) === toHash(listOf(b));
}

export function currentRoute(): Route {
  return parseHash(window.location.hash);
}

let cachedHash = '';
let cachedRoute: Route = { view: 'folder', folder: 'inbox' };

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

function snapshot(): Route {
  const h = window.location.hash;
  if (h !== cachedHash) {
    cachedHash = h;
    cachedRoute = parseHash(h);
  }
  return cachedRoute;
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
