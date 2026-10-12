import { useEffect, useMemo } from 'react';
import { Clock, Inbox, Search, Star, Tag, type LucideIcon } from 'lucide-react';
import { draftThreadIds, listThreads, PAGE_SIZE } from '../../domain/selectors';
import type { Folder } from '../../domain/types';
import { go, type Route, type Section } from '../../lib/route';
import { highlightTerms } from '../../lib/search';
import { useMail } from '../../store/mailStore';
import { runScheduler } from '../../store/scheduler';
import { useUI } from '../../store/uiStore';
import { EmptyState } from '../ui/primitives';
import { CategoryTabs } from './CategoryTabs';
import { ListToolbar } from './ListToolbar';
import { ThreadRow } from './ThreadRow';

interface MailListProps {
  route: Route;
  /** Stacked rows (mobile or split reading pane) instead of single-line rows. */
  stacked: boolean;
}

export function MailList({ route, stacked }: MailListProps) {
  const data = useMail((s) => s.data);
  const category = useUI((s) => s.category);
  const page = useUI((s) => s.page);
  const setPage = useUI((s) => s.setPage);
  const selected = useUI((s) => s.selected);
  const focusedId = useUI((s) => s.focusedId);
  const setFocusedId = useUI((s) => s.setFocusedId);
  const refreshing = useUI((s) => s.refreshing);
  const setRefreshing = useUI((s) => s.setRefreshing);

  const { section } = route;
  const folder: Folder | null = section.kind === 'folder' ? section.folder : null;
  const isInboxWithTabs = section.kind === 'folder' && section.folder === 'inbox' && data.settings.categories;
  const now = Date.now();

  const threads = useMemo(
    () => listThreads(data, section, category, Date.now()),
    [data, section, category],
  );

  const pageCount = Math.max(1, Math.ceil(threads.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const pageThreads = threads.slice(start, start + PAGE_SIZE);
  const visibleIds = pageThreads.map((t) => t.id);
  const terms = section.kind === 'search' ? highlightTerms(section.q) : [];
  const drafts = useMemo(() => draftThreadIds(data), [data]);

  useEffect(() => {
    if (!focusedId) return;
    document.getElementById(`row-${focusedId}`)?.scrollIntoView({ block: 'nearest' });
  }, [focusedId]);

  const open = (threadId: string) => {
    setFocusedId(threadId);
    go({ section, threadId });
  };

  const refresh = () => {
    setRefreshing(true);
    runScheduler();
    window.setTimeout(() => setRefreshing(false), 600);
  };

  const empty = emptyCopy(section);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface" aria-label="Conversations">
      {isInboxWithTabs && <CategoryTabs />}
      <ListToolbar
        folder={folder}
        visibleIds={visibleIds}
        total={threads.length}
        from={threads.length === 0 ? 0 : start + 1}
        to={Math.min(threads.length, start + PAGE_SIZE)}
        page={currentPage}
        pageCount={pageCount}
        onPage={setPage}
        onRefresh={refresh}
        refreshing={refreshing}
      />
      {section.kind === 'search' && (
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-4 text-xs text-ink-3">
          <Search className="size-3.5" />
          <span className="truncate">
            {threads.length} result{threads.length === 1 ? '' : 's'} for <strong className="text-ink">{section.q}</strong>
          </span>
        </div>
      )}
      <div role="grid" aria-label="Conversations" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {threads.length === 0 && (
          <EmptyState icon={<empty.Icon />} title={empty.title} body={empty.body} />
        )}
        {pageThreads.map((thread) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            me={data.account.email}
            layout={stacked ? 'stacked' : 'row'}
            density={data.settings.density}
            selected={selected.includes(thread.id)}
            focused={focusedId === thread.id}
            labels={data.labels}
            hasDraft={drafts.has(thread.id)}
            terms={terms}
            now={now}
            onOpen={open}
          />
        ))}
      </div>
    </section>
  );
}

function emptyCopy(section: Section): { Icon: LucideIcon; title: string; body: string } {
  if (section.kind === 'search') {
    return { Icon: Search, title: 'No results', body: 'Try fewer words, or search operators like from: and has:attachment.' };
  }
  if (section.kind === 'label') {
    return { Icon: Tag, title: 'No conversations with this label', body: 'Apply a label from the toolbar to see it here.' };
  }
  switch (section.folder) {
    case 'starred':
      return { Icon: Star, title: 'No starred conversations', body: 'Star a conversation to keep it close.' };
    case 'snoozed':
      return { Icon: Clock, title: 'No snoozed conversations', body: 'Snoozed mail returns to your inbox when it’s due.' };
    case 'trash':
      return { Icon: Inbox, title: 'Trash is empty', body: 'Deleted conversations appear here for 30 days.' };
    case 'spam':
      return { Icon: Inbox, title: 'No spam', body: 'Nothing has been marked as spam.' };
    default:
      return { Icon: Inbox, title: 'You’re all caught up', body: 'No conversations here.' };
  }
}
