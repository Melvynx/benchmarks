import { createContext, useContext, useMemo } from 'react';
import {
  PAGE_SIZE, useMail, threadsForView, threadSnippet, categoryCounts, isSnoozed,
} from '../store/mailStore';
import type { Category, Thread, View } from '../types';
import { Icon } from './Icon';
import { ListToolbar } from './Toolbar';
import { cx, formatRowDate, formatSnoozeDate, highlightParts } from '../lib/utils';
import { displayName } from '../data/seed';
import { parseQuery, searchTermsOf } from '../lib/search';

const TABS: Array<{ id: Category; label: string; icon: Parameters<typeof Icon>[0]['name'] }> = [
  { id: 'primary', label: 'Primary', icon: 'inbox' },
  { id: 'social', label: 'Social', icon: 'people' },
  { id: 'promotions', label: 'Promotions', icon: 'tag' },
  { id: 'updates', label: 'Updates', icon: 'info' },
];

function CategoryTabs() {
  const view = useMail((s) => s.view);
  const setCategory = useMail((s) => s.setCategory);
  const threads = useMail((s) => s.threads);
  const counts = categoryCounts(threads);
  if (view.kind !== 'mailbox' || view.mailbox !== 'inbox') return null;
  const active = view.category ?? 'primary';
  return (
    <div className="category-tabs" role="tablist" aria-label="Inbox categories">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={cx('category-tab', active === t.id && 'active')}
          onClick={() => setCategory(t.id)}
        >
          <Icon name={t.icon} size={18} />
          <span className="category-tab-label">{t.label}</span>
          {counts[t.id] > 0 && <span className="category-new">{counts[t.id]} new</span>}
        </button>
      ))}
    </div>
  );
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const parts = highlightParts(text, terms);
  return (
    <>
      {parts.map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
    </>
  );
}

function Row({ thread, terms }: { thread: Thread; terms: string[] }) {
  const view = useMail((s) => s.view);
  const selection = useMail((s) => s.selection);
  const cursorIndex = useMail((s) => s.cursorIndex);
  const listIndex = useIndexOf(thread.id);
  const toggleSelect = useMail((s) => s.toggleSelect);
  const star = useMail((s) => s.star);
  const openThread = useMail((s) => s.openThread);
  const archive = useMail((s) => s.archive);
  const moveToTrash = useMail((s) => s.moveToTrash);
  const markRead = useMail((s) => s.markRead);
  const snooze = useMail((s) => s.snooze);
  const labels = useMail((s) => s.labels);

  const isDraft = thread.labels.includes('DRAFT');
  const selected = selection.includes(thread.id);
  const snoozed = isSnoozed(thread);
  const last = thread.messages[thread.messages.length - 1];
  const customLabels = labels.filter((l) => thread.labels.includes(l.id));
  const hasAttachment =
    thread.messages.some((m) => (m.attachments ?? []).length > 0) || (thread.draftAttachments ?? []).length > 0;

  const inSent = view.kind === 'mailbox' && (view.mailbox === 'sent');
  const sender = isDraft
    ? 'Draft'
    : inSent && last
      ? `To: ${last.to.map((r) => displayName(r)).join(', ')}`
      : last
        ? displayName(last.from)
        : 'Draft';

  const date = snoozed && thread.snoozeUntil
    ? formatSnoozeDate(thread.snoozeUntil)
    : formatRowDate(last ? last.date : thread.updatedAt ?? Date.now());

  return (
    <div
      className={cx(
        'mail-row',
        !thread.read && 'unread',
        selected && 'selected',
        cursorIndex === listIndex && 'cursor',
      )}
      onClick={() => openThread(thread.id)}
      role="row"
      tabIndex={-1}
      aria-label={`${thread.subject} ${thread.read ? '' : '(unread)'}`}
    >
      <div className="row-cell row-check" onClick={(e) => e.stopPropagation()}>
        <button
          className={cx('checkbox', selected && 'checked')}
          aria-label={selected ? 'Deselect conversation' : 'Select conversation'}
          onClick={() => toggleSelect(thread.id)}
        >
          {selected && <Icon name="check" size={14} />}
        </button>
      </div>
      <div className="row-cell row-star" onClick={(e) => e.stopPropagation()}>
        <button
          className={cx('star-btn', thread.starred && 'starred')}
          aria-label={thread.starred ? 'Starred' : 'Not starred'}
          onClick={() => star([thread.id])}
        >
          <Icon name={thread.starred ? 'starFilled' : 'star'} size={18} />
        </button>
      </div>
      <div className={cx('row-cell row-sender', isDraft && 'draft-sender')}>
        <Highlight text={sender} terms={terms} />
        {thread.messages.length > 1 && <span className="row-count">&nbsp;({thread.messages.length})</span>}
      </div>
      <div className="row-cell row-content">
        <span className="row-subject">
          <Highlight text={thread.subject || '(no subject)'} terms={terms} />
        </span>
        <span className="row-dash"> – </span>
        <span className="row-snippet">
          <Highlight text={threadSnippet(thread)} terms={terms} />
        </span>
        {customLabels.length > 0 && (
          <span className="row-labels">
            {customLabels.map((l) => (
              <span key={l.id} className="label-chip" style={{ borderColor: l.color, color: l.color }}>
                {l.name}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="row-cell row-meta">
        {hasAttachment && <Icon name="attach" size={16} className="row-attach" />}
        <span className={cx('row-date', snoozed && 'snoozed-date')}>
          {snoozed && <Icon name="clock" size={14} />}
          {date}
        </span>
      </div>
      <div className="row-actions" onClick={(e) => e.stopPropagation()}>
        {!isDraft && (
          <>
            <button className="icon-btn small" title="Archive" aria-label="Archive" onClick={() => archive([thread.id])}>
              <Icon name="archive" size={18} />
            </button>
            <button className="icon-btn small" title="Delete" aria-label="Delete" onClick={() => moveToTrash([thread.id])}>
              <Icon name="trash" size={18} />
            </button>
            <button
              className="icon-btn small"
              title={thread.read ? 'Mark as unread' : 'Mark as read'}
              aria-label={thread.read ? 'Mark as unread' : 'Mark as read'}
              onClick={() => markRead([thread.id], !thread.read)}
            >
              <Icon name={thread.read ? 'mailUnread' : 'mailRead'} size={18} />
            </button>
            <button
              className="icon-btn small"
              title="Snooze until tomorrow"
              aria-label="Snooze until tomorrow"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(8, 0, 0, 0);
                snooze([thread.id], d.getTime());
              }}
            >
              <Icon name="snooze" size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// lightweight index lookup via context maintained by ListPane render
const IndexCtx = createContext<Map<string, number>>(new Map());
function useIndexOf(id: string): number {
  return useContext(IndexCtx).get(id) ?? -1;
}

const EMPTY_STATES: Record<string, { icon: Parameters<typeof Icon>[0]['name']; title: string; hint: string }> = {
  inbox: { icon: 'inbox', title: 'Your inbox is empty', hint: 'Enjoy the calm — or hit refresh to check for new mail.' },
  starred: { icon: 'star', title: 'No starred messages', hint: 'Stars let you give messages a special status. Click the star on any conversation.' },
  snoozed: { icon: 'clock', title: 'No snoozed conversations', hint: 'Snooze messages to get them out of your inbox until you need them.' },
  sent: { icon: 'sent', title: 'No sent messages', hint: 'Messages you send will appear here.' },
  drafts: { icon: 'drafts', title: 'No saved drafts', hint: 'Start a new message and it will be saved as a draft automatically.' },
  all: { icon: 'mailUnread', title: 'No mail', hint: 'All your conversations live here.' },
  spam: { icon: 'spam', title: 'Hooray, no spam here!', hint: 'Messages identified as spam land in this folder.' },
  trash: { icon: 'trash', title: 'No conversations in Trash', hint: 'Deleted conversations stay here for 30 days.' },
};

function EmptyState({ view }: { view: View }) {
  if (view.kind === 'search') {
    return (
      <div className="empty-state">
        <Icon name="search" size={48} />
        <div className="empty-title">No messages matched your search</div>
        <div className="empty-hint">Try different keywords, or operators like from:, label:, has:attachment</div>
      </div>
    );
  }
  if (view.kind === 'label') {
    return (
      <div className="empty-state">
        <Icon name="label" size={48} />
        <div className="empty-title">No conversations with this label</div>
        <div className="empty-hint">Select conversations and use the label button to organize them.</div>
      </div>
    );
  }
  const st = EMPTY_STATES[view.mailbox] ?? EMPTY_STATES.inbox;
  return (
    <div className="empty-state">
      <Icon name={st.icon} size={48} />
      <div className="empty-title">{st.title}</div>
      <div className="empty-hint">{st.hint}</div>
    </div>
  );
}

export function ListPane() {
  const view = useMail((s) => s.view);
  const threads = useMail((s) => s.threads);
  const labels = useMail((s) => s.labels);
  const page = useMail((s) => s.page);
  const moveToInbox = useMail((s) => s.moveToInbox);
  const emptyTrash = useMail((s) => s.emptyTrash);

  const all = useMemo(() => threadsForView(threads, view, labels), [threads, view, labels]);
  const pageItems = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const terms = useMemo(
    () => (view.kind === 'search' ? searchTermsOf(parseQuery(view.query)) : []),
    [view],
  );

  const indexMap = useMemo(() => new Map(pageItems.map((t, i) => [t.id, i] as const)), [pageItems]);

  const inTrash = view.kind === 'mailbox' && view.mailbox === 'trash';
  const inSpam = view.kind === 'mailbox' && view.mailbox === 'spam';
  const spamIds = inSpam ? all.map((t) => t.id) : [];

  return (
    <div className="list-pane">
      <ListToolbar visibleIds={all.map((t) => t.id)} total={all.length} />
      <CategoryTabs />
      {view.kind === 'search' && (
        <div className="search-banner">
          <Icon name="search" size={16} />
          <span>
            Results for <strong>{view.query}</strong> — {all.length} conversation{all.length === 1 ? '' : 's'}
          </span>
        </div>
      )}
      {inTrash && all.length > 0 && (
        <div className="folder-banner">
          Messages that have been in Trash more than 30 days will be automatically deleted.
          <button className="link-btn" onClick={emptyTrash}>Empty Trash now</button>
        </div>
      )}
      {inSpam && all.length > 0 && (
        <div className="folder-banner">
          Messages in Spam are deleted after 30 days.
          <button className="link-btn" onClick={() => moveToInbox(spamIds)}>Move all to Inbox</button>
        </div>
      )}
      <div className="mail-list" role="listbox" aria-label="Conversations">
        <IndexCtx.Provider value={indexMap}>
          {pageItems.map((t) => (
            <Row key={t.id} thread={t} terms={terms} />
          ))}
        </IndexCtx.Provider>
        {all.length === 0 && <EmptyState view={view} />}
      </div>
      {inTrash === false && view.kind === 'mailbox' && view.mailbox === 'inbox' && all.length > 0 && (
        <div className="list-footer">
          <button className="link-btn" onClick={() => useMail.getState().markAllRead()}>Mark all as read</button>
          <span className="list-footer-note">· {all.filter((t) => !t.read).length} unread</span>
        </div>
      )}
    </div>
  );
}
