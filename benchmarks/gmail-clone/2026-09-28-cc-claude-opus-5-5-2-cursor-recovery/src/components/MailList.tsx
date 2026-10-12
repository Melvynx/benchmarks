import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  MdAddTask, MdArrowDropDown, MdCheck, MdChevronLeft, MdChevronRight, MdClose, MdInbox, MdLabelImportant,
  MdLabelImportantOutline, MdMoreVert, MdNotificationsOff, MdOutlineArchive, MdOutlineCancelScheduleSend, MdOutlineDelete,
  MdOutlineDeleteForever, MdOutlineDrafts, MdOutlineDriveFileMove, MdOutlineInfo, MdOutlineLabel, MdOutlineLocalOffer,
  MdOutlineMarkEmailUnread, MdOutlineMoveToInbox, MdOutlineReport, MdOutlineSchedule, MdOutlineStarBorder,
  MdPeopleOutline, MdRefresh, MdStar, MdOutlineMailOutline, MdFilterList,
} from 'react-icons/md';
import type { Attachment, Category, Thread } from '../data/types';
import { useIsMobile, useNow } from '../hooks';
import { cancelScheduled, composeNew, discardDrafts, openDraft, openThread, runAction, type BulkAction } from '../lib/actions';
import { firstName } from '../lib/format';
import { listRoute, navigate, type Route, type SystemFolder } from '../lib/router';
import { parseQuery, tokenize } from '../lib/search';
import { useMail } from '../store/mail';
import { FOLDER_NAMES, computeCounts, folderTitle, labelMap, rowsForRoute, type Row } from '../store/selectors';
import { useUI } from '../store/ui';
import { MailRow } from './MailRow';
import { LabelMenu, MoveMenu, SnoozeMenu } from './menus';
import { Checkbox, IconButton, Menu, MenuDivider, MenuItem, useAnchor } from './primitives';

type ListRoute = Exclude<Route, { view: 'settings' }>;

const TABS: { id: Category; label: string; icon: IconType; color: string }[] = [
  { id: 'primary', label: 'Primary', icon: MdInbox, color: 'var(--tab-primary)' },
  { id: 'promotions', label: 'Promotions', icon: MdOutlineLocalOffer, color: 'var(--tab-promotions)' },
  { id: 'social', label: 'Social', icon: MdPeopleOutline, color: 'var(--tab-social)' },
  { id: 'updates', label: 'Updates', icon: MdOutlineInfo, color: 'var(--tab-updates)' },
];

function folderOf(route: ListRoute): SystemFolder | 'label' | 'search' {
  if (route.view === 'folder') return route.folder;
  return route.view;
}

export function useListRows(route: ListRoute) {
  const now = useNow(20_000);
  const threads = useMail((s) => s.threads);
  const drafts = useMail((s) => s.drafts);
  const labels = useMail((s) => s.labels);
  const settings = useMail((s) => s.settings);
  const base = listRoute(route) as ListRoute;
  const rows = useMemo(
    () => rowsForRoute({ threads, drafts, labels, settings }, base, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threads, drafts, labels, settings, JSON.stringify(base), now],
  );
  return { rows, now };
}

export function MailList({ route, split }: { route: ListRoute; split?: boolean }) {
  const mobile = useIsMobile();
  const { rows, now } = useListRows(route);
  const threads = useMail((s) => s.threads);
  const drafts = useMail((s) => s.drafts);
  const labels = useMail((s) => s.labels);
  const settings = useMail((s) => s.settings);
  const selected = useUI((s) => s.selected);
  const selectAllMatching = useUI((s) => s.selectAllMatching);
  const cursorId = useUI((s) => s.cursorId);
  const page = useUI((s) => s.page);
  const scrollRef = useRef<HTMLDivElement>(null);
  const folder = folderOf(route);
  const layout = mobile || split ? 'stacked' : 'wide';
  const pageSize = settings.pageSize;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const pageRows = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const lmap = useMemo(() => labelMap(labels), [labels]);
  const terms = useMemo(() => (route.view === 'search' ? parseQuery(route.query).terms : []), [route]);
  const draftThreads = useMemo(() => new Set(Object.values(drafts).filter((d) => d.threadId && !d.scheduledAt && !d.outgoing).map((d) => d.threadId!)), [drafts]);
  const key = JSON.stringify(listRoute(route));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [key, safePage]);

  useEffect(() => {
    if (page !== safePage) useUI.getState().setPage(safePage);
  }, [page, safePage]);

  const selectedIds = selectAllMatching ? rows.map((r) => r.id) : pageRows.filter((r) => selected[r.id]).map((r) => r.id);
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected[r.id]);
  const someOnPage = pageRows.some((r) => selected[r.id]);

  const onSelect = useCallback(
    (id: string, e: ReactMouseEvent) => {
      const ui = useUI.getState();
      const ids = pageRows.map((r) => r.id);
      if (e.shiftKey && ui.anchorId && ids.includes(ui.anchorId)) {
        const a = ids.indexOf(ui.anchorId);
        const b = ids.indexOf(id);
        const range = ids.slice(Math.min(a, b), Math.max(a, b) + 1);
        ui.setSelected(range, !ui.selected[id]);
      } else {
        ui.toggleSelected(id);
        ui.setAnchor(id);
      }
    },
    [pageRows],
  );

  const onOpen = useCallback(
    (row: Row) => {
      if (Object.keys(useUI.getState().selected).length && mobile) {
        useUI.getState().toggleSelected(row.id);
        return;
      }
      if (row.kind === 'draft') {
        if (row.draft.scheduledAt) navigate({ view: 'folder', folder: 'scheduled', threadId: row.id });
        else openDraft(row.id);
        return;
      }
      openThread(row.id, listRoute(route));
    },
    [route, mobile],
  );

  const onOpenAttachment = useCallback((list: Attachment[], index: number) => {
    useUI.getState().set({ viewer: { attachments: list, index } });
  }, []);

  const showTabs = route.view === 'folder' && route.folder === 'inbox' && settings.categories && !mobile;
  const title = route.view === 'folder' && route.folder === 'inbox' && settings.categories && route.category && route.category !== 'primary'
    ? TABS.find((t) => t.id === route.category)!.label
    : folderTitle(route, labels);

  return (
    <section className={`list ${split ? 'is-split' : ''}`} aria-label={title}>
      <ListToolbar
        route={route}
        rows={rows}
        pageRows={pageRows}
        selectedIds={selectedIds}
        allOnPage={allOnPage}
        someOnPage={someOnPage}
        page={safePage}
        pageSize={pageSize}
        title={title}
      />
      <div className="list-scroll" ref={scrollRef}>
        {showTabs && <CategoryTabs route={route} now={now} />}
        {route.view === 'search' && <SearchChips query={route.query} count={rows.length} />}
        {mobile && selectedIds.length === 0 && <div className="list-title">{title}</div>}
        {allOnPage && rows.length > pageRows.length && (
          <div className="select-banner">
            {selectAllMatching ? (
              <>
                All <b>{rows.length}</b> conversations in {title} are selected.{' '}
                <button type="button" className="link-btn" onClick={() => useUI.getState().clearSelection()}>Clear selection</button>
              </>
            ) : (
              <>
                All <b>{pageRows.length}</b> conversations on this page are selected.{' '}
                <button type="button" className="link-btn" onClick={() => useUI.getState().setSelectAllMatching(true)}>
                  Select all {rows.length} conversations in {title}
                </button>
              </>
            )}
          </div>
        )}
        <FolderNotice route={route} rows={rows} />
        {pageRows.length === 0 ? (
          <EmptyState route={route} />
        ) : (
          <div className="rows" role="grid" aria-label={`${title} conversations`}>
            {pageRows.map((row) => {
              const el = (
                <MailRow
                  key={row.id}
                  row={row}
                  selected={!!selected[row.id] || selectAllMatching}
                  cursor={cursorId === row.id}
                  layout={layout}
                  density={settings.density}
                  labels={lmap}
                  folder={folder}
                  currentLabel={route.view === 'label' ? route.labelId : undefined}
                  terms={terms}
                  hasDraft={row.kind === 'thread' && draftThreads.has(row.id) && folder !== 'drafts'}
                  importance={settings.importanceMarkers}
                  hoverActions={settings.hoverActions && !mobile}
                  now={now}
                  onSelect={onSelect}
                  onOpen={onOpen}
                  onOpenAttachment={onOpenAttachment}
                />
              );
              return mobile && row.kind === 'thread' ? <SwipeRow key={row.id} thread={threads[row.id]}>{el}</SwipeRow> : el;
            })}
          </div>
        )}
        {pageRows.length > 0 && !mobile && <ListFooter />}
      </div>
      {mobile && <MobileFab />}
    </section>
  );
}

/* ---------------- Toolbar ---------------- */

function ListToolbar({
  route, rows, pageRows, selectedIds, allOnPage, someOnPage, page, pageSize, title,
}: {
  route: ListRoute;
  rows: Row[];
  pageRows: Row[];
  selectedIds: string[];
  allOnPage: boolean;
  someOnPage: boolean;
  page: number;
  pageSize: number;
  title: string;
}) {
  const mobile = useIsMobile();
  const threads = useMail((s) => s.threads);
  const selectMenu = useAnchor<HTMLButtonElement>();
  const moreMenu = useAnchor<HTMLButtonElement>();
  const labelMenu = useAnchor<HTMLButtonElement>();
  const moveMenu = useAnchor<HTMLButtonElement>();
  const snoozeMenu = useAnchor<HTMLButtonElement>();
  const [spinning, setSpinning] = useState(false);
  const folder = folderOf(route);
  const isDrafts = folder === 'drafts' || folder === 'scheduled';
  const n = selectedIds.length;
  const selThreads = selectedIds.map((id) => threads[id]).filter((t): t is Thread => !!t);
  const ui = useUI.getState;

  const selectWhere = (pred: (r: Row) => boolean) => {
    ui().clearSelection();
    ui().setSelected(pageRows.filter(pred).map((r) => r.id), true);
    selectMenu.close();
  };

  const act = (a: BulkAction) => runAction(selectedIds, a);
  const refresh = () => {
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 700);
    useMail.getState().tick(Date.now());
  };

  const start = rows.length ? page * pageSize + 1 : 0;
  const end = Math.min(rows.length, (page + 1) * pageSize);
  const anyUnread = selThreads.some((t) => t.unread);
  const anyInbox = selThreads.some((t) => t.inInbox && !t.trashed && !t.spam);
  const allStarred = selThreads.length > 0 && selThreads.every((t) => t.starred);
  const allImportant = selThreads.length > 0 && selThreads.every((t) => t.important);
  const allMuted = selThreads.length > 0 && selThreads.every((t) => t.muted);

  const addTasks = () => {
    const mail = useMail.getState();
    for (const t of selThreads) mail.addTask(t.subject, t.id);
    ui().clearSelection();
    ui().showToast(selThreads.length === 1 ? 'Added to Tasks.' : `${selThreads.length} tasks added.`, [
      { label: 'View', run: () => useMail.getState().updateSettings({ sidePanel: 'tasks' }) },
    ]);
  };

  const markAllRead = () => {
    moreMenu.close();
    const ids = rows.filter((r) => r.kind === 'thread' && r.thread.unread).map((r) => r.id);
    if (!ids.length) {
      ui().showToast(`No unread conversations in ${title}.`);
      return;
    }
    runAction(ids, 'read');
    ui().showToast(ids.length === 1 ? '1 conversation marked as read.' : `${ids.length} conversations marked as read.`);
  };

  const selectionActions: ReactNode = (() => {
    if (!n) return null;
    if (isDrafts) {
      return folder === 'scheduled' ? (
        <IconButton icon={MdOutlineCancelScheduleSend} label="Cancel send" onClick={() => { selectedIds.forEach(cancelScheduled); ui().clearSelection(); }} />
      ) : (
        <button type="button" className="btn btn-text btn-sm" onClick={() => discardDrafts(selectedIds)}>Discard drafts</button>
      );
    }
    if (folder === 'trash') {
      return (
        <>
          <button type="button" className="btn btn-text btn-sm" onClick={() => act('deleteForever')}>Delete forever</button>
          <IconButton icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={() => act('inbox')} />
          <IconButton icon={MdOutlineLabel} label="Labels" onClick={labelMenu.toggle} active={labelMenu.open} />
        </>
      );
    }
    if (folder === 'spam') {
      return (
        <>
          <button type="button" className="btn btn-text btn-sm" onClick={() => act('deleteForever')}>Delete forever</button>
          <button type="button" className="btn btn-text btn-sm" onClick={() => act('notSpam')}>Not spam</button>
        </>
      );
    }
    return (
      <>
        {anyInbox || folder === 'inbox' ? (
          <IconButton icon={MdOutlineArchive} label="Archive" onClick={() => act('archive')} />
        ) : (
          <IconButton icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={() => act('inbox')} />
        )}
        {!mobile && <IconButton icon={MdOutlineReport} label="Report spam" onClick={() => act('spam')} />}
        <IconButton icon={MdOutlineDelete} label="Delete" onClick={() => act('trash')} />
        <span className="tb-sep" />
        <IconButton
          icon={anyUnread ? MdOutlineDrafts : MdOutlineMarkEmailUnread}
          label={anyUnread ? 'Mark as read' : 'Mark as unread'}
          onClick={() => act(anyUnread ? 'read' : 'unread')}
        />
        {!mobile && folder !== 'snoozed' && <IconButton icon={MdOutlineSchedule} label="Snooze" onClick={snoozeMenu.toggle} active={snoozeMenu.open} />}
        {folder === 'snoozed' && <button type="button" className="btn btn-text btn-sm" onClick={() => act('unsnooze')}>Unsnooze</button>}
        {!mobile && <IconButton icon={MdAddTask} label="Add to Tasks" onClick={addTasks} />}
        {!mobile && <span className="tb-sep" />}
        {!mobile && <IconButton icon={MdOutlineDriveFileMove} label="Move to" onClick={moveMenu.toggle} active={moveMenu.open} />}
        {!mobile && <IconButton icon={MdOutlineLabel} label="Labels" onClick={labelMenu.toggle} active={labelMenu.open} />}
      </>
    );
  })();

  if (mobile && n > 0) {
    return (
      <div className="toolbar toolbar-mobile-select">
        <IconButton icon={MdClose} label="Clear selection" onClick={() => ui().clearSelection()} />
        <span className="tb-count">{n}</span>
        <div className="tb-actions">{selectionActions}</div>
        <IconButton icon={MdMoreVert} label="More" onClick={moreMenu.toggle} active={moreMenu.open} />
        <SelectionMore anchor={moreMenu} ids={selectedIds} allStarred={allStarred} allImportant={allImportant} allMuted={allMuted} extra={
          <>
            <MenuItem icon={MdOutlineDriveFileMove} onSelect={() => { moreMenu.close(); moveMenu.setAnchor(moreMenu.anchor); }}>Move to</MenuItem>
            <MenuItem icon={MdOutlineLabel} onSelect={() => { moreMenu.close(); labelMenu.setAnchor(moreMenu.anchor); }}>Label</MenuItem>
            <MenuItem icon={MdOutlineSchedule} onSelect={() => { moreMenu.close(); snoozeMenu.setAnchor(moreMenu.anchor); }}>Snooze</MenuItem>
            <MenuItem icon={MdOutlineReport} onSelect={() => { moreMenu.close(); act('spam'); }}>Report spam</MenuItem>
          </>
        } />
        <LabelMenu anchor={labelMenu.anchor} open={labelMenu.open} onClose={labelMenu.close} ids={selectedIds} />
        <MoveMenu anchor={moveMenu.anchor} open={moveMenu.open} onClose={moveMenu.close} ids={selectedIds} exclude={folder === 'inbox' ? 'inbox' : undefined} />
        <SnoozeMenu anchor={snoozeMenu.anchor} open={snoozeMenu.open} onClose={snoozeMenu.close} ids={selectedIds} />
      </div>
    );
  }

  if (mobile) return null;

  return (
    <div className={`toolbar ${n ? 'has-selection' : ''}`} role="toolbar" aria-label="Conversation actions">
      <div className="tb-select">
        <Checkbox
          checked={allOnPage}
          indeterminate={someOnPage && !allOnPage}
          label={allOnPage ? 'Deselect all' : 'Select all'}
          onChange={() => {
            if (someOnPage) ui().clearSelection();
            else ui().setSelected(pageRows.map((r) => r.id), true);
          }}
        />
        <button type="button" className={`tb-caret ${selectMenu.open ? 'is-active' : ''}`} aria-label="Select options" data-tip="Select" onClick={selectMenu.toggle}>
          <MdArrowDropDown aria-hidden />
        </button>
        <Menu anchor={selectMenu.anchor} open={selectMenu.open} onClose={selectMenu.close}>
          <MenuItem onSelect={() => selectWhere(() => true)} hint="* a">All</MenuItem>
          <MenuItem onSelect={() => { ui().clearSelection(); selectMenu.close(); }} hint="* n">None</MenuItem>
          {!isDrafts && (
            <>
              <MenuItem onSelect={() => selectWhere((r) => r.kind === 'thread' && !r.thread.unread)} hint="* r">Read</MenuItem>
              <MenuItem onSelect={() => selectWhere((r) => r.kind === 'thread' && r.thread.unread)} hint="* u">Unread</MenuItem>
              <MenuItem onSelect={() => selectWhere((r) => r.kind === 'thread' && r.thread.starred)} hint="* s">Starred</MenuItem>
              <MenuItem onSelect={() => selectWhere((r) => r.kind === 'thread' && !r.thread.starred)} hint="* t">Unstarred</MenuItem>
            </>
          )}
        </Menu>
      </div>
      {n ? (
        <div className="tb-actions">
          {selectionActions}
          {!isDrafts && folder !== 'trash' && folder !== 'spam' && (
            <>
              <IconButton icon={MdMoreVert} label="More" onClick={moreMenu.toggle} active={moreMenu.open} />
              <SelectionMore anchor={moreMenu} ids={selectedIds} allStarred={allStarred} allImportant={allImportant} allMuted={allMuted} />
            </>
          )}
          <LabelMenu anchor={labelMenu.anchor} open={labelMenu.open} onClose={labelMenu.close} ids={selectedIds} />
          <MoveMenu anchor={moveMenu.anchor} open={moveMenu.open} onClose={moveMenu.close} ids={selectedIds} exclude={folder === 'inbox' ? 'inbox' : undefined} />
          <SnoozeMenu anchor={snoozeMenu.anchor} open={snoozeMenu.open} onClose={snoozeMenu.close} ids={selectedIds} />
        </div>
      ) : (
        <div className="tb-actions">
          <IconButton icon={MdRefresh} label="Refresh" onClick={refresh} className={spinning ? 'is-spinning' : ''} />
          <IconButton icon={MdMoreVert} label="More" onClick={moreMenu.toggle} active={moreMenu.open} />
          <Menu anchor={moreMenu.anchor} open={moreMenu.open} onClose={moreMenu.close}>
            {!isDrafts && <MenuItem icon={MdOutlineDrafts} onSelect={markAllRead}>Mark all as read</MenuItem>}
            {folder === 'trash' && <MenuItem icon={MdOutlineDeleteForever} onSelect={() => { moreMenu.close(); emptyFolder('trash', rows); }}>Empty Trash now</MenuItem>}
            {folder === 'spam' && <MenuItem icon={MdOutlineDeleteForever} onSelect={() => { moreMenu.close(); emptyFolder('spam', rows); }}>Delete all spam messages now</MenuItem>}
            <MenuDivider />
            <MenuItem onSelect={() => { moreMenu.close(); ui().set({ quickSettings: true }); }}>Display density & inbox type…</MenuItem>
          </Menu>
        </div>
      )}
      <div className="tb-spacer" />
      <div className="tb-pager">
        <span className="tb-range">{rows.length ? `${start.toLocaleString()}–${end.toLocaleString()} of ${rows.length.toLocaleString()}` : ''}</span>
        <IconButton icon={MdChevronLeft} label="Newer" disabled={page === 0} onClick={() => ui().setPage(page - 1)} />
        <IconButton icon={MdChevronRight} label="Older" disabled={end >= rows.length} onClick={() => ui().setPage(page + 1)} />
      </div>
    </div>
  );
}

function SelectionMore({
  anchor, ids, allStarred, allImportant, allMuted, extra,
}: {
  anchor: ReturnType<typeof useAnchor<HTMLButtonElement>>;
  ids: string[];
  allStarred: boolean;
  allImportant: boolean;
  allMuted: boolean;
  extra?: ReactNode;
}) {
  const threads = useMail((s) => s.threads);
  const run = (a: BulkAction) => {
    anchor.close();
    runAction(ids, a);
  };
  const first = threads[ids[0]];
  const sender = first?.messages.find((m) => m.from.email !== useMail.getState().me().email)?.from;
  return (
    <Menu anchor={anchor.anchor} open={anchor.open} onClose={anchor.close} placement="bottom-end">
      {extra}
      <MenuItem icon={allStarred ? MdOutlineStarBorder : MdStar} onSelect={() => run(allStarred ? 'unstar' : 'star')}>{allStarred ? 'Remove star' : 'Add star'}</MenuItem>
      <MenuItem icon={allImportant ? MdLabelImportantOutline : MdLabelImportant} onSelect={() => run(allImportant ? 'notImportant' : 'important')}>
        {allImportant ? 'Mark as not important' : 'Mark as important'}
      </MenuItem>
      <MenuItem icon={MdNotificationsOff} onSelect={() => run(allMuted ? 'unmute' : 'mute')}>{allMuted ? 'Unmute' : 'Mute'}</MenuItem>
      {sender && (
        <>
          <MenuDivider />
          <MenuItem
            icon={MdFilterList}
            onSelect={() => {
              anchor.close();
              useUI.getState().clearSelection();
              navigate({ view: 'search', query: `from:${sender.email}` });
            }}
          >
            Filter messages like these
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

function emptyFolder(which: 'trash' | 'spam', rows: Row[]) {
  const ids = rows.filter((r) => r.kind === 'thread').map((r) => r.id);
  if (!ids.length) return;
  const what = which === 'trash' ? 'Trash' : 'Spam';
  if (!window.confirm(`Permanently delete all ${ids.length} conversations in ${what}? This can't be undone.`)) return;
  useMail.getState().deleteForever(ids);
  useUI.getState().clearSelection();
  useUI.getState().showToast(`${ids.length} conversations deleted forever.`);
}

/* ---------------- Category tabs ---------------- */

function CategoryTabs({ route, now }: { route: ListRoute; now: number }) {
  const threads = useMail((s) => s.threads);
  const drafts = useMail((s) => s.drafts);
  const settings = useMail((s) => s.settings);
  const counts = computeCounts({ threads, drafts, settings }, now);
  const current = route.view === 'folder' ? route.category ?? 'primary' : 'primary';
  const latestSenders = (c: Category) => {
    const unread = Object.values(threads)
      .filter((t) => t.unread && t.category === c && t.inInbox && !t.trashed && !t.spam && !(t.snoozedUntil && t.snoozedUntil > now))
      .sort((a, b) => b.messages[b.messages.length - 1].date - a.messages[a.messages.length - 1].date);
    return Array.from(new Set(unread.map((t) => firstName(t.messages[t.messages.length - 1].from)))).slice(0, 3).join(', ');
  };
  return (
    <div className="tabs-wrap">
      <div className="tabs" role="tablist" aria-label="Inbox categories">
        {TABS.map((t) => {
          const active = current === t.id;
          const count = counts.categories[t.id];
          const hasNew = t.id !== 'primary' && count > 0;
          const senders = hasNew ? latestSenders(t.id) : '';
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`tab ${active ? 'is-active' : ''} ${hasNew ? 'has-new' : ''}`}
              data-tip={hasNew ? `${t.label} · ${count} new` : t.label}
              style={{ ['--tab-color' as string]: t.color }}
              onClick={() => {
                useUI.getState().clearSelection();
                useUI.getState().setPage(0);
                navigate({ view: 'folder', folder: 'inbox', category: t.id });
              }}
            >
              <t.icon className="tab-icon" aria-hidden />
              <span className="tab-text">
                <span className="tab-label">
                  {t.label}
                  {hasNew && <span className="tab-badge">{count} new</span>}
                </span>
                {senders && <span className="tab-senders">{senders}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Search chips ---------------- */

const SEARCH_CHIPS = [
  { label: 'Has attachment', token: 'has:attachment' },
  { label: 'Last 7 days', token: 'newer_than:7d' },
  { label: 'Unread', token: 'is:unread' },
  { label: 'Starred', token: 'is:starred' },
  { label: 'From me', token: 'from:me' },
  { label: 'Include Spam & Trash', token: 'in:anywhere' },
];

function SearchChips({ query, count }: { query: string; count: number }) {
  const tokens = tokenize(query);
  const has = (t: string) => tokens.some((x) => x.toLowerCase() === t);
  const toggle = (t: string) => {
    const next = has(t) ? tokens.filter((x) => x.toLowerCase() !== t) : [...tokens, t];
    const q = next.join(' ').trim();
    useUI.getState().clearSelection();
    useUI.getState().setPage(0);
    if (q) navigate({ view: 'search', query: q });
    else navigate({ view: 'folder', folder: 'inbox' });
  };
  return (
    <div className="search-chips">
      {SEARCH_CHIPS.map((c) => (
        <button key={c.token} type="button" className={`filter-chip ${has(c.token) ? 'is-on' : ''}`} aria-pressed={has(c.token)} onClick={() => toggle(c.token)}>
          {has(c.token) && <MdCheck aria-hidden />}
          {c.label}
        </button>
      ))}
      <button type="button" className="link-btn search-adv-link" onClick={() => window.dispatchEvent(new Event('opus:advanced-search'))}>
        Advanced search
      </button>
      <span className="search-count">{count === 1 ? '1 result' : `${count.toLocaleString()} results`}</span>
    </div>
  );
}

/* ---------------- Notices, empty states ---------------- */

function FolderNotice({ route, rows }: { route: ListRoute; rows: Row[] }) {
  if (route.view !== 'folder' || !rows.length) return null;
  if (route.folder === 'trash') {
    return (
      <div className="folder-notice">
        Messages that have been in Trash more than 30 days will be automatically deleted.{' '}
        <button type="button" className="link-btn" onClick={() => emptyFolder('trash', rows)}>Empty Trash now</button>
      </div>
    );
  }
  if (route.folder === 'spam') {
    return (
      <div className="folder-notice">
        Messages that have been in Spam more than 30 days will be automatically deleted.{' '}
        <button type="button" className="link-btn" onClick={() => emptyFolder('spam', rows)}>Delete all spam messages now</button>
      </div>
    );
  }
  if (route.folder === 'scheduled') {
    return <div className="folder-notice folder-notice-info">Scheduled messages send automatically, even if you close this tab. Open one to cancel the send.</div>;
  }
  return null;
}

const EMPTY: Partial<Record<SystemFolder, { title: string; body: string }>> = {
  inbox: { title: 'You’re all caught up', body: 'Nothing new here. Enjoy the quiet — new mail will show up the moment it arrives.' },
  starred: { title: 'No starred messages', body: 'Stars let you give messages a special status to make them easier to find. Click the star outline beside any conversation.' },
  snoozed: { title: 'Nothing snoozed', body: 'Snooze conversations to make them disappear until a better time. They’ll come back to the top of your inbox.' },
  important: { title: 'No important messages', body: 'Mark conversations as important with the arrow marker to keep them here.' },
  sent: { title: 'No sent messages', body: 'Messages you send will appear here.' },
  scheduled: { title: 'Nothing scheduled', body: 'Use Schedule send from the arrow next to Send in the compose window.' },
  drafts: { title: 'You don’t have any saved drafts', body: 'Saving a draft allows you to keep a message you aren’t ready to send yet.' },
  all: { title: 'No conversations', body: 'Your mailbox is empty.' },
  spam: { title: 'Hooray, no spam here!', body: 'Suspicious messages will be filtered here automatically.' },
  trash: { title: 'No conversations in Trash', body: 'Who needs to delete when you have that much space?' },
};

function EmptyState({ route }: { route: ListRoute }) {
  if (route.view === 'search') {
    const anywhere = /\bin:anywhere\b/i.test(route.query);
    return (
      <div className="empty">
        <div className="empty-art empty-art-search" aria-hidden />
        <h2>No messages matched your search</h2>
        <p>Try different words, or use search options such as sender, date, or attachments.</p>
        {!anywhere && (
          <button type="button" className="btn btn-outline" onClick={() => navigate({ view: 'search', query: `${route.query} in:anywhere` })}>
            Search in Spam &amp; Trash
          </button>
        )}
      </div>
    );
  }
  if (route.view === 'label') {
    return (
      <div className="empty">
        <div className="empty-art" aria-hidden><MdOutlineLabel /></div>
        <h2>There are no conversations with this label</h2>
        <p>Drag conversations onto the label in the sidebar, or use Labels in the toolbar.</p>
      </div>
    );
  }
  const e = EMPTY[route.folder] ?? { title: `No conversations in ${FOLDER_NAMES[route.folder]}`, body: '' };
  const isInbox = route.folder === 'inbox';
  return (
    <div className={`empty ${isInbox ? 'empty-inbox' : ''}`}>
      <div className="empty-art" aria-hidden>{isInbox ? <MdCheck /> : <MdOutlineMailOutline />}</div>
      <h2>{e.title}</h2>
      {e.body && <p>{e.body}</p>}
      {route.folder === 'sent' && <button type="button" className="btn btn-outline" onClick={() => composeNew()}>Compose a message</button>}
    </div>
  );
}

function ListFooter() {
  const threads = useMail((s) => s.threads);
  const seededAt = useMail((s) => s.seededAt);
  const count = Object.keys(threads).length;
  return (
    <div className="list-foot">
      <span>{count} conversations stored on this device</span>
      <span>Last activity: {new Date(Math.max(seededAt, ...Object.values(threads).map((t) => t.messages[t.messages.length - 1]?.date ?? 0))).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
    </div>
  );
}

/* ---------------- Mobile ---------------- */

function MobileFab() {
  const [extended, setExtended] = useState(true);
  useEffect(() => {
    const el = document.querySelector('.list-scroll');
    if (!el) return;
    let last = el.scrollTop;
    const onScroll = () => {
      const top = el.scrollTop;
      if (Math.abs(top - last) < 6) return;
      setExtended(top < last || top < 40);
      last = top;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button type="button" className={`fab ${extended ? 'is-extended' : ''}`} onClick={() => composeNew()} aria-label="Compose">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden><path fill="currentColor" d="M20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.84 1.83 3.75 3.75zM3 17.25V21h3.75L17.81 9.93l-3.75-3.75z" /></svg>
      <span className="fab-label">Compose</span>
    </button>
  );
}

function SwipeRow({ thread, children }: { thread: Thread | undefined; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [dx, setDx] = useState(0);
  const [locked, setLocked] = useState<'x' | 'y' | null>(null);
  const moved = useRef(false);
  const threshold = 96;

  const onDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    moved.current = false;
    setLocked(null);
  };
  const onMove = (e: ReactPointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const x = e.clientX - s.x;
    const y = e.clientY - s.y;
    if (!locked) {
      if (Math.abs(x) > 10 && Math.abs(x) > Math.abs(y)) {
        setLocked('x');
        ref.current?.setPointerCapture(e.pointerId);
      } else if (Math.abs(y) > 10) setLocked('y');
      return;
    }
    if (locked === 'x') {
      moved.current = true;
      setDx(x);
    }
  };
  const onUp = () => {
    const d = dx;
    start.current = null;
    setLocked(null);
    if (thread && Math.abs(d) > threshold) {
      setDx(d > 0 ? window.innerWidth : -window.innerWidth);
      window.setTimeout(() => {
        runAction([thread.id], thread.inInbox ? 'archive' : 'trash');
        setDx(0);
      }, 160);
    } else setDx(0);
  };
  const action = thread?.inInbox ? 'Archive' : 'Delete';
  return (
    <div
      className={`swipe ${Math.abs(dx) > threshold ? 'is-armed' : ''} ${dx > 0 ? 'is-right' : dx < 0 ? 'is-left' : ''}`}
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClickCapture={(e) => {
        if (moved.current) {
          e.stopPropagation();
          e.preventDefault();
          moved.current = false;
        }
      }}
      style={{ touchAction: locked === 'x' ? 'none' : 'pan-y' }}
    >
      <div className="swipe-bg" aria-hidden>
        {thread?.inInbox ? <MdOutlineArchive /> : <MdOutlineDelete />}
        <span>{action}</span>
      </div>
      <div className="swipe-fg" style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: start.current ? 'none' : undefined }}>
        {children}
      </div>
    </div>
  );
}
