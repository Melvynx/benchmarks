import { useEffect, useMemo, useRef, useState } from "react";
import { Popover } from "radix-ui";
import { useMail } from "../lib/store";
import { useUI, ui } from "../lib/ui";
import { navigate, routeHash, useRoute } from "../lib/router";
import { viewThreads } from "../lib/selectors";
import { buildQuery } from "../lib/search";
import { listDate } from "../lib/date";
import { cn } from "../lib/utils";
import { Avatar, Button, Icon, IconButton, type IconKey } from "./ui";
import { FilterDialog } from "./FilterDialog";

const OPERATORS = [
  "is:unread", "is:read", "is:starred", "is:important", "is:snoozed", "has:attachment", "has:invite", "has:pdf",
  "in:inbox", "in:sent", "in:drafts", "in:trash", "in:spam", "in:anywhere", "from:me", "to:me",
  "older_than:7d", "newer_than:2d", "category:promotions", "category:social", "category:updates",
];

interface Suggestion {
  key: string;
  icon?: IconKey;
  avatar?: { name: string; email: string };
  primary: string;
  secondary?: string;
  meta?: string;
  run: () => void;
}

export function runSearch(q: string) {
  const query = q.trim();
  if (!query) return;
  useMail.getState().addRecentSearch(query);
  ui().set({ searchInput: query, mobileSearch: false });
  navigate(routeHash({ view: { kind: "search", query } }));
}

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <b className="font-semibold text-fg">{text.slice(i, i + term.length)}</b>
      {text.slice(i + term.length)}
    </>
  );
}

export function useSearchSuggestions(input: string, close: () => void): Suggestion[] {
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const contacts = useMail((s) => s.contacts);
  const recent = useMail((s) => s.recentSearches);
  const labels = useMail((s) => s.labels);
  const settings = useMail((s) => s.settings);
  const account = useMail((s) => s.account);

  return useMemo(() => {
    const q = input.trim();
    const out: Suggestion[] = [];
    if (!q) {
      recent.slice(0, 6).forEach((r) =>
        out.push({ key: `r:${r}`, icon: "history", primary: r, run: () => (close(), runSearch(r)) }),
      );
      return out;
    }
    const last = q.split(/\s+/).pop() || "";
    const head = q.slice(0, q.length - last.length);
    if (last.length >= 2 && (last.includes(":") || OPERATORS.some((o) => o.startsWith(last.toLowerCase())))) {
      const ops = [...OPERATORS, ...labels.map((l) => `label:${l.name.toLowerCase().replace(/\s+/g, "-")}`)];
      ops
        .filter((o) => o.startsWith(last.toLowerCase()) && o !== last.toLowerCase())
        .slice(0, 4)
        .forEach((o) =>
          out.push({ key: `o:${o}`, icon: "filter_alt", primary: o, secondary: "Search operator", run: () => ui().set({ searchInput: `${head}${o} ` }) }),
        );
    }
    if (!q.includes(":")) {
      const lc = q.toLowerCase();
      Object.values(contacts)
        .filter((c) => c.name.toLowerCase().includes(lc) || c.email.toLowerCase().includes(lc))
        .slice(0, 3)
        .forEach((c) =>
          out.push({
            key: `c:${c.email}`,
            avatar: c,
            primary: c.name || c.email,
            secondary: c.email,
            run: () => (close(), runSearch(`from:${c.email}`)),
          }),
        );
    }
    const s = { threads, messages, settings, account, labels };
    viewThreads(s, { kind: "search", query: q })
      .slice(0, 5)
      .forEach((t) => {
        const last = t.messageIds.map((id) => messages[id]).filter(Boolean).sort((a, b) => b.date - a.date)[0];
        out.push({
          key: `t:${t.id}`,
          icon: "mail",
          primary: t.subject || "(no subject)",
          secondary: last ? last.from.name || last.from.email : "",
          meta: last ? listDate(last.date) : "",
          run: () => {
            close();
            useMail.getState().addRecentSearch(q);
            navigate(routeHash({ view: { kind: "search", query: q }, threadId: t.id }));
          },
        });
      });
    return out;
  }, [input, threads, messages, contacts, recent, labels, settings, account, close]);
}

export function SuggestionList({ items, active, term, onHover, onPick }: { items: Suggestion[]; active: number; term: string; onHover: (i: number) => void; onPick: (s: Suggestion) => void }) {
  return (
    <ul role="listbox" className="py-2">
      {items.map((s, i) => (
        <li
          key={s.key}
          role="option"
          aria-selected={i === active}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => onHover(i)}
          onClick={() => onPick(s)}
          className={cn("flex h-12 cursor-pointer items-center gap-4 px-4", i === active && "bg-hover")}
        >
          {s.avatar ? <Avatar name={s.avatar.name} email={s.avatar.email} size={28} /> : <Icon name={s.icon || "search"} size={20} className="ml-1 text-icon" />}
          <div className="min-w-0 flex-1">
            <div className="truncate font-body text-sm text-fg-2">
              <Highlight text={s.primary} term={s.icon === "history" ? "" : term} />
            </div>
            {s.secondary && <div className="truncate font-body text-xs text-fg-3">{s.secondary}</div>}
          </div>
          {s.meta && <span className="shrink-0 font-body text-xs text-fg-3">{s.meta}</span>}
        </li>
      ))}
    </ul>
  );
}

export function SearchBar() {
  const route = useRoute();
  const input = useUI((s) => s.searchInput);
  const focusNonce = useUI((s) => s.searchFocusNonce);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [hover, setHover] = useState(-1);
  const [advanced, setAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const clearRecent = useMail((s) => s.clearRecentSearches);

  const routeQuery = route.view.kind === "search" ? route.view.query : "";
  useEffect(() => {
    ui().set({ searchInput: routeQuery });
  }, [routeQuery]);

  useEffect(() => {
    if (focusNonce) inputRef.current?.focus();
  }, [focusNonce]);

  const close = useMemo(() => () => inputRef.current?.blur(), []);
  const items = useSearchSuggestions(input, close);
  useEffect(() => {
    setActive(-1);
    setHover(-1);
  }, [input]);
  const open = focused && items.length > 0;

  const submit = () => {
    if (active >= 0 && items[active]) return items[active].run();
    if (!input.trim()) return;
    inputRef.current?.blur();
    runSearch(input);
  };

  return (
    <div className="relative min-w-0 max-w-[720px] flex-1">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          "relative z-[61] flex h-12 items-center gap-1 px-1 transition-[background,box-shadow,border-radius]",
          focused || advanced ? "bg-[var(--search-focus)] shadow-e1" : "bg-search",
          open ? "rounded-t-3xl" : "rounded-3xl",
        )}
      >
        <IconButton icon="search" label="Search" type="submit" onClick={(e) => (e.preventDefault(), submit())} />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => ui().set({ searchInput: e.target.value })}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(items.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(-1, a - 1));
            } else if (e.key === "Escape") {
              inputRef.current?.blur();
            }
          }}
          placeholder="Search mail"
          aria-label="Search mail"
          className="h-full min-w-0 flex-1 bg-transparent font-sans text-base text-fg outline-none placeholder:text-fg-2"
          autoComplete="off"
          spellCheck={false}
        />
        {input && (
          <IconButton
            icon="close"
            label="Clear search"
            onClick={() => {
              ui().set({ searchInput: "" });
              if (route.view.kind === "search") navigate("inbox");
              else inputRef.current?.focus();
            }}
          />
        )}
        <Popover.Root open={advanced} onOpenChange={setAdvanced}>
          <Popover.Trigger asChild>
            <IconButton icon="tune" label="Show search options" active={advanced} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              alignOffset={-4}
              collisionPadding={12}
              className="no-print z-[70] w-[min(720px,calc(100vw-24px))] rounded-lg bg-menu p-6 font-sans text-fg shadow-e3 outline-none animate-pop"
            >
              <AdvancedSearch onDone={() => setAdvanced(false)} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </form>
      {open && (
        <div className="absolute inset-x-0 top-12 z-[60] max-h-[70vh] overflow-auto rounded-b-3xl bg-[var(--search-focus)] shadow-e2 animate-fade">
          <div className="mx-4 h-px bg-line" />
          {!input.trim() && (
            <div className="flex items-center justify-between px-5 pt-3 text-xs font-medium text-fg-3">
              <span>Recent searches</span>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clearRecent} className="rounded px-2 py-1 text-primary hover:bg-hover">
                Clear
              </button>
            </div>
          )}
          <SuggestionList items={items} active={active >= 0 ? active : hover} term={input.trim()} onHover={setHover} onPick={(s) => s.run()} />
          {input.trim() && (
            <div className="border-t border-line px-5 py-3 font-body text-xs text-fg-3">
              Press <b>Enter</b> to search all mail for “{input.trim()}”
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SCOPES: [string, string][] = [
  ["all", "All Mail"], ["inbox", "Inbox"], ["starred", "Starred"], ["sent", "Sent Mail"], ["drafts", "Drafts"],
  ["spam", "Spam"], ["trash", "Trash"], ["anywhere", "Mail & Spam & Trash"],
];

export function AdvancedSearch({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ from: "", to: "", subject: "", words: "", without: "", within: "1d", date: "", scope: "all", hasAttachment: false });
  const [filterOpen, setFilterOpen] = useState(false);
  const q = buildQuery(f);
  const field = (key: "from" | "to" | "subject" | "words" | "without", label: string) => (
    <label className="grid grid-cols-[150px_1fr] items-end gap-4 max-sm:grid-cols-1 max-sm:gap-1">
      <span className="pb-1.5 text-sm text-fg-2">{label}</span>
      <input
        value={f[key]}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        className="h-8 border-b border-outline bg-transparent font-body text-sm outline-none focus:border-b-2 focus:border-primary"
      />
    </label>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!q) return;
        onDone();
        runSearch(q);
      }}
      className="flex flex-col gap-3"
    >
      {field("from", "From")}
      {field("to", "To")}
      {field("subject", "Subject")}
      {field("words", "Has the words")}
      {field("without", "Doesn't have")}
      <div className="grid grid-cols-[150px_1fr] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-1">
        <span className="text-sm text-fg-2">Date within</span>
        <div className="flex gap-3">
          <select value={f.within} onChange={(e) => setF({ ...f, within: e.target.value })} className="h-9 rounded border border-outline-soft bg-surface px-2 text-sm">
            {[["1d", "1 day"], ["3d", "3 days"], ["1w", "1 week"], ["2w", "2 weeks"], ["1m", "1 month"], ["2m", "2 months"], ["6m", "6 months"], ["1y", "1 year"]].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="h-9 flex-1 rounded border border-outline-soft bg-surface px-2 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-[150px_1fr] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-1">
        <span className="text-sm text-fg-2">Search</span>
        <select value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })} className="h-9 rounded border border-outline-soft bg-surface px-2 text-sm">
          {SCOPES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <label className="mt-1 flex items-center gap-3 text-sm text-fg-2">
        <input type="checkbox" checked={f.hasAttachment} onChange={(e) => setF({ ...f, hasAttachment: e.target.checked })} className="size-4 accent-[var(--primary)]" />
        Has attachment
      </label>
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button variant="text" disabled={!q} onClick={() => setFilterOpen(true)}>
          Create filter
        </Button>
        <Button type="submit" disabled={!q}>
          Search
        </Button>
      </div>
      <FilterDialog open={filterOpen} query={q} onOpenChange={(v) => { setFilterOpen(v); if (!v) onDone(); }} />
    </form>
  );
}