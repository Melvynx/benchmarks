import { useEffect, useMemo, useRef, useState } from 'react';
import { MdArrowBack, MdClose, MdHistory, MdOutlineMail, MdSearch, MdTune } from 'react-icons/md';
import type { Contact, Thread } from '../types';
import { formatListDate, toLocalInput, DAY } from '../lib/date';
import { latestDate } from '../lib/mailbox';
import { navigate, useRoute } from '../lib/router';
import { parseQuery, threadText } from '../lib/search';
import { cn } from '../lib/utils';
import { useMail } from '../store/mail';
import { useSettings } from '../store/settings';
import { ui, useUI } from '../store/ui';
import { Avatar, Button, IconButton } from './ui';

type Item =
  | { kind: 'thread'; thread: Thread }
  | { kind: 'contact'; contact: Contact }
  | { kind: 'recent'; q: string }
  | { kind: 'all'; q: string };

export function SearchBar({ variant = 'desktop', onDone }: { variant?: 'desktop' | 'mobile'; onDone?: () => void }) {
  const route = useRoute();
  const routeQuery = route.view === 'search' ? route.query : '';
  const [value, setValue] = useState(routeQuery);
  const [focused, setFocused] = useState(variant === 'mobile');
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const focusNonce = useUI((s) => s.searchFocus);
  const advanced = useUI((s) => s.advancedSearch);
  const threads = useMail((s) => s.threads);
  const contacts = useMail((s) => s.contacts);
  const recent = useSettings((s) => s.recentSearches);

  useEffect(() => setValue(routeQuery), [routeQuery]);
  useEffect(() => {
    if (focusNonce && variant === 'desktop') {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [focusNonce, variant]);
  useEffect(() => {
    if (variant === 'mobile') inputRef.current?.focus();
  }, [variant]);

  useEffect(() => {
    if (!focused || variant === 'mobile') return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setFocused(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [focused, variant]);

  const items = useMemo<Item[]>(() => {
    const q = value.trim().toLowerCase();
    if (!q) return recent.map((r) => ({ kind: 'recent', q: r }));
    if (/\w+:/.test(q)) return [{ kind: 'all', q: value.trim() }];
    const words = q.split(/\s+/);
    const people = contacts
      .filter((c) => words.every((w) => c.name.toLowerCase().split(/\s+/).some((n) => n.startsWith(w)) || c.email.toLowerCase().startsWith(w)))
      .slice(0, 3)
      .map<Item>((c) => ({ kind: 'contact', contact: c }));
    const mails = Object.values(threads)
      .filter((t) => !t.trashed && !t.spam && words.every((w) => threadText(t).all.includes(w)))
      .sort((a, b) => latestDate(b) - latestDate(a))
      .slice(0, 6)
      .map<Item>((t) => ({ kind: 'thread', thread: t }));
    return [...mails, ...people, { kind: 'all', q: value.trim() }];
  }, [value, threads, contacts, recent]);

  const submit = (q: string) => {
    const t = q.trim();
    if (!t) return;
    useSettings.getState().addRecentSearch(t);
    navigate({ view: 'search', query: t });
    setFocused(false);
    inputRef.current?.blur();
    onDone?.();
  };

  const pick = (it: Item) => {
    if (it.kind === 'thread') {
      useSettings.getState().addRecentSearch(value.trim());
      navigate({ view: 'search', query: value.trim(), threadId: it.thread.id });
      setFocused(false);
      inputRef.current?.blur();
      onDone?.();
    } else if (it.kind === 'contact') submit(`from:${it.contact.email}`);
    else submit(it.q);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && items[active]) pick(items[active]);
      else submit(value);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      if (variant === 'mobile') onDone?.();
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = focused && !advanced && items.length > 0;
  const mobile = variant === 'mobile';

  return (
    <div ref={wrapRef} className={cn('relative w-full', mobile && 'flex h-full flex-col')}>
      <div
        className={cn(
          'flex h-12 items-center gap-1 px-1 transition-[background,box-shadow,border-radius]',
          mobile ? 'border-b border-line bg-panel' : 'rounded-full',
          !mobile && (focused || advanced ? 'bg-search-focus shadow-e1' : 'bg-search hover:bg-search-focus/60'),
          !mobile && (showDropdown || advanced) && 'rounded-b-none rounded-t-3xl',
        )}
      >
        {mobile ? (
          <IconButton icon={MdArrowBack} label="Back" onClick={onDone} />
        ) : (
          <IconButton icon={MdSearch} label="Search" onClick={() => submit(value)} />
        )}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setActive(-1);
            if (advanced) ui.set({ advancedSearch: false });
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          placeholder="Search mail"
          aria-label="Search mail"
          role="combobox"
          aria-expanded={showDropdown}
          className="h-full min-w-0 flex-1 bg-transparent px-1 text-base text-fg outline-none placeholder:text-fg2"
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
        {!mobile && <IconButton icon={MdTune} label="Show search options" active={advanced} onClick={() => ui.set({ advancedSearch: !advanced })} />}
      </div>

      {(showDropdown || (mobile && items.length > 0)) && (
        <div
          role="listbox"
          className={cn(
            'overflow-y-auto py-2',
            mobile ? 'flex-1 bg-panel' : 'absolute inset-x-0 top-12 z-40 max-h-[70vh] rounded-b-3xl bg-search-focus shadow-e2 [clip-path:inset(0_-20px_-20px_-20px)]',
          )}
        >
          {!mobile && <div className="mx-4 mb-1 h-px bg-line" />}
          {items.map((it, i) => (
            <SuggestionRow key={i} item={it} active={i === active} query={value} onPick={() => pick(it)} onHover={() => setActive(i)} />
          ))}
        </div>
      )}

      {advanced && !mobile && <AdvancedSearch initial={value} onSearch={submit} />}
    </div>
  );
}

function SuggestionRow({ item, active, onPick, onHover, query }: { item: Item; active: boolean; onPick: () => void; onHover: () => void; query: string }) {
  const base = cn('flex w-full items-center gap-4 px-4 py-2 text-left text-sm', active ? 'bg-hover' : 'hover:bg-hover');
  if (item.kind === 'thread') {
    const t = item.thread;
    const last = t.messages[t.messages.length - 1];
    return (
      <button type="button" role="option" aria-selected={active} className={base} onMouseDown={(e) => e.preventDefault()} onClick={onPick} onMouseEnter={onHover}>
        <MdOutlineMail size={20} className="shrink-0 text-fg3" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-fg">
            <Highlight text={t.subject || '(no subject)'} query={query} />
          </span>
          <span className="block truncate text-xs text-fg3">{last?.from.name}</span>
        </span>
        <span className="shrink-0 text-xs text-fg3">{formatListDate(latestDate(t))}</span>
      </button>
    );
  }
  if (item.kind === 'contact') {
    return (
      <button type="button" role="option" aria-selected={active} className={base} onMouseDown={(e) => e.preventDefault()} onClick={onPick} onMouseEnter={onHover}>
        <Avatar person={item.contact} size={24} />
        <span className="min-w-0 flex-1 truncate text-fg">
          <Highlight text={item.contact.name} query={query} /> <span className="text-fg3">{item.contact.email}</span>
        </span>
      </button>
    );
  }
  if (item.kind === 'recent') {
    return (
      <button type="button" role="option" aria-selected={active} className={base} onMouseDown={(e) => e.preventDefault()} onClick={onPick} onMouseEnter={onHover}>
        <MdHistory size={20} className="shrink-0 text-fg3" />
        <span className="flex-1 truncate text-fg">{item.q}</span>
      </button>
    );
  }
  return (
    <button type="button" role="option" aria-selected={active} className={base} onMouseDown={(e) => e.preventDefault()} onClick={onPick} onMouseEnter={onHover}>
      <MdSearch size={20} className="shrink-0 text-fg3" />
      <span className="flex-1 truncate text-fg">
        All search results for “<b>{item.q}</b>”
      </span>
      <span className="text-xs text-fg3">Press Enter</span>
    </button>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const words = query.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 0 && !w.includes(':'));
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return (
    <>
      {text.split(re).map((part, i) =>
        words.includes(part.toLowerCase()) ? (
          <b key={i} className="font-semibold">
            {part}
          </b>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const WITHIN = [
  ['1', '1 day'],
  ['3', '3 days'],
  ['7', '1 week'],
  ['14', '2 weeks'],
  ['30', '1 month'],
  ['60', '2 months'],
  ['180', '6 months'],
  ['365', '1 year'],
];

function AdvancedSearch({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const pq = parseQuery(initial);
  const labels = useMail((s) => s.labels);
  const [f, setF] = useState({
    from: pq.from[0] ?? '',
    to: pq.to[0] ?? '',
    subject: pq.subject[0] ?? '',
    words: pq.terms.join(' '),
    not: pq.neg.join(' '),
    within: '',
    date: toLocalInput(Date.now()).slice(0, 10),
    scope: pq.in ?? (pq.label[0] ? `label:${pq.label[0]}` : 'all'),
    attachment: pq.has.includes('attachment'),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const build = () => {
    const parts: string[] = [];
    const q = (v: string) => (/\s/.test(v) ? `"${v}"` : v);
    if (f.from.trim()) parts.push(`from:${q(f.from.trim())}`);
    if (f.to.trim()) parts.push(`to:${q(f.to.trim())}`);
    if (f.subject.trim()) parts.push(`subject:${q(f.subject.trim())}`);
    if (f.words.trim()) parts.push(f.words.trim());
    if (f.not.trim()) parts.push(...f.not.trim().split(/\s+/).map((w) => `-${w}`));
    if (f.within) {
      const center = new Date(f.date).getTime();
      const d = Number(f.within) * DAY;
      const fmt = (ts: number) => {
        const x = new Date(ts);
        return `${x.getFullYear()}/${x.getMonth() + 1}/${x.getDate()}`;
      };
      parts.push(`after:${fmt(center - d)}`, `before:${fmt(center + d + DAY)}`);
    }
    if (f.scope.startsWith('label:')) parts.push(f.scope);
    else if (f.scope !== 'all') parts.push(`in:${f.scope}`);
    if (f.attachment) parts.push('has:attachment');
    return parts.join(' ');
  };

  const field = 'h-9 w-full border-b border-line-strong bg-transparent text-sm text-fg outline-none focus:border-accent';
  const row = 'grid grid-cols-[130px_1fr] items-center gap-3';
  return (
    <form
      className="absolute inset-x-0 top-12 z-40 space-y-3 rounded-b-3xl bg-search-focus px-6 pt-3 pb-5 shadow-e2 [clip-path:inset(0_-20px_-20px_-20px)]"
      onSubmit={(e) => {
        e.preventDefault();
        const q = build();
        ui.set({ advancedSearch: false });
        if (q) onSearch(q);
      }}
    >
      <div className={row}>
        <label className="text-sm text-fg2">From</label>
        <input className={field} value={f.from} onChange={set('from')} autoFocus />
      </div>
      <div className={row}>
        <label className="text-sm text-fg2">To</label>
        <input className={field} value={f.to} onChange={set('to')} />
      </div>
      <div className={row}>
        <label className="text-sm text-fg2">Subject</label>
        <input className={field} value={f.subject} onChange={set('subject')} />
      </div>
      <div className={row}>
        <label className="text-sm text-fg2">Has the words</label>
        <input className={field} value={f.words} onChange={set('words')} />
      </div>
      <div className={row}>
        <label className="text-sm text-fg2">Doesn't have</label>
        <input className={field} value={f.not} onChange={set('not')} />
      </div>
      <div className={row}>
        <label className="text-sm text-fg2">Date within</label>
        <div className="flex gap-3">
          <select className={cn(field, 'w-36')} value={f.within} onChange={set('within')}>
            <option value="">Any time</option>
            {WITHIN.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input type="date" className={cn(field, 'flex-1')} value={f.date} onChange={set('date')} disabled={!f.within} />
        </div>
      </div>
      <div className={row}>
        <label className="text-sm text-fg2">Search</label>
        <select className={field} value={f.scope} onChange={set('scope')}>
          <option value="all">All Mail</option>
          <option value="inbox">Inbox</option>
          <option value="starred">Starred</option>
          <option value="sent">Sent Mail</option>
          <option value="drafts">Drafts</option>
          <option value="spam">Spam</option>
          <option value="trash">Trash</option>
          <option value="anywhere">Mail &amp; Spam &amp; Trash</option>
          {labels.map((l) => (
            <option key={l.id} value={`label:${l.name.toLowerCase().replace(/\s+/g, '-')}`}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 pt-1 text-sm text-fg2">
        <input type="checkbox" checked={f.attachment} onChange={set('attachment')} className="size-4 accent-[var(--accent)]" />
        Has attachment
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="text" onClick={() => ui.set({ advancedSearch: false })}>
          Cancel
        </Button>
        <Button type="submit">Search</Button>
      </div>
    </form>
  );
}
