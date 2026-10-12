import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Checkbox, Highlight, Icon, IconButton, LabelChip } from './kit';
import { MenuItem, Popover, useAnchor } from './Popover';
import { TriageButtons, SnoozeMenu } from './Triage';
import { useMail } from '../lib/store';
import { clearSelection, confirmDialog, openCompose, setSelection, setUI, toast, toggleSelected, useUI } from '../lib/ui';
import { PAGE_SIZE, selectedRows, uniqueThreadIds, useViewModel, type ViewModel } from '../lib/viewModel';
import {
  CATEGORIES,
  deliveredMessages,
  drafts as draftsOf,
  isMeAddr,
  isUnread,
  listRowsForFolder,
  messageSnippet,
  rowDate,
  senderSummary,
  subjectOf,
  threadSnippet,
  type Row,
} from '../lib/mail';
import { formatListDate, formatShortWhen } from '../lib/dates';
import { folderHref, navigate, hrefFor } from '../lib/router';
import { archive, cancelScheduled, deleteForever, discardDraft, emptyFolder, markRead, moveToInbox, setImportant, tick, toggleStar, trash } from '../lib/actions';
import { searchSnippet } from '../lib/search';
import { useViewport } from '../lib/hooks';
import type { CategoryId, Label, MailState, Settings } from '../lib/types';

const scrollMemory = new Map<string, number>();

/* ------------------------------------------------------------------ */
/* Empty states                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ vm, mail }: { vm: ViewModel; mail: MailState }) {
  let icon = 'inbox';
  let title = 'Nothing here';
  let body = '';
  const v = vm.view;
  if (v.kind === 'search') {
    icon = 'search_off';
    title = 'No messages matched your search';
    body = 'Try different keywords, or use operators like from:, has:attachment, is:unread or newer_than:7d.';
  } else if (v.kind === 'label') {
    icon = 'label';
    title = 'No conversations with this label';
    body = 'To add this label, select conversations and choose it from the Labels menu.';
  } else {
    switch (v.folder) {
      case 'inbox':
        icon = 'inbox';
        if (v.tab && v.tab !== 'primary') {
          title = `Nothing in ${CATEGORIES.find((c) => c.id === v.tab)?.label}`;
          body = 'Messages from this category will show up here.';
        } else {
          title = 'Your inbox is empty';
          body = 'Enjoy the quiet. New messages will appear here.';
        }
        break;
      case 'starred':
        icon = 'star';
        title = 'No starred messages';
        body = 'Stars let you give messages a special status to make them easier to find. Click the star beside any conversation.';
        break;
      case 'snoozed':
        icon = 'schedule';
        title = 'No snoozed messages';
        body = 'Snooze messages to have them reappear in your inbox when you need them.';
        break;
      case 'important':
        icon = 'label_important';
        title = 'No important messages';
        body = 'Messages marked important will show up here.';
        break;
      case 'sent':
        icon = 'send';
        title = 'No sent messages';
        body = 'Messages you send will show up here.';
        break;
      case 'drafts':
        icon = 'draft';
        title = 'You don’t have any saved drafts';
        body = 'Saving a draft lets you keep a message you aren’t ready to send yet.';
        break;
      case 'scheduled':
        icon = 'schedule_send';
        title = 'No scheduled messages';
        body = 'Use “Schedule send” in the composer to send a message later.';
        break;
      case 'all':
        icon = 'mail';
        title = 'No mail';
        break;
      case 'spam':
        icon = 'report';
        title = 'Hooray, no spam here!';
        body = 'Messages reported as spam are removed after 30 days.';
        break;
      case 'trash':
        icon = 'delete';
        title = 'No conversations in Trash';
        body = 'Deleted conversations stay here for 30 days.';
        break;
    }
  }
  const inboxOther =
    v.kind === 'folder' && v.folder === 'inbox' && v.tab === 'primary'
      ? CATEGORIES.filter((c) => c.id !== 'primary' && mail.settings.categoriesEnabled[c.id]).length
      : 0;
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} />
      </div>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {inboxOther > 0 && <p className="empty-hint">Other tabs may still have mail: Promotions, Social and Updates.</p>}
      {v.kind === 'search' && (
        <button type="button" className="btn outline" onClick={() => navigate('#/inbox')}>
          Back to Inbox
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Category tabs                                                       */
/* ------------------------------------------------------------------ */

function CategoryTabs() {
  const vm = useViewModel();
  const mail = useMail();
  const { now } = useUI();
  const cats = mail.settings.categoriesEnabled;
  const enabled = CATEGORIES.filter((c) => cats[c.id]);
  const active = vm.view.kind === 'folder' && vm.view.folder === 'inbox' ? (vm.view.tab ?? 'primary') : null;

  const info = useMemo(() => {
    const out = {} as Record<CategoryId, { count: number; names: string[] }>;
    for (const c of CATEGORIES) {
      const rows = listRowsForFolder(mail, 'inbox', now, c.id).filter((r) => isUnread(r.thread));
      const names: string[] = [];
      for (const r of rows) {
        const last = [...deliveredMessages(r.thread)].reverse().find((m) => !isMeAddr(m.from));
        const n = last?.from.name || last?.from.email || '';
        if (n && !names.includes(n)) names.push(n);
        if (names.length >= 3) break;
      }
      out[c.id] = { count: rows.length, names };
    }
    return out;
  }, [mail, now]);

  if (!active || enabled.length < 2) return null;
  return (
    <div className="cat-tabs" role="tablist" aria-label="Inbox categories">
      {enabled.map((c) => {
        const on = active === c.id;
        const { count, names } = info[c.id];
        return (
          <a
            key={c.id}
            role="tab"
            aria-selected={on}
            href={folderHref('inbox', c.id)}
            className={`cat-tab${on ? ' active' : ''}`}
            style={{ ['--tab' as string]: c.color }}
          >
            <span className="cat-top">
              <Icon name={c.icon} fill={on} />
              <span className="cat-name">{c.label}</span>
              {count > 0 && <span className="cat-badge">{count} new</span>}
            </span>
            {!on && count > 0 && names.length > 0 && <span className="cat-names">{names.join(', ')}</span>}
          </a>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */

function ListToolbar() {
  const vm = useViewModel();
  const ui = useUI();
  const vp = useViewport();
  const selectMenu = useAnchor();
  const [spin, setSpin] = useState(false);
  const rows = vm.pageRows;
  const view = vm.view;
  const folder = view.kind === 'folder' ? view.folder : undefined;
  const selected = selectedRows(vm.rows, ui.selection.keys, ui.selection.allInView);
  const count = ui.selection.allInView ? vm.rows.length : ui.selection.keys.length;
  const pageSel = rows.filter((r) => ui.selection.keys.includes(r.key) || ui.selection.allInView).length;
  const state = pageSel === 0 ? 'unchecked' : pageSel === rows.length ? 'checked' : 'indeterminate';
  const ids = uniqueThreadIds(selected);
  const total = vm.rows.length;
  const start = total ? vm.pageIndex * PAGE_SIZE + 1 : 0;
  const end = Math.min(total, (vm.pageIndex + 1) * PAGE_SIZE);
  const draftsView = folder === 'drafts';
  const scheduledView = folder === 'scheduled';

  const selectWhere = (pred: (r: Row) => boolean) => setSelection(rows.filter(pred).map((r) => r.key));

  const toggleAll = () => {
    if (state === 'unchecked') setSelection(rows.map((r) => r.key));
    else clearSelection();
  };

  const refresh = () => {
    setSpin(true);
    tick(Date.now());
    setUI({ now: Date.now() });
    setTimeout(() => setSpin(false), 700);
  };

  const discardSelected = () => {
    const targets = selected.filter((r) => r.message);
    for (const r of targets) discardDraft(r.message!.id, r.thread.id, { silent: true });
    clearSelection();
    toast(targets.length === 1 ? 'Draft discarded.' : `${targets.length} drafts discarded.`);
  };

  const cancelSelected = () => {
    for (const r of selected) if (r.message) cancelScheduled(r.message.id, r.thread.id);
    clearSelection();
  };

  const hasSelection = count > 0;
  const pager = total > 0 && (
    <div className="pager">
      <span className="pager-text" aria-live="polite">
        {start}–{end} of {total}
      </span>
      <IconButton
        small
        icon="chevron_left"
        label="Newer"
        disabled={vm.pageIndex === 0}
        onClick={() => navigate(hrefFor(view, undefined, vm.pageIndex - 1))}
      />
      <IconButton
        small
        icon="chevron_right"
        label="Older"
        disabled={vm.pageIndex >= vm.pageCount - 1}
        onClick={() => navigate(hrefFor(view, undefined, vm.pageIndex + 1))}
      />
    </div>
  );

  if (vp === 'mobile' && hasSelection) {
    return (
      <div className="toolbar selection-mode">
        <IconButton icon="close" label="Clear selection" onClick={clearSelection} />
        <span className="sel-count">{count}</span>
        <span className="tb-spacer" />
        {draftsView ? (
          <IconButton icon="delete" label="Discard drafts" onClick={discardSelected} />
        ) : scheduledView ? (
          <IconButton icon="cancel_schedule_send" label="Cancel send" onClick={cancelSelected} />
        ) : (
          <TriageButtons ids={ids} view={view} compact />
        )}
      </div>
    );
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Conversation actions">
      <div className="tb-select">
        <Checkbox
          state={state}
          label={state === 'checked' ? 'Deselect all' : 'Select all'}
          onChange={toggleAll}
          className="tb-check"
        />
        <button type="button" className="tb-caret" aria-label="Select options" onClick={selectMenu.toggle} aria-expanded={selectMenu.open}>
          <Icon name="arrow_drop_down" />
        </button>
        {selectMenu.open && (
          <Popover anchor={selectMenu.el} onClose={selectMenu.close}>
            <MenuItem label="All" onClick={() => selectWhere(() => true)} />
            <MenuItem label="None" onClick={clearSelection} />
            <MenuItem label="Read" onClick={() => selectWhere((r) => !isUnread(r.thread))} />
            <MenuItem label="Unread" onClick={() => selectWhere((r) => isUnread(r.thread))} />
            <MenuItem label="Starred" onClick={() => selectWhere((r) => r.thread.starred)} />
            <MenuItem label="Unstarred" onClick={() => selectWhere((r) => !r.thread.starred)} />
          </Popover>
        )}
      </div>

      {hasSelection ? (
        <>
          {draftsView ? (
            <button type="button" className="btn text tb-text" onClick={discardSelected}>
              <Icon name="delete" size="sm" /> Discard drafts
            </button>
          ) : scheduledView ? (
            <button type="button" className="btn text tb-text" onClick={cancelSelected}>
              <Icon name="cancel_schedule_send" size="sm" /> Cancel send
            </button>
          ) : (
            <TriageButtons ids={ids} view={view} compact={vp !== 'desktop'} />
          )}
          <span className="sel-count-inline">{count} selected</span>
        </>
      ) : (
        <>
          <IconButton icon="refresh" label="Refresh" onClick={refresh} className={spin ? 'spin' : ''} />
          <MoreListMenu />
        </>
      )}
      <span className="tb-spacer" />
      {pager}
    </div>
  );
}

function MoreListMenu() {
  const vm = useViewModel();
  const menu = useAnchor();
  const ids = uniqueThreadIds(vm.rows);
  const anyUnread = vm.rows.some((r) => isUnread(r.thread));
  return (
    <>
      <IconButton icon="more_vert" label="More" onClick={menu.toggle} active={menu.open} />
      {menu.open && (
        <Popover anchor={menu.el} onClose={menu.close}>
          <MenuItem
            icon="drafts"
            label="Mark all as read"
            disabled={!anyUnread}
            onClick={() => {
              markRead(ids, true);
            }}
          />
          <MenuItem icon="checklist" label="Select all" onClick={() => setSelection(vm.pageRows.map((r) => r.key))} />
        </Popover>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

interface RowProps {
  row: Row;
  selected: boolean;
  cursor: boolean;
  vm: ViewModel;
  labels: Label[];
  settings: Settings;
  now: number;
  mobile: boolean;
  onOpen: (r: Row) => void;
}

const ThreadRow = memo(function ThreadRow({ row, selected, cursor, vm, labels, settings, now, mobile, onOpen }: RowProps) {
  const t = row.thread;
  const view = vm.view;
  const folder = view.kind === 'folder' ? view.folder : undefined;
  const isDraftRow = folder === 'drafts';
  const isSchedRow = folder === 'scheduled';
  const unread = !isDraftRow && !isSchedRow && isUnread(t);
  const snooze = useAnchor();

  const parts = useMemo(() => {
    if (isDraftRow) return [{ name: 'Draft', unread: false, draft: true }];
    if (isSchedRow || folder === 'sent') return senderSummary(t, 'sent').map((p) => ({ ...p, draft: false }));
    const base = senderSummary(t, 'received').map((p) => ({ ...p, draft: false }));
    if (draftsOf(t).length) base.push({ name: ', ', unread: false, draft: false }, { name: draftsOf(t).length > 1 ? `Drafts (${draftsOf(t).length})` : 'Draft', unread: false, draft: true });
    return base;
  }, [t, isDraftRow, isSchedRow, folder]);

  const delivered = deliveredMessages(t).length;
  const snippet = useMemo(() => {
    if (row.message) return messageSnippet(row.message, 140);
    if (view.kind === 'search') return searchSnippet(t, vm.highlight, 150);
    return threadSnippet(t, 140);
  }, [t, row.message, view.kind === 'search', vm.highlight]); // eslint-disable-line react-hooks/exhaustive-deps

  const rowLabels = t.labelIds.map((id) => labels.find((l) => l.id === id)).filter(Boolean) as Label[];
  const hasAtt = t.messages.some((m) => m.attachments.length && !m.draft);
  const subject = subjectOf(t);
  const hl = view.kind === 'search' ? vm.highlight : [];

  let dateText = formatListDate(rowDate(row), now);
  let dateIcon: string | undefined;
  if (isSchedRow && row.message?.scheduledAt) {
    dateText = formatShortWhen(row.message.scheduledAt, now);
    dateIcon = 'schedule_send';
  } else if (t.snoozedUntil && t.snoozedUntil > now && (folder === 'snoozed' || view.kind !== 'folder')) {
    dateText = formatShortWhen(t.snoozedUntil, now);
    dateIcon = 'schedule';
  }

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const inTrash = folder === 'trash';

  const nameNodes = parts.map((p, i) => (
    <span key={i} className={p.draft ? 'draft-tag' : p.unread ? 'unread-name' : undefined}>
      <Highlight text={p.name} terms={hl} />
    </span>
  ));

  const classes = ['row', unread ? 'unread' : 'read', selected ? 'selected' : '', cursor ? 'cursor' : ''].filter(Boolean).join(' ');

  if (mobile) {
    return (
      <div
        className={`${classes} mrow`}
        role="option"
        aria-selected={selected}
        data-key={row.key}
        onClick={() => onOpen(row)}
      >
        <button
          type="button"
          className="mrow-avatar"
          aria-label={selected ? 'Deselect conversation' : 'Select conversation'}
          onClick={(e) => {
            stop(e);
            toggleSelected(row.key);
          }}
        >
          {selected ? (
            <span className="avatar sel-avatar">
              <Icon name="check" />
            </span>
          ) : (
            (() => {
              const first = isDraftRow || folder === 'sent' || isSchedRow ? t.messages[t.messages.length - 1] : ([...deliveredMessages(t)].reverse().find((m) => !isMeAddr(m.from)) ?? t.messages[t.messages.length - 1]);
              const a = isDraftRow || folder === 'sent' || isSchedRow ? (first.to[0] ?? first.from) : first.from;
              return <Avatar name={a.name || a.email} email={a.email} size={40} />;
            })()
          )}
        </button>
        <div className="mrow-body">
          <div className="mrow-line1">
            <span className="mrow-sender">
              {nameNodes}
              {delivered > 1 && <span className="row-count"> {delivered}</span>}
            </span>
            <span className="mrow-date">
              {dateIcon && <Icon name={dateIcon} size="xs" />}
              {dateText}
            </span>
          </div>
          <div className="mrow-line2">
            <span className="mrow-subject">
              <Highlight text={subject} terms={hl} />
            </span>
            {hasAtt && <Icon name="attach_file" size="sm" className="row-att" />}
          </div>
          <div className="mrow-line3">
            {settings.previewSnippets ? (
              <span className="mrow-snippet">
                <Highlight text={snippet} terms={hl} />
              </span>
            ) : null}
            {rowLabels.length > 0 && (
              <span className="mrow-chips">
                {rowLabels.slice(0, 2).map((l) => (
                  <LabelChip key={l.id} label={l} />
                ))}
              </span>
            )}
          </div>
        </div>
        {!isDraftRow && (
          <button
            type="button"
            className="row-star mrow-star"
            aria-label={t.starred ? 'Remove star' : 'Add star'}
            aria-pressed={t.starred}
            onClick={(e) => {
              stop(e);
              toggleStar([t.id]);
            }}
          >
            <Icon name="star" fill={t.starred} className={t.starred ? 'starred' : ''} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={classes} role="option" aria-selected={selected} data-key={row.key} onClick={() => onOpen(row)}>
      <Checkbox
        state={selected ? 'checked' : 'unchecked'}
        label={selected ? 'Deselect conversation' : 'Select conversation'}
        onChange={() => toggleSelected(row.key)}
        className="row-check"
      />
      {isDraftRow ? (
        <span className="row-star-spacer" />
      ) : (
        <button
          type="button"
          className="row-star"
          aria-label={t.starred ? 'Remove star' : 'Add star'}
          aria-pressed={t.starred}
          data-tip={t.starred ? 'Starred' : 'Not starred'}
          onClick={(e) => {
            stop(e);
            toggleStar([t.id]);
          }}
        >
          <Icon name="star" fill={t.starred} className={t.starred ? 'starred' : ''} />
        </button>
      )}
      {isDraftRow || isSchedRow ? (
        <span className="row-imp-spacer" />
      ) : (
        <button
          type="button"
          className={`row-imp${t.important ? ' on' : ''}`}
          aria-label={t.important ? 'Mark as not important' : 'Mark as important'}
          aria-pressed={t.important}
          data-tip={t.important ? 'Important' : 'Not important'}
          onClick={(e) => {
            stop(e);
            setImportant([t.id], !t.important);
          }}
        >
          <Icon name="label_important" fill={t.important} size="sm" />
        </button>
      )}
      <span className="row-sender">
        <span className="row-sender-names">{nameNodes}</span>
        {delivered > 1 && <span className="row-count">{delivered}</span>}
      </span>
      <span className="row-main">
        {rowLabels.slice(0, 3).map((l) => (
          <LabelChip key={l.id} label={l} />
        ))}
        <span className="row-subject">
          <Highlight text={subject} terms={hl} />
        </span>
        {settings.previewSnippets && snippet && (
          <span className="row-snippet">
            <span className="row-dash"> – </span>
            <Highlight text={snippet} terms={hl} />
          </span>
        )}
      </span>
      {hasAtt && <Icon name="attach_file" size="sm" className="row-att" />}
      <span className="row-date">
        {dateIcon && <Icon name={dateIcon} size="xs" />}
        {dateText}
      </span>
      {settings.hoverActions && !isDraftRow && !isSchedRow && (
        <span className="row-actions" onClick={stop}>
          {inTrash ? (
            <>
              <IconButton small icon="move_to_inbox" label="Move to Inbox" onClick={() => moveToInbox([t.id])} />
              <IconButton
                small
                icon="delete_forever"
                label="Delete forever"
                onClick={() =>
                  confirmDialog({ title: 'Delete forever?', body: 'This conversation will be permanently deleted.', confirmLabel: 'Delete forever', danger: true }, () => deleteForever([t.id]))
                }
              />
            </>
          ) : (
            <>
              {t.inbox && <IconButton small icon="archive" label="Archive" onClick={() => archive([t.id])} />}
              <IconButton small icon="delete" label="Delete" onClick={() => trash([t.id])} />
              <IconButton small icon={unread ? 'drafts' : 'mark_email_unread'} label={unread ? 'Mark as read' : 'Mark as unread'} onClick={() => markRead([t.id], unread)} />
              <IconButton small icon="schedule" label="Snooze" onClick={snooze.toggle} active={snooze.open} />
            </>
          )}
        </span>
      )}
      {snooze.open && <SnoozeMenu anchor={snooze.el} ids={[t.id]} onClose={snooze.close} />}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Pane                                                                */
/* ------------------------------------------------------------------ */

export function ListPane({ compactSplit }: { compactSplit?: boolean }) {
  const vm = useViewModel();
  const mail = useMail();
  const ui = useUI();
  const vp = useViewport();
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobile = vp === 'mobile';
  const view = vm.view;
  const folder = view.kind === 'folder' ? view.folder : undefined;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = scrollMemory.get(vm.viewKey + vm.pageIndex) ?? 0;
    return () => {
      if (el) scrollMemory.set(vm.viewKey + vm.pageIndex, el.scrollTop);
    };
  }, [vm.viewKey, vm.pageIndex]);

  useEffect(() => {
    if (!ui.cursor) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(ui.cursor)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [ui.cursor]);

  const onOpen = (r: Row) => {
    setUI({ cursor: r.key });
    if (folder === 'drafts' && r.message) {
      const replyish = r.thread.messages.some((m) => !m.draft);
      openCompose({ draftId: r.message.id, threadId: r.thread.id, mode: replyish ? 'reply' : 'new' });
      return;
    }
    navigate(vm.hrefFor(r.thread.id));
  };

  const selectedSet = useMemo(() => new Set(ui.selection.keys), [ui.selection.keys]);
  const allPageSelected = vm.pageRows.length > 0 && vm.pageRows.every((r) => selectedSet.has(r.key));
  const showSelectAllBanner = !ui.selection.allInView && allPageSelected && vm.rows.length > vm.pageRows.length;
  const trashOrSpam = folder === 'trash' || folder === 'spam';
  const scopeName = view.kind === 'folder' ? (folder ? mailScope(folder) : '') : view.kind === 'label' ? vm.title : 'search results';

  return (
    <section className={`list-pane${compactSplit ? ' in-split' : ''}`} aria-label={vm.title}>
      <ListToolbar />
      <CategoryTabs />
      <div className="list-scroll" ref={scrollRef}>
        {showSelectAllBanner && (
          <div className="banner select-banner">
            All {vm.pageRows.length} conversations on this page are selected.
            <button type="button" className="link-btn" onClick={() => setSelection(vm.rows.map((r) => r.key), true)}>
              Select all {vm.rows.length} conversations in {scopeName}
            </button>
          </div>
        )}
        {ui.selection.allInView && (
          <div className="banner select-banner">
            All {vm.rows.length} conversations in {scopeName} are selected.
            <button type="button" className="link-btn" onClick={clearSelection}>
              Clear selection
            </button>
          </div>
        )}
        {trashOrSpam && vm.rows.length > 0 && (
          <div className="banner trash-banner">
            <span>
              {folder === 'trash'
                ? 'Messages that have been in Trash more than 30 days will be automatically deleted.'
                : 'Messages that have been in Spam more than 30 days will be automatically deleted.'}
            </span>
            <button
              type="button"
              className="link-btn"
              onClick={() =>
                confirmDialog(
                  {
                    title: folder === 'trash' ? 'Empty Trash?' : 'Delete all spam?',
                    body: `All ${vm.rows.length} conversations will be permanently deleted. This can’t be undone.`,
                    confirmLabel: 'Delete forever',
                    danger: true,
                  },
                  () => emptyFolder(folder as 'trash' | 'spam'),
                )
              }
            >
              {folder === 'trash' ? 'Empty Trash now' : 'Delete all spam messages now'}
            </button>
          </div>
        )}
        {vm.view.kind === 'search' && (
          <div className="search-summary">
            {vm.rows.length} result{vm.rows.length === 1 ? '' : 's'} for <strong>{vm.view.query}</strong>
          </div>
        )}
        {vm.pageRows.length === 0 ? (
          <EmptyState vm={vm} mail={mail} />
        ) : (
          <div role="listbox" aria-multiselectable="true" aria-label={vm.title} className="rows">
            {vm.pageRows.map((r) => (
              <ThreadRow
                key={r.key}
                row={r}
                selected={ui.selection.allInView || selectedSet.has(r.key)}
                cursor={ui.cursor === r.key}
                vm={vm}
                labels={mail.labels}
                settings={mail.settings}
                now={ui.now}
                mobile={mobile}
                onOpen={onOpen}
              />
            ))}
          </div>
        )}
        {vm.pageRows.length > 0 && (
          <div className="list-foot">
            {vm.rows.length} conversation{vm.rows.length === 1 ? '' : 's'} · Local mailbox, stored in this browser
          </div>
        )}
      </div>
    </section>
  );
}

function mailScope(folder: string): string {
  const names: Record<string, string> = { inbox: 'Inbox', starred: 'Starred', snoozed: 'Snoozed', important: 'Important', sent: 'Sent', drafts: 'Drafts', scheduled: 'Scheduled', all: 'All Mail', spam: 'Spam', trash: 'Trash' };
  return names[folder] ?? folder;
}

