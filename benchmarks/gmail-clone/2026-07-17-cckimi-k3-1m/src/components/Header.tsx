import { useEffect, useMemo, useRef, useState } from 'react';
import { useMail } from '../store/mailStore';
import { useUi } from '../store/uiStore';
import { CONTACTS, ME } from '../data/contacts';
import { Icon } from './Icon';
import { Avatar } from './Avatar';
import { Popover } from './Popover';
import { SEARCH_HINTS } from '../lib/search';
import { useMedia } from '../lib/hooks';
import { formatSize } from '../lib/utils';

function SearchBar() {
  const view = useMail((s) => s.view);
  const runSearch = useMail((s) => s.runSearch);
  const openMailbox = useMail((s) => s.openMailbox);
  const recentSearches = useMail((s) => s.recentSearches);
  const [q, setQ] = useState(view.kind === 'search' ? view.query : '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQ(view.kind === 'search' ? view.query : '');
  }, [view]);

  const contactMatches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 1 || needle.includes(':')) return [];
    return CONTACTS.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle),
    ).slice(0, 4);
  }, [q]);

  const showHints = q.trim().length === 0;

  type Item = { kind: 'search' | 'recent' | 'contact' | 'hint'; label: string; run: () => void };
  const items: Item[] = [];
  if (!showHints) {
    items.push({ kind: 'search', label: q, run: () => runSearch(q) });
    for (const c of contactMatches) {
      items.push({ kind: 'contact', label: `${c.name} — ${c.email}`, run: () => { setQ(`from:${c.email}`); runSearch(`from:${c.email}`); } });
    }
  } else {
    for (const r of recentSearches) items.push({ kind: 'recent', label: r, run: () => { setQ(r); runSearch(r); } });
    for (const h of SEARCH_HINTS.slice(0, 5)) items.push({ kind: 'hint', label: `${h.example} — ${h.desc}`, run: () => { setQ(h.example); inputRef.current?.focus(); } });
  }

  const submit = () => {
    if (active >= 0 && items[active]) {
      items[active].run();
    } else if (q.trim()) {
      runSearch(q);
    }
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
  };

  return (
    <div className="search-wrap">
      <div className="search-bar">
        <button className="icon-btn" aria-label="Search" onClick={submit}>
          <Icon name="search" />
        </button>
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Search mail"
          value={q}
          aria-label="Search mail"
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); e.stopPropagation(); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
          }}
        />
        {q && (
          <button
            className="icon-btn"
            aria-label="Clear search"
            onClick={() => {
              setQ('');
              if (view.kind === 'search') openMailbox('inbox');
              inputRef.current?.focus();
            }}
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      <Popover open={open} onClose={() => setOpen(false)} className="search-pop" width={undefined}>
        {items.length === 0 && <div className="search-pop-empty">Try “from:maya”, “has:attachment”, “label:work”…</div>}
        {items.map((it, i) => (
          <button
            key={`${it.kind}-${it.label}`}
            className={`search-item ${i === active ? 'active' : ''}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => { it.run(); setOpen(false); }}
          >
            <Icon
              name={it.kind === 'recent' ? 'clock' : it.kind === 'contact' ? 'people' : it.kind === 'hint' ? 'tune' : 'search'}
              size={16}
            />
            <span className="search-item-label">{it.label}</span>
          </button>
        ))}
        {showHints && (
          <div className="search-pop-foot">Search by sender, label, date, or operator — press Enter to search</div>
        )}
      </Popover>
    </div>
  );
}

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const settings = useMail((s) => s.settings);
  const updateSettings = useMail((s) => s.updateSettings);
  const resetAll = useMail((s) => s.resetAll);
  const threads = useMail((s) => s.threads);
  const openDialog = useUi((s) => s.openDialog);

  const usedBytes = threads.reduce(
    (sum, t) => sum + t.messages.reduce((s2, m) => s2 + (m.attachments ?? []).reduce((s3, a) => s3 + a.size, 0), 0),
    0,
  );

  return (
    <div className="account-wrap">
      <button className="avatar-btn" aria-label="Account" onClick={() => setOpen((o) => !o)}>
        <Avatar email={ME.email} size={32} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} align="right" className="account-pop" width={300}>
        <div className="account-card">
          <Avatar email={ME.email} size={44} />
          <div>
            <div className="account-name">{ME.name}</div>
            <div className="account-email">{ME.email}</div>
          </div>
        </div>
        <div className="account-storage">
          <div className="storage-bar">
            <div className="storage-fill" style={{ width: `${Math.min(100, (usedBytes / (15 * 1024 * 1024 * 1024)) * 100 * 400)}%` }} />
          </div>
          <div className="storage-text">{formatSize(usedBytes)} of 15 GB used</div>
        </div>
        <div className="menu-list">
          <button className="menu-item" onClick={() => { setOpen(false); openDialog('settings'); }}>
            <Icon name="settings" size={18} /> Settings
          </button>
          <button className="menu-item" onClick={() => { setOpen(false); openDialog('shortcuts'); }}>
            <Icon name="keyboard" size={18} /> Keyboard shortcuts
          </button>
          <button
            className="menu-item"
            onClick={() => { updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' }); setOpen(false); }}
          >
            <Icon name={settings.theme === 'light' ? 'moon' : 'sun'} size={18} />
            {settings.theme === 'light' ? 'Dark theme' : 'Light theme'}
          </button>
          <button className="menu-item danger" onClick={() => { resetAll(); setOpen(false); }}>
            <Icon name="refresh" size={18} /> Reset demo data
          </button>
        </div>
      </Popover>
    </div>
  );
}

export function Header() {
  const isNarrow = useMedia('(max-width: 900px)');
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const toggleCollapse = useUi((s) => s.toggleCollapse);
  const openDialog = useUi((s) => s.openDialog);
  const settings = useMail((s) => s.settings);
  const updateSettings = useMail((s) => s.updateSettings);

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="icon-btn"
          aria-label="Main menu"
          onClick={() => (isNarrow ? toggleSidebar() : toggleCollapse())}
        >
          <Icon name="menu" />
        </button>
        <div className="logo" aria-label="k3[1m]">
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#0b57d0" d="M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5z" />
            <path fill="#fff" d="M4.6 6.2 12 11.4l7.4-5.2v11.4H4.6z" />
          </svg>
          <span className="logo-text">k3[1m]</span>
        </div>
      </div>
      <SearchBar />
      <div className="header-right">
        <button
          className="icon-btn"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          onClick={() => openDialog('shortcuts')}
        >
          <Icon name="help" />
        </button>
        <button
          className="icon-btn"
          aria-label="Toggle theme"
          title="Toggle theme"
          onClick={() => updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })}
        >
          <Icon name={settings.theme === 'light' ? 'moon' : 'sun'} />
        </button>
        <button className="icon-btn" aria-label="Settings" title="Settings" onClick={() => openDialog('settings')}>
          <Icon name="settings" />
        </button>
        <AccountMenu />
      </div>
    </header>
  );
}
