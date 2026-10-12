import { useMemo } from 'react';
import { useMail } from './store';
import { useNow } from './hooks';
import { highlightTerms, parseQuery } from './search';
import { threadsInView, type ListItem } from './selectors';
import type { MailData, Route } from './types';

export interface ListModel {
  items: ListItem[];
  page: ListItem[];
  total: number;
  start: number;
  end: number;
  pageNo: number;
  pageCount: number;
  terms: string[];
}

export function useListModel(route: Route): ListModel {
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const drafts = useMail((s) => s.drafts);
  const labels = useMail((s) => s.labels);
  const settings = useMail((s) => s.settings);
  const now = useNow(15_000);
  const { view, param, tab } = route;

  const items = useMemo(() => {
    const data: MailData = { threads, messages, drafts, labels, contacts: [], pending: [], recentSearches: [] };
    return threadsInView(data, { view, param, tab, page: 1 }, settings, now);
  }, [threads, messages, drafts, labels, settings, now, view, param, tab]);

  return useMemo(() => {
    const size = settings.pageSize;
    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / size));
    const pageNo = Math.min(route.page, pageCount);
    const startIdx = (pageNo - 1) * size;
    const page = items.slice(startIdx, startIdx + size);
    const terms = view === 'search' ? highlightTerms(parseQuery(param ?? '')) : [];
    return { items, page, total, start: total ? startIdx + 1 : 0, end: startIdx + page.length, pageNo, pageCount, terms };
  }, [items, route.page, settings.pageSize, view, param]);
}
