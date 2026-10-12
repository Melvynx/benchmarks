import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useMail } from './store';
import { useUI, clearSelection, setUI } from './ui';
import { useRoute, hrefFor, type Route } from './router';
import { FOLDER_META, listRowsForFolder, listRowsForLabel, type Row, type ViewSpec } from './mail';
import { runSearch } from './search';

export const PAGE_SIZE = 50;

export interface ViewModel {
  route: Route;
  page: 'mail' | 'settings';
  view: ViewSpec;
  viewKey: string;
  rows: Row[];
  pageRows: Row[];
  pageIndex: number;
  pageCount: number;
  highlight: string[];
  title: string;
  threadId?: string;
  /** Row that owns the open conversation, if visible in this view. */
  hrefFor: (threadId?: string, pageIndex?: number) => string;
}

const INBOX_VIEW: ViewSpec = { kind: 'folder', folder: 'inbox', tab: 'primary' };

const Ctx = createContext<ViewModel | null>(null);

export function viewKeyOf(view: ViewSpec): string {
  switch (view.kind) {
    case 'folder':
      return `f:${view.folder}:${view.tab ?? ''}`;
    case 'label':
      return `l:${view.labelId}`;
    case 'search':
      return `s:${view.query}`;
  }
}

export function ViewProvider({ children }: { children: ReactNode }) {
  const route = useRoute();
  const mail = useMail();
  const { now } = useUI();
  const view: ViewSpec = route.page === 'mail' ? route.view : INBOX_VIEW;
  const viewKey = viewKeyOf(view);

  const result = useMemo(() => {
    if (route.page !== 'mail') return { rows: [] as Row[], highlight: [] as string[] };
    if (view.kind === 'folder') return { rows: listRowsForFolder(mail, view.folder, now, view.tab), highlight: [] as string[] };
    if (view.kind === 'label') return { rows: listRowsForLabel(mail, view.labelId), highlight: [] as string[] };
    return runSearch(mail, view.query, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mail, viewKey, now, route.page]);

  const pageIndexRaw = route.page === 'mail' ? route.pageIndex : 0;
  const pageCount = Math.max(1, Math.ceil(result.rows.length / PAGE_SIZE));
  const pageIndex = Math.min(pageIndexRaw, pageCount - 1);
  const pageRows = useMemo(() => result.rows.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE), [result.rows, pageIndex]);

  const title = useMemo(() => {
    if (view.kind === 'folder') return FOLDER_META[view.folder].label;
    if (view.kind === 'label') return mail.labels.find((l) => l.id === view.labelId)?.name ?? 'Label';
    return 'Search results';
  }, [view, mail.labels]);

  const threadId = route.page === 'mail' ? route.threadId : undefined;

  const vm = useMemo<ViewModel>(
    () => ({
      route,
      page: route.page,
      view,
      viewKey,
      rows: result.rows,
      pageRows,
      pageIndex,
      pageCount,
      highlight: result.highlight,
      title,
      threadId,
      hrefFor: (id, p = pageIndex) => hrefFor(view, id, id ? 0 : p),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route, viewKey, result, pageRows, pageIndex, pageCount, title, threadId],
  );

  // A different view starts with a clean selection and cursor.
  const prevKey = useRef(viewKey);
  useEffect(() => {
    if (prevKey.current !== viewKey) {
      prevKey.current = viewKey;
      clearSelection();
      setUI({ cursor: null });
    }
  }, [viewKey]);

  return <Ctx.Provider value={vm}>{children}</Ctx.Provider>;
}

export function useViewModel(): ViewModel {
  const v = useContext(Ctx);
  if (!v) throw new Error('ViewProvider missing');
  return v;
}

/** Thread ids covered by the current selection ("select all" spans every page). */
export function selectedRows(rows: Row[], keys: string[], allInView: boolean): Row[] {
  if (allInView) return rows;
  const set = new Set(keys);
  return rows.filter((r) => set.has(r.key));
}

export function uniqueThreadIds(rows: Row[]): string[] {
  return [...new Set(rows.map((r) => r.thread.id))];
}
