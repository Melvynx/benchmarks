import { useMemo, useState } from 'react';
import { Icon, IconButton } from './kit';
import { MenuItem, MenuSeparator, Popover, useAnchor } from './Popover';
import { useMail } from '../lib/store';
import { confirmDialog, openDialog, setUI, useUI } from '../lib/ui';
import { useViewModel } from '../lib/viewModel';
import { CATEGORIES, FOLDER_META, computeCounts } from '../lib/mail';
import { folderHref, labelHref, navigate } from '../lib/router';
import { composeNew, deleteLabel } from '../lib/actions';
import { useViewport } from '../lib/hooks';
import type { Label, SystemFolder } from '../lib/types';

const MAIN_FOLDERS: SystemFolder[] = ['inbox', 'starred', 'snoozed', 'sent', 'drafts', 'trash'];
const MORE_FOLDERS: SystemFolder[] = ['important', 'scheduled', 'all', 'spam'];

function NavItem({
  href,
  icon,
  label,
  count,
  active,
  fill,
  collapsed,
  onClick,
  trailing,
  dot,
  sub,
}: {
  href: string;
  icon?: string;
  label: string;
  count?: number;
  active?: boolean;
  fill?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
  dot?: string;
  sub?: boolean;
}) {
  return (
    <div className={`nav-row${active ? ' active' : ''}${sub ? ' sub' : ''}`}>
      <a
        href={href}
        className="nav-item"
        aria-current={active ? 'page' : undefined}
        data-tip={collapsed ? label : undefined}
        onClick={onClick}
      >
        {dot ? <span className="label-dot" style={{ background: dot }} aria-hidden="true" /> : <Icon name={icon ?? 'label'} fill={fill ?? active} />}
        {!collapsed && <span className="nav-label">{label}</span>}
        {!collapsed && count ? <span className="nav-count">{count > 999 ? '999+' : count}</span> : null}
        {collapsed && count ? <span className="nav-badge" aria-hidden="true" /> : null}
      </a>
      {!collapsed && trailing}
    </div>
  );
}

export function Sidebar() {
  const vm = useViewModel();
  const mail = useMail();
  const ui = useUI();
  const vp = useViewport();
  const counts = useMemo(() => computeCounts(mail, ui.now), [mail, ui.now]);
  const isDrawer = vp !== 'desktop';
  const collapsed = !isDrawer && mail.settings.sidebarCollapsed;
  const view = vm.page === 'mail' ? vm.view : null;
  const activeFolder = view?.kind === 'folder' ? view.folder : null;
  const activeTab = view?.kind === 'folder' && view.folder === 'inbox' ? (view.tab ?? 'primary') : null;
  const moreActive = (activeFolder ? MORE_FOLDERS.includes(activeFolder) : false) || (!!activeTab && activeTab !== 'primary');
  const [moreOpen, setMoreOpen] = useState(false);
  const more = moreOpen || moreActive;
  const closeDrawer = () => setUI({ drawerOpen: false });
  const cats = mail.settings.categoriesEnabled;

  const folderCount = (f: SystemFolder): number | undefined => {
    switch (f) {
      case 'inbox':
        return counts.inbox;
      case 'drafts':
        return counts.drafts;
      case 'spam':
        return counts.spam;
      case 'snoozed':
      case 'scheduled':
        return undefined;
      default:
        return undefined;
    }
  };

  const nav = (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}${isDrawer ? ' drawer' : ''}${isDrawer && ui.drawerOpen ? ' open' : ''}`} aria-label="Mailboxes">
      {isDrawer && (
        <div className="drawer-head">
          <span className="drawer-title">Mail</span>
        </div>
      )}
      <button
        type="button"
        className="compose-btn"
        onClick={() => {
          closeDrawer();
          composeNew();
        }}
        data-tip={collapsed ? 'Compose' : undefined}
      >
        <Icon name="edit" />
        {!collapsed && <span>Compose</span>}
      </button>

      <div className="nav-scroll">
        {MAIN_FOLDERS.map((f) => (
          <NavItem
            key={f}
            href={folderHref(f)}
            icon={FOLDER_META[f].icon}
            label={FOLDER_META[f].label}
            count={folderCount(f)}
            active={activeFolder === f && (f !== 'inbox' || activeTab === 'primary')}
            collapsed={collapsed}
            onClick={closeDrawer}
          />
        ))}

        <button
          type="button"
          className="nav-item nav-more"
          aria-expanded={more}
          onClick={() => setMoreOpen((v) => !v)}
          data-tip={collapsed ? (more ? 'Less' : 'More') : undefined}
          disabled={moreActive}
        >
          <Icon name={more ? 'expand_less' : 'expand_more'} />
          {!collapsed && <span className="nav-label">{more ? 'Less' : 'More'}</span>}
        </button>

        {more && (
          <>
            {MORE_FOLDERS.map((f) => (
              <NavItem
                key={f}
                href={folderHref(f)}
                icon={FOLDER_META[f].icon}
                label={FOLDER_META[f].label}
                count={folderCount(f)}
                active={activeFolder === f}
                collapsed={collapsed}
                onClick={closeDrawer}
              />
            ))}
            {!collapsed && <div className="nav-group-title">Categories</div>}
            {CATEGORIES.filter((c) => c.id !== 'primary').map((c) => (
              <NavItem
                key={c.id}
                href={folderHref('inbox', c.id)}
                icon={c.icon}
                label={c.label}
                count={cats[c.id] ? counts.byCategory[c.id] : undefined}
                active={activeTab === c.id}
                collapsed={collapsed}
                onClick={closeDrawer}
              />
            ))}
          </>
        )}

        {!collapsed && (
          <div className="nav-section">
            <span>Labels</span>
            <IconButton icon="add" label="Create new label" small onClick={() => openDialog({ kind: 'label' })} />
          </div>
        )}
        {collapsed && (
          <button type="button" className="nav-item" data-tip="Create new label" onClick={() => openDialog({ kind: 'label' })}>
            <Icon name="add" />
          </button>
        )}
        {mail.labels.map((l) => (
          <LabelNavItem
            key={l.id}
            label={l}
            count={counts.byLabel[l.id]}
            active={view?.kind === 'label' && view.labelId === l.id}
            collapsed={collapsed}
            onClick={closeDrawer}
          />
        ))}
        {!collapsed && !mail.labels.length && <div className="nav-empty">No labels yet. Use + to create one.</div>}
        {!collapsed && (
          <a className="nav-item manage" href="#/settings/labels" onClick={closeDrawer}>
            <Icon name="settings" />
            <span className="nav-label">Manage labels</span>
          </a>
        )}
      </div>
    </nav>
  );

  if (!isDrawer) return nav;
  return (
    <>
      <div className={`scrim${ui.drawerOpen ? ' open' : ''}`} onClick={closeDrawer} aria-hidden="true" />
      {nav}
    </>
  );
}

function LabelNavItem({ label, count, active, collapsed, onClick }: { label: Label; count?: number; active: boolean; collapsed: boolean; onClick: () => void }) {
  const menu = useAnchor();
  return (
    <>
      <NavItem
        href={labelHref(label.id)}
        label={label.name}
        count={count}
        active={active}
        collapsed={collapsed}
        dot={label.color}
        onClick={onClick}
        trailing={
          <button type="button" className="nav-more-btn" aria-label={`Options for label ${label.name}`} onClick={menu.toggle}>
            <Icon name="more_vert" size="sm" />
          </button>
        }
      />
      {menu.open && (
        <Popover anchor={menu.el} onClose={menu.close}>
          <MenuItem icon="edit" label="Edit" onClick={() => openDialog({ kind: 'label', labelId: label.id })} />
          <MenuItem icon="visibility" label="Show only this label" onClick={() => navigate(labelHref(label.id))} />
          <MenuSeparator />
          <MenuItem
            icon="delete"
            label="Remove label"
            onClick={() =>
              confirmDialog(
                { title: 'Remove label?', body: `Delete the label "${label.name}"? Conversations that use it are not deleted.`, confirmLabel: 'Remove', danger: true },
                () => {
                  if (active) navigate('#/inbox');
                  deleteLabel(label.id);
                },
              )
            }
          />
        </Popover>
      )}
    </>
  );
}

