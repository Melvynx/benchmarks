import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Menu, Search, X, SlidersHorizontal, HelpCircle, Settings, Clock, Mail, Moon, Sun, Keyboard, RotateCcw,
} from "lucide-react";
import { useMail } from "../lib/store";
import { navigate, useRoute } from "../lib/router";
import { parseQuery, matchesQuery, sortKey } from "../lib/query";
import { ME, attachmentTotal, displayName, fileSize, listDate } from "../lib/format";
import type { Contact, Thread } from "../lib/types";
import { Avatar, IconButton, MenuDivider, MenuItem, Popover, useAnchor, useIsMobile } from "./ui";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4c8df6" />
          <stop offset="1" stopColor="#0b57d0" />
        </linearGradient>
      </defs>
      <rect x="4" y="9" width="32" height="23" rx="5" fill="url(#lg1)" />
      <path d="M7 13l13 9.5L33 13" stroke="#fff" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="33" cy="10" r="5" fill="#f4b400" stroke="var(--bg)" strokeWidth="2" />
    </svg>
  );
}

const RECENT_KEY = "mail-recent-searches";
const getRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
};
const pushRecent = (q: string) => {
  const list = [q, ...getRecent().filter((x) => x !== q)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
};

export function runSearch(q: string) {
  const query = q.trim();
  if (!query) return;
  pushRecent(query);
  navigate({ view: "search", query });
  (document.activeElement as HTMLElement | null)?.blur();
}

function useContacts() {
  const threads = useMail((s) => s.threads);
  return useMemo(() => {
    const map = new Map<string, Contact & { count: number }>();
    for (const t of Object.values(threads))
      for (const m of t.messages)
        for (const c of [m.from, ...m.to, ...m.cc]) {
          if (c.email === ME.email) continue;
          const e = map.get(c.email);
          if (e) e.count++;
          else map.set(c.email, { ...c, count: 1 });
        }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [threads]);
}
export { useContacts };

function Highlight({ text, q }: { text: string; q: string }) {
  const needle = q.trim().toLowerCase();
  if (!needle) return <>{text}</>;
  const i = text.toLowerCase().indexOf(needle);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <b className="font-semibold">{text.slice(i, i + needle.length)}</b>
      {text.slice(i + needle.length)}
    </>
  );
}

function SearchBar({ mobile }: { mobile?: boolean }) {
  const route = useRoute();
  const threads = useMail((s) => s.threads);
  const labels = useMail((s) => s.labels);
  const now = useMail((s) => s.now);
  const setMobileNav = useMail((s) => s.set);
  const contacts = useContacts();
  const [value, setValue] = useState(route.view === "search" ? route.query ?? "" : "");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const adv = useAnchor();

  useEffect(() => {
    setValue(route.view === "search" ? route.query ?? "" : "");
  }, [route.view, route.query]);

  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    window.addEventListener("mail:focus-search", focus);
    return () => window.removeEventListener("mail:focus-search", focus);
  }, []);

  const suggestions = useMemo(() => {
    const q = value.trim();
    if (!q) return { threads: [] as Thread[], contacts: [] as Contact[] };
    const p = parseQuery(q, now);
    const ts = Object.values(threads)
      .filter((t) => matchesQuery(t, p, labels, now))
      .sort((a, b) => sortKey(b) - sortKey(a))
      .slice(0, 6);
    const lower = q.toLowerCase();
    const cs = q.includes(":")
      ? []
      : contacts.filter((c) => c.name.toLowerCase().includes(lower) || c.email.includes(lower)).slice(0, 3);
    return { threads: ts, contacts: cs };
  }, [value, threads, labels, contacts, now]);

  const recent = focused && !value.trim() ? getRecent() : [];
  type Item = { key: string; run: () => void };
  const items: Item[] = [
    ...recent.map((r) => ({ key: "r" + r, run: () => runSearch(r) })),
    ...suggestions.contacts.map((c) => ({ key: "c" + c.email, run: () => runSearch(`from:${c.email}`) })),
    ...suggestions.threads.map((t) => ({
      key: "t" + t.id,
      run: () => {
        (document.activeElement as HTMLElement | null)?.blur();
        navigate({ view: "search", query: value.trim(), threadId: t.id });
      },
    })),
  ];
  const open = focused && (items.length > 0 || !!value.trim());

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && items[active]) items[active].run();
      else runSearch(value);
    } else if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  };

  let idx = -1;
  const rowCls = (i: number) =>
    clsx("flex w-full items-center gap-4 px-4 py-2 text-left text-sm hover:bg-hover", i === active && "bg-hover");

  return (
    <div
      ref={wrapRef}
      className={clsx(
        "relative flex h-12 w-full items-center rounded-full transition-[background,box-shadow]",
        focused || adv.anchor ? "bg-search-focus shadow-float" : "bg-search",
        open && !mobile && "rounded-b-none rounded-t-3xl",
      )}
    >
      {mobile ? (
        <IconButton tip="Main menu" className="ml-1" onClick={() => setMobileNav({ mobileNavOpen: true })}>
          <Menu size={22} />
        </IconButton>
      ) : (
        <IconButton tip="Search" className="ml-1" onClick={() => runSearch(value)}>
          <Search size={20} />
        </IconButton>
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setActive(-1);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={onKey}
        placeholder="Search mail"
        aria-label="Search mail"
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-base text-ink outline-none placeholder:text-ink-2"
      />
      {value && (
        <IconButton
          tip="Clear search"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
            if (route.view === "search") navigate({ view: "inbox" });
          }}
        >
          <X size={20} />
        </IconButton>
      )}
      {!mobile && (
        <IconButton tip="Show search options" className="mr-1" onClick={(e) => adv.setAnchor(adv.anchor ? null : wrapRef.current ?? e.currentTarget)}>
          <SlidersHorizontal size={20} />
        </IconButton>
      )}
      {mobile && <AccountButton />}

      {open && (
        <div
          className={clsx(
            "anim-fade absolute left-0 right-0 top-full z-50 overflow-hidden bg-search-focus pb-2 shadow-float",
            mobile ? "mt-2 rounded-2xl" : "rounded-b-3xl border-t border-divider",
          )}
          onMouseDown={(e) => e.preventDefault()}
        >
          {recent.length > 0 && (
            <div className="pt-2">
              {recent.map((r) => {
                idx++;
                const i = idx;
                return (
                  <button key={r} className={rowCls(i)} onClick={() => runSearch(r)}>
                    <Clock size={18} className="text-ink-3" />
                    <span className="truncate">{r}</span>
                  </button>
                );
              })}
            </div>
          )}
          {suggestions.contacts.length > 0 && (
            <div className="pt-2">
              {suggestions.contacts.map((c) => {
                idx++;
                const i = idx;
                return (
                  <button key={c.email} className={rowCls(i)} onClick={() => runSearch(`from:${c.email}`)}>
                    <Avatar contact={c} size={24} />
                    <span className="truncate">
                      <Highlight text={displayName(c)} q={value} />
                      <span className="ml-2 text-ink-3">{c.email}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {suggestions.threads.length > 0 && (
            <div className="pt-2">
              {suggestions.threads.map((t) => {
                idx++;
                const i = idx;
                const last = t.messages[t.messages.length - 1];
                return (
                  <button
                    key={t.id}
                    className={rowCls(i)}
                    onClick={() => {
                      (document.activeElement as HTMLElement | null)?.blur();
                      navigate({ view: "search", query: value.trim(), threadId: t.id });
                    }}
                  >
                    <Mail size={18} className="shrink-0 text-ink-3" />
                    <span className="min-w-0 flex-1">
                      <span className={clsx("block truncate", t.unread && "font-semibold")}>
                        <Highlight text={t.subject} q={value} />
                      </span>
                      <span className="block truncate text-xs text-ink-3">{displayName(last.from)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-3">{listDate(sortKey(t), now)}</span>
                  </button>
                );
              })}
            </div>
          )}
          {value.trim() && (
            <button
              className="mt-1 flex w-full items-center gap-4 border-t border-divider px-4 pt-3 pb-1 text-left text-sm text-ink-2 hover:text-ink"
              onClick={() => runSearch(value)}
            >
              <Search size={18} className="text-ink-3" />
              All search results for “{value.trim()}”
              <span className="ml-auto text-xs text-ink-3">Press Enter</span>
            </button>
          )}
        </div>
      )}

      <Popover anchor={adv.anchor} onClose={adv.close} matchWidth className="!rounded-2xl">
        <AdvancedSearch
          initial={value}
          onSearch={(q) => {
            adv.close();
            runSearch(q);
          }}
        />
      </Popover>
    </div>
  );
}

function AdvancedSearch({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const labels = useMail((s) => s.labels);
  const p = parseQuery(initial);
  const [f, setF] = useState({
    from: p.from.join(" "),
    to: p.to.join(" "),
    subject: p.subject.join(" "),
    words: p.terms.join(" "),
    without: p.negTerms.join(" "),
    within: "",
    where: p.in ?? "",
    attachment: p.has.includes("attachment"),
    unread: p.is.includes("unread"),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  const build = () => {
    const parts: string[] = [];
    const quote = (s: string) => (/\s/.test(s) ? `"${s}"` : s);
    if (f.from.trim()) parts.push(`from:${quote(f.from.trim())}`);
    if (f.to.trim()) parts.push(`to:${quote(f.to.trim())}`);
    if (f.subject.trim()) parts.push(`subject:${quote(f.subject.trim())}`);
    if (f.words.trim()) parts.push(f.words.trim());
    for (const w of f.without.trim().split(/\s+/).filter(Boolean)) parts.push(`-${w}`);
    if (f.within) parts.push(`newer_than:${f.within}`);
    if (f.where) parts.push(f.where.startsWith("label:") ? f.where : `in:${f.where}`);
    if (f.attachment) parts.push("has:attachment");
    if (f.unread) parts.push("is:unread");
    return parts.join(" ");
  };

  const field = (label: string, k: "from" | "to" | "subject" | "words" | "without") => (
    <label className="flex items-end gap-4">
      <span className="w-32 shrink-0 pb-1.5 text-sm text-ink-2">{label}</span>
      <input
        value={f[k]}
        onChange={set(k)}
        data-autofocus={k === "from" || undefined}
        onKeyDown={(e) => e.key === "Enter" && onSearch(build())}
        className="w-full border-b border-line bg-transparent py-1.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );

  return (
    <div className="space-y-4 px-6 py-4">
      {field("From", "from")}
      {field("To", "to")}
      {field("Subject", "subject")}
      {field("Has the words", "words")}
      {field("Doesn't have", "without")}
      <div className="flex flex-wrap items-center gap-4">
        <span className="w-32 text-sm text-ink-2">Date within</span>
        <select value={f.within} onChange={set("within")} className="rounded border border-line bg-transparent px-2 py-1.5 text-sm">
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
        <span className="w-32 text-sm text-ink-2">Search</span>
        <select value={f.where} onChange={set("where")} className="rounded border border-line bg-transparent px-2 py-1.5 text-sm">
          <option value="">All Mail</option>
          <option value="inbox">Inbox</option>
          <option value="sent">Sent Mail</option>
          <option value="snoozed">Snoozed</option>
          {labels.map((l) => (
            <option key={l.id} value={`label:${l.name.toLowerCase()}`}>{l.name}</option>
          ))}
          <option value="spam">Spam</option>
          <option value="trash">Trash</option>
          <option value="anywhere">Mail &amp; Spam &amp; Trash</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-6 pl-36 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={f.attachment} onChange={set("attachment")} className="h-4 w-4 accent-[var(--primary)]" />
          Has attachment
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={f.unread} onChange={set("unread")} className="h-4 w-4 accent-[var(--primary)]" />
          Unread only
        </label>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => onSearch(build())}
          disabled={!build()}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40"
        >
          Search
        </button>
      </div>
    </div>
  );
}

function AccountButton() {
  const menu = useAnchor();
  const threads = useMail((s) => s.threads);
  const settings = useMail((s) => s.settings);
  const set = useMail((s) => s.set);
  const updateSettings = useMail((s) => s.updateSettings);
  const resetDemo = useMail((s) => s.resetDemo);
  const used = useMemo(
    () => Object.values(threads).reduce((s, t) => s + t.messages.reduce((a, m) => a + attachmentTotal(m.attachments) + m.html.length, 0), 0),
    [threads],
  );
  const quota = 15 * 1024 * 1024 * 1024;
  const dark = settings.theme === "dark" || (settings.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  return (
    <>
      <button
        data-tip={`${ME.name}\n${ME.email}`}
        aria-label="Account"
        onClick={menu.open}
        className="mx-1 rounded-full p-1 hover:bg-hover"
      >
        <Avatar contact={ME} size={32} />
      </button>
      <Popover anchor={menu.anchor} onClose={menu.close} align="end" className="w-[340px] !rounded-3xl !py-0">
        <div className="bg-search px-6 pb-4 pt-5 text-center">
          <div className="text-sm text-ink-2">{ME.email}</div>
          <Avatar contact={ME} size={72} className="mx-auto mt-4" />
          <div className="mt-3 text-xl font-normal">Hi, {ME.name.split(" ")[0]}!</div>
          <div className="mt-4 rounded-2xl bg-surface px-4 py-3 text-left">
            <div className="flex justify-between text-xs text-ink-2">
              <span>Storage</span>
              <span>{fileSize(used)} of 15 GB used</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-chip">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(1.5, (used / quota) * 100)}%` }} />
            </div>
          </div>
        </div>
        <div className="py-2">
          <MenuItem
            icon={dark ? <Sun size={18} /> : <Moon size={18} />}
            label={dark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => updateSettings({ theme: dark ? "light" : "dark" })}
          />
          <MenuItem icon={<Settings size={18} />} label="Quick settings" onClick={() => { menu.close(); set({ settingsOpen: true }); }} />
          <MenuItem icon={<Keyboard size={18} />} label="Keyboard shortcuts" hint="?" onClick={() => { menu.close(); set({ shortcutsOpen: true }); }} />
          <MenuDivider />
          <MenuItem
            icon={<RotateCcw size={18} />}
            label="Reset demo mailbox"
            onClick={() => {
              menu.close();
              if (confirm("Restore the original demo mailbox? Your local changes will be lost.")) resetDemo();
            }}
          />
        </div>
        <div className="border-t border-divider px-6 py-3 text-center text-xs text-ink-3">
          All mail is stored locally in this browser.
        </div>
      </Popover>
    </>
  );
}

export function TopBar() {
  const set = useMail((s) => s.set);
  const collapsed = useMail((s) => s.sidebarCollapsed);
  const isMobile = useIsMobile();
  const selectedCount = useMail((s) => s.selected.length);

  if (isMobile) {
    return (
      <header className="no-print relative z-30 px-3 pb-2 pt-2">
        {selectedCount > 0 ? null : <SearchBar mobile />}
      </header>
    );
  }

  return (
    <header className="no-print flex h-16 shrink-0 items-center gap-2 pl-2 pr-3">
      <div className="flex w-[232px] shrink-0 items-center gap-1 pr-4">
        <IconButton tip="Main menu" size="lg" onClick={() => set({ sidebarCollapsed: !collapsed })}>
          <Menu size={22} />
        </IconButton>
        <button
          className="flex items-center gap-1.5 rounded-lg pr-2"
          onClick={() => navigate({ view: "inbox" })}
          aria-label="Go to Inbox"
        >
          <Logo size={36} />
          <h1 className="whitespace-nowrap font-display text-[20px] leading-none text-ink-2">Claude Opus 5.5</h1>
        </button>
      </div>
      <div className="min-w-0 max-w-[720px] flex-1">
        <SearchBar />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <IconButton tip="Keyboard shortcuts" onClick={() => set({ shortcutsOpen: true })}>
          <HelpCircle size={22} />
        </IconButton>
        <IconButton tip="Settings" onClick={() => set({ settingsOpen: true })}>
          <Settings size={22} />
        </IconButton>
        <AccountButton />
      </div>
    </header>
  );
}