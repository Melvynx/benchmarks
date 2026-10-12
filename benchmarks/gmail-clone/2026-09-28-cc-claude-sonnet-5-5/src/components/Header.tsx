import { useMemo, useState } from 'react';
import { Avatar, Icon, IconButton } from './kit';
import { MenuItem, MenuSeparator, MenuTitle, Popover, useAnchor } from './Popover';
import { SearchBar } from './SearchBar';
import { useMail } from '../lib/store';
import { openDialog, setUI, useUI } from '../lib/ui';
import { resetMailbox, updateSettings, confirmReset } from '../lib/actions';
import { navigate } from '../lib/router';
import { ME } from '../data/contacts';
import { formatSize } from '../lib/files';
import type { Density, ReadingPane, ThemeMode } from '../lib/types';
import { useViewport } from '../lib/hooks';

export const APP_NAME = 'Claude Sonnet 5.5';

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a5c" />
          <stop offset="1" stopColor="#d9482b" />
        </linearGradient>
      </defs>
      <rect x="2" y="6" width="28" height="20" rx="5" fill="url(#lg1)" />
      <path d="M4.5 9.5 16 18l11.5-8.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Header() {
  const vp = useViewport();
  const mail = useMail();
  const ui = useUI();
  const [searchOpen, setSearchOpen] = useState(false);
  const account = useAnchor();
  const quick = useAnchor();

  const toggleNav = () => {
    if (vp === 'desktop') updateSettings({ sidebarCollapsed: !mail.settings.sidebarCollapsed });
    else setUI({ drawerOpen: !ui.drawerOpen });
  };

  if (vp === 'mobile' && searchOpen) {
    return (
      <header className="header searching">
        <SearchBar mobileOpen onMobileClose={() => setSearchOpen(false)} />
      </header>
    );
  }

  return (
    <header className="header">
      <div className="header-left">
        <IconButton icon="menu" label="Main menu" onClick={toggleNav} aria-expanded={vp === 'desktop' ? !mail.settings.sidebarCollapsed : ui.drawerOpen} />
        <a className="brand" href="#/inbox" onClick={() => setUI({ drawerOpen: false })}>
          <LogoMark />
          <h1 className="wordmark">{APP_NAME}</h1>
        </a>
      </div>
      {vp !== 'mobile' && (
        <div className="header-search">
          <SearchBar />
        </div>
      )}
      <div className="header-right">
        {vp === 'mobile' && <IconButton icon="search" label="Search mail" onClick={() => setSearchOpen(true)} />}
        {vp !== 'mobile' && <IconButton icon="keyboard" label="Keyboard shortcuts" onClick={() => openDialog({ kind: 'shortcuts' })} />}
        <IconButton icon="settings" label="Quick settings" onClick={quick.toggle} active={quick.open} />
        <button type="button" className="account-btn" aria-label={`Account: ${ME.name}`} onClick={account.toggle}>
          <Avatar name={ME.name} email={ME.email} color="#b5401a" size={32} />
        </button>
      </div>
      {quick.open && (
        <Popover anchor={quick.el} onClose={quick.close} align="end" role="dialog" className="quick-settings">
          <QuickSettings onClose={quick.close} />
        </Popover>
      )}
      {account.open && (
        <Popover anchor={account.el} onClose={account.close} align="end" role="dialog" className="account-menu">
          <AccountCard onClose={account.close} />
        </Popover>
      )}
    </header>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; icon?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size="sm" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

const ACCENTS = [
  { id: 'blue', color: '#0b57d0', label: 'Blue' },
  { id: 'coral', color: '#d9482b', label: 'Coral' },
  { id: 'green', color: '#188038', label: 'Green' },
  { id: 'violet', color: '#6750a4', label: 'Violet' },
] as const;

function QuickSettings({ onClose }: { onClose: () => void }) {
  const { settings } = useMail();
  return (
    <div className="qs">
      <div className="qs-head">
        <strong>Quick settings</strong>
        <button type="button" className="btn outline" onClick={() => { onClose(); navigate('#/settings/general'); }}>
          See all settings
        </button>
      </div>
      <div className="qs-section">
        <div className="qs-title">Density</div>
        <Segmented<Density>
          label="Density"
          value={settings.density}
          onChange={(density) => updateSettings({ density })}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
      </div>
      <div className="qs-section">
        <div className="qs-title">Theme</div>
        <Segmented<ThemeMode>
          label="Theme"
          value={settings.theme}
          onChange={(theme) => updateSettings({ theme })}
          options={[
            { value: 'light', label: 'Light', icon: 'light_mode' },
            { value: 'dark', label: 'Dark', icon: 'dark_mode' },
            { value: 'system', label: 'System', icon: 'contrast' },
          ]}
        />
        <div className="swatches" role="radiogroup" aria-label="Accent color">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={settings.accent === a.id}
              aria-label={a.label}
              data-tip={a.label}
              className={`swatch${settings.accent === a.id ? ' on' : ''}`}
              style={{ background: a.color }}
              onClick={() => updateSettings({ accent: a.id })}
            >
              {settings.accent === a.id && <Icon name="check" size="sm" />}
            </button>
          ))}
        </div>
      </div>
      <div className="qs-section">
        <div className="qs-title">Reading pane</div>
        <Segmented<ReadingPane>
          label="Reading pane"
          value={settings.readingPane}
          onChange={(readingPane) => updateSettings({ readingPane })}
          options={[
            { value: 'off', label: 'No split', icon: 'view_agenda' },
            { value: 'right', label: 'Right of inbox', icon: 'vertical_split' },
          ]}
        />
      </div>
      <div className="qs-section">
        <label className="switch-row">
          <span>Inbox categories</span>
          <input
            type="checkbox"
            role="switch"
            checked={Object.values(settings.categoriesEnabled).some(Boolean)}
            onChange={(e) =>
              updateSettings({ categoriesEnabled: { primary: true, promotions: e.target.checked, social: e.target.checked, updates: e.target.checked } })
            }
          />
        </label>
        <label className="switch-row">
          <span>Conversation snippets</span>
          <input type="checkbox" role="switch" checked={settings.previewSnippets} onChange={(e) => updateSettings({ previewSnippets: e.target.checked })} />
        </label>
      </div>
    </div>
  );
}

function AccountCard({ onClose }: { onClose: () => void }) {
  const mail = useMail();
  const { used, count } = useMemo(() => {
    let bytes = 0;
    let n = 0;
    for (const t of Object.values(mail.threads)) {
      for (const m of t.messages) {
        n++;
        bytes += m.text.length * 2 + m.html.length + 1200;
        for (const a of m.attachments) bytes += a.size;
      }
    }
    return { used: bytes, count: n };
  }, [mail.threads]);
  const quota = 15 * 1024 ** 3;
  const pct = Math.max(1, Math.min(100, (used / quota) * 100));

  return (
    <div className="account-card">
      <div className="account-email">{ME.email}</div>
      <Avatar name={ME.name} email={ME.email} color="#b5401a" size={72} />
      <div className="account-name">Hi, {ME.name.split(' ')[0]}!</div>
      <div className="account-storage">
        <div className="storage-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Storage used">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="storage-text">
          {formatSize(used)} of 15 GB used · {count} messages
        </div>
      </div>
      <div className="account-actions">
        <button type="button" className="btn outline" onClick={() => { onClose(); navigate('#/settings/general'); }}>
          <Icon name="settings" size="sm" /> Settings
        </button>
        <button type="button" className="btn outline" onClick={() => { onClose(); confirmReset(); }}>
          <Icon name="restart_alt" size="sm" /> Reset mailbox
        </button>
      </div>
      <div className="account-foot">Everything is stored locally in this browser.</div>
    </div>
  );
}

export { MenuItem, MenuSeparator, MenuTitle };
export { resetMailbox };
