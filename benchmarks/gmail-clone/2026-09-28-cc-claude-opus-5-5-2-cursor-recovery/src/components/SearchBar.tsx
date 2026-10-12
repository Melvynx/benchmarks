import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { MdArrowBack, MdClose, MdHistory, MdMenu, MdNorthWest, MdOutlineMail, MdSearch, MdTune } from 'react-icons/md';
import { ME } from '../data/seed';
import { useIsMobile } from '../hooks';
import { openThread } from '../lib/actions';
import { displayName, listDate } from '../lib/format';
import { navigate, useRoute } from '../lib/router';
import { EMPTY_ADVANCED, buildQuery, parseQuery, queryToFields, threadMatches, type AdvancedFields } from '../lib/search';
import { useMail } from '../store/mail';
import { knownContacts, lastDate } from '../store/selectors';
import { useUI } from '../store/ui';
import { Avatar, IconButton, Popover } from './primitives';

type Suggestion =
  | { kind: 'recent'; q: string }
  | { kind: 'contact'; name: string; email: string; q: string }
  | { kind: 'thread'; id: string; subject: string; from: string; date: number }
  | { kind: 'op'; q: string; hint: string };

const QUICK_FILTERS = [
  { label: 'Has attachment', q: 'has:attachment' },
  { label: 'Last 7 days', q: 'newer_than:7d' },
  { label: 'Unread', q: 'is:unread' },
  { label: 'Starred', q: 'is:starred' },
  { label: 'From me', q: 'from:me' },
];

export function SearchBar({ onMenu, account }: { onMenu?: () => void; account?: React.ReactNode }) {
  const route = useRoute();
  const mobile = useIsMobile();
  const threads = useMail((s) => s.threads);
  const labels = useMail((s) => s.labels);
  const recent = useMail((s) => s.recentSearches);
  const addRecent = useMail((s) => s.addRecentSearch);
  const clearRecent = useMail((s) => s.clearRecentSearches);
  const routeQuery = route.view === 'search' ? route.query : '';
  const [value, setValue] = useState(routeQuery);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [advOpen, setAdvOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setValue(routeQuery), [routeQuery]);

  useEffect(() => {
    const focus = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    const advanced = () => {
      if (window.matchMedia('(max-width: 720px)').matches) focus();
      else setAdvOpen(true);
    };
    window.addEventListener('opus:focus-search', focus);
    window.addEventListener('opus:advanced-search', advanced);
    return () => {
      window.removeEventListener('opus:focus-search', focus);
      window.removeEventListener('opus:advanced-search', advanced);
    };
  }, []);

  useEffect(() => useUI.getState().set({ searchFocused: focused }), [focused]);

  const contacts = useMemo(() => knownContacts(threads), [threads]);

  const suggestions: Suggestion[] = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return recent.slice(0, 6).map((r) => ({ kind: 'recent' as const, q: r }));
    const out: Suggestion[] = [];
    const lastWord = q.split(/\s+/).pop() ?? '';
    if (/^[a-z_]+:?$/.test(lastWord)) {
      const ops: [string, string][] = [
        ['from:', 'Sender'], ['to:', 'Recipient'], ['subject:', 'Subject'], ['has:attachment', 'Has attachment'],
        ['is:unread', 'Unread'], ['is:starred', 'Starred'], ['label:', 'Label'], ['in:anywhere', 'Include Spam & Trash'],
        ['newer_than:7d', 'Last 7 days'], ['filename:pdf', 'PDF attachments'],
      ];
      for (const [op, hint] of ops) {
        if (op.startsWith(lastWord) && op !== lastWord) out.push({ kind: 'op', q: q.slice(0, q.length - lastWord.length) + op, hint });
      }
    }
    const pq = parseQuery(value);
    const hasOps = /\w+:/.test(q);
    if (!hasOps) {
      for (const c of contacts) {
        if (out.length >= 4) break;
        if (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) {
          out.push({ kind: 'contact', name: displayName(c), email: c.email, q: `from:${c.email}` });
        }
      }
    }
    const matches = Object.values(threads)
      .filter((t) => threadMatches(t, pq, { labels, meEmail: ME.email, now: Date.now() }))
      .sort((a, b) => lastDate(b) - lastDate(a))
      .slice(0, 5);
    for (const t of matches) {
      const last = t.messages[t.messages.length - 1];
      out.push({ kind: 'thread', id: t.id, subject: t.subject, from: displayName(last.from), date: lastDate(t) });
    }
    return out;
  }, [value, recent, contacts, threads, labels]);

  useEffect(() => setActive(-1), [value]);

  const run = (q: string) => {
    const clean = q.trim();
    setFocused(false);
    inputRef.current?.blur();
    if (!clean) {
      navigate({ view: 'folder', folder: 'inbox' });
      return;
    }
    addRecent(clean);
    useUI.getState().set({ page: 0 });
    navigate({ view: 'search', query: clean });
  };

  const choose = (s: Suggestion) => {
    if (s.kind === 'thread') {
      setFocused(false);
      inputRef.current?.blur();
      addRecent(value);
      navigate({ view: 'search', query: value.trim() || s.subject }, true);
      openThread(s.id);
      return;
    }
    if (s.kind === 'op' && s.q.endsWith(':')) {
      setValue(s.q);
      inputRef.current?.focus();
      return;
    }
    setValue(s.q);
    run(s.q);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) choose(suggestions[active]);
    else run(value);
  };

  const showDrop = focused && !advOpen && (suggestions.length > 0 || !value.trim());

  return (
    <div className={`search ${focused ? 'is-focused' : ''} ${showDrop ? 'has-drop' : ''}`}>
      <form ref={formRef} className="search-form" role="search" onSubmit={onSubmit}>
        {mobile ? (
          focused || route.view === 'search' ? (
            <IconButton
              icon={MdArrowBack}
              label="Back"
              tip={false}
              onClick={() => {
                setFocused(false);
                inputRef.current?.blur();
                if (route.view === 'search') navigate({ view: 'folder', folder: 'inbox' });
              }}
            />
          ) : (
            <IconButton icon={MdMenu} label="Main menu" tip={false} onClick={onMenu} />
          )
        ) : (
          <IconButton icon={MdSearch} label="Search" onClick={() => run(value)} />
        )}
        <input
          ref={inputRef}
          className="search-input"
          value={value}
          placeholder="Search mail"
          aria-label="Search mail"
          aria-autocomplete="list"
          aria-expanded={showDrop}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            if (!formRef.current?.parentElement?.contains(e.relatedTarget as Node)) setFocused(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, -1));
            } else if (e.key === 'Escape') {
              setFocused(false);
              inputRef.current?.blur();
            }
          }}
        />
        {value && (
          <IconButton
            icon={MdClose}
            label="Clear search"
            onClick={() => {
              setValue('');
              inputRef.current?.focus();
              if (route.view === 'search') navigate({ view: 'folder', folder: 'inbox' });
            }}
          />
        )}
        {!mobile && <AdvancedSearch open={advOpen} setOpen={setAdvOpen} query={value} onSearch={(q) => { setValue(q); run(q); }} />}
        {mobile && !focused && account}
      </form>
      {showDrop && (
        <div className="search-drop" role="listbox" onMouseDown={(e) => e.preventDefault()}>
          {!value.trim() && (
            <div className="search-quick">
              {QUICK_FILTERS.map((f) => (
                <button key={f.q} type="button" className="filter-chip" onClick={() => { setValue(f.q); run(f.q); }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={`${s.kind}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`search-sugg ${i === active ? 'is-active' : ''}`}
              onClick={() => choose(s)}
            >
              {s.kind === 'recent' && (<><MdHistory className="sugg-icon" /><span className="sugg-main">{s.q}</span><MdNorthWest className="sugg-fill" onClick={(e) => { e.stopPropagation(); setValue(s.q + ' '); inputRef.current?.focus(); }} /></>)}
              {s.kind === 'op' && (<><MdSearch className="sugg-icon" /><span className="sugg-main">{s.q}</span><span className="sugg-meta">{s.hint}</span></>)}
              {s.kind === 'contact' && (<><Avatar contact={{ name: s.name, email: s.email }} size={24} /><span className="sugg-main"><b>{s.name}</b> <span className="sugg-meta">{s.email}</span></span></>)}
              {s.kind === 'thread' && (<><MdOutlineMail className="sugg-icon" /><span className="sugg-main"><span className="sugg-subject">{s.subject}</span><span className="sugg-meta">{s.from}</span></span><span className="sugg-date">{listDate(s.date)}</span></>)}
            </button>
          ))}
          {!value.trim() && recent.length > 0 && (
            <button type="button" className="search-clear-history" onClick={clearRecent}>Clear search history</button>
          )}
          {value.trim() && (
            <button type="button" className="search-sugg search-all" onClick={() => run(value)}>
              <MdSearch className="sugg-icon" />
              <span className="sugg-main">All search results for “{value.trim()}”</span>
              <span className="sugg-meta">Press Enter</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AdvancedSearch({ open, setOpen, query, onSearch }: { open: boolean; setOpen: (v: boolean) => void; query: string; onSearch: (q: string) => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [f, setF] = useState<AdvancedFields>(EMPTY_ADVANCED);
  useEffect(() => {
    if (open) setF(queryToFields(query));
  }, [open, query]);
  const upd = (patch: Partial<AdvancedFields>) => setF((x) => ({ ...x, ...patch }));
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`icon-btn icon-btn-md ${open ? 'is-active' : ''}`}
        aria-label="Show search options"
        data-tip="Show search options"
        onClick={() => setOpen(!open)}
      >
        <MdTune aria-hidden />
      </button>
      <Popover anchor={btnRef.current?.closest('.search') as HTMLElement | null} open={open} onClose={() => setOpen(false)} placement="bottom-start" className="adv-search" matchWidth label="Advanced search" offset={-48}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            onSearch(buildQuery(f));
          }}
        >
          <div className="adv-row"><label htmlFor="adv-from">From</label><input id="adv-from" value={f.from} onChange={(e) => upd({ from: e.target.value })} autoFocus /></div>
          <div className="adv-row"><label htmlFor="adv-to">To</label><input id="adv-to" value={f.to} onChange={(e) => upd({ to: e.target.value })} /></div>
          <div className="adv-row"><label htmlFor="adv-subject">Subject</label><input id="adv-subject" value={f.subject} onChange={(e) => upd({ subject: e.target.value })} /></div>
          <div className="adv-row"><label htmlFor="adv-has">Has the words</label><input id="adv-has" value={f.hasWords} onChange={(e) => upd({ hasWords: e.target.value })} /></div>
          <div className="adv-row"><label htmlFor="adv-not">Doesn't have</label><input id="adv-not" value={f.doesntHave} onChange={(e) => upd({ doesntHave: e.target.value })} /></div>
          <div className="adv-row">
            <label htmlFor="adv-within">Date within</label>
            <select id="adv-within" value={f.within} onChange={(e) => upd({ within: e.target.value as AdvancedFields['within'] })}>
              <option value="">Any time</option>
              <option value="1d">1 day</option>
              <option value="3d">3 days</option>
              <option value="7d">1 week</option>
              <option value="14d">2 weeks</option>
              <option value="1m">1 month</option>
              <option value="2m">2 months</option>
              <option value="6m">6 months</option>
              <option value="1y">1 year</option>
            </select>
          </div>
          <div className="adv-row">
            <label htmlFor="adv-scope">Search</label>
            <select id="adv-scope" value={f.scope} onChange={(e) => upd({ scope: e.target.value as AdvancedFields['scope'] })}>
              <option value="all">All Mail</option>
              <option value="inbox">Inbox</option>
              <option value="starred">Starred</option>
              <option value="sent">Sent Mail</option>
              <option value="unread">Unread Mail</option>
              <option value="trash">Trash</option>
              <option value="spam">Spam</option>
              <option value="anywhere">Mail &amp; Spam &amp; Trash</option>
            </select>
          </div>
          <label className="adv-check">
            <input type="checkbox" checked={f.hasAttachment} onChange={(e) => upd({ hasAttachment: e.target.checked })} />
            Has attachment
          </label>
          <div className="adv-actions">
            <button type="button" className="btn btn-text" onClick={() => setF(EMPTY_ADVANCED)}>Clear</button>
            <button type="submit" className="btn btn-primary">Search</button>
          </div>
        </form>
      </Popover>
    </>
  );
}
