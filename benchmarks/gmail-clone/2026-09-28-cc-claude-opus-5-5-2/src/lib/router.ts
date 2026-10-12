import { useSyncExternalStore } from 'react';
import type { Category } from '../data/types';

export const SYSTEM_FOLDERS = [
  'inbox', 'starred', 'snoozed', 'important', 'sent', 'scheduled', 'drafts', 'all', 'spam', 'trash',
] as const;
export type SystemFolder = (typeof SYSTEM_FOLDERS)[number];

export type Route =
  | { view: 'folder'; folder: SystemFolder; category?: Category; threadId?: string }
  | { view: 'label'; labelId: string; threadId?: string }
  | { view: 'search'; query: string; threadId?: string }
  | { view: 'settings'; tab: string };

const CATEGORIES: Category[] = ['primary', 'promotions', 'social', 'updates'];

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map((p) => decodeURIComponent(p));
  const [head, a, b] = parts;
  if (!head) return { view: 'folder', folder: 'inbox' };
  if (head === 'category' && a && CATEGORIES.includes(a as Category)) {
    return { view: 'folder', folder: 'inbox', category: a as Category, threadId: b };
  }
  if (head === 'label' && a) return { view: 'label', labelId: a, threadId: b };
  if (head === 'search') return { view: 'search', query: a ?? '', threadId: b };
  if (head === 'settings') return { view: 'settings', tab: a ?? 'general' };
  if ((SYSTEM_FOLDERS as readonly string[]).includes(head)) {
    return { view: 'folder', folder: head as SystemFolder, threadId: a };
  }
  return { view: 'folder', folder: 'inbox' };
}

export function routeToHash(r: Route): string {
  const enc = encodeURIComponent;
  switch (r.view) {
    case 'folder': {
      const base = r.folder === 'inbox' && r.category && r.category !== 'primary' ? `category/${r.category}` : r.folder;
      return `#${base}${r.threadId ? `/${enc(r.threadId)}` : ''}`;
    }
    case 'label':
      return `#label/${enc(r.labelId)}${r.threadId ? `/${enc(r.threadId)}` : ''}`;
    case 'search':
      return `#search/${enc(r.query)}${r.threadId ? `/${enc(r.threadId)}` : ''}`;
    case 'settings':
      return `#settings/${enc(r.tab)}`;
  }
}

/** Route without the open conversation — i.e. the list the conversation belongs to. */
export function listRoute(r: Route): Route {
  if (r.view === 'settings') return { view: 'folder', folder: 'inbox' };
  return { ...r, threadId: undefined } as Route;
}

export function withThread(r: Route, threadId: string | undefined): Route {
  if (r.view === 'settings') return { view: 'folder', folder: 'inbox', threadId };
  return { ...r, threadId } as Route;
}

export function routeKey(r: Route): string {
  return routeToHash(listRoute(r));
}

export function navigate(r: Route | string, replace = false) {
  const hash = typeof r === 'string' ? r : routeToHash(r);
  if (hash === window.location.hash) return;
  if (replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

let cachedHash = '';
let cachedRoute: Route = { view: 'folder', folder: 'inbox' };

function getSnapshot(): Route {
  const h = window.location.hash;
  if (h !== cachedHash) {
    cachedHash = h;
    cachedRoute = parseHash(h);
  }
  return cachedRoute;
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getRoute(): Route {
  return getSnapshot();
}
