import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  MdArrowDropDown,
  MdCheck,
  MdChevronLeft,
  MdChevronRight,
  MdClose,
  MdDeleteForever,
  MdInbox,
  MdInfoOutline,
  MdLabelImportant,
  MdLabelImportantOutline,
  MdLabelOutline,
  MdLocalOffer,
  MdMoreVert,
  MdOutlineArchive,
  MdOutlineDelete,
  MdOutlineDriveFileMove,
  MdOutlineMarkEmailRead,
  MdOutlineMarkEmailUnread,
  MdOutlineMoveToInbox,
  MdOutlinePeopleAlt,
  MdOutlineReport,
  MdOutlineWatchLater,
  MdRefresh,
  MdSchedule,
  MdStar,
  MdStarBorder,
  MdVolumeOff,
  MdSearchOff,
  MdOutlineInbox,
  MdOutlineSend,
  MdOutlineInsertDriveFile,
  MdOutlineMarkEmailRead as MdAllRead,
} from 'react-icons/md';
import type { Category, Thread } from '../types';
import { useElementWidth, useIsMobile, useNow, useThreadList, useCounts } from '../hooks';
import { actions } from '../lib/actions';
import { openCompose } from '../lib/composeActions';
import { CATEGORY_NAMES, categoriesActive, SECTION_TITLES, sectionOf, routeTitle } from '../lib/mailbox';
import { navigate, type Route } from '../lib/router';
import { highlightTerms, parseQuery, replaceToken, toggleToken } from '../lib/search';
import { cn, formatSize, plural } from '../lib/utils';
import { useMail } from '../store/mail';
import { useSettings } from '../store/settings';
import { ui, useUI } from '../store/ui';
import { LabelMenu, MoveMenu, SnoozeMenu } from './menus';
import { MailRow } from './MailRow';
import { DRAG_MIME } from './Sidebar';
import { Checkbox, IconButton, MenuDivider, MenuItem, Popover, Spinner } from './ui';

export function MailList({ route }: { route: Route }) {
  const list = useThreadList(route);
  const settings = useSettings();
  const page = useUI((s) => s.page);
  const selected = useUI((s) => s.selected);
  const cursor = useUI((s) => s.cursor);
  const labels = useMail((s) => s.labels);
  const isMobile = useIsMobile();
  const now = useNow(20_000);
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const stacked = isMobile || (width > 0 && width < 720);
  const pageSize = settings.pageSize;
  const maxPage = Math.max(0, Math.ceil(list.length / pageSize) - 1);
  const p = Math.min(page, maxPage);
  const pageItems = useMemo(() => list.slice(p * pageSize, (p + 1) * pageSize), [list, p, pageSize]);
  const ids = useMemo(() => pageItems.map((t) => t.id), [pageItems]);
  const touch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, []);
  const highlight = route.view === 'search' ? highlightTerms(parseQuery(route.query)) : [];
  const ctx = { inboxType: settings.inboxType, categories: settings.categories };
  const showTabs = !isMobile && (route.view === 'category' || (route.view === 'folder' && route.folder === 'inbox')) && categoriesActive({ ...ctx, labels, now });
  const sectioned = route.view === 'folder' && route.folder === 'inbox' && settings.inboxType !== 'default';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [p, route.view, route.view === 'folder' ? route.folder : route.view === 'category' ? route.category : route.view === 'label' ? route.labelId : route.view === 'search' ? route.query : '']);

  useEffect(() => {
    if (!cursor) return;
    const el = scrollRef.current?.querySelector(`[data-thread-id="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const folder = route.view === 'folder' ? route.folder : null;
  const allOnPage = pageItems.length > 0 && pageItems.every((t) => selected.includes(t.id));
  const allSelected = list.length > 0 && list.every((t) => selected.includes(t.id));

  return (
    <div ref={ref} className="flex h-full min-h-0 flex-col" data-testid="mail-list-pane">
      <ListToolbar list={list} pageItems={pageItems} route={route} page={p} pageSize={pageSize} compact={stacked} />
      {showTabs && <CategoryTabs route={route} compact={width > 0 && width < 600} />}
      {route.view === 'search' && <SearchChips query={route.query} />}
      {allOnPage && list.length > pageItems.length && (
        <div className="flex flex-wrap items-center justify-center gap-x-2 border-b border-line bg-row-read px-4 py-2 text-center text-sm text-fg2">
          {allSelected ? (
            <>
              All {list.length} conversations in {routeTitle(route, labels)} are selected.
              <button type="button" className="font-medium text-accent-text hover:underline" onClick={() => ui.set({ selected: [] })}>
                Clear selection
              </button>
            </>
          ) : (
            <>
              All {pageItems.length} conversations on this page are selected.
              <button type="button" className="font-medium text-accent-text hover:underline" onClick={() => ui.set({ selected: list.map((t) => t.id) })}>
                Select all {list.length} conversations in {routeTitle(route, labels)}
              </button>
            </>
          )}
        </div>
      )}
      {(folder === 'trash' || folder === 'spam') && pageItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-line px-4 py-2.5 text-center text-sm text-fg2">
          Messages that have been in {folder === 'trash' ? 'Trash' : 'Spam'} more than 30 days will be automatically deleted.
          <button type="button" className="font-medium text-accent-text hover:underline" onClick={() => actions.emptyFolder(folder)}>
            {folder === 'trash' ? 'Empty Trash now' : 'Delete all spam messages now'}
          </button>
        </div>
      )}
      {isMobile && selected.length === 0 && (
        <div className="px-4 pt-3 pb-1 text-xs font-medium tracking-wide text-fg3">
          {route.view === 'folder' && route.folder === 'inbox' && categoriesActive({ ...ctx, labels, now }) ? 'Primary' : routeTitle(route, labels)}
        </div>
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto" role="list" aria-label="Conversations" data-testid="mail-list">
        {pageItems.map((t, i) => {
          const section = sectioned ? sectionOf(t, settings.inboxType) : 0;
          const prev = i > 0 ? sectionOf(pageItems[i - 1], settings.inboxType) : -1;
          return (
            <Fragment key={t.id}>
              {sectioned && section !== prev && (
                <div className="sticky top-0 z-[2] flex h-10 items-center border-b border-line bg-panel px-5 text-sm font-medium text-fg">{SECTION_TITLES[settings.inboxType][section]}</div>
              )}
              <MailRow
                thread={t}
                route={route}
                ids={ids}
                selected={selected.includes(t.id)}
                cursor={cursor === t.id}
                stacked={stacked}
                density={settings.density}
                hoverActions={settings.hoverActions && !touch}
                importance={settings.importanceMarkers}
                snippets={settings.snippets}
                swipeLeft={settings.swipeLeft}
                swipeRight={settings.swipeRight}
                touch={touch}
                highlight={highlight}
                now={now}
              />
            </Fragment>
          );
        })}
        {!pageItems.length && <EmptyState route={route} />}
        {pageItems.length > 0 && <ListFooter />}
        {isMobile && <div className="h-24" />}
      </div>
    </div>
  );
}

function ToolbarMenuButton({
  icon,
  label,
  kind,
  ids,
  render,
}: {
  icon: IconType;
  label: string;
  kind?: 'labels' | 'move' | 'snooze';
  ids: string[];
  render: (close: () => void) => React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const req = useUI((s) => s.menuRequest);
  useEffect(() => {
    if (req && kind && req.kind === kind && req.target === 'list' && ids.length) {
      setOpen(true);
      ui.set({ menuRequest: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);
  return (
    <>
      <IconButton ref={ref} icon={icon} label={label} onClick={() => setOpen((o) => !o)} active={open} />
      <Popover open={open} anchor={ref.current} onClose={() => setOpen(false)}>
        {render(() => setOpen(false))}
      </Popover>
    </>
  );
}

function ListToolbar({ list, pageItems, route, page, pageSize, compact }: { list: Thread[]; pageItems: Thread[]; route: Route; page: number; pageSize: number; compact: boolean }) {
  const selected = useUI((s) => s.selected);
  const refreshing = useUI((s) => s.refreshing);
  const isMobile = useIsMobile();
  const [selMenu, setSelMenu] = useState<HTMLElement | null>(null);
  const [moreMenu, setMoreMenu] = useState<HTMLElement | null>(null);
  const folder = route.view === 'folder' ? route.folder : null;
  const sel = selected.filter((id) => list.some((t) => t.id === id));
  const selThreads = list.filter((t) => sel.includes(t.id));
  const anyUnread = selThreads.some((t) => t.unread);
  const anyStarred = selThreads.some((t) => t.starred);
  const allImportant = selThreads.length > 0 && selThreads.every((t) => t.important);
  const allMuted = selThreads.length > 0 && selThreads.every((t) => t.muted);
  const has = sel.length > 0;
  const pageAll = pageItems.length > 0 && pageItems.every((t) => sel.includes(t.id));
  const start = list.length ? page * pageSize + 1 : 0;
  const end = Math.min(list.length, (page + 1) * pageSize);

  const selectWhere = (pred: (t: Thread) => boolean) => {
    ui.set({ selected: pageItems.filter(pred).map((t) => t.id) });
    setSelMenu(null);
  };

  if (isMobile && has) {
    return (
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-line bg-panel px-1" role="toolbar" aria-label="Selection actions">
        <IconButton icon={MdClose} label="Clear selection" onClick={() => ui.set({ selected: [] })} />
        <span className="flex-1 pl-2 text-lg font-medium">{sel.length}</span>
        {folder === 'trash' ? (
          <IconButton icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={() => actions.moveToInbox(sel)} />
        ) : (
          <IconButton icon={MdOutlineArchive} label="Archive" onClick={() => actions.archive(sel)} />
        )}
        <IconButton icon={folder === 'trash' ? MdDeleteForever : MdOutlineDelete} label="Delete" onClick={() => (folder === 'trash' ? actions.deleteForever(sel) : actions.trash(sel))} />
        <IconButton icon={anyUnread ? MdOutlineMarkEmailRead : MdOutlineMarkEmailUnread} label={anyUnread ? 'Mark as read' : 'Mark as unread'} onClick={() => actions.markRead(sel, anyUnread)} />
        <IconButton icon={MdMoreVert} label="More" onClick={(e) => setMoreMenu(e.currentTarget)} />
        <Popover open={!!moreMenu} anchor={moreMenu} onClose={() => setMoreMenu(null)} placement="bottom-end">
          <MobileMore ids={sel} anyStarred={anyStarred} allImportant={allImportant} close={() => setMoreMenu(null)} />
        </Popover>
      </div>
    );
  }

  if (isMobile) return null;

  return (
    <div className="flex h-12 shrink-0 items-center gap-0.5 px-2 md:pl-3" role="toolbar" aria-label="Conversation actions">
      <div className="flex items-center rounded hover:bg-hover">
        <Checkbox
          checked={pageAll}
          indeterminate={has && !pageAll}
          label={has ? 'Deselect all' : 'Select all'}
          onChange={() => ui.set({ selected: has ? [] : pageItems.map((t) => t.id) })}
          className="rounded"
        />
        <button type="button" aria-label="Select options" data-tip="Select" onClick={(e) => setSelMenu(e.currentTarget)} className="-ml-1.5 flex h-8 w-4 items-center justify-center text-fg2">
          <MdArrowDropDown size={18} />
        </button>
      </div>
      <Popover open={!!selMenu} anchor={selMenu} onClose={() => setSelMenu(null)}>
        <div className="w-40">
          <MenuItem label="All" onClick={() => selectWhere(() => true)} />
          <MenuItem label="None" onClick={() => selectWhere(() => false)} />
          <MenuItem label="Read" onClick={() => selectWhere((t) => !t.unread)} />
          <MenuItem label="Unread" onClick={() => selectWhere((t) => t.unread)} />
          <MenuItem label="Starred" onClick={() => selectWhere((t) => t.starred)} />
          <MenuItem label="Unstarred" onClick={() => selectWhere((t) => !t.starred)} />
        </div>
      </Popover>

      {!has ? (
        <>
          <IconButton icon={MdRefresh} label="Refresh" onClick={() => actions.refresh()} className={refreshing ? 'pointer-events-none' : ''} iconClassName={refreshing ? 'opacity-0' : ''} />
          {refreshing && <Spinner size={18} className="-ml-[30px] mr-[12px]" />}
          <IconButton icon={MdMoreVert} label="More" onClick={(e) => setMoreMenu(e.currentTarget)} />
          <Popover open={!!moreMenu} anchor={moreMenu} onClose={() => setMoreMenu(null)}>
            <div className="w-56">
              <MenuItem
                icon={MdAllRead}
                label="Mark all as read"
                disabled={!list.some((t) => t.unread)}
                onClick={() => {
                  setMoreMenu(null);
                  actions.markRead(
                    list.filter((t) => t.unread).map((t) => t.id),
                    true,
                  );
                }}
              />
              {(folder === 'trash' || folder === 'spam') && (
                <MenuItem icon={MdDeleteForever} label={folder === 'trash' ? 'Empty Trash' : 'Delete all spam'} onClick={() => { setMoreMenu(null); actions.emptyFolder(folder); }} />
              )}
              <MenuDivider />
              <div className="px-4 py-1 text-xs text-fg3">Select messages to see more actions</div>
            </div>
          </Popover>
        </>
      ) : (
        <div className="flex items-center gap-0.5">
          {folder === 'trash' ? (
            <>
              <IconButton icon={MdDeleteForever} label="Delete forever" onClick={() => actions.deleteForever(sel)} />
              <IconButton icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={() => actions.moveToInbox(sel)} />
            </>
          ) : folder === 'spam' ? (
            <>
              <button type="button" onClick={() => actions.notSpam(sel)} className="h-8 rounded px-3 text-sm font-medium text-fg2 hover:bg-hover">
                Not spam
              </button>
              <IconButton icon={MdDeleteForever} label="Delete forever" onClick={() => actions.deleteForever(sel)} />
            </>
          ) : folder === 'drafts' ? (
            <button type="button" onClick={() => actions.discardDrafts(sel)} className="h-8 rounded px-3 text-sm font-medium text-fg2 hover:bg-hover">
              Discard drafts
            </button>
          ) : folder === 'scheduled' ? (
            <button type="button" onClick={() => actions.cancelScheduled(sel)} className="flex h-8 items-center gap-2 rounded px-3 text-sm font-medium text-fg2 hover:bg-hover">
              <MdSchedule size={18} /> Cancel send
            </button>
          ) : (
            <>
              {selThreads.every((t) => t.inInbox) || folder === 'inbox' || route.view === 'category' ? (
                <IconButton icon={MdOutlineArchive} label="Archive" onClick={() => actions.archive(sel)} />
              ) : (
                <IconButton icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={() => actions.moveToInbox(sel)} />
              )}
              <IconButton icon={MdOutlineReport} label="Report spam" onClick={() => actions.spam(sel)} />
              <IconButton icon={MdOutlineDelete} label="Delete" onClick={() => actions.trash(sel)} />
            </>
          )}
          {folder !== 'drafts' && folder !== 'scheduled' && (
            <>
              <span className="mx-1.5 h-5 w-px bg-line" />
              <IconButton icon={anyUnread ? MdOutlineMarkEmailRead : MdOutlineMarkEmailUnread} label={anyUnread ? 'Mark as read' : 'Mark as unread'} onClick={() => actions.markRead(sel, anyUnread)} />
              {folder === 'snoozed' ? (
                <IconButton icon={MdOutlineWatchLater} label="Unsnooze" onClick={() => actions.unsnooze(sel)} />
              ) : (
                folder !== 'trash' && folder !== 'spam' && <ToolbarMenuButton icon={MdOutlineWatchLater} label="Snooze" kind="snooze" ids={sel} render={(close) => <SnoozeMenu ids={sel} onClose={close} />} />
              )}
              <span className="mx-1.5 h-5 w-px bg-line" />
              <ToolbarMenuButton icon={MdOutlineDriveFileMove} label="Move to" kind="move" ids={sel} render={(close) => <MoveMenu ids={sel} onClose={close} />} />
              <ToolbarMenuButton icon={MdLabelOutline} label="Labels" kind="labels" ids={sel} render={(close) => <LabelMenu ids={sel} onClose={close} />} />
              <IconButton icon={MdMoreVert} label="More" onClick={(e) => setMoreMenu(e.currentTarget)} />
              <Popover open={!!moreMenu} anchor={moreMenu} onClose={() => setMoreMenu(null)}>
                <div className="w-56">
                  <MenuItem icon={allImportant ? MdLabelImportantOutline : MdLabelImportant} label={allImportant ? 'Mark as not important' : 'Mark as important'} onClick={() => { setMoreMenu(null); actions.important(sel, !allImportant); }} />
                  <MenuItem icon={anyStarred ? MdStarBorder : MdStar} label={anyStarred ? 'Remove star' : 'Add star'} onClick={() => { setMoreMenu(null); actions.star(sel, !anyStarred); }} />
                  <MenuItem icon={MdVolumeOff} label={allMuted ? 'Unmute' : 'Mute'} onClick={() => { setMoreMenu(null); (allMuted ? actions.unmute : actions.mute)(sel); }} />
                </div>
              </Popover>
            </>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-1 text-xs text-fg2">
        {list.length > 0 && (
          <span className="px-2 whitespace-nowrap" aria-live="polite">
            {start}–{end} of {compact ? list.length : list.length.toLocaleString()}
          </span>
        )}
        <IconButton icon={MdChevronLeft} label="Newer" size="sm" disabled={page === 0} onClick={() => ui.set({ page: page - 1, selected: [] })} />
        <IconButton icon={MdChevronRight} label="Older" size="sm" disabled={end >= list.length} onClick={() => ui.set({ page: page + 1, selected: [] })} />
      </div>
    </div>
  );
}

function MobileMore({ ids, anyStarred, allImportant, close }: { ids: string[]; anyStarred: boolean; allImportant: boolean; close: () => void }) {
  const [mode, setMode] = useState<'main' | 'move' | 'labels' | 'snooze'>('main');
  if (mode === 'move') return <MoveMenu ids={ids} onClose={close} />;
  if (mode === 'labels') return <LabelMenu ids={ids} onClose={close} />;
  if (mode === 'snooze') return <SnoozeMenu ids={ids} onClose={close} />;
  return (
    <div className="w-60">
      <MenuItem icon={MdOutlineDriveFileMove} label="Move to" onClick={() => setMode('move')} />
      <MenuItem icon={MdLabelOutline} label="Change labels" onClick={() => setMode('labels')} />
      <MenuItem icon={MdOutlineWatchLater} label="Snooze" onClick={() => setMode('snooze')} />
      <MenuItem icon={anyStarred ? MdStarBorder : MdStar} label={anyStarred ? 'Remove star' : 'Add star'} onClick={() => { close(); actions.star(ids, !anyStarred); }} />
      <MenuItem icon={allImportant ? MdLabelImportantOutline : MdLabelImportant} label={allImportant ? 'Mark not important' : 'Mark important'} onClick={() => { close(); actions.important(ids, !allImportant); }} />
      <MenuItem icon={MdVolumeOff} label="Mute" onClick={() => { close(); actions.mute(ids); }} />
      <MenuItem icon={MdOutlineReport} label="Report spam" onClick={() => { close(); actions.spam(ids); }} />
    </div>
  );
}

const TAB_META: Record<Category, { icon: IconType; color: string; pill: string }> = {
  primary: { icon: MdInbox, color: 'var(--accent-text)', pill: '' },
  promotions: { icon: MdLocalOffer, color: '#188038', pill: '#188038' },
  social: { icon: MdOutlinePeopleAlt, color: '#1a73e8', pill: '#1a73e8' },
  updates: { icon: MdInfoOutline, color: '#e37400', pill: '#e37400' },
};

function CategoryTabs({ route, compact }: { route: Route; compact: boolean }) {
  const enabled = useSettings((s) => s.categories);
  const counts = useCounts();
  const active: Category = route.view === 'category' ? route.category : 'primary';
  const tabs: Category[] = ['primary', ...(['promotions', 'social', 'updates'] as const).filter((c) => enabled.includes(c))];
  return (
    <div className="flex shrink-0 border-b border-line" role="tablist" aria-label="Inbox categories">
      {tabs.map((c) => (
        <CategoryTab key={c} category={c} active={active === c} compact={compact} unread={c === 'primary' ? 0 : counts.categories[c].unread} senders={counts.categories[c].senders} />
      ))}
    </div>
  );
}

function CategoryTab({ category, active, unread, senders, compact }: { category: Category; active: boolean; unread: number; senders: string[]; compact: boolean }) {
  const meta = TAB_META[category];
  const [over, setOver] = useState(false);
  const Icon = meta.icon;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => {
        ui.set({ selected: [], page: 0 });
        navigate(category === 'primary' ? { view: 'folder', folder: 'inbox' } : { view: 'category', category });
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        try {
          actions.moveTo(JSON.parse(e.dataTransfer.getData(DRAG_MIME)), { kind: 'category', id: category });
        } catch {
          /* ignore malformed drops */
        }
      }}
      aria-label={compact ? `${CATEGORY_NAMES[category]}${unread && !active ? `, ${unread} new` : ''}` : undefined}
      data-tip={compact ? (senders.length && unread && !active ? `${CATEGORY_NAMES[category]}\n${senders.join(', ')}` : CATEGORY_NAMES[category]) : undefined}
      className={cn(
        'relative flex min-w-0 flex-1 items-center text-left hover:bg-hover',
        compact ? 'h-12 justify-center gap-2 px-2' : 'h-14 max-w-[252px] gap-4 px-4',
        over && 'bg-accent-soft',
      )}
      style={active ? { color: meta.color } : undefined}
    >
      <span className="relative shrink-0">
        <Icon size={20} className={cn(!active && 'text-fg2')} />
        {compact && unread > 0 && !active && (
          <span className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-medium text-white" style={{ background: meta.pill }}>
            {unread}
          </span>
        )}
      </span>
      {compact && active && <span className="truncate text-sm font-medium">{CATEGORY_NAMES[category]}</span>}
      {!compact && (
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn('truncate text-sm font-medium', !active && 'text-fg2')}>{CATEGORY_NAMES[category]}</span>
          {unread > 0 && !active && (
            <span className="shrink-0 rounded-full px-1.5 text-[11px] leading-4 font-medium text-white" style={{ background: meta.pill }}>
              {unread} new
            </span>
          )}
        </span>
        {unread > 0 && !active && senders.length > 0 && <span className="block truncate text-xs text-fg3">{senders.join(', ')}</span>}
      </span>
      )}
      {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full" style={{ background: meta.color }} />}
    </button>
  );
}

const TIME_OPTIONS: Array<[string | null, string]> = [
  [null, 'Any time'],
  ['older_than:1w', 'Older than a week'],
  ['older_than:1m', 'Older than a month'],
  ['older_than:6m', 'Older than 6 months'],
  ['newer_than:1d', 'Last 24 hours'],
  ['newer_than:7d', 'Last 7 days'],
  ['newer_than:1m', 'Last 30 days'],
];

function SearchChips({ query }: { query: string }) {
  const contacts = useMail((s) => s.contacts);
  const [fromAnchor, setFromAnchor] = useState<HTMLElement | null>(null);
  const [timeAnchor, setTimeAnchor] = useState<HTMLElement | null>(null);
  const lower = query.toLowerCase();
  const go = (q: string) => {
    if (!q.trim()) return navigate({ view: 'folder', folder: 'inbox' });
    ui.set({ page: 0, selected: [] });
    navigate({ view: 'search', query: q.trim() });
  };
  const fromToken = query.split(/\s+/).find((t) => t.toLowerCase().startsWith('from:'));
  const timeToken = query.split(/\s+/).find((t) => /^(older|newer)_than:/i.test(t));
  const chip = (active: boolean) =>
    cn('inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-3 text-sm font-medium', active ? 'border-transparent bg-accent-soft text-fg' : 'border-line-strong text-fg2 hover:bg-hover');
  const toggle = (token: string, label: string) => {
    const active = lower.split(/\s+/).includes(token);
    return (
      <button type="button" className={chip(active)} onClick={() => go(toggleToken(query, token))} aria-pressed={active}>
        {active && <MdCheck size={16} />}
        {label}
      </button>
    );
  };
  const topContacts = contacts.filter((c) => c.kind === 'person').slice(0, 8);
  return (
    <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-4 pb-2 md:pl-5">
      <button type="button" className={chip(!!fromToken)} onClick={(e) => setFromAnchor(e.currentTarget)}>
        {fromToken ? fromToken.replace(/^from:/i, 'From: ') : 'From'} <MdArrowDropDown size={18} />
      </button>
      <Popover open={!!fromAnchor} anchor={fromAnchor} onClose={() => setFromAnchor(null)}>
        <div className="max-h-80 w-72 overflow-y-auto">
          {fromToken && <MenuItem label="Anyone" onClick={() => { setFromAnchor(null); go(replaceToken(query, 'from:', null)); }} />}
          {topContacts.map((c) => (
            <MenuItem key={c.email} label={<span>{c.name} <span className="text-fg3">{c.email}</span></span>} onClick={() => { setFromAnchor(null); go(replaceToken(query, 'from:', `from:${c.email}`)); }} />
          ))}
        </div>
      </Popover>
      <button type="button" className={chip(!!timeToken)} onClick={(e) => setTimeAnchor(e.currentTarget)}>
        {TIME_OPTIONS.find(([t]) => t && timeToken && t === timeToken.toLowerCase())?.[1] ?? 'Any time'} <MdArrowDropDown size={18} />
      </button>
      <Popover open={!!timeAnchor} anchor={timeAnchor} onClose={() => setTimeAnchor(null)}>
        <div className="w-56">
          {TIME_OPTIONS.map(([token, label]) => (
            <MenuItem
              key={label}
              label={label}
              checked={(token ?? null) === (timeToken?.toLowerCase() ?? null)}
              onClick={() => {
                setTimeAnchor(null);
                go(replaceToken(replaceToken(query, 'older_than:', null), 'newer_than:', token));
              }}
            />
          ))}
        </div>
      </Popover>
      {toggle('has:attachment', 'Has attachment')}
      {toggle('is:unread', 'Is unread')}
      {toggle('is:starred', 'Is starred')}
      {toggle('in:anywhere', 'Include Trash & Spam')}
      <button type="button" className="h-8 shrink-0 rounded-lg px-3 text-sm font-medium text-accent-text hover:bg-hover" onClick={() => ui.set({ advancedSearch: true })}>
        Advanced search
      </button>
    </div>
  );
}

function EmptyState({ route }: { route: Route }) {
  const labels = useMail((s) => s.labels);
  let icon: IconType = MdOutlineInbox;
  let title = '';
  let body: React.ReactNode = null;
  if (route.view === 'search') {
    icon = MdSearchOff;
    title = 'No messages matched your search.';
    body = (
      <>
        Try using search options such as sender, date, size and more.{' '}
        <button type="button" className="font-medium text-accent-text hover:underline" onClick={() => ui.set({ advancedSearch: true })}>
          Advanced search
        </button>
      </>
    );
  } else if (route.view === 'category') {
    title = `Your ${CATEGORY_NAMES[route.category]} tab is empty.`;
    body = route.category === 'social' ? 'Messages from social networks and media-sharing sites will be shown here.' : route.category === 'promotions' ? 'Deals, offers and other marketing emails will be shown here.' : 'Notifications, confirmations, receipts, bills and statements will be shown here.';
  } else if (route.view === 'label') {
    icon = MdLabelOutline;
    title = `There are no conversations with the label “${labels.find((l) => l.id === route.labelId)?.name ?? ''}”.`;
  } else if (route.view === 'folder') {
    switch (route.folder) {
      case 'inbox':
        title = 'Your Primary tab is empty.';
        body = 'Personal messages and messages that don’t appear in other tabs will be shown here.';
        break;
      case 'starred':
        icon = MdStarBorder;
        title = 'No starred messages.';
        body = 'Stars let you give messages a special status to make them easier to find. To star a message, click on the star outline beside any message or conversation.';
        break;
      case 'snoozed':
        icon = MdOutlineWatchLater;
        title = 'Nothing snoozed.';
        body = 'Snoozed conversations will return to your inbox at the time you pick.';
        break;
      case 'sent':
        icon = MdOutlineSend;
        title = 'No sent messages!';
        body = (
          <button type="button" className="font-medium text-accent-text hover:underline" onClick={() => openCompose()}>
            Send one now!
          </button>
        );
        break;
      case 'drafts':
        icon = MdOutlineInsertDriveFile;
        title = 'You don’t have any saved drafts.';
        body = 'Saving a draft allows you to keep a message you aren’t ready to send yet.';
        break;
      case 'scheduled':
        icon = MdSchedule;
        title = 'No scheduled messages.';
        body = 'Use the arrow next to Send to schedule a message for later.';
        break;
      case 'spam':
        icon = MdOutlineReport;
        title = 'Hooray, no spam here!';
        break;
      case 'trash':
        icon = MdOutlineDelete;
        title = 'No conversations in Trash.';
        break;
      case 'important':
        icon = MdLabelImportantOutline;
        title = 'No important conversations.';
        break;
      default:
        title = 'No conversations.';
    }
  }
  const Icon = icon;
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center" data-testid="empty-state">
      <Icon size={56} className="text-line-strong" />
      <p className="mt-4 text-base text-fg">{title}</p>
      {body && <p className="mt-2 max-w-md text-sm text-fg3">{body}</p>}
    </div>
  );
}

const BASE_STORAGE = 3.62 * 1024 * 1024 * 1024;
const QUOTA = 15 * 1024 * 1024 * 1024;
const sessionStart = Date.now();

function ListFooter() {
  const threads = useMail((s) => s.threads);
  const now = useNow(60_000);
  const used = useMemo(() => {
    let bytes = BASE_STORAGE;
    for (const t of Object.values(threads)) for (const m of t.messages) bytes += m.body.length + m.attachments.reduce((a, x) => a + x.size, 0);
    return bytes;
  }, [threads]);
  const mins = Math.max(0, Math.round((now - sessionStart) / 60000));
  const pct = Math.min(100, (used / QUOTA) * 100);
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6 pb-8 text-xs text-fg3">
      <div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5">
          {formatSize(used)} of 15 GB ({pct.toFixed(0)}%) used
        </div>
      </div>
      <div className="text-right">
        Last account activity: {mins === 0 ? 'just now' : `${plural(mins, 'minute')} ago`}
        <br />
        Open in 1 location · this browser
      </div>
    </div>
  );
}
