import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useMail } from "../store/mail";
import { navigate } from "../lib/router";
import type { Route } from "../types";
import { Icon, IconButton } from "../ui/Icon";
import { matches, parseQuery } from "../lib/search";
import { contactFor, isMe } from "../data/contacts";
import { Avatar } from "../ui/Avatar";
import { listDate } from "../lib/format";
import { threadDate } from "../store/mail";

const RECENT_KEY = "opus-mail:recent-searches";

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export interface SearchHandle {
  focus: () => void;
}

export const SearchBar = forwardRef<SearchHandle, { route: Route; mobileAvatar?: React.ReactNode; onMenu?: () => void }>(
  function SearchBar({ route, mobileAvatar, onMenu }, ref) {
    const { state } = useMail();
    const [value, setValue] = useState(route.view === "search" ? route.param ?? "" : "");
    const [focused, setFocused] = useState(false);
    const [advanced, setAdvanced] = useState(false);
    const [active, setActive] = useState(-1);
    const [recent, setRecent] = useState<string[]>(loadRecent);
    const input = useRef<HTMLInputElement>(null);
    const wrap = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));

    useEffect(() => {
      setValue(route.view === "search" ? route.param ?? "" : "");
    }, [route.view, route.param]);

    useEffect(() => {
      if (!focused && !advanced) return;
      const down = (e: MouseEvent) => {
        if (!wrap.current?.contains(e.target as Node)) {
          setFocused(false);
          setAdvanced(false);
        }
      };
      document.addEventListener("mousedown", down);
      return () => document.removeEventListener("mousedown", down);
    }, [focused, advanced]);

    const submit = (q: string) => {
      const query = q.trim();
      setFocused(false);
      setAdvanced(false);
      input.current?.blur();
      if (!query) {
        navigate({ view: "inbox" });
        return;
      }
      const next = [query, ...recent.filter((r) => r !== query)].slice(0, 6);
      setRecent(next);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      navigate({ view: "search", param: query });
    };

    const suggestions = useMemo(() => {
      const q = value.trim();
      if (!q) return { threads: [], people: [] };
      const p = parseQuery(q);
      const threads = state.threads
        .filter((t) => matches(t, p, state.labels, state.contacts))
        .sort((a, b) => threadDate(b) - threadDate(a))
        .slice(0, 5);
      const lower = q.toLowerCase();
      const people = q.includes(":")
        ? []
        : state.contacts
            .filter((c) => !isMe(c.email) && (c.name.toLowerCase().includes(lower) || c.email.toLowerCase().includes(lower)))
            .slice(0, 3);
      return { threads, people };
    }, [value, state.threads, state.labels, state.contacts]);

    type Item = { key: string; run: () => void };
    const items: Item[] = value.trim()
      ? [
          ...suggestions.people.map((c) => ({ key: "p" + c.email, run: () => submit(`from:${c.email}`) })),
          ...suggestions.threads.map((t) => ({
            key: "t" + t.id,
            run: () => {
              setFocused(false);
              input.current?.blur();
              navigate({ view: "search", param: value.trim(), threadId: t.id });
            },
          })),
        ]
      : recent.map((r) => ({ key: "r" + r, run: () => submit(r) }));

    const onKey = (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(items.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(-1, a - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (active >= 0 && items[active]) items[active].run();
        else submit(value);
      } else if (e.key === "Escape") {
        setFocused(false);
        input.current?.blur();
      }
    };

    const showDrop = focused && !advanced && (items.length > 0 || !value.trim());
    let idx = -1;

    return (
      <div className={"search" + (focused || advanced ? " open" : "")} ref={wrap}>
        <form
          className="search-box"
          onSubmit={(e) => {
            e.preventDefault();
            submit(value);
          }}
        >
          {onMenu && <IconButton icon="menu" label="Main menu" onClick={onMenu} className="search-menu-btn" />}
          <button type="submit" className="icon-btn search-icon" aria-label="Search mail" data-tip="Search">
            <Icon name="search" />
          </button>
          <input
            ref={input}
            value={value}
            placeholder="Search mail"
            aria-label="Search mail"
            onChange={(e) => {
              setValue(e.target.value);
              setActive(-1);
              setFocused(true);
            }}
            onFocus={() => setFocused(true)}
            onKeyDown={onKey}
          />
          {value && (
            <IconButton
              icon="close"
              label="Clear search"
              onClick={() => {
                setValue("");
                input.current?.focus();
                if (route.view === "search") navigate({ view: "inbox" });
              }}
            />
          )}
          <IconButton icon="tune" label="Show search options" onClick={() => setAdvanced((a) => !a)} className="search-tune" />
          {mobileAvatar}
        </form>
        {showDrop && (
          <div className="search-drop">
            {!value.trim() && (
              <>
                <div className="search-chips">
                  {[
                    ["is:unread", "Unread"],
                    ["is:starred", "Starred"],
                    ["has:attachment", "Has attachment"],
                    ["newer_than:7d", "Last 7 days"],
                    ["from:me", "From me"],
                  ].map(([q, l]) => (
                    <button key={q} className="chip" onMouseDown={(e) => e.preventDefault()} onClick={() => submit(q)}>
                      {l}
                    </button>
                  ))}
                </div>
                {recent.length > 0 && <div className="search-section">Recent searches</div>}
              </>
            )}
            {!value.trim() &&
              recent.map((r) => {
                idx++;
                const i = idx;
                return (
                  <button key={r} className={"search-item" + (active === i ? " active" : "")} onClick={() => submit(r)} onMouseEnter={() => setActive(i)}>
                    <Icon name="restore" size={18} />
                    <span className="grow">{r}</span>
                  </button>
                );
              })}
            {suggestions.people.map((c) => {
              idx++;
              const i = idx;
              return (
                <button key={c.email} className={"search-item" + (active === i ? " active" : "")} onClick={() => submit(`from:${c.email}`)} onMouseEnter={() => setActive(i)}>
                  <Avatar contact={c} size={24} />
                  <span className="grow">
                    <b>{c.name}</b> <span className="muted">{c.email}</span>
                  </span>
                  <span className="muted small">Emails from</span>
                </button>
              );
            })}
            {suggestions.threads.map((t) => {
              idx++;
              const i = idx;
              const last = t.messages[t.messages.length - 1];
              const c = contactFor(last.from, state.contacts);
              return (
                <button key={t.id} className={"search-item" + (active === i ? " active" : "")} onClick={items[i]?.run} onMouseEnter={() => setActive(i)}>
                  <Icon name={t.unread ? "mail" : "mailOpen"} size={18} />
                  <span className="grow ellipsis">
                    <span className={t.unread ? "strong" : ""}>{t.subject}</span>
                    <span className="muted"> · {isMe(c.email) ? "me" : c.name}</span>
                  </span>
                  <span className="muted small">{listDate(threadDate(t))}</span>
                </button>
              );
            })}
            {value.trim() && (
              <button className="search-item all" onClick={() => submit(value)}>
                <Icon name="search" size={18} />
                <span className="grow">
                  All search results for “<b>{value.trim()}</b>”
                </span>
                <span className="muted small">Enter</span>
              </button>
            )}
          </div>
        )}
        {advanced && <AdvancedSearch initial={value} onSearch={submit} />}
      </div>
    );
  },
);

function AdvancedSearch({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const { state } = useMail();
  const p = parseQuery(initial);
  const op = (k: string) => p.ops.find((o) => o.key === k && !o.neg)?.value ?? "";
  const [f, setF] = useState({
    from: op("from"),
    to: op("to"),
    subject: op("subject"),
    words: p.terms.join(" "),
    without: p.exclude.join(" "),
    within: op("newer_than"),
    where: op("in") || op("label") ? (op("label") ? `label:${op("label")}` : `in:${op("in")}`) : "",
    attach: p.ops.some((o) => o.key === "has" && o.value.startsWith("attachment")),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });
  const quote = (v: string) => (/\s/.test(v) ? `"${v}"` : v);
  const build = () => {
    const parts: string[] = [];
    if (f.from) parts.push(`from:${quote(f.from)}`);
    if (f.to) parts.push(`to:${quote(f.to)}`);
    if (f.subject) parts.push(`subject:${quote(f.subject)}`);
    if (f.words) parts.push(f.words);
    if (f.without) parts.push(...f.without.split(/\s+/).map((w) => `-${w}`));
    if (f.within) parts.push(`newer_than:${f.within}`);
    if (f.where) parts.push(f.where);
    if (f.attach) parts.push("has:attachment");
    return parts.join(" ");
  };
  return (
    <form
      className="adv-search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(build());
      }}
    >
      <label>
        <span>From</span>
        <input value={f.from} onChange={set("from")} autoFocus />
      </label>
      <label>
        <span>To</span>
        <input value={f.to} onChange={set("to")} />
      </label>
      <label>
        <span>Subject</span>
        <input value={f.subject} onChange={set("subject")} />
      </label>
      <label>
        <span>Has the words</span>
        <input value={f.words} onChange={set("words")} />
      </label>
      <label>
        <span>Doesn't have</span>
        <input value={f.without} onChange={set("without")} />
      </label>
      <label>
        <span>Date within</span>
        <select value={f.within} onChange={set("within")}>
          <option value="">Any time</option>
          <option value="1d">1 day</option>
          <option value="7d">1 week</option>
          <option value="1m">1 month</option>
          <option value="6m">6 months</option>
          <option value="1y">1 year</option>
        </select>
      </label>
      <label>
        <span>Search</span>
        <select value={f.where} onChange={set("where")}>
          <option value="">All Mail</option>
          <option value="in:inbox">Inbox</option>
          <option value="in:starred">Starred</option>
          <option value="in:sent">Sent Mail</option>
          <option value="in:snoozed">Snoozed</option>
          <option value="in:spam">Spam</option>
          <option value="in:trash">Trash</option>
          <option value="in:anywhere">Mail &amp; Spam &amp; Trash</option>
          {state.labels.map((l) => (
            <option key={l.id} value={`label:${l.id}`}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <label className="adv-check">
        <input type="checkbox" checked={f.attach} onChange={set("attach")} />
        <span>Has attachment</span>
      </label>
      <div className="adv-actions">
        <span className="muted small ellipsis">{build() || "Fill in a field to search"}</span>
        <button type="submit" className="btn primary" disabled={!build()}>
          Search
        </button>
      </div>
    </form>
  );
}
