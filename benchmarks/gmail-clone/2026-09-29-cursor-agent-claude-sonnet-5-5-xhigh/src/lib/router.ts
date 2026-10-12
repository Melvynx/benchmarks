import { useMemo, useSyncExternalStore } from 'react';
import { CATEGORIES, SYSTEM_VIEWS, type Category, type Route, type SystemView, type ViewKey } from './types';

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const [pathPart, queryPart = ''] = raw.split('?');
  const segs = pathPart.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  const params = new URLSearchParams(queryPart);
  const page = Math.max(1, parseInt(params.get('p') ?? '1', 10) || 1);
  const tabParam = params.get('tab') as Category | null;
  const tab: Category = tabParam && CATEGORIES.includes(tabParam) ? tabParam : 'primary';

  let view: ViewKey = 'inbox';
  let param: string | undefined;
  let rest = segs;
  const first = segs[0];
  if (first && (SYSTEM_VIEWS as readonly string[]).includes(first)) {
    view = first as SystemView;
    rest = segs.slice(1);
  } else if (first === 'label' || first === 'search' || first === 'settings') {
    view = first;
    param = segs[1];
    rest = segs.slice(2);
  }
  let threadId: string | undefined;
  if (rest[0] === 't' && rest[1]) threadId = rest[1];
  if (view === 'settings') threadId = undefined;
  return { view, param, threadId, page, tab };
}

export function routeToHash(r: Partial<Route> & { view: ViewKey }): string {
  const parts: string[] = [r.view];
  if (r.param !== undefined && (r.view === 'label' || r.view === 'search' || r.view === 'settings')) {
    parts.push(encodeURIComponent(r.param));
  }
  if (r.threadId) parts.push('t', encodeURIComponent(r.threadId));
  const q = new URLSearchParams();
  if (r.tab && r.tab !== 'primary' && r.view === 'inbox') q.set('tab', r.tab);
  if (r.page && r.page > 1) q.set('p', String(r.page));
  const qs = q.toString();
  return `#/${parts.join('/')}${qs ? `?${qs}` : ''}`;
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

const getHash = () => window.location.hash;

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  return useMemo(() => parseHash(hash), [hash]);
}

export function currentRoute(): Route {
  return parseHash(window.location.hash);
}

export function navigate(target: Partial<Route> & { view: ViewKey }, opts: { replace?: boolean } = {}) {
  const hash = routeToHash(target);
  if (opts.replace) window.history.replaceState(null, '', hash);
  else if (window.location.hash !== hash) window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function hrefFor(target: Partial<Route> & { view: ViewKey }): string {
  return routeToHash(target);
}

export function withoutThread(r: Route): Route {
  return { ...r, threadId: undefined };
}

export function viewTitle(r: Route, labelName?: string): string {
  switch (r.view) {
    case 'label':
      return labelName ?? 'Label';
    case 'search':
      return 'Search results';
    case 'settings':
      return 'Settings';
    case 'all':
      return 'All Mail';
    default:
      return r.view[0].toUpperCase() + r.view.slice(1);
  }
}
