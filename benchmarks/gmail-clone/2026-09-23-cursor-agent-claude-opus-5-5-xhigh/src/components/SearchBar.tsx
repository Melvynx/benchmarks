import { useEffect, useMemo, useRef, useState } from "react";
import { ME } from "../lib/contacts";
import { formatListDate } from "../lib/format";
import { useIsMobile, useRoute } from "../lib/hooks";
import { navigate } from "../lib/router";
import { buildQuery, fieldsFromQuery, parseQuery, type AdvancedFields } from "../lib/search";
import { lastMessage, matchesQuery, threadDate } from "../lib/selectors";
import { allContacts, useMail } from "../lib/store";
import { useUI } from "../lib/ui";
import { cn } from "../lib/utils";
import { Avatar, Button, Icon, IconButton, Popover } from "./ui";

const RECENT_KEY = "mail-recent-searches";

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  const list = [q, ...loadRecent().filter((x) => x !== q)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export function runSearch(q: string) {
  const query = q.trim();
  if (!query) return;
  saveRecent(query);
  navigate(`#search/${encodeURIComponent(query)}`);
}

type Suggestion =
  | { kind: "recent"; q: string }
  | { kind: "contact"; name: string; email: string }
  | { kind: "thread"; id: string; subject: string; from: string; email: string; date: number }
  | { kind: "search"; q: string };

export function SearchBar({ onClose, autoFocus }: { onClose?: () => void; autoFocus?: boolean }) {
  const route = useRoute();
  const routeQ = route.view.kind === "search" ? route.view.q : "";
  const [value, setValue] = useState(routeQ);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [advOpen, setAdvOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const labels = useMail((s) => s.labels);
  const extra = useMail((s) => s.extraContacts);
  const now = useUI((s) => s.now);

  useEffect(() => setValue(routeQ), [routeQ]);

  useEffect(() => {
    const focus = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("focus-search", focus);
    return () => window.removeEventListener("focus-search", focus);
  }, []);

  const suggestions = useMemo<Suggestion[]>(() => {
    const v = value.trim().toLowerCase();
    if (!v) return loadRecent().map((q) => ({ kind: "recent", q }) as Suggestion);
    const contacts = allContacts(extra)
      .filter((c) => c.email !== ME.email && (c.name.toLowerCase().includes(v) || c.email.toLowerCase().includes(v)))
      .slice(0, 3)
      .map((c) => ({ kind: "contact", name: c.name, email: c.email }) as Suggestion);
    const q = parseQuery(value, now);
    const found = Object.values(threads)
      .filter((t) => matchesQuery(t, messages, q, labels, now))
      .sort((a, b) => threadDate(b, messages) - threadDate(a, messages))
      .slice(0, 6)
      .map((t) => {
        const m = lastMessage(t, messages);
        return {
          kind: "thread",
          id: t.id,
          subject: t.subject || "(no subject)",
          from: m?.from.email === ME.email ? "me" : (m?.from.name ?? ""),
          email: m?.from.email ?? "",
          date: threadDate(t, messages),
        } as Suggestion;
      });
    return [...contacts, ...found, { kind: "search", q: value.trim() }];
  }, [value, threads, messages, labels, extra, now]);

  useEffect(() => setActive(-1), [value]);

  const choose = (s: Suggestion) => {
    setFocused(false);
    inputRef.current?.blur();
    onClose?.();
    if (s.kind === "recent" || s.kind === "search") {
      setValue(s.q);
      runSearch(s.q);
    } else if (s.kind === "contact") {
      const q = `from:${s.email}`;
      setValue(q);
      runSearch(q);
    } else {
      saveRecent(value.trim());
      navigate(`#search/${encodeURIComponent(value.trim())}/${s.id}`);
    }
  };

  const submit = () => {
    if (active >= 0 && suggestions[active]) return choose(suggestions[active]);
    if (!value.trim()) return;
    setFocused(false);
    inputRef.current?.blur();
    onClose?.();
    runSearch(value);
  };

  const showDrop = focused && !advOpen && suggestions.length > 0;
  const term = value.trim().toLowerCase();

  return (
    <div ref={boxRef} className="relative w-full max-w-[720px]">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          "relative flex h-12 items-center rounded-full transition-[background,box-shadow] duration-150",
          focused || advOpen ? "bg-raised shadow-pop" : "bg-surface-3 hover:shadow-sm",
          showDrop && "rounded-b-none",
        )}
      >
        {isMobile && onClose ? (
          <IconButton icon="arrow_back" label="Close search" className="ml-1" onClick={onClose} />
        ) : (
          <IconButton icon="search" label="Search" type="submit" className="ml-1" />
        )}
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, -1));
            } else if (e.key === "Escape") {
              inputRef.current?.blur();
              onClose?.();
            }
          }}
          placeholder="Search mail"
          aria-label="Search mail"
          aria-autocomplete="list"
          aria-expanded={showDrop}
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-base text-fg placeholder:text-fg-2 focus:outline-none"
        />
        {value && (
          <IconButton
            icon="close"
            label="Clear search"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
              if (routeQ) navigate("#inbox");
            }}
          />
        )}
        <IconButton icon="tune" label="Show search options" className="mr-1" onClick={() => setAdvOpen((o) => !o)} active={advOpen} />
      </form>

      {showDrop && (
        <div
          role="listbox"
          className="animate-fade absolute inset-x-0 top-12 z-50 overflow-hidden rounded-b-3xl bg-raised pb-2 shadow-pop"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mx-4 h-px bg-line" />
          {!term && (
            <div className="flex flex-wrap gap-2 px-4 py-3">
              {[
                ["attach_file", "Has attachment", "has:attachment"],
                ["mark_email_unread", "Unread", "is:unread"],
                ["star", "Starred", "is:starred"],
                ["calendar_month", "Last 7 days", "newer_than:7d"],
                ["send", "From me", "from:me"],
              ].map(([icon, label, q]) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => choose({ kind: "search", q })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-fg-2 hover:bg-hover"
                >
                  <Icon name={icon} size={18} />
                  {label}
                </button>
              ))}
            </div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(s)}
              className={cn("flex w-full items-center gap-4 px-4 py-2 text-left", i === active && "bg-hover")}
            >
              {s.kind === "recent" && (
                <>
                  <Icon name="history" className="text-fg-3" />
                  <span className="truncate">{s.q}</span>
                </>
              )}
              {s.kind === "search" && (
                <>
                  <Icon name="search" className="text-fg-3" />
                  <span className="truncate">
                    All search results for <b>“{s.q}”</b>
                  </span>
                  <span className="ml-auto text-xs text-fg-3">Press Enter</span>
                </>
              )}
              {s.kind === "contact" && (
                <>
                  <Avatar name={s.name} email={s.email} size={24} />
                  <span className="min-w-0 truncate">
                    <Highlight text={s.name} term={term} /> <span className="text-fg-3">&lt;{s.email}&gt;</span>
                  </span>
                </>
              )}
              {s.kind === "thread" && (
                <>
                  <Icon name="mail" className="text-fg-3" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      <Highlight text={s.subject} term={term} />
                    </span>
                    <span className="block truncate text-xs text-fg-3">{s.from}</span>
                  </span>
                  <span className="shrink-0 text-xs text-fg-3">{formatListDate(s.date, now)}</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      <Popover anchor={boxRef.current} open={advOpen} onClose={() => setAdvOpen(false)} align="start" className="w-[min(720px,calc(100vw-16px))] rounded-lg">
        <AdvancedSearch
          initial={value}
          onSubmit={(q) => {
            setAdvOpen(false);
            setValue(q);
            onClose?.();
            runSearch(q);
          }}
        />
      </Popover>
    </div>
  );
}

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term || term.includes(":")) return <>{text}</>;
  const i = text.toLowerCase().indexOf(term);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <b>{text.slice(i, i + term.length)}</b>
      {text.slice(i + term.length)}
    </>
  );
}

function AdvancedSearch({ initial, onSubmit }: { initial: string; onSubmit: (q: string) => void }) {
  const [f, setF] = useState<AdvancedFields>(() => fieldsFromQuery(initial));
  const labels = useMail((s) => s.labels);
  const set = (patch: Partial<AdvancedFields>) => setF((x) => ({ ...x, ...patch }));
  const row = (label: string, key: "from" | "to" | "subject" | "hasWords" | "notWords") => (
    <label className="flex items-end gap-4">
      <span className="w-36 shrink-0 pb-1.5 text-sm text-fg-2">{label}</span>
      <input
        value={f[key]}
        onChange={(e) => set({ [key]: e.target.value })}
        className="h-8 min-w-0 flex-1 border-b border-line bg-transparent text-sm focus:border-accent focus:outline-none"
      />
    </label>
  );
  const q = buildQuery(f);
  return (
    <form
      className="space-y-3 px-6 pb-5 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (q) onSubmit(q);
      }}
    >
      {row("From", "from")}
      {row("To", "to")}
      {row("Subject", "subject")}
      {row("Has the words", "hasWords")}
      {row("Doesn't have", "notWords")}
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <span className="w-36 shrink-0 text-sm text-fg-2">Date within</span>
        <select
          value={f.within}
          onChange={(e) => set({ within: e.target.value })}
          className="h-8 rounded border border-line bg-transparent px-2 text-sm"
        >
          <option value="">Any time</option>
          <option value="1d">1 day</option>
          <option value="3d">3 days</option>
          <option value="7d">1 week</option>
          <option value="14d">2 weeks</option>
          <option value="1m">1 month</option>
          <option value="6m">6 months</option>
          <option value="1y">1 year</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <span className="w-36 shrink-0 text-sm text-fg-2">Search</span>
        <select value={f.in} onChange={(e) => set({ in: e.target.value })} className="h-8 rounded border border-line bg-transparent px-2 text-sm">
          <option value="all">All Mail</option>
          <option value="inbox">Inbox</option>
          <option value="starred">Starred</option>
          <option value="sent">Sent Mail</option>
          <option value="drafts">Drafts</option>
          <option value="spam">Spam</option>
          <option value="trash">Trash</option>
          <option value="anywhere">Mail & Spam & Trash</option>
          {labels.map((l) => (
            <option key={l.id} value={`label:${l.name.toLowerCase().replace(/\s+/g, "-")}`}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-6 pt-1 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={f.hasAttachment} onChange={(e) => set({ hasAttachment: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
          Has attachment
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={f.unread} onChange={(e) => set({ unread: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
          Unread only
        </label>
      </div>
      <div className="flex items-center justify-between gap-3 pt-2">
        <code className="min-w-0 truncate text-xs text-fg-3">{q || "Fill in a field to build a search"}</code>
        <div className="flex gap-2">
          <Button onClick={() => setF(fieldsFromQuery(""))}>Clear filter</Button>
          <Button variant="filled" type="submit" disabled={!q}>
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}
