import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Clock, Search, SlidersHorizontal, X } from 'lucide-react';
import { contactsOf, type Contact } from '../../domain/selectors';
import { cn } from '../../lib/cn';
import { go, goFolder, sectionKey, type Route } from '../../lib/route';
import { addRecentSearch } from '../../store/actions';
import { useMail } from '../../store/mailStore';
import { AdvancedSearch } from './AdvancedSearch';
import { Avatar, IconButton } from '../ui/primitives';

interface Suggestion {
  key: string;
  label: string;
  name?: string;
  detail?: string;
  query: string;
  fill?: boolean;
  icon: 'search' | 'clock' | 'user' | 'op';
}

const OPERATORS: Suggestion[] = [
  { key: 'op-from', label: 'from:', detail: 'Messages from a sender', query: 'from:', fill: true, icon: 'op' },
  { key: 'op-to', label: 'to:', detail: 'Messages sent to someone', query: 'to:', fill: true, icon: 'op' },
  { key: 'op-att', label: 'has:attachment', detail: 'Mail with files attached', query: 'has:attachment', icon: 'op' },
  { key: 'op-unread', label: 'is:unread', detail: 'Conversations you have not read', query: 'is:unread', icon: 'op' },
  { key: 'op-larger', label: 'larger:5m', detail: 'Larger than 5 MB', query: 'larger:5m', icon: 'op' },
  { key: 'op-recent', label: 'newer_than:7d', detail: 'From the last week', query: 'newer_than:7d', icon: 'op' },
];

export function buildSuggestions(value: string, recent: string[], contacts: Contact[]): Suggestion[] {
  const trimmed = value.trim();
  const parts = value.trimStart().split(/\s+/);
  const last = parts[parts.length - 1] ?? '';
  const head = parts.slice(0, -1).join(' ');
  const join = (tail: string) => (head ? `${head} ${tail}` : tail);

  const operator = last.match(/^(from|to):(.*)$/i);
  if (operator) {
    const key = operator[1].toLowerCase();
    const needle = operator[2].toLowerCase();
    return contacts
      .filter((c) => !needle || c.email.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle))
      .slice(0, 6)
      .map((c) => ({
        key: `${key}-${c.email}`,
        label: `${key}: ${c.name || c.email}`,
        name: c.name,
        detail: c.email,
        query: join(`${key}:${c.email}`),
        icon: 'user' as const,
      }));
  }

  if (last && !last.includes(':')) {
    const needle = last.toLowerCase();
    const people = contacts
      .filter((c) => c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle))
      .slice(0, 3)
      .map((c) => ({
        key: `c-${c.email}`,
        label: `from: ${c.name || c.email}`,
        name: c.name,
        detail: c.email,
        query: join(`from:${c.email}`),
        icon: 'user' as const,
      }));
    return [{ key: 'text', label: `Search for “${trimmed}”`, query: trimmed, icon: 'search' }, ...people];
  }

  if (!trimmed) {
    return [
      ...recent.map((q) => ({ key: `r-${q}`, label: q, query: q, icon: 'clock' as const })),
      ...OPERATORS,
    ];
  }
  return [];
}

export function SearchBar({ route, className }: { route: Route; className?: string }) {
  const routeKey = sectionKey(route.section);
  const inSearch = route.section.kind === 'search';
  const [value, setValue] = useState(route.section.kind === 'search' ? route.section.q : '');
  const [focused, setFocused] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const recent = useMail((s) => s.data.recentSearches);
  const threads = useMail((s) => s.data.threads);
  const account = useMail((s) => s.data.account);
  const contacts = useMemo(() => contactsOf(account, threads), [account, threads]);

  // Re-sync the input only when the destination changes, not while the user is typing.
  useEffect(() => {
    setValue(route.section.kind === 'search' ? route.section.q : '');
  }, [routeKey]);

  useEffect(() => {
    setActive(-1);
  }, [value]);

  useEffect(() => {
    if (!focused && !advanced) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setFocused(false);
        setAdvanced(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [focused, advanced]);

  const suggestions = useMemo(
    () => (focused ? buildSuggestions(value, recent, contacts).slice(0, 10) : []),
    [focused, value, recent, contacts],
  );

  const submit = (query: string) => {
    const q = query.trim();
    if (!q) return;
    addRecentSearch(q);
    go({ section: { kind: 'search', q }, threadId: null });
    setFocused(false);
    setAdvanced(false);
    inputRef.current?.blur();
  };

  const choose = (s: Suggestion) => {
    if (s.fill) {
      setValue(s.query);
      setFocused(true);
      inputRef.current?.focus();
      return;
    }
    setValue(s.query);
    submit(s.query);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && suggestions[active]) choose(suggestions[active]);
      else submit(value);
    } else if (e.key === 'Escape') {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const clear = () => {
    setValue('');
    if (inSearch) goFolder('inbox');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn('relative flex min-w-0', className)}>
      <form
        role="search"
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <div
          className={cn(
            'flex h-12 items-center gap-1 rounded-full bg-surface-2 pl-4 pr-1 transition-shadow',
            focused && 'bg-surface shadow-md ring-1 ring-line',
          )}
        >
          <button
            type="submit"
            aria-label="Search mail"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-hover"
          >
            <Search className="size-5" />
          </button>
          <input
            id="search-input"
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={onKeyDown}
            placeholder="Search mail"
            aria-label="Search mail"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3 md:text-base"
          />
          {value && (
            <IconButton label="Clear search" onClick={clear} className="size-8">
              <X className="size-4" />
            </IconButton>
          )}
          <IconButton
            label="Show search options"
            active={advanced}
            className="size-9"
            onClick={() => {
              setAdvanced((v) => !v);
              setFocused(false);
            }}
          >
            <SlidersHorizontal className="size-[18px]" />
          </IconButton>
        </div>
      </form>

      {focused && !advanced && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface py-2 shadow-2xl"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.key}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center gap-3 px-4 py-2 text-sm',
                i === active ? 'bg-hover' : '',
              )}
            >
              {s.icon === 'user' && s.detail ? (
                <Avatar name={s.name ?? ''} email={s.detail} size={24} />
              ) : s.icon === 'clock' ? (
                <Clock className="size-4 text-ink-3" />
              ) : s.icon === 'op' ? (
                <SlidersHorizontal className="size-4 text-ink-3" />
              ) : (
                <Search className="size-4 text-ink-3" />
              )}
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              {s.detail && <span className="truncate text-xs text-ink-3">{s.detail}</span>}
            </li>
          ))}
        </ul>
      )}

      {advanced && <AdvancedSearch onSearch={submit} onClose={() => setAdvanced(false)} />}
    </div>
  );
}
