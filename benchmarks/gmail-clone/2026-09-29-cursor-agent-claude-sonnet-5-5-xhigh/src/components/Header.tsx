import { useRef, useState } from 'react';
import { Download, Keyboard, Menu, RotateCcw, Search, Settings as SettingsIcon } from 'lucide-react';
import { useMail } from '../lib/store';
import { useUI } from '../lib/ui';
import { ME } from '../lib/people';
import { useIsCompact, useIsMobile } from '../lib/hooks';
import { formatSize } from '../lib/date';
import { storageUsed } from '../lib/selectors';
import { Avatar, IconButton, Popover } from './primitives';
import { SearchBar } from './SearchBar';

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="lm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b8def" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#lm-g)" />
      <path d="M14 22l18 13 18-13v22a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" fill="#fff" opacity=".96" />
      <path d="M14 22a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3l-18 13z" fill="#fff" opacity=".72" />
    </svg>
  );
}

export function Header() {
  const compact = useIsCompact();
  const mobile = useIsMobile();
  const mobileSearch = useUI((s) => s.mobileSearch);

  const toggleMenu = () => {
    if (compact) useUI.setState((s) => ({ drawerOpen: !s.drawerOpen }));
    else useMail.getState().setSettings({ sidebarCollapsed: !useMail.getState().settings.sidebarCollapsed });
  };

  return (
    <header className="header">
      {mobile && mobileSearch ? (
        <div className="header__mobile-search">
          <SearchBar mobile onDone={() => useUI.getState().set({ mobileSearch: false })} />
        </div>
      ) : (
        <>
          <div className="header__left">
            <IconButton label="Main menu" size="lg" onClick={toggleMenu} aria-label="Main menu">
              <Menu size={22} />
            </IconButton>
            <a className="brand" href="#/inbox" onClick={() => useUI.getState().clearSelection()}>
              <LogoMark size={32} />
              <h1 className="brand__title">Claude Sonnet 5.5</h1>
            </a>
          </div>
          {!mobile ? (
            <div className="header__search">
              <SearchBar />
            </div>
          ) : null}
          <div className="header__right">
            {mobile ? (
              <IconButton label="Search mail" size="lg" onClick={() => useUI.getState().set({ mobileSearch: true })}>
                <Search size={22} />
              </IconButton>
            ) : null}
            {!mobile ? (
              <IconButton label="Keyboard shortcuts" size="lg" onClick={() => useUI.getState().set({ shortcutsHelp: true })}>
                <Keyboard size={22} />
              </IconButton>
            ) : null}
            <IconButton label="Settings" size="lg" onClick={() => useUI.setState((s) => ({ quickSettings: !s.quickSettings }))}>
              <SettingsIcon size={22} />
            </IconButton>
            <AccountMenu />
          </div>
        </>
      )}
    </header>
  );
}

function AccountMenu() {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const used = useMail((s) => storageUsed(s));

  const exportData = () => {
    const s = useMail.getState();
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), threads: s.threads, messages: s.messages, drafts: s.drafts, labels: s.labels }, null, 2)],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mailbox-export.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setOpen(false);
  };

  return (
    <>
      <button ref={ref} type="button" className="account-btn" aria-label={`Account: ${ME.name}`} title={`${ME.name}\n${ME.email}`} onClick={() => setOpen(!open)}>
        <Avatar person={ME} size={32} />
      </button>
      <Popover open={open} anchorRef={ref} onClose={() => setOpen(false)} placement="bottom-end" className="popover--account">
        <div className="account-card">
          <Avatar person={ME} size={72} />
          <div className="account-card__name">{ME.name}</div>
          <div className="account-card__email">{ME.email}</div>
          <div className="account-card__storage">
            <div className="meter">
              <div className="meter__bar" style={{ width: '18%' }} />
            </div>
            <span>{formatSize(used + 2_400_000_000)} of 15 GB used</span>
          </div>
          <div className="account-card__actions">
            <button type="button" className="btn btn--outline" onClick={exportData}>
              <Download size={16} /> Export mailbox
            </button>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => {
                setOpen(false);
                useUI.getState().set({
                  confirm: {
                    title: 'Reset demo mailbox?',
                    body: 'This restores the original sample messages and removes your changes, drafts, and labels.',
                    confirmLabel: 'Reset mailbox',
                    cancelLabel: 'Cancel',
                    onConfirm: () => {
                      useMail.getState().resetData();
                      useUI.setState({ selected: [], compose: [] });
                      window.location.hash = '#/inbox';
                      useUI.getState().toast('Mailbox reset to the original sample data.');
                    },
                  },
                });
              }}
            >
              <RotateCcw size={16} /> Reset demo data
            </button>
          </div>
        </div>
      </Popover>
    </>
  );
}
