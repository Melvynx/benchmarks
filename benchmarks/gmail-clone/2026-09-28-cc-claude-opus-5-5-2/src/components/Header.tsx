import { useMemo } from 'react';
import {
  MdApps, MdClose, MdLogout, MdMenu, MdOutlineCalendarToday, MdOutlineContacts, MdOutlineFeedback, MdOutlineHelpOutline,
  MdOutlineKeyboard, MdOutlineRefresh, MdOutlineSettings, MdOutlineTaskAlt,
} from 'react-icons/md';
import { ME } from '../data/seed';
import { useIsMobile } from '../hooks';
import { composeNew } from '../lib/actions';
import { fileSize } from '../lib/format';
import { navigate } from '../lib/router';
import { useMail } from '../store/mail';
import { useUI } from '../store/ui';
import { Avatar, IconButton, Menu, MenuDivider, MenuItem, Popover, useAnchor } from './primitives';
import { SearchBar } from './SearchBar';

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size * 0.75} viewBox="0 0 48 36" aria-hidden>
      <path d="M4 34h8V15L0 6v24c0 2.2 1.8 4 4 4z" fill="#4285f4" />
      <path d="M36 34h8c2.2 0 4-1.8 4-4V6l-12 9z" fill="#34a853" />
      <path d="M36 2v13l12-9V4c0-3.3-3.8-5.2-6.4-3.2z" fill="#fbbc04" />
      <path d="M12 15V2l12 9 12-9v13l-12 9z" fill="#ea4335" />
      <path d="M0 4v2l12 9V2L6.4.8C3.8-1.2 0 .7 0 4z" fill="#c5221f" />
    </svg>
  );
}

export function Header() {
  const mobile = useIsMobile();
  const collapsed = useMail((s) => s.settings.sidebarCollapsed);
  const update = useMail((s) => s.updateSettings);
  const toggleNav = () => {
    if (window.matchMedia('(max-width: 720px)').matches) useUI.getState().set({ navOpen: true });
    else update({ sidebarCollapsed: !collapsed });
  };

  if (mobile) {
    return (
      <header className="topbar topbar-mobile">
        <SearchBar onMenu={toggleNav} account={<AccountButton size={32} />} />
      </header>
    );
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <IconButton icon={MdMenu} label="Main menu" onClick={toggleNav} size="lg" />
        <a className="brand" href="#inbox" aria-label="Opus 5.5 inbox">
          <Logo />
          <span className="brand-name">Opus 5.5</span>
        </a>
      </div>
      <SearchBar />
      <div className="topbar-right">
        <HelpMenu />
        <IconButton icon={MdOutlineSettings} label="Settings" onClick={() => useUI.getState().set({ quickSettings: !useUI.getState().quickSettings })} />
        <AppsMenu />
        <AccountButton />
      </div>
    </header>
  );
}

function HelpMenu() {
  const m = useAnchor<HTMLButtonElement>();
  return (
    <>
      <button type="button" className={`icon-btn icon-btn-md ${m.open ? 'is-active' : ''}`} aria-label="Support" data-tip="Support" onClick={m.toggle}>
        <MdOutlineHelpOutline aria-hidden />
      </button>
      <Menu anchor={m.anchor} open={m.open} onClose={m.close} placement="bottom-end">
        <MenuItem icon={MdOutlineKeyboard} hint="?" onSelect={() => { m.close(); useUI.getState().set({ shortcutsHelp: true }); }}>Keyboard shortcuts</MenuItem>
        <MenuItem icon={MdOutlineSettings} onSelect={() => { m.close(); navigate({ view: 'settings', tab: 'general' }); }}>All settings</MenuItem>
        <MenuDivider />
        <MenuItem
          icon={MdOutlineFeedback}
          onSelect={() => {
            m.close();
            composeNew({ to: [{ name: 'Opus Mail feedback', email: 'feedback@opus.mail' }], subject: 'Feedback on Opus Mail' });
          }}
        >
          Send feedback
        </MenuItem>
      </Menu>
    </>
  );
}

function AppsMenu() {
  const m = useAnchor<HTMLButtonElement>();
  const update = useMail((s) => s.updateSettings);
  const open = (p: 'calendar' | 'tasks' | 'contacts') => {
    m.close();
    update({ sidePanel: p });
  };
  const apps = [
    { id: 'calendar' as const, label: 'Calendar', icon: MdOutlineCalendarToday, color: '#1a73e8' },
    { id: 'tasks' as const, label: 'Tasks', icon: MdOutlineTaskAlt, color: '#1e8e3e' },
    { id: 'contacts' as const, label: 'Contacts', icon: MdOutlineContacts, color: '#e37400' },
  ];
  return (
    <>
      <button type="button" className={`icon-btn icon-btn-md ${m.open ? 'is-active' : ''}`} aria-label="Apps" data-tip="Apps" onClick={m.toggle}>
        <MdApps aria-hidden />
      </button>
      <Popover anchor={m.anchor} open={m.open} onClose={m.close} placement="bottom-end" className="apps-pop" label="Apps">
        <div className="apps-grid">
          {apps.map((a) => (
            <button key={a.id} type="button" className="app-tile" onClick={() => open(a.id)}>
              <span className="app-icon" style={{ color: a.color }}><a.icon aria-hidden /></span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}

function AccountButton({ size = 32 }: { size?: number }) {
  const m = useAnchor<HTMLButtonElement>();
  const displayName = useMail((s) => s.settings.displayName);
  const threads = useMail((s) => s.threads);
  const reset = useMail((s) => s.resetMailbox);
  const me = { ...ME, name: displayName || ME.name };
  const used = useMemo(() => {
    let bytes = 0;
    for (const t of Object.values(threads)) for (const msg of t.messages) {
      bytes += msg.html.length * 40;
      for (const a of msg.attachments) bytes += a.size;
    }
    return bytes * 38; // pretend a decade of mail lives here
  }, [threads]);
  const quota = 15 * 1024 ** 3;
  return (
    <>
      <button type="button" className="account-btn" aria-label={`Account: ${me.name}`} data-tip={`${me.name}\n${me.email}`} onClick={m.toggle}>
        <Avatar contact={me} size={size} />
      </button>
      <Popover anchor={m.anchor} open={m.open} onClose={m.close} placement="bottom-end" className="account-pop" label="Account">
        <div className="account-card">
          <div className="account-email">{me.email}</div>
          <IconButton icon={MdClose} label="Close" className="account-close" onClick={m.close} />
          <Avatar contact={me} size={80} className="account-avatar" />
          <div className="account-hi">Hi, {me.name.split(' ')[0]}!</div>
          <button type="button" className="btn btn-outline" onClick={() => { m.close(); navigate({ view: 'settings', tab: 'general' }); }}>
            Manage your account
          </button>
          <div className="account-storage">
            <div className="storage-bar"><span style={{ width: `${Math.min(100, (used / quota) * 100)}%` }} /></div>
            <div className="storage-text">{fileSize(used)} of 15 GB used</div>
          </div>
          <div className="account-actions">
            <button
              type="button"
              className="account-action"
              onClick={() => {
                m.close();
                if (window.confirm('Reset the mailbox to its original demo state? Your local changes will be lost.')) {
                  reset();
                  useUI.getState().clearSelection();
                  navigate({ view: 'folder', folder: 'inbox' });
                  useUI.getState().showToast('Mailbox reset to demo data.');
                }
              }}
            >
              <MdOutlineRefresh aria-hidden /> Reset demo mailbox
            </button>
            <button type="button" className="account-action" onClick={() => { m.close(); useUI.getState().set({ signedOut: true }); }}>
              <MdLogout aria-hidden /> Sign out
            </button>
          </div>
          <div className="account-foot">Everything stays on this device · Stored locally</div>
        </div>
      </Popover>
    </>
  );
}
