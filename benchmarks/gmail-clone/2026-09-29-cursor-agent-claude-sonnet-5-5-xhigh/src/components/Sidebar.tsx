import { useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Inbox,
  Mails,
  OctagonAlert,
  Pencil,
  Plus,
  Send,
  Star,
  Tag,
  Trash2,
  EllipsisVertical,
} from 'lucide-react';
import { useMail } from '../lib/store';
import { useUI } from '../lib/ui';
import { hrefFor, navigate, useRoute } from '../lib/router';
import {
  draftCount,
  scheduledCount,
  snoozedCount,
  unreadCountForInbox,
  unreadCountForLabel,
  unreadCountSpam,
} from '../lib/selectors';
import { applyLabel, composeNew, moveToInbox, notSpamThreads, spamThreads, starThreads, trashThreads } from '../lib/actions';
import { useIsCompact, useNow } from '../lib/hooks';
import { formatSize } from '../lib/date';
import { storageUsed } from '../lib/selectors';
import { IconButton, MenuList, Popover } from './primitives';
import type { SystemView, Route } from '../lib/types';

interface NavDef {
  view: SystemView;
  label: string;
  icon: React.ReactNode;
  count?: number;
  countStyle?: 'unread' | 'total';
}

export const DRAG_MIME = 'application/x-mail-threads';

export function Sidebar() {
  const route = useRoute();
  const data = useMail();
  const collapsedSetting = useMail((s) => s.settings.sidebarCollapsed);
  const compact = useIsCompact();
  const drawerOpen = useUI((s) => s.drawerOpen);
  const now = useNow(20_000);
  const [moreOpen, setMoreOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(true);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const collapsed = !compact && collapsedSetting;
  const inMore = ['scheduled', 'all', 'spam', 'trash'].includes(route.view);
  const showMore = moreOpen || inMore;

  const counts = useMemo(
    () => ({
      inbox: unreadCountForInbox(data, now),
      drafts: draftCount(data),
      scheduled: scheduledCount(data),
      snoozed: snoozedCount(data, now),
      spam: unreadCountSpam(data),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.threads, data.messages, data.drafts, now],
  );

  const primary: NavDef[] = [
    { view: 'inbox', label: 'Inbox', icon: <Inbox size={20} />, count: counts.inbox, countStyle: 'unread' },
    { view: 'starred', label: 'Starred', icon: <Star size={20} /> },
    { view: 'snoozed', label: 'Snoozed', icon: <Clock size={20} /> },
    { view: 'important', label: 'Important', icon: <Bookmark size={20} /> },
    { view: 'sent', label: 'Sent', icon: <Send size={20} /> },
    { view: 'drafts', label: 'Drafts', icon: <FileText size={20} />, count: counts.drafts, countStyle: 'total' },
  ];
  const more: NavDef[] = [
    { view: 'scheduled', label: 'Scheduled', icon: <CalendarClock size={20} />, count: counts.scheduled, countStyle: 'total' },
    { view: 'all', label: 'All Mail', icon: <Mails size={20} /> },
    { view: 'spam', label: 'Spam', icon: <OctagonAlert size={20} />, count: counts.spam, countStyle: 'unread' },
    { view: 'trash', label: 'Trash', icon: <Trash2 size={20} /> },
  ];

  const go = (r: Partial<Route> & { view: Route['view'] }) => (e: React.MouseEvent) => {
    e.preventDefault();
    useUI.getState().clearSelection();
    navigate(r);
    useUI.getState().set({ drawerOpen: false });
  };

  const onDrop = (key: string, handler: (ids: string[]) => void) => (e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    try {
      const ids = JSON.parse(e.dataTransfer.getData(DRAG_MIME)) as string[];
      if (ids.length) handler(ids);
    } catch {
      /* ignore */
    }
    void key;
  };

  const dropHandlers = (key: string, handler?: (ids: string[]) => void) =>
    handler
      ? {
          onDragOver: (e: React.DragEvent) => {
            if (e.dataTransfer.types.includes(DRAG_MIME)) {
              e.preventDefault();
              setDropTarget(key);
            }
          },
          onDragLeave: () => setDropTarget((t) => (t === key ? null : t)),
          onDrop: onDrop(key, handler),
        }
      : {};

  const dropFor = (view: SystemView): ((ids: string[]) => void) | undefined => {
    switch (view) {
      case 'inbox':
        return (ids) => moveToInbox(ids);
      case 'trash':
        return (ids) => trashThreads(ids);
      case 'spam':
        return (ids) => (route.view === 'spam' ? notSpamThreads(ids) : spamThreads(ids));
      case 'starred':
        return (ids) => starThreads(true, ids);
      default:
        return undefined;
    }
  };

  const renderNav = (n: NavDef) => {
    const current = route.view === n.view && !route.threadId ? 'page' : route.view === n.view ? 'true' : undefined;
    const selected = route.view === n.view;
    const shownCount = n.count && n.count > 0 ? n.count : 0;
    return (
      <a
        key={n.view}
        href={hrefFor({ view: n.view })}
        className={`nav-item ${selected ? 'is-active' : ''} ${dropTarget === n.view ? 'is-drop' : ''} ${shownCount && n.countStyle === 'unread' ? 'has-unread' : ''}`}
        aria-current={current as 'page' | undefined}
        title={collapsed ? n.label : undefined}
        onClick={go({ view: n.view })}
        {...dropHandlers(n.view, dropFor(n.view))}
      >
        <span className="nav-item__icon">{n.icon}</span>
        {!collapsed ? <span className="nav-item__label">{n.label}</span> : null}
        {!collapsed && shownCount ? <span className="nav-item__count">{shownCount}</span> : null}
        {collapsed && shownCount && n.countStyle === 'unread' ? <span className="nav-item__dot" /> : null}
      </a>
    );
  };

  return (
    <>
      {compact && drawerOpen ? <div className="scrim" onClick={() => useUI.getState().set({ drawerOpen: false })} /> : null}
      <nav className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${compact ? 'is-drawer' : ''} ${drawerOpen ? 'is-open' : ''}`} aria-label="Mailboxes">
        <button
          type="button"
          className="compose-btn"
          onClick={() => {
            composeNew();
            useUI.getState().set({ drawerOpen: false });
          }}
          title="Compose (c)"
        >
          <Pencil size={22} strokeWidth={2} />
          {!collapsed ? <span>Compose</span> : null}
        </button>

        <div className="sidebar__scroll">
          {primary.map(renderNav)}
          <button type="button" className="nav-item nav-item--more" onClick={() => setMoreOpen(!showMore)} aria-expanded={showMore} disabled={inMore}>
            <span className="nav-item__icon">{showMore ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
            {!collapsed ? <span className="nav-item__label">{showMore ? 'Less' : 'More'}</span> : null}
          </button>
          {showMore ? more.map(renderNav) : null}

          {!collapsed ? (
            <div className="sidebar__heading">
              <button type="button" className="sidebar__heading-btn" onClick={() => setLabelsOpen(!labelsOpen)} aria-expanded={labelsOpen}>
                Labels
              </button>
              <IconButton label="Create new label" size="sm" onClick={() => useUI.getState().set({ labelDialog: {} })}>
                <Plus size={18} />
              </IconButton>
            </div>
          ) : (
            <IconButton label="Create new label" className="sidebar__collapsed-plus" onClick={() => useUI.getState().set({ labelDialog: {} })}>
              <Plus size={20} />
            </IconButton>
          )}

          {(labelsOpen || collapsed) &&
            data.labels
              .filter((l) => !l.hidden)
              .map((l) => {
                const n = unreadCountForLabel(data, l.id);
                const selected = route.view === 'label' && route.param === l.id;
                return (
                  <LabelNav
                    key={l.id}
                    id={l.id}
                    name={l.name}
                    color={l.color}
                    count={n}
                    selected={selected}
                    collapsed={collapsed}
                    isDrop={dropTarget === `l:${l.id}`}
                    onGo={go({ view: 'label', param: l.id })}
                    dropProps={dropHandlers(`l:${l.id}`, (ids) => applyLabel(l.id, true, ids))}
                  />
                );
              })}
        </div>

        {!collapsed ? (
          <div className="sidebar__foot">
            <div className="meter" role="img" aria-label="Storage usage">
              <div className="meter__bar" style={{ width: `${Math.min(100, (storageUsed(data) / (15 * 1024 * 1024 * 1024)) * 100 + 8)}%` }} />
            </div>
            <div className="sidebar__foot-text">{formatSize(storageUsed(data) + 2_400_000_000)} of 15 GB used</div>
          </div>
        ) : null}
      </nav>
    </>
  );
}

function LabelNav({
  id,
  name,
  color,
  count,
  selected,
  collapsed,
  isDrop,
  onGo,
  dropProps,
}: {
  id: string;
  name: string;
  color: string;
  count: number;
  selected: boolean;
  collapsed: boolean;
  isDrop: boolean;
  onGo: (e: React.MouseEvent) => void;
  dropProps: object;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const deleteLabel = useMail((s) => s.deleteLabel);
  const updateLabel = useMail((s) => s.updateLabel);
  return (
    <div className={`nav-item nav-item--label ${selected ? 'is-active' : ''} ${isDrop ? 'is-drop' : ''} ${count ? 'has-unread' : ''}`} {...dropProps}>
      <a href={hrefFor({ view: 'label', param: id })} className="nav-item__link" onClick={onGo} title={collapsed ? name : undefined}>
        <span className="nav-item__icon">
          <Tag size={20} fill={color} color={color} strokeWidth={1.5} />
        </span>
        {!collapsed ? <span className="nav-item__label">{name}</span> : null}
        {!collapsed && count ? <span className="nav-item__count">{count}</span> : null}
      </a>
      {!collapsed ? (
        <>
          <button ref={btnRef} type="button" className="nav-item__more" aria-label={`Label actions for ${name}`} onClick={() => setMenu(!menu)}>
            <EllipsisVertical size={18} />
          </button>
          <Popover open={menu} anchorRef={btnRef} onClose={() => setMenu(false)} placement="bottom-end">
            <MenuList
              onClose={() => setMenu(false)}
              items={[
                { label: 'Edit', onClick: () => useUI.getState().set({ labelDialog: { id } }) },
                { label: 'Hide in label list', onClick: () => updateLabel(id, { hidden: true }) },
                {
                  label: 'Remove label',
                  danger: true,
                  onClick: () => {
                    const undo = deleteLabel(id);
                    useUI.getState().toast(`Label “${name}” removed.`, [{ label: 'Undo', run: undo }]);
                    if (selected) navigate({ view: 'inbox' });
                  },
                },
              ]}
            />
          </Popover>
        </>
      ) : null}
    </div>
  );
}
