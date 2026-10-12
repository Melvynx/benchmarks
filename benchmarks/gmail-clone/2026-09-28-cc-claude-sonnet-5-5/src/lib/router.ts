import { useSyncExternalStore } from 'react';
import type { CategoryId, SystemFolder } from './types';
import type { ViewSpec } from './mail';

export type Route =
  | { page: 'mail'; view: ViewSpec; threadId?: string; pageIndex: number }
  | { page: 'settings'; tab: string };

const FOLDERS: SystemFolder[] = ['inbox', 'starred', 'snoozed', 'important', 'sent', 'drafts', 'scheduled', 'all', 'spam', 'trash'];
const TABS: CategoryId[] = ['primary', 'promotions', 'social', 'updates'];

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/inbox';
  const [pathPart, queryPart = ''] = raw.split('?');
  const params = new URLSearchParams(queryPart);
  const segs = pathPart.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  const pageIndex = Math.max(0, (parseInt(params.get('p') ?? '1', 10) || 1) - 1);
  const head = segs[0] ?? 'inbox';

  if (head === 'settings') return { page: 'settings', tab: segs[1] ?? 'general' };
  if (head === 'search') return { page: 'mail', view: { kind: 'search', query: segs[1] ?? '' }, threadId: segs[2], pageIndex };
  if (head === 'label' && segs[1]) return { page: 'mail', view: { kind: 'label', labelId: segs[1] }, threadId: segs[2], pageIndex };
  if ((FOLDERS as string[]).includes(head)) {
    const tabParam = params.get('tab') as CategoryId | null;
    const tab = head === 'inbox' ? (tabParam && TABS.includes(tabParam) ? tabParam : 'primary') : undefined;
    return { page: 'mail', view: { kind: 'folder', folder: head as SystemFolder, tab }, threadId: segs[1], pageIndex };
  }
  return { page: 'mail', view: { kind: 'folder', folder: 'inbox', tab: 'primary' }, pageIndex: 0 };
}

export function viewPath(view: ViewSpec): string {
  switch (view.kind) {
    case 'folder':
      return `/${view.folder}`;
    case 'label':
      return `/label/${encodeURIComponent(view.labelId)}`;
    case 'search':
      return `/search/${encodeURIComponent(view.query)}`;
  }
}

export function viewQuery(view: ViewSpec, pageIndex = 0): string {
  const p = new URLSearchParams();
  if (view.kind === 'folder' && view.folder === 'inbox' && view.tab && view.tab !== 'primary') p.set('tab', view.tab);
  if (pageIndex > 0) p.set('p', String(pageIndex + 1));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function hrefFor(view: ViewSpec, threadId?: string, pageIndex = 0): string {
  return `#${viewPath(view)}${threadId ? `/${encodeURIComponent(threadId)}` : ''}${viewQuery(view, pageIndex)}`;
}

export const folderHref = (folder: SystemFolder, tab?: CategoryId) => hrefFor({ kind: 'folder', folder, tab });
export const searchHref = (query: string) => hrefFor({ kind: 'search', query });
export const labelHref = (labelId: string) => hrefFor({ kind: 'label', labelId });

export function navigate(href: string, replace = false) {
  if (replace) {
    history.replaceState(null, '', href);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = href.replace(/^#/, '');
  }
}

let cachedHash = '';
let cachedRoute: Route = parseHash('');

function getRoute(): Route {
  const h = location.hash;
  if (h !== cachedHash) {
    cachedHash = h;
    cachedRoute = parseHash(h);
  }
  return cachedRoute;
}

export function currentRoute(): Route {
  return getRoute();
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      window.addEventListener('hashchange', l);
      return () => window.removeEventListener('hashchange', l);
    },
    getRoute,
    getRoute,
  );
}
