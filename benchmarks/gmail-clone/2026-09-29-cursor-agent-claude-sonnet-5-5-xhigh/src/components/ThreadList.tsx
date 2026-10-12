import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Bookmark,
  Check,
  Info,
  Inbox,
  Mail,
  MailOpen,
  Paperclip,
  Star,
  Tag,
  Trash2,
  Users,
  Search as SearchIcon,
  Send,
  FileText,
  Clock,
  CalendarClock,
  OctagonAlert,
  Mails,
} from 'lucide-react';
import { useMail } from '../lib/store';
import { useUI } from '../lib/ui';
import { CATEGORIES, type Category, type Label, type Route } from '../lib/types';
import { participantsLabel, unreadCountForInbox, type ListItem, type ThreadInfo } from '../lib/selectors';
import { formatListDate, formatSize } from '../lib/date';
import { makeSnippet } from '../lib/text';
import {
  archiveThreads,
  deleteForever,
  emptyFolder,
  markRead,
  moveToCategory,
  openDraftItem,
  openThread,
  setImportant,
  toggleStar,
  trashThreads,
  unsnoozeThreads,
  discardCompose,
} from '../lib/actions';
import { hasToken, toggleToken } from '../lib/search';
import { navigate } from '../lib/router';
import { useIsMobile, useNow } from '../lib/hooks';
import type { ListModel } from '../lib/listModel';
import { Avatar, Checkbox, IconButton, LabelChip } from './primitives';
import { SnoozeButton } from './ToolbarActions';
import { DRAG_MIME } from './Sidebar';
import { ME } from '../lib/people';
import { AttachmentIcon } from './AttachmentIcon';

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${escaped.join('|')})`, 'ig');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>))}
    </>
  );
}

const CAT_META: Record<Category, { label: string; icon: React.ReactNode; color: string }> = {
  primary: { label: 'Primary', icon: <Inbox size={20} />, color: 'var(--accent)' },
  promotions: { label: 'Promotions', icon: <Tag size={20} />, color: '#188038' },
  social: { label: 'Social', icon: <Users size={20} />, color: '#1a73e8' },
  updates: { label: 'Updates', icon: <Info size={20} />, color: '#e37400' },
};

export function CategoryTabs({ route }: { route: Route }) {
  const data = useMail();
  const settings = useMail((s) => s.settings);
  const now = useNow(20_000);
  const [dropOn, setDropOn] = useState<Category | null>(null);
  const tabs = CATEGORIES.filter((c) => settings.categories[c]);
  const counts = useMemo(
    () => Object.fromEntries(tabs.map((c) => [c, unreadCountForInbox(data, now, settings, c)])) as Record<Category, number>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.threads, data.messages, now, settings],
  );
  return (
    <div className="tabs" role="tablist" aria-label="Inbox categories">
      {tabs.map((c) => {
        const meta = CAT_META[c];
        const active = route.tab === c;
        return (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={active}
            className={`tab ${active ? 'is-active' : ''} ${dropOn === c ? 'is-drop' : ''}`}
            style={{ '--tab-color': meta.color } as React.CSSProperties}
            onClick={() => {
              useUI.getState().clearSelection();
              navigate({ view: 'inbox', tab: c });
            }}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(DRAG_MIME)) {
                e.preventDefault();
                setDropOn(c);
              }
            }}
            onDragLeave={() => setDropOn(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDropOn(null);
              try {
                const ids = JSON.parse(e.dataTransfer.getData(DRAG_MIME)) as string[];
                moveToCategory(c, ids);
              } catch {
                /* ignore */
              }
            }}
          >
            <span className="tab__icon">{meta.icon}</span>
            <span className="tab__label">{meta.label}</span>
            {counts[c] > 0 ? <span className="tab__badge">{counts[c]} new</span> : null}
          </button>
        );
      })}
    </div>
  );
}

const SEARCH_CHIPS: [string, string][] = [
  ['has:attachment', 'Has attachment'],
  ['newer_than:7d', 'Last 7 days'],
  ['is:unread', 'Unread'],
  ['is:starred', 'Starred'],
  ['in:anywhere', 'Include Spam & Trash'],
];

export function SearchChips({ query }: { query: string }) {
  return (
    <div className="search-chips" aria-label="Refine search">
      {SEARCH_CHIPS.map(([token, label]) => (
        <button
          key={token}
          type="button"
          className={`chip-btn ${hasToken(query, token) ? 'is-on' : ''}`}
          aria-pressed={hasToken(query, token)}
          onClick={() => navigate({ view: 'search', param: toggleToken(query, token) })}
        >
          {hasToken(query, token) ? <Check size={14} /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}

interface RowProps {
  item: Extract<ListItem, { kind: 'thread' }>;
  view: string;
  selected: boolean;
  cursor: boolean;
  anySelected: boolean;
  terms: string[];
  labels: Label[];
  showImportant: boolean;
  showSnippet: boolean;
  density: string;
  mobile: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  now: number;
}

const ThreadRow = memo(function ThreadRow({ item, view, selected, cursor, anySelected, terms, labels, showImportant, showSnippet, density, mobile, onSelect, now }: RowProps) {
  const { info } = item;
  const { thread, unread, starred, attachments } = info;
  const last = item.match ?? info.msgs[info.msgs.length - 1];
  const p = participantsLabel(info, view);
  const chips = thread.labelIds.map((id) => labels.find((l) => l.id === id)).filter(Boolean) as Label[];
  const rowRef = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const touch = useRef<{ x: number; y: number; t: number; active: boolean; timer?: ReturnType<typeof setTimeout>; longPressed: boolean } | null>(null);
  const firstAttachments = info.msgs.flatMap((m) => m.attachments).slice(0, 3);
  const isSnoozed = !!thread.snoozeUntil && thread.snoozeUntil > now;

  useEffect(() => {
    if (cursor) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const canSwipe = mobile && (view === 'inbox' || view === 'starred' || view === 'important' || view === 'label' || view === 'all');

  const onTouchStart = (e: React.TouchEvent) => {
    if (!mobile) return;
    const t = e.touches[0];
    const st = { x: t.clientX, y: t.clientY, t: Date.now(), active: false, longPressed: false } as NonNullable<typeof touch.current>;
    st.timer = setTimeout(() => {
      st.longPressed = true;
      useUI.getState().toggleSelect(thread.id);
      navigator.vibrate?.(10);
    }, 480);
    touch.current = st;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const st = touch.current;
    if (!st) return;
    const t = e.touches[0];
    const ddx = t.clientX - st.x;
    const ddy = t.clientY - st.y;
    if (Math.abs(ddx) > 8 || Math.abs(ddy) > 8) clearTimeout(st.timer);
    if (!canSwipe) return;
    if (!st.active && Math.abs(ddx) > 12 && Math.abs(ddx) > Math.abs(ddy) * 1.5) st.active = true;
    if (st.active) setDx(ddx);
  };
  const onTouchEnd = () => {
    const st = touch.current;
    touch.current = null;
    if (!st) return;
    clearTimeout(st.timer);
    if (st.active && Math.abs(dx) > 110) {
      setDx(dx > 0 ? 500 : -500);
      setTimeout(() => {
        setDx(0);
        archiveThreads([thread.id]);
      }, 160);
    } else setDx(0);
  };

  const click = (e: React.MouseEvent) => {
    if (touch.current?.longPressed) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || (mobile && anySelected)) {
      onSelect(thread.id, e);
      return;
    }
    openThread(thread.id);
  };

  const dragStart = (e: React.DragEvent) => {
    const sel = useUI.getState().selected;
    const ids = sel.includes(thread.id) ? sel : [thread.id];
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(ids));
    e.dataTransfer.setData('text/plain', thread.subject);
    e.dataTransfer.effectAllowed = 'move';
  };

  const snippet = last ? (item.match ? makeSnippet(last.html, 200) : last.snippet) : '';
  const dateLabel = isSnoozed && view === 'snoozed' ? `Until ${formatListDate(thread.snoozeUntil!, now)}` : formatListDate(info.date, now);
  const count = info.msgs.length;
  const draftFlag = info.drafts > 0;
  const senderPerson = last?.from ?? ME;

  return (
    <div
      ref={rowRef}
      role="listitem"
      tabIndex={0}
      id={`row-${thread.id}`}
      aria-current={cursor ? 'true' : undefined}
      data-selected={selected}
      data-thread-id={thread.id}
      className={`row ${unread ? 'is-unread' : 'is-read'} ${selected ? 'is-selected' : ''} ${cursor ? 'is-cursor' : ''} density-${density}`}
      draggable={!mobile}
      onDragStart={dragStart}
      onClick={click}
      onFocus={(e) => {
        if (e.target === e.currentTarget) useUI.getState().setCursor(thread.id);
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === 'o')) {
          e.preventDefault();
          openThread(thread.id);
        }
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {canSwipe ? (
        <div className={`row__swipe ${dx > 0 ? 'is-right' : ''}`} aria-hidden="true">
          <Archive size={22} />
          <span>Archive</span>
        </div>
      ) : null}
      <div className="row__inner" style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: touch.current ? 'none' : 'transform .18s ease' }}>
        <div className="row__lead">
          <Checkbox
            checked={selected}
            label={selected ? 'Deselect conversation' : 'Select conversation'}
            className="row__check"
            onChange={() => undefined}
            onClick={(e) => onSelect(thread.id, e)}
          />
          <button
            type="button"
            className={`star-btn row__star ${starred ? 'is-on' : ''}`}
            aria-label={starred ? 'Starred' : 'Not starred'}
            aria-pressed={starred}
            title={starred ? 'Starred' : 'Not starred'}
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(thread.id);
            }}
          >
            <Star size={18} fill={starred ? 'currentColor' : 'none'} />
          </button>
          {showImportant ? (
            <button
              type="button"
              className={`imp-btn row__imp ${thread.important ? 'is-on' : ''}`}
              aria-label={thread.important ? 'Marked as important' : 'Not important'}
              title={thread.important ? 'Marked as important' : 'Not important'}
              onClick={(e) => {
                e.stopPropagation();
                setImportant(!thread.important, [thread.id]);
              }}
            >
              <Bookmark size={16} fill={thread.important ? 'currentColor' : 'none'} />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className={`row__avatar ${selected ? 'is-selected' : ''}`}
          aria-label={selected ? 'Deselect conversation' : 'Select conversation'}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(thread.id, e);
          }}
        >
          {selected ? (
            <span className="avatar avatar--check" style={{ width: 40, height: 40 }}>
              <Check size={20} />
            </span>
          ) : (
            <Avatar person={senderPerson} size={40} />
          )}
        </button>

        <div className="row__sender">
          <span className="row__sender-text">
            {view === 'sent' ? (
              <Highlight text={p.text} terms={terms} />
            ) : (
              p.parts.map((part, i) => (
                <span key={i} className={part.unread ? 'is-unread' : ''}>
                  <Highlight text={part.name} terms={terms} />
                  {i < p.parts.length - 1 ? ', ' : ''}
                </span>
              ))
            )}
            {count > 1 ? <span className="row__count">{count}</span> : null}
            {draftFlag ? <span className="row__draft">{count > 1 ? ', ' : ''}Draft</span> : null}
          </span>
        </div>

        <div className="row__subject">
          {chips.map((l) => (
            <LabelChip key={l.id} name={l.name} color={l.color} small />
          ))}
          <span className="row__subject-text">
            <Highlight text={thread.subject} terms={terms} />
          </span>
        </div>
        {showSnippet ? (
          <div className="row__snippet">
            <span className="row__dash"> – </span>
            <Highlight text={snippet} terms={terms} />
          </div>
        ) : null}

        {density === 'comfortable' && firstAttachments.length > 0 ? (
          <div className="row__attachments">
            {firstAttachments.map((a) => (
              <span key={a.id} className="att-chip" title={`${a.name} (${formatSize(a.size)})`}>
                <AttachmentIcon kind={a.kind} size={16} />
                <span>{a.name}</span>
              </span>
            ))}
            {attachments > firstAttachments.length ? <span className="att-chip att-chip--more">+{attachments - firstAttachments.length}</span> : null}
          </div>
        ) : null}

        <div className="row__meta">
          {attachments > 0 ? <Paperclip size={16} className="row__clip" aria-label="Has attachment" /> : null}
          <span className="row__date">{dateLabel}</span>
        </div>

        <div className="row__actions" onClick={(e) => e.stopPropagation()}>
          {view !== 'trash' && view !== 'spam' ? (
            <IconButton label="Archive" size="sm" onClick={() => archiveThreads([thread.id])}>
              <Archive size={18} />
            </IconButton>
          ) : null}
          <IconButton label={view === 'trash' ? 'Delete forever' : 'Delete'} size="sm" onClick={() => (view === 'trash' ? deleteForever([thread.id]) : trashThreads([thread.id]))}>
            <Trash2 size={18} />
          </IconButton>
          <IconButton label={unread ? 'Mark as read' : 'Mark as unread'} size="sm" onClick={() => markRead(unread, [thread.id])}>
            {unread ? <MailOpen size={18} /> : <Mail size={18} />}
          </IconButton>
          {view === 'snoozed' ? (
            <IconButton label="Unsnooze" size="sm" onClick={() => unsnoozeThreads([thread.id])}>
              <Clock size={18} />
            </IconButton>
          ) : (
            <SnoozeButton ids={[thread.id]} />
          )}
        </div>
      </div>
    </div>
  );
});

function DraftRow({ item, view, selected, onSelect, mobile }: { item: Extract<ListItem, { kind: 'draft' }>; view: string; selected: boolean; onSelect: (id: string, e: React.MouseEvent) => void; mobile: boolean }) {
  const d = item.draft;
  const snippet = makeSnippet(d.html);
  const to = d.to.map((p) => p.name || p.email);
  const person = d.to[0] ?? ME;
  return (
    <div
      role="listitem"
      tabIndex={0}
      data-draft-id={d.id}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && e.key === 'Enter') {
          e.preventDefault();
          openDraftItem(d.id);
        }
      }}
      className={`row is-read row--draft ${selected ? 'is-selected' : ''}`}
      onClick={(e) => (e.metaKey || e.ctrlKey || e.shiftKey || (mobile && useUI.getState().selected.length) ? onSelect(d.id, e) : openDraftItem(d.id))}
    >
      <div className="row__inner">
        <div className="row__lead">
          <Checkbox checked={selected} label="Select draft" className="row__check" onChange={() => undefined} onClick={(e) => onSelect(d.id, e)} />
          <span className="row__star-spacer" />
        </div>
        <span className="row__avatar">
          <Avatar person={person} size={40} />
        </span>
        <div className="row__sender">
          <span className="row__sender-text">
            {view === 'scheduled' ? (
              <span>To: {to.join(', ') || '(no recipients)'}</span>
            ) : (
              <>
                <span className="row__draft row__draft--solo">Draft</span>
                {to.length ? <span className="row__to"> · {to.join(', ')}</span> : null}
              </>
            )}
          </span>
        </div>
        <div className="row__subject">
          <span className="row__subject-text">{d.subject || '(no subject)'}</span>
        </div>
        <div className="row__snippet">
          <span className="row__dash"> – </span>
          {snippet}
        </div>
        <div className="row__meta">
          {d.attachments.length ? <Paperclip size={16} className="row__clip" /> : null}
          <span className="row__date">{view === 'scheduled' && d.sendAt ? `Sends ${formatListDate(d.sendAt)}` : formatListDate(item.date)}</span>
        </div>
        <div className="row__actions" onClick={(e) => e.stopPropagation()}>
          <IconButton label={view === 'scheduled' ? 'Cancel send' : 'Discard draft'} size="sm" onClick={() => discardCompose(d.id)}>
            <Trash2 size={18} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

const EMPTY: Record<string, { title: string; body: string; icon: React.ReactNode }> = {
  inbox: { title: 'Your inbox is clear', body: 'Nothing new here. Enjoy the quiet, or start a new message.', icon: <Inbox size={44} /> },
  starred: { title: 'No starred messages', body: 'Stars let you give messages a special status to make them easier to find. To star a message, click the star outline beside any message or conversation.', icon: <Star size={44} /> },
  snoozed: { title: 'No snoozed conversations', body: 'Snooze messages to have them reappear in your inbox when you need them.', icon: <Clock size={44} /> },
  important: { title: 'No important conversations', body: 'Messages marked as important will show up here.', icon: <Bookmark size={44} /> },
  sent: { title: 'No sent messages', body: 'Messages you send will appear here.', icon: <Send size={44} /> },
  drafts: { title: 'You don’t have any saved drafts', body: 'Saving a draft allows you to keep a message you aren’t ready to send yet.', icon: <FileText size={44} /> },
  scheduled: { title: 'No scheduled messages', body: 'Use “Schedule send” in the compose window to send a message later.', icon: <CalendarClock size={44} /> },
  all: { title: 'No mail', body: 'Everything you archive ends up here.', icon: <Mails size={44} /> },
  spam: { title: 'Hooray, no spam here!', body: 'Messages that you report as spam appear here.', icon: <OctagonAlert size={44} /> },
  trash: { title: 'No conversations in the Trash', body: 'Deleted conversations appear here for 30 days.', icon: <Trash2 size={44} /> },
  label: { title: 'Nothing with this label', body: 'Apply this label to conversations to see them here.', icon: <Tag size={44} /> },
  search: { title: 'No messages matched your search', body: 'Try different keywords or remove a filter. You can also search across Spam and Trash with in:anywhere.', icon: <SearchIcon size={44} /> },
};

export function ThreadList({ route, model }: { route: Route; model: ListModel }) {
  const selected = useUI((s) => s.selected);
  const cursor = useUI((s) => s.cursor);
  const labels = useMail((s) => s.labels);
  const settings = useMail((s) => s.settings);
  const mobile = useIsMobile();
  const now = useNow(30_000);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const onSelect = (id: string, e: React.MouseEvent) => {
    const ui = useUI.getState();
    if (e.shiftKey && ui.anchor) {
      const ids = model.page.map((i) => i.id);
      const a = ids.indexOf(ui.anchor);
      const b = ids.indexOf(id);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        const range = ids.slice(lo, hi + 1);
        ui.select(Array.from(new Set([...ui.selected, ...range])));
        return;
      }
    }
    ui.toggleSelect(id);
  };

  if (!model.total) {
    const key = route.view === 'search' ? 'search' : route.view;
    const e = EMPTY[key] ?? EMPTY.inbox;
    return (
      <div className="empty" role="status">
        <div className="empty__art">{e.icon}</div>
        <h2>{e.title}</h2>
        <p>{e.body}</p>
        {route.view === 'search' ? (
          <button type="button" className="btn btn--outline" onClick={() => navigate({ view: 'inbox' })}>
            Back to Inbox
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="list" role="list" aria-label={`${route.view} conversations`}>
      {model.page.map((item) =>
        item.kind === 'thread' ? (
          <ThreadRow
            key={item.id}
            item={item}
            view={route.view}
            selected={selectedSet.has(item.id)}
            cursor={cursor === item.id}
            anySelected={selected.length > 0}
            terms={model.terms}
            labels={labels}
            showImportant={settings.showImportant && !mobile}
            showSnippet={settings.showSnippets}
            density={settings.density}
            mobile={mobile}
            onSelect={onSelect}
            now={now}
          />
        ) : (
          <DraftRow key={item.id} item={item} view={route.view} selected={selectedSet.has(item.id)} onSelect={onSelect} mobile={mobile} />
        ),
      )}
      {model.pageCount > 1 || model.total > 0 ? (
        <div className="list__end">
          {route.view === 'trash' || route.view === 'spam' ? null : <span>{model.total > settings.pageSize ? `Showing ${model.start}–${model.end} of ${model.total}` : `${model.total} ${model.total === 1 ? 'item' : 'items'}`}</span>}
        </div>
      ) : null}
    </div>
  );
}

export function FolderBanner({ route, count }: { route: Route; count: number }) {
  if ((route.view !== 'trash' && route.view !== 'spam') || !count) return null;
  const isTrash = route.view === 'trash';
  return (
    <div className="banner">
      <span>
        {isTrash ? 'Messages that have been in Trash more than 30 days will be automatically deleted.' : 'Messages that have been in Spam more than 30 days will be automatically deleted.'}
      </span>
      <button type="button" className="text-btn" onClick={() => emptyFolder(isTrash ? 'trash' : 'spam')}>
        {isTrash ? 'Empty Trash now' : 'Delete all spam messages now'}
      </button>
    </div>
  );
}

export function SelectAllBanner({ model }: { model: ListModel }) {
  const selected = useUI((s) => s.selected);
  const pageIds = model.page.map((i) => i.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  if (!allOnPage || model.total <= pageIds.length) return null;
  const all = selected.length >= model.total;
  return (
    <div className="banner banner--select">
      {all ? (
        <>
          <span>All {model.total} conversations are selected.</span>
          <button type="button" className="text-btn" onClick={() => useUI.getState().clearSelection()}>
            Clear selection
          </button>
        </>
      ) : (
        <>
          <span>All {pageIds.length} conversations on this page are selected.</span>
          <button type="button" className="text-btn" onClick={() => useUI.getState().select(model.items.map((i) => i.id))}>
            Select all {model.total} conversations
          </button>
        </>
      )}
    </div>
  );
}

export type { ThreadInfo };
