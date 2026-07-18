import { MailCheck, SearchX } from 'lucide-react';

import type { MailboxId, MailCategory, MailThread } from '../domain/mail';
import { MAILBOX_TITLES } from '../lib/format';
import { CategoryTabs } from './CategoryTabs';
import { MailboxToolbar } from './MailboxToolbar';
import { MailRow } from './MailRow';

interface MailboxViewProps {
  threads: MailThread[];
  currentMailbox: MailboxId;
  currentCategory: MailCategory;
  categoryCounts: Record<MailCategory, number>;
  selectedIds: Set<string>;
  totalCount: number;
  query: string;
  labels: readonly string[];
  onCategoryChange: (category: MailCategory) => void;
  onSelect: (threadId: string) => void;
  onToggleAll: () => void;
  onClearSelection: () => void;
  onOpen: (threadId: string) => void;
  onStar: (threadId: string) => void;
  onToggleRead: (threadId: string) => void;
  onArchive: (threadId: string) => void;
  onTrash: (threadId: string) => void;
  onSnooze: (threadId: string) => void;
  onRestore: (threadId: string) => void;
  onDeleteThreadForever: (threadId: string) => void;
  onArchiveSelected: () => void;
  onTrashSelected: () => void;
  onMarkSelectedUnread: () => void;
  onSnoozeSelected: () => void;
  onLabelSelected: (label: string) => void;
  onRestoreSelected: () => void;
  onDeleteForever: () => void;
  onClearSearch: () => void;
  onCompose: () => void;
  onNotify: (message: string) => void;
}

export function MailboxView({
  threads,
  currentMailbox,
  currentCategory,
  categoryCounts,
  selectedIds,
  totalCount,
  query,
  labels,
  onCategoryChange,
  onSelect,
  onToggleAll,
  onClearSelection,
  onOpen,
  onStar,
  onToggleRead,
  onArchive,
  onTrash,
  onSnooze,
  onRestore,
  onDeleteThreadForever,
  onArchiveSelected,
  onTrashSelected,
  onMarkSelectedUnread,
  onSnoozeSelected,
  onLabelSelected,
  onRestoreSelected,
  onDeleteForever,
  onClearSearch,
  onCompose,
  onNotify,
}: MailboxViewProps) {
  const isAllSelected = threads.length > 0 && threads.every((thread) => selectedIds.has(thread.id));
  const selectedThreads = threads.filter((thread) => selectedIds.has(thread.id));
  const canArchiveSelection =
    selectedThreads.length > 0 &&
    selectedThreads.every((thread) => thread.folder === 'inbox');
  const canSnoozeSelection =
    selectedThreads.length > 0 &&
    selectedThreads.every(
      (thread) => thread.folder === 'inbox' || thread.folder === 'archive',
    );

  return (
    <section className="mailbox-view" aria-label={MAILBOX_TITLES[currentMailbox]}>
      <MailboxToolbar
        currentMailbox={currentMailbox}
        visibleCount={threads.length}
        totalCount={totalCount}
        selectedCount={selectedIds.size}
        isAllSelected={isAllSelected}
        canArchiveSelection={canArchiveSelection}
        canSnoozeSelection={canSnoozeSelection}
        labels={labels}
        onToggleAll={onToggleAll}
        onClearSelection={onClearSelection}
        onArchiveSelected={onArchiveSelected}
        onTrashSelected={onTrashSelected}
        onMarkSelectedUnread={onMarkSelectedUnread}
        onSnoozeSelected={onSnoozeSelected}
        onLabelSelected={onLabelSelected}
        onRestoreSelected={onRestoreSelected}
        onDeleteForever={onDeleteForever}
        onNotify={onNotify}
      />

      {currentMailbox === 'inbox' && !query ? (
        <CategoryTabs
          currentCategory={currentCategory}
          counts={categoryCounts}
          onChange={onCategoryChange}
        />
      ) : null}

      <div className="mail-list" role="list" aria-label="Messages">
        {threads.length > 0 ? (
          threads.map((thread) => (
            <MailRow
              key={thread.id}
              thread={thread}
              currentMailbox={currentMailbox}
              isSelected={selectedIds.has(thread.id)}
              onSelect={onSelect}
              onOpen={onOpen}
              onStar={onStar}
              onToggleRead={onToggleRead}
              onArchive={onArchive}
              onTrash={onTrash}
              onSnooze={onSnooze}
              onRestore={onRestore}
              onDeleteForever={onDeleteThreadForever}
            />
          ))
        ) : (
          <div className="empty-mailbox">
            {query ? <SearchX aria-hidden="true" /> : <MailCheck aria-hidden="true" />}
            <h2>{query ? 'No messages match your search' : `${MAILBOX_TITLES[currentMailbox]} is clear`}</h2>
            <p>
              {query
                ? 'Try a sender, subject, label, or a word from the message.'
                : currentMailbox === 'inbox'
                  ? 'You are all caught up. New messages will appear here.'
                  : 'Messages you move here will appear in this mailbox.'}
            </p>
            <button
              type="button"
              className="outline-button"
              onClick={query ? onClearSearch : onCompose}
            >
              {query ? 'Clear search' : 'Compose message'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
