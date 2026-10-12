import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  MdAdd, MdExpandLess, MdExpandMore, MdInbox, MdInsertDriveFile, MdLabel, MdLabelImportant, MdMail, MdMoreVert,
  MdOutlineDelete, MdOutlineEdit, MdOutlineInbox, MdOutlineInfo, MdOutlineInsertDriveFile, MdOutlineLabel,
  MdOutlineLabelImportant, MdOutlineLocalOffer, MdOutlineMail, MdOutlineReport, MdOutlineSchedule, MdOutlineScheduleSend,
  MdOutlineSend, MdOutlineSettings, MdOutlineStarBorder, MdPeopleOutline, MdReport, MdSchedule, MdScheduleSend, MdSend,
  MdStar, MdDelete,
} from 'react-icons/md';
import { LABEL_PALETTE } from '../data/seed';
import type { Category } from '../data/types';
import { useIsMobile, useNow } from '../hooks';
import { composeNew, moveTo, runAction } from '../lib/actions';
import { navigate, useRoute, type Route, type SystemFolder } from '../lib/router';
import { useMail } from '../store/mail';
import { computeCounts } from '../store/selectors';
import { useUI } from '../store/ui';
import { Logo } from './Header';
import { Menu, MenuDivider, MenuItem, useAnchor } from './primitives';

const DRAG_TYPE = 'application/x-opus-threads';

interface NavDef {
  folder: SystemFolder;
  label: string;
  icon: IconType;
  activeIcon: IconType;
}

const PRIMARY: NavDef[] = [
  { folder: 'inbox', label: 'Inbox', icon: MdOutlineInbox, activeIcon: MdInbox },
  { folder: 'starred', label: 'Starred', icon: MdOutlineStarBorder, activeIcon: MdStar },
  { folder: 'snoozed', label: 'Snoozed', icon: MdOutlineSchedule, activeIcon: MdSchedule },
  { folder: 'sent', label: 'Sent', icon: MdOutlineSend, activeIcon: MdSend },
  { folder: 'drafts', label: 'Drafts', icon: MdOutlineInsertDriveFile, activeIcon: MdInsertDriveFile },
];

const MORE: NavDef[] = [
  { folder: 'important', label: 'Important', icon: MdOutlineLabelImportant, activeIcon: MdLabelImportant },
  { folder: 'scheduled', label: 'Scheduled', icon: MdOutlineScheduleSend, activeIcon: MdScheduleSend },
  { folder: 'all', label: 'All Mail', icon: MdOutlineMail, activeIcon: MdMail },
  { folder: 'spam', label: 'Spam', icon: MdOutlineReport, activeIcon: MdReport },
  { folder: 'trash', label: 'Trash', icon: MdOutlineDelete, activeIcon: MdDelete },
];

const CATEGORY_NAV: { id: Category; label: string; icon: IconType }[] = [
  { id: 'social', label: 'Social', icon: MdPeopleOutline },
  { id: 'updates', label: 'Updates', icon: MdOutlineInfo },
  { id: 'promotions', label: 'Promotions', icon: MdOutlineLocalOffer },
];

function readDrag(e: DragEvent): string[] | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    return raw ? (JSON.parse(raw) as string[]) : useUI.getState().dragIds;
  } catch {
    return useUI.getState().dragIds;
  }
}

function NavItem({
  active, icon: Icon, label, count, bold, onClick, onDrop, trailing, style, dotColor,
}: {
  active: boolean;
  icon: IconType;
  label: string;
  count?: number;
  bold?: boolean;
  onClick: () => void;
  onDrop?: (ids: string[]) => void;
  trailing?: ReactNode;
  style?: CSSProperties;
  dotColor?: string;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`nav-item ${active ? 'is-active' : ''} ${over ? 'is-drop' : ''} ${bold && count ? 'has-unread' : ''}`}
      style={style}
      onDragOver={(e) => {
        if (!onDrop || !useUI.getState().dragIds) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const ids = readDrag(e);
        if (ids?.length && onDrop) {
          e.preventDefault();
          onDrop(ids);
        }
      }}
    >
      <button type="button" className="nav-link" onClick={onClick} aria-current={active ? 'page' : undefined} data-tip={label}>
        <span className="nav-icon" style={dotColor ? { color: dotColor } : undefined}><Icon aria-hidden /></span>
        <span className="nav-label">{label}</span>
        {!!count && <span className="nav-count">{count > 9999 ? '9,999+' : count.toLocaleString()}</span>}
      </button>
      {trailing}
    </div>
  );
}

export function Sidebar() {
  const route = useRoute();
  const mobile = useIsMobile();
  const now = useNow(15_000);
  const threads = useMail((s) => s.threads);
  const drafts = useMail((s) => s.drafts);
  const settings = useMail((s) => s.settings);
  const labels = useMail((s) => s.labels);
  const navOpen = useUI((s) => s.navOpen);
  const [showMore, setShowMore] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobile || !navOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    asideRef.current?.querySelector<HTMLElement>('.nav-item.is-active .nav-link, .nav-link')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      useUI.getState().set({ navOpen: false });
      opener?.focus();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [mobile, navOpen]);
  const counts = computeCounts({ threads, drafts, settings }, now);
  const collapsed = settings.sidebarCollapsed && !mobile;

  const go = (r: Route) => {
    useUI.getState().clearSelection();
    useUI.getState().set({ page: 0, navOpen: false });
    navigate(r);
  };

  const isFolder = (f: SystemFolder) => route.view === 'folder' && route.folder === f && (f !== 'inbox' || !route.category || route.category === 'primary' || !settings.categories);

  const countFor = (f: SystemFolder) => {
    if (f === 'inbox') return counts.inbox;
    if (f === 'drafts') return counts.drafts;
    if (f === 'scheduled') return counts.scheduled;
    if (f === 'spam') return counts.spam;
    return 0;
  };

  const dropFor = (f: SystemFolder): ((ids: string[]) => void) | undefined => {
    if (f === 'inbox') return (ids) => runAction(ids, 'inbox');
    if (f === 'starred') return (ids) => runAction(ids, 'star');
    if (f === 'important') return (ids) => runAction(ids, 'important');
    if (f === 'trash') return (ids) => runAction(ids, 'trash');
    if (f === 'spam') return (ids) => runAction(ids, 'spam');
    return undefined;
  };

  const primary = [...PRIMARY];
  if (counts.scheduled > 0) primary.push(MORE[1]);
  const more = MORE.filter((d) => !primary.includes(d));
  const hidden = more.some((d) => isFolder(d.folder));

  const renderDef = (d: NavDef) => (
    <NavItem
      key={d.folder}
      active={isFolder(d.folder)}
      icon={isFolder(d.folder) ? d.activeIcon : d.icon}
      label={d.label}
      count={countFor(d.folder)}
      bold={d.folder !== 'drafts' && d.folder !== 'scheduled'}
      onClick={() => go({ view: 'folder', folder: d.folder })}
      onDrop={dropFor(d.folder)}
    />
  );

  return (
    <>
      {mobile && navOpen && <div className="drawer-scrim" onClick={() => useUI.getState().set({ navOpen: false })} />}
      <aside
        ref={asideRef}
        className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${mobile ? 'is-drawer' : ''} ${mobile && navOpen ? 'is-open' : ''}`}
        aria-label="Mailboxes"
      >
        <div className="sidebar-inner">
          {mobile && <div className="drawer-brand"><Logo size={28} /><span className="brand-name">Claude Opus 5.5</span></div>}
          {!mobile && (
            <div className="compose-wrap">
              <button type="button" className="compose-btn" onClick={() => composeNew()} data-tip={collapsed ? 'Compose' : undefined}>
                <MdOutlineEdit aria-hidden />
                <span className="compose-label">Compose</span>
              </button>
            </div>
          )}
          <nav className="nav">
            {primary.map(renderDef)}
            {(showMore || hidden) && more.map(renderDef)}
            {(showMore || hidden) && settings.categories && (
              <>
                {CATEGORY_NAV.map((c) => (
                  <NavItem
                    key={c.id}
                    active={route.view === 'folder' && route.folder === 'inbox' && route.category === c.id}
                    icon={c.icon}
                    label={c.label}
                    count={counts.categories[c.id]}
                    onClick={() => go({ view: 'folder', folder: 'inbox', category: c.id })}
                  />
                ))}
              </>
            )}
            {(showMore || hidden) && (
              <NavItem active={route.view === 'settings'} icon={MdOutlineSettings} label="Manage labels" onClick={() => go({ view: 'settings', tab: 'labels' })} />
            )}
            <NavItem
              active={false}
              icon={showMore || hidden ? MdExpandLess : MdExpandMore}
              label={showMore || hidden ? 'Less' : 'More'}
              onClick={() => setShowMore(!showMore)}
            />
            <div className="nav-section">
              <span className="nav-section-title">Labels</span>
              <button
                type="button"
                className="icon-btn icon-btn-sm nav-section-add"
                aria-label="Create new label"
                data-tip="Create new label"
                onClick={() => useUI.getState().set({ labelDialog: { mode: 'create' } })}
              >
                <MdAdd aria-hidden />
              </button>
            </div>
            {labels.filter((l) => !l.hidden).map((l) => {
              const active = route.view === 'label' && route.labelId === l.id;
              return (
                <NavItem
                  key={l.id}
                  active={active}
                  icon={active ? MdLabel : MdOutlineLabel}
                  dotColor={l.color}
                  label={l.name}
                  count={counts.labels[l.id]}
                  bold
                  onClick={() => go({ view: 'label', labelId: l.id })}
                  onDrop={(ids) => moveTo(ids, { labelId: l.id })}
                  trailing={<LabelItemMenu labelId={l.id} />}
                />
              );
            })}
          </nav>
          {!collapsed && (
            <div className="sidebar-foot">
              <span>Stored locally · works offline</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function LabelItemMenu({ labelId }: { labelId: string }) {
  const m = useAnchor<HTMLButtonElement>();
  const label = useMail((s) => s.labels.find((l) => l.id === labelId));
  const updateLabel = useMail((s) => s.updateLabel);
  const deleteLabel = useMail((s) => s.deleteLabel);
  if (!label) return null;
  return (
    <>
      <button type="button" className={`icon-btn icon-btn-sm nav-more ${m.open ? 'is-open' : ''}`} aria-label={`Options for ${label.name}`} onClick={m.toggle}>
        <MdMoreVert aria-hidden />
      </button>
      <Menu anchor={m.anchor} open={m.open} onClose={m.close} placement="right-start">
        <div className="menu-header">Label color</div>
        <div className="swatches">
          {LABEL_PALETTE.map((p) => (
            <button
              key={p.color}
              type="button"
              className={`swatch ${p.color === label.color ? 'is-on' : ''}`}
              style={{ background: p.color }}
              aria-label={`Set color ${p.color}`}
              onClick={() => {
                updateLabel(label.id, p);
                m.close();
              }}
            />
          ))}
        </div>
        <MenuDivider />
        <MenuItem onSelect={() => { m.close(); useUI.getState().set({ labelDialog: { mode: 'edit', labelId } }); }}>Edit</MenuItem>
        <MenuItem onSelect={() => { m.close(); updateLabel(label.id, { hidden: true }); useUI.getState().showToast(`"${label.name}" hidden from the label list.`, [{ label: 'Undo', run: () => useMail.getState().updateLabel(label.id, { hidden: false }) }]); }}>Hide from label list</MenuItem>
        <MenuItem
          danger
          onSelect={() => {
            m.close();
            if (window.confirm(`Delete the label "${label.name}"? Conversations keep their other labels.`)) {
              deleteLabel(label.id);
              const r = useUI.getState();
              r.showToast(`Label "${label.name}" deleted.`);
              navigate({ view: 'folder', folder: 'inbox' });
            }
          }}
        >
          Remove label
        </MenuItem>
      </Menu>
    </>
  );
}

export { DRAG_TYPE };
