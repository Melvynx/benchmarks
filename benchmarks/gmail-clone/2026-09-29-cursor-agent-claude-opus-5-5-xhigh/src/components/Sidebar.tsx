import { useRef, useState, type ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  MdAdd,
  MdAllInbox,
  MdExpandLess,
  MdExpandMore,
  MdInbox,
  MdInfoOutline,
  MdInfo,
  MdInsertDriveFile,
  MdLabel,
  MdLabelImportant,
  MdLabelImportantOutline,
  MdLocalOffer,
  MdMoreVert,
  MdOutlineEdit,
  MdOutlineDelete,
  MdOutlineInbox,
  MdOutlineInsertDriveFile,
  MdOutlineLocalOffer,
  MdOutlinePeopleAlt,
  MdPeopleAlt,
  MdOutlineReport,
  MdReport,
  MdOutlineScheduleSend,
  MdScheduleSend,
  MdOutlineSend,
  MdSend,
  MdOutlineSettings,
  MdOutlineWatchLater,
  MdWatchLater,
  MdStar,
  MdStarBorder,
  MdDelete,
  MdOutlineMail,
  MdMail,
  MdVisibilityOff,
  MdCheck,
  MdKeyboard,
} from 'react-icons/md';
import type { Category, FolderId, Label } from '../types';
import { useCounts, useIsMobile, useMediaQuery } from '../hooks';
import { actions } from '../lib/actions';
import { openCompose } from '../lib/composeActions';
import { navigate, useRoute, type Route } from '../lib/router';
import { cn } from '../lib/utils';
import { LABEL_COLORS, LABEL_COLOR_KEYS } from '../lib/visuals';
import { useMail } from '../store/mail';
import { useSettings } from '../store/settings';
import { confirmDialog, showToast, ui, useUI } from '../store/ui';
import { AppTitle, Logo } from './Header';
import { IconButton, MenuDivider, MenuItem, Popover } from './ui';

export const DRAG_MIME = 'application/x-opus-threads';

type DropTarget = { kind: 'inbox' | 'starred' | 'trash' | 'spam' } | { kind: 'label'; id: string } | { kind: 'category'; id: Category };

function handleDrop(ids: string[], target: DropTarget) {
  if (!ids.length) return;
  if (target.kind === 'starred') actions.star(ids, true);
  else if (target.kind === 'inbox') actions.moveToInbox(ids);
  else if (target.kind === 'trash') actions.trash(ids);
  else if (target.kind === 'spam') actions.spam(ids);
  else if (target.kind === 'label') actions.moveTo(ids, { kind: 'label', id: target.id });
  else if (target.kind === 'category') actions.moveTo(ids, { kind: 'category', id: target.id });
}

export function Sidebar() {
  const isMobile = useIsMobile();
  const isNarrow = useMediaQuery('(max-width: 1023px)');
  const collapsedSetting = useSettings((s) => s.sidebarCollapsed);
  const drawerOpen = useUI((s) => s.drawerOpen);
  const [hover, setHover] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  if (isMobile) {
    if (!drawerOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex print-hide">
        <div className="absolute inset-0 animate-fade bg-scrim" onClick={() => ui.set({ drawerOpen: false })} />
        <div className="relative h-full w-[300px] max-w-[85vw] animate-slide-right bg-panel shadow-e2">
          <NavContent expanded mobile onNavigate={() => ui.set({ drawerOpen: false })} />
        </div>
      </div>
    );
  }

  const collapsed = collapsedSetting || isNarrow;
  const expanded = !collapsed || hover;
  return (
    <aside
      className={cn('print-hide relative shrink-0 transition-[width] duration-200', collapsed ? 'w-[72px]' : 'w-[256px]')}
      onMouseEnter={() => {
        if (!collapsed) return;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setHover(true), 250);
      }}
      onMouseLeave={() => {
        clearTimeout(timer.current);
        setHover(false);
      }}
    >
      <div className={cn('h-full', collapsed && hover && 'absolute inset-y-0 left-0 z-30 w-[256px] rounded-r-2xl bg-bg shadow-e2')}>
        <NavContent expanded={expanded} />
      </div>
    </aside>
  );
}

function isFolder(route: Route, f: FolderId) {
  return route.view === 'folder' && route.folder === f;
}

function NavContent({ expanded, mobile, onNavigate }: { expanded: boolean; mobile?: boolean; onNavigate?: () => void }) {
  const route = useRoute();
  const counts = useCounts();
  const labels = useMail((s) => s.labels);
  const [more, setMore] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);

  const go = (r: Route) => {
    ui.set({ selected: [], page: 0, inline: null });
    navigate(r);
    onNavigate?.();
  };
  const folderItem = (f: FolderId, label: string, icon: IconType, activeIcon: IconType, opts: { count?: number; bold?: boolean; drop?: DropTarget } = {}) => (
    <NavItem
      key={f}
      label={label}
      icon={icon}
      activeIcon={activeIcon}
      active={isFolder(route, f) || (!mobile && f === 'inbox' && route.view === 'category')}
      count={opts.count}
      bold={opts.bold}
      expanded={expanded}
      drop={opts.drop}
      onClick={() => go({ view: 'folder', folder: f })}
    />
  );
  const catItem = (c: Exclude<Category, 'primary'>, label: string, icon: IconType, activeIcon: IconType) => (
    <NavItem
      key={c}
      label={label}
      icon={icon}
      activeIcon={activeIcon}
      active={route.view === 'category' && route.category === c}
      count={counts.categories[c].unread}
      bold
      expanded={expanded}
      drop={{ kind: 'category', id: c }}
      onClick={() => go({ view: 'category', category: c })}
    />
  );
  const hasScheduled = counts.scheduled > 0;

  return (
    <nav className={cn('flex h-full flex-col overflow-x-hidden overflow-y-auto pb-6', expanded ? 'pr-3' : 'pr-2')} aria-label="Mailboxes">
      {mobile ? (
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <Logo size={28} />
          <AppTitle className="text-lg" />
        </div>
      ) : (
        <div className="px-2 pt-2 pb-4">
          <button
            type="button"
            onClick={() => openCompose()}
            aria-label="Compose"
            data-tip={expanded ? undefined : 'Compose'}
            className={cn(
              'flex h-14 items-center rounded-2xl bg-compose text-compose-fg transition-shadow hover:shadow-e1',
              expanded ? 'gap-3 pr-6 pl-4' : 'w-14 justify-center',
            )}
          >
            <MdOutlineEdit size={24} />
            {expanded && <span className="text-sm font-medium">Compose</span>}
          </button>
        </div>
      )}

      {mobile && <div className="h-2" />}
      {mobile ? (
        <>
          {folderItem('inbox', 'Primary', MdOutlineInbox, MdInbox, { count: counts.inbox, bold: true, drop: { kind: 'inbox' } })}
          {catItem('promotions', 'Promotions', MdOutlineLocalOffer, MdLocalOffer)}
          {catItem('social', 'Social', MdOutlinePeopleAlt, MdPeopleAlt)}
          {catItem('updates', 'Updates', MdInfoOutline, MdInfo)}
          <SectionLabel expanded>All labels</SectionLabel>
        </>
      ) : (
        folderItem('inbox', 'Inbox', MdOutlineInbox, MdInbox, { count: counts.inbox, bold: true, drop: { kind: 'inbox' } })
      )}
      {folderItem('starred', 'Starred', MdStarBorder, MdStar, { drop: { kind: 'starred' } })}
      {folderItem('snoozed', 'Snoozed', MdOutlineWatchLater, MdWatchLater)}
      {mobile && folderItem('important', 'Important', MdLabelImportantOutline, MdLabelImportant)}
      {folderItem('sent', 'Sent', MdOutlineSend, MdSend)}
      {(hasScheduled || mobile) && folderItem('scheduled', 'Scheduled', MdOutlineScheduleSend, MdScheduleSend, { count: counts.scheduled })}
      {folderItem('drafts', 'Drafts', MdOutlineInsertDriveFile, MdInsertDriveFile, { count: counts.drafts })}

      {(mobile || more) && (
        <>
          {!mobile && folderItem('important', 'Important', MdLabelImportantOutline, MdLabelImportant)}
          {!mobile && !hasScheduled && folderItem('scheduled', 'Scheduled', MdOutlineScheduleSend, MdScheduleSend)}
          {folderItem('all', 'All Mail', MdOutlineMail, MdMail)}
          {folderItem('spam', 'Spam', MdOutlineReport, MdReport, { count: counts.spam, bold: true, drop: { kind: 'spam' } })}
          {folderItem('trash', 'Trash', MdOutlineDelete, MdDelete, { drop: { kind: 'trash' } })}
          {!mobile && (
            <>
              <NavItem label="Categories" icon={catsOpen ? MdExpandLess : MdExpandMore} expanded={expanded} onClick={() => setCatsOpen((o) => !o)} />
              {catsOpen && (
                <div className={expanded ? 'pl-4' : ''}>
                  {catItem('social', 'Social', MdOutlinePeopleAlt, MdPeopleAlt)}
                  {catItem('updates', 'Updates', MdInfoOutline, MdInfo)}
                  {catItem('promotions', 'Promotions', MdOutlineLocalOffer, MdLocalOffer)}
                </div>
              )}
              <NavItem label="Manage labels" icon={MdOutlineSettings} expanded={expanded} onClick={() => go({ view: 'settings', tab: 'labels' })} />
              <NavItem label="Create new label" icon={MdAdd} expanded={expanded} onClick={() => ui.set({ labelDialog: {} })} />
            </>
          )}
        </>
      )}
      {!mobile && (
        <NavItem label={more ? 'Less' : 'More'} icon={more ? MdExpandLess : MdExpandMore} expanded={expanded} onClick={() => setMore((m) => !m)} />
      )}

      <div className={cn('mt-4 flex h-10 items-center', expanded ? 'pr-2 pl-6' : 'justify-center')}>
        {expanded ? (
          <>
            <span className="flex-1 text-base font-medium text-fg">Labels</span>
            <IconButton icon={MdAdd} label="Create new label" size="sm" onClick={() => ui.set({ labelDialog: {} })} />
          </>
        ) : (
          <div className="h-px w-8 bg-line" />
        )}
      </div>
      {labels
        .filter((l) => !l.hidden)
        .map((l) => (
          <LabelNavItem key={l.id} label={l} expanded={expanded} active={route.view === 'label' && route.labelId === l.id} count={counts.labels[l.id]} onClick={() => go({ view: 'label', labelId: l.id })} />
        ))}

      {mobile && (
        <>
          <div className="mx-5 my-3 h-px bg-line" />
          <NavItem label="Create new label" icon={MdAdd} expanded onClick={() => { onNavigate?.(); ui.set({ labelDialog: {} }); }} />
          <NavItem label="Settings" icon={MdOutlineSettings} expanded onClick={() => { onNavigate?.(); ui.set({ quickSettings: true }); }} />
          <NavItem label="Keyboard shortcuts" icon={MdKeyboard} expanded onClick={() => { onNavigate?.(); ui.set({ shortcutsOpen: true }); }} />
          <NavItem label="All settings" icon={MdAllInbox} expanded onClick={() => go({ view: 'settings', tab: 'general' })} />
        </>
      )}
    </nav>
  );
}

function SectionLabel({ children, expanded }: { children: ReactNode; expanded: boolean }) {
  if (!expanded) return null;
  return <div className="px-6 pt-4 pb-1 text-xs font-medium tracking-wide text-fg3 uppercase">{children}</div>;
}

function NavItem({
  label,
  icon: Icon,
  activeIcon,
  active,
  count,
  bold,
  expanded,
  onClick,
  drop,
  iconColor,
  trailing,
}: {
  label: string;
  icon: IconType;
  activeIcon?: IconType;
  active?: boolean;
  count?: number;
  bold?: boolean;
  expanded: boolean;
  onClick: () => void;
  drop?: DropTarget;
  iconColor?: string;
  trailing?: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const ActiveIcon = active && activeIcon ? activeIcon : Icon;
  const dropProps = drop
    ? {
        onDragOver: (e: React.DragEvent) => {
          if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setOver(true);
        },
        onDragLeave: () => setOver(false),
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          setOver(false);
          try {
            handleDrop(JSON.parse(e.dataTransfer.getData(DRAG_MIME)) as string[], drop);
          } catch {
            /* ignore malformed drops */
          }
        },
      }
    : {};
  const showCount = !!count && count > 0;
  return (
    <div className="group/nav relative">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        aria-label={showCount ? `${label}, ${count} unread` : label}
        data-tip={expanded ? undefined : label}
        {...dropProps}
        className={cn(
          'relative flex h-8 items-center text-sm transition-colors',
          expanded ? 'w-full rounded-r-full pr-3 pl-[26px]' : 'mx-2 w-14 justify-center rounded-full',
          active ? 'bg-nav-active font-bold text-nav-active-fg' : 'text-fg hover:bg-hover',
          over && 'bg-accent-soft ring-2 ring-accent ring-inset',
        )}
      >
        <ActiveIcon size={20} className="shrink-0" style={iconColor ? { color: iconColor } : undefined} />
        {expanded && <span className={cn('ml-[18px] min-w-0 flex-1 truncate text-left', showCount && bold && !active && 'font-bold')}>{label}</span>}
        {expanded && showCount && <span className={cn('ml-2 text-xs', bold && 'font-bold', !!trailing && 'group-hover/nav:invisible')}>{count}</span>}
        {!expanded && showCount && bold && (
          <span className="absolute -top-1 right-0 min-w-4 rounded-full bg-danger px-1 text-[10px] leading-4 font-bold text-white dark:text-[#1f1f1f]">{count > 99 ? '99+' : count}</span>
        )}
      </button>
      {expanded && trailing}
    </div>
  );
}

function LabelNavItem({ label, expanded, active, count, onClick }: { label: Label; expanded: boolean; active: boolean; count?: number; onClick: () => void }) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const update = useMail((s) => s.updateLabel);
  return (
    <>
      <NavItem
        label={label.name}
        icon={MdLabel}
        iconColor={LABEL_COLORS[label.color].dot}
        active={active}
        count={count}
        bold
        expanded={expanded}
        onClick={onClick}
        drop={{ kind: 'label', id: label.id }}
        trailing={
          <button
            type="button"
            aria-label={`Options for ${label.name}`}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            className={cn(
              'absolute top-0 right-3 flex size-8 items-center justify-center rounded-full text-fg2 hover:bg-hover',
              menuAnchor ? 'visible' : 'invisible group-hover/nav:visible',
            )}
          >
            <MdMoreVert size={18} />
          </button>
        }
      />
      <Popover open={!!menuAnchor} anchor={menuAnchor} onClose={() => setMenuAnchor(null)} placement="right-start" className="w-60">
        <div className="px-4 pt-1 pb-2 text-xs font-medium text-fg3">Label color</div>
        <div className="grid grid-cols-9 gap-1 px-4 pb-2">
          {LABEL_COLOR_KEYS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => update(label.id, { color: c })}
              className="flex size-5 items-center justify-center rounded-full"
              style={{ background: LABEL_COLORS[c].dot }}
            >
              {label.color === c && <MdCheck size={14} className="text-white" />}
            </button>
          ))}
        </div>
        <MenuDivider />
        <MenuItem
          icon={MdOutlineEdit}
          label="Edit"
          onClick={() => {
            setMenuAnchor(null);
            ui.set({ labelDialog: { labelId: label.id } });
          }}
        />
        <MenuItem
          icon={MdVisibilityOff}
          label="Hide from label list"
          onClick={() => {
            setMenuAnchor(null);
            update(label.id, { hidden: true });
            showToast(`"${label.name}" hidden. Show it again in Settings › Labels.`);
          }}
        />
        <MenuItem
          icon={MdOutlineDelete}
          label="Remove label"
          onClick={() => {
            setMenuAnchor(null);
            confirmDialog({
              title: 'Remove label',
              message: `Delete the label "${label.name}"? Conversations with this label will not be deleted.`,
              confirmLabel: 'Delete',
              danger: true,
              onConfirm: () => {
                useMail.getState().deleteLabel(label.id);
                if (active) navigate({ view: 'folder', folder: 'inbox' });
                showToast(`Label "${label.name}" deleted.`);
              },
            });
          }}
        />
      </Popover>
    </>
  );
}
