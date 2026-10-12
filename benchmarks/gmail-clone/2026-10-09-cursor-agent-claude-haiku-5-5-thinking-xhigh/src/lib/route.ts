import { FOLDERS, type Folder } from '../domain/types';

export type Section =
  | { kind: 'folder'; folder: Folder }
  | { kind: 'label'; labelId: string }
  | { kind: 'search'; q: string };

export interface Route {
  section: Section;
  threadId: string | null;
}

export const DEFAULT_ROUTE: Route = { section: { kind: 'folder', folder: 'inbox' }, threadId: null };

/** Hash routes: #/inbox, #/label/<id>, #/search?q=..., optional &t=<threadId>. */
export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '').replace(/^\//, '');
  const queryAt = raw.indexOf('?');
  const path = queryAt === -1 ? raw : raw.slice(0, queryAt);
  const params = new URLSearchParams(queryAt === -1 ? '' : raw.slice(queryAt + 1));
  const [head = '', arg = ''] = path.split('/').map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  const threadId = params.get('t');

  if (head === 'label' && arg) return { section: { kind: 'label', labelId: arg }, threadId };
  if (head === 'search') return { section: { kind: 'search', q: params.get('q') ?? '' }, threadId };
  if ((FOLDERS as readonly string[]).includes(head)) {
    return { section: { kind: 'folder', folder: head as Folder }, threadId };
  }
  return { ...DEFAULT_ROUTE, threadId };
}

export function formatRoute(route: Route): string {
  const params = new URLSearchParams();
  const { section } = route;
  let path: string;
  if (section.kind === 'folder') {
    path = section.folder;
  } else if (section.kind === 'label') {
    path = `label/${encodeURIComponent(section.labelId)}`;
  } else {
    path = 'search';
    params.set('q', section.q);
  }
  if (route.threadId) params.set('t', route.threadId);
  const query = params.toString();
  return `#/${path}${query ? `?${query}` : ''}`;
}

export function sectionKey(section: Section): string {
  if (section.kind === 'folder') return `folder:${section.folder}`;
  if (section.kind === 'label') return `label:${section.labelId}`;
  return `search:${section.q}`;
}

/** Navigate by updating the hash (the hashchange listener re-renders the app). */
export function go(route: Route): void {
  const next = formatRoute(route);
  if (window.location.hash !== next) window.location.hash = next;
}

export function goFolder(folder: Folder): void {
  go({ section: { kind: 'folder', folder }, threadId: null });
}
