import { useEffect, useRef } from "react";
import type { MailboxId, MenuState } from "./types";
import { colorFor, formatListDate, initials, mailboxLabel, snippetOf, latestMessage } from "./format";
import { Icon } from "./icons";
import { useMail, useNarrow } from "./store";
import { MailList } from "./list";
import { ThreadView } from "./thread";
import { ComposeDock } from "./compose";
import { Overlays } from "./overlays";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function Shell() {
  const mail = useMail();
  const narrow = useNarrow();
  const ref = useRef(mail);
  const narrowRef = useRef(narrow);
  ref.current = mail;
  narrowRef.current = narrow;

  useEffect(() => {
    let chord = false;
    let chordTimer = 0;
    const onKey = (event: KeyboardEvent) => {
      const api = ref.current;
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") return;
      if (event.key === "Escape") {
        if (api.menu) api.dispatch({ type: "menu", menu: null });
        else if (api.dialog) api.dispatch({ type: "dialog", dialog: null });
        else if (api.dockExpanded) api.dispatch({ type: "expand", value: false });
        else if (api.dockDraftId && !api.dockMinimized) api.dispatch({ type: "minimize" });
        else if (api.searchOpen) api.dispatch({ type: "search-open", open: false });
        else if (api.sideOpen) api.dispatch({ type: "side", open: false });
        else if (api.openThreadId && !(api.settings.readingPane && !narrowRef.current)) api.dispatch({ type: "open", id: null });
        else if (api.query) api.dispatch({ type: "query", query: "" });
        else if (api.selected.length) api.dispatch({ type: "select-many", ids: [] });
        return;
      }
      if (isTyping(event.target) || api.dialog) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.closest("button, a") && (event.key === "Enter" || event.key === " ")) return;
      if (chord) {
        chord = false;
        const go: Record<string, MailboxId> = { i: "inbox", s: "starred", t: "sent", d: "drafts", a: "all" };
        if (event.key === "#") api.dispatch({ type: "mailbox", mailbox: "trash" });
        else if (go[event.key]) api.dispatch({ type: "mailbox", mailbox: go[event.key] });
        return;
      }
      const list = api.visible;
      const ids = () => {
        if (api.selected.length) return api.selected;
        if (api.openThreadId) return [api.openThreadId];
        if (api.cursorId) return [api.cursorId];
        return [] as string[];
      };
      const move = (dir: 1 | -1) => {
        if (!list.length) return;
        const current = api.cursorId ?? api.openThreadId;
        const index = list.findIndex((thread) => thread.id === current);
        const nextIndex = Math.max(0, Math.min(list.length - 1, index < 0 ? 0 : index + dir));
        const next = list[nextIndex];
        const split = api.settings.readingPane && !narrowRef.current;
        if ((api.openThreadId && !split) || split) api.dispatch({ type: "open", id: next.id });
        else api.dispatch({ type: "cursor", id: next.id });
      };
      if (event.key === "g") {
        chord = true;
        window.clearTimeout(chordTimer);
        chordTimer = window.setTimeout(() => {
          chord = false;
        }, 900);
        return;
      }
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        move(1);
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "o" || event.key === "Enter") {
        const id = api.cursorId ?? list[0]?.id;
        if (id) api.dispatch({ type: "open", id });
      } else if (event.key === "u") api.dispatch({ type: "open", id: null });
      else if (event.key === "c") api.dispatch({ type: "compose", mode: "new" });
      else if (event.key === "x") {
        const id = api.cursorId ?? api.openThreadId ?? list[0]?.id;
        if (id) api.dispatch({ type: "select", id, shift: false, visibleIds: list.map((thread) => thread.id) });
      } else if (event.key === "s") {
        const chosen = ids();
        if (chosen.length) api.dispatch({ type: "star", ids: chosen });
      } else if (event.key === "e") {
        const chosen = ids();
        if (chosen.length) api.dispatch({ type: "archive", ids: chosen });
      } else if (event.key === "#") {
        const chosen = ids();
        if (!chosen.length) return;
        api.dispatch({ type: api.mailbox === "trash" ? "delete-forever" : "trash", ids: chosen });
      } else if (event.key === "r" && api.openThreadId) api.dispatch({ type: "compose", mode: "reply", threadId: api.openThreadId });
      else if (event.key === "a" && api.openThreadId) api.dispatch({ type: "compose", mode: "replyAll", threadId: api.openThreadId });
      else if (event.key === "f" && api.openThreadId) api.dispatch({ type: "compose", mode: "forward", threadId: api.openThreadId, popout: true });
      else if (event.key === "/") {
        event.preventDefault();
        if (narrowRef.current) api.dispatch({ type: "search-open", open: true });
        requestAnimationFrame(() => document.getElementById("mail-search")?.focus());
      } else if (event.key === "?") api.dispatch({ type: "dialog", dialog: { type: "shortcuts" } });
      else if (event.key === "I") {
        const chosen = ids();
        if (chosen.length) api.dispatch({ type: "read", ids: chosen, read: true });
      } else if (event.key === "U") {
        const chosen = ids();
        if (chosen.length) api.dispatch({ type: "read", ids: chosen, read: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const split = mail.settings.readingPane && !narrow && mail.mailbox !== "drafts" && mail.mailbox !== "scheduled";
  const threadOpen = Boolean(mail.openThreadId) && !split;

  return (
    <div className="shell">
      <Topbar />
      <div className="workspace">
        {narrow && mail.sideOpen && <button className="scrim" aria-label="Close menu" onClick={() => mail.dispatch({ type: "side", open: false })} />}
        <Sidebar />
        <main className="main" data-mailbox={mail.mailbox}>
          {!threadOpen && <Toolbar />}
          {mail.mailbox === "inbox" && !mail.query && !threadOpen && <CategoryTabs />}
          <div className={split ? "content split" : "content"}>
            {(split || !mail.openThreadId) && (
              <div className="list-pane">
                <MailList />
              </div>
            )}
            {(split || mail.openThreadId) && (
              <div className="thread-pane">
                {mail.openThreadId ? <ThreadView /> : <div className="empty"><Icon name="mail" size={48} /><h2>No conversation selected</h2><p>Choose a message, or press c to write one.</p></div>}
              </div>
            )}
          </div>
        </main>
      </div>
      <ComposeDock />
      <Overlays />
    </div>
  );
}

function Topbar() {
  const mail = useMail();
  const narrow = useNarrow();
  return (
    <header className="topbar">
      <button className="ib" aria-label="Main menu" onClick={() => mail.dispatch({ type: "side", open: !mail.sideOpen })}>
        <Icon name="menu" />
      </button>
      <h1 className="wordmark">Grok 4.7</h1>
      {(mail.searchOpen || !narrow) && (
        <form className={narrow ? "search overlay" : "search"} role="search" onSubmit={(event) => event.preventDefault()}>
          <Icon name="search" size={20} />
          <input
            id="mail-search"
            aria-label="Search mail"
            placeholder="Search mail"
            value={mail.query}
            onChange={(event) => mail.dispatch({ type: "query", query: event.target.value })}
            onFocus={() => mail.dispatch({ type: "search-open", open: true })}
          />
          <button
            className="ib sm"
            type="button"
            aria-label="Search options"
            data-menu-root
            onClick={() => mail.dispatch({ type: "menu", menu: mail.menu?.type === "search-tools" ? null : { type: "search-tools" } })}
          >
            <Icon name="tune" size={18} />
          </button>
          {mail.query && (
            <button className="ib sm" type="button" aria-label="Clear search" onClick={() => mail.dispatch({ type: "query", query: "" })}>
              <Icon name="close" size={18} />
            </button>
          )}
        </form>
      )}
      {narrow && !mail.searchOpen && (
        <button className="ib mobile-search" aria-label="Search" onClick={() => mail.dispatch({ type: "search-open", open: true })}>
          <Icon name="search" />
        </button>
      )}
      <div className="top-actions">
        <button className="ib" aria-label="Settings" onClick={() => mail.dispatch({ type: "dialog", dialog: { type: "settings" } })}>
          <Icon name="settings" />
        </button>
        <button className="ib" aria-label="Keyboard shortcuts" onClick={() => mail.dispatch({ type: "dialog", dialog: { type: "shortcuts" } })}>
          <Icon name="help" />
        </button>
        <button
          className="avatar-btn"
          style={{ background: colorFor(mail.me.email) }}
          aria-label={`Account: ${mail.me.name}`}
          data-menu-root
          onClick={() => mail.dispatch({ type: "menu", menu: mail.menu?.type === "account" ? null : { type: "account" } })}
        >
          {initials(mail.me.name)}
        </button>
      </div>
    </header>
  );
}

const NAV: { id: MailboxId; icon: string }[] = [
  { id: "inbox", icon: "inbox" },
  { id: "starred", icon: "star" },
  { id: "snoozed", icon: "clock" },
  { id: "sent", icon: "send" },
  { id: "drafts", icon: "file" },
  { id: "scheduled", icon: "calendar" },
  { id: "all", icon: "layers" },
  { id: "spam", icon: "spam" },
  { id: "trash", icon: "trash" },
];

function Sidebar() {
  const mail = useMail();
  const narrow = useNarrow();
  const countFor = (id: MailboxId) => {
    if (id === "inbox") return mail.counts.inbox;
    if (id === "drafts") return mail.counts.drafts;
    if (id === "scheduled") return mail.counts.scheduled;
    if (id === "snoozed") return mail.counts.snoozed;
    if (id === "spam") return mail.counts.spam;
    return 0;
  };
  return (
    <nav className={narrow && mail.sideOpen ? "side open" : "side"} aria-label="Mailboxes" hidden={narrow && !mail.sideOpen ? true : undefined}>
      <button className="compose-btn" onClick={() => mail.dispatch({ type: "compose", mode: "new" })}>
        <Icon name="pencil" />
        Compose
      </button>
      {NAV.filter((item) => item.id !== "scheduled" || mail.counts.scheduled > 0).map((item) => {
        const count = countFor(item.id);
        const active = mail.mailbox === item.id && !mail.query;
        return (
          <button key={item.id} className={active ? "nav-btn active" : "nav-btn"} aria-current={active ? "page" : undefined} onClick={() => mail.dispatch({ type: "mailbox", mailbox: item.id })}>
            <Icon name={item.icon} size={18} filled={item.id === "starred" && active} />
            <span className="label">{mailboxLabel(item.id, mail.labels)}</span>
            {count > 0 && <span className="badge">{count}</span>}
          </button>
        );
      })}
      <div className="side-label">
        Labels
        <button className="ib sm" aria-label="Create label" onClick={() => mail.dispatch({ type: "dialog", dialog: { type: "label" } })}>
          <Icon name="plus" size={16} />
        </button>
      </div>
      {mail.labels.map((label) => {
        const id = `label:${label.id}` as MailboxId;
        const active = mail.mailbox === id && !mail.query;
        return (
          <button key={label.id} className={active ? "nav-btn active" : "nav-btn"} onClick={() => mail.dispatch({ type: "mailbox", mailbox: id })}>
            <span className="dot" style={{ background: label.color }} />
            <span className="label">{label.name}</span>
          </button>
        );
      })}
    </nav>
  );
}

function CategoryTabs() {
  const mail = useMail();
  const tabs = [
    ["primary", "inbox", "Primary"],
    ["social", "people", "Social"],
    ["promotions", "tag", "Promotions"],
    ["updates", "alert", "Updates"],
  ] as const;
  return (
    <div className="tabs" role="tablist" aria-label="Categories">
      {tabs.map(([id, icon, label]) => {
        const count = mail.counts.categories[id];
        return (
          <button key={id} role="tab" aria-selected={mail.category === id} className={mail.category === id ? `tab ${id} active` : `tab ${id}`} onClick={() => mail.dispatch({ type: "category", category: id })}>
            <Icon name={icon} size={18} />
            {label}
            {count > 0 && <span className="count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function actionIds(mail: ReturnType<typeof useMail>, menu?: MenuState | null): string[] {
  if (menu && "ids" in menu && menu.ids?.length) return menu.ids;
  if (mail.selected.length) return mail.selected;
  if (mail.openThreadId) return [mail.openThreadId];
  if (mail.cursorId) return [mail.cursorId];
  return [];
}

function Toolbar() {
  const mail = useMail();
  const ids = mail.visible.map((thread) => thread.id);
  const selected = mail.selected;
  const active = selected.length ? selected : [];
  const all = ids.length > 0 && ids.every((id) => selected.includes(id));
  const some = ids.some((id) => selected.includes(id));
  const pageCount = mail.mailbox === "drafts" || mail.mailbox === "scheduled" ? mail.matchingDrafts.length : mail.visible.length;
  return (
    <div className="toolbar">
      <div className="check-wrap pop-anchor" data-menu-root>
        <input
          ref={(node) => {
            if (node) node.indeterminate = some && !all;
          }}
          type="checkbox"
          checked={all && ids.length > 0}
          aria-label="Select"
          onChange={() => mail.dispatch({ type: "select-many", ids: all ? [] : ids })}
        />
        <button className="ib sm" aria-label="Select conversations" aria-expanded={mail.menu?.type === "select"} onClick={() => mail.dispatch({ type: "menu", menu: mail.menu?.type === "select" ? null : { type: "select" } })}>
          <Icon name="chevron-down" size={16} />
        </button>
      </div>
      {active.length === 0 && (
        <button className="ib" aria-label="Check for new mail" onClick={() => mail.dispatch({ type: "check-mail" })}>
          <Icon name="refresh" />
        </button>
      )}
      {active.length > 0 && (
        <>
          <button className="ib" aria-label="Archive" onClick={() => mail.dispatch({ type: "archive", ids: active })}><Icon name="archive" /></button>
          <button className="ib" aria-label="Report spam" onClick={() => mail.dispatch({ type: "spam", ids: active, spam: mail.mailbox !== "spam" })}><Icon name="spam" /></button>
          <button className="ib" aria-label="Delete" onClick={() => mail.dispatch({ type: mail.mailbox === "trash" ? "delete-forever" : "trash", ids: active })}><Icon name="trash" /></button>
          <button className="ib" aria-label="Mark as read" onClick={() => mail.dispatch({ type: "read", ids: active, read: true })}><Icon name="mail" /></button>
          <span className="pop-anchor" data-menu-root>
            <button className="ib" aria-label="Snooze" onClick={() => mail.dispatch({ type: "menu", menu: { type: "snooze", ids: active } })}><Icon name="clock" /></button>
          </span>
          <span className="pop-anchor" data-menu-root>
            <button className="ib" aria-label="Move to" onClick={() => mail.dispatch({ type: "menu", menu: { type: "move", ids: active } })}><Icon name="archive" /></button>
          </span>
          <span className="pop-anchor" data-menu-root>
            <button className="ib" aria-label="Label" onClick={() => mail.dispatch({ type: "menu", menu: { type: "labels", ids: active } })}><Icon name="tag" /></button>
          </span>
        </>
      )}
      {mail.mailbox === "trash" && mail.visible.length > 0 && (
        <button className="btn ghost" onClick={() => mail.dispatch({ type: "dialog", dialog: { type: "confirm", title: "Empty trash?", body: "Every conversation in Trash will be deleted permanently. You can still undo it for a few seconds.", confirm: "Empty trash", danger: true, intent: { type: "empty-trash" } } })}>Empty trash</button>
      )}
      {mail.mailbox === "spam" && (
        <button className="btn ghost" onClick={() => mail.dispatch({ type: "dialog", dialog: { type: "confirm", title: "Empty spam?", body: "Every conversation in Spam will be deleted permanently.", confirm: "Delete all spam", danger: true, intent: { type: "empty-spam" } } })}>Delete all spam</button>
      )}
      <button className={mail.unreadOnly ? "btn ghost on" : "btn ghost"} aria-pressed={mail.unreadOnly} onClick={() => mail.dispatch({ type: "unread-only", value: !mail.unreadOnly })}>
        Unread
      </button>
      <span className="box-title mobile-only">{mail.query ? "Search" : mailboxLabel(mail.mailbox, mail.labels)}</span>
      <span className="grow" />
      <div className="pager">
        <span>{pageCount === 0 ? "0" : `1–${pageCount}`} of {pageCount}</span>
        <button className="ib sm" aria-label="Newer" disabled><Icon name="chevron-left" size={18} /></button>
        <button className="ib sm" aria-label="Older" disabled><Icon name="chevron-right" size={18} /></button>
      </div>
    </div>
  );
}

export function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query.trim().split(/\s+/).filter((term) => term.length > 1 && !term.includes(":"));
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, index) =>
        terms.some((term) => part.toLowerCase() === term.toLowerCase()) ? <mark key={index}>{part}</mark> : <span key={index}>{part}</span>,
      )}
    </>
  );
}

export function rowSnippet(thread: Parameters<typeof latestMessage>[0]): string {
  const latest = latestMessage(thread);
  return snippetOf(latest.body);
}

export function Avatar({ name, email, size = 32 }: { name: string; email: string; size?: number }) {
  return (
    <span className="avatar-btn" style={{ background: colorFor(email), width: size, height: size, fontSize: Math.max(10, size * 0.36) }} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function formatWhen(iso: string, now: number): string {
  return formatListDate(iso, new Date(now));
}
