import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  ChevronDown, ChevronLeft, ChevronRight, RotateCw, MoreVertical, Star, Archive, Trash2, MailOpen, Mail, Clock,
  Inbox, Tag, Users, Info, Paperclip, ChevronRight as Chevron, GripVertical, Bookmark, CheckCheck, X, Image as ImageIcon,
  FileText, Sheet, Presentation, FileArchive, Calendar, File as FileIcon, Send, Search,
} from "lucide-react";
import { useMail } from "../lib/store";
import { navigate, useRoute, listRoute } from "../lib/router";
import { useThreadList, visibleRows } from "../lib/hooks";
import { VIEW_TITLES, highlightTerms, isSnoozed, sortKey, parseQuery } from "../lib/query";
import { ME, displayName, firstName, isMe, kindColor, listDate, shortDateTime, stripHtml } from "../lib/format";
import type { Attachment, Category, Draft, Route, Thread } from "../lib/types";
import { Avatar, Checkbox, IconButton, MenuItem, MenuDivider, Popover, useAnchor, useIsMobile } from "./ui";
import { ConversationActions } from "./Actions";
import { SnoozeMenu } from "./menus";
import { DRAG_TYPE } from "./Sidebar";
import { runSearch } from "./TopBar";

const TABS: { cat: Category; label: string; icon: ReactNode; color: string }[] = [
  { cat: "primary", label: "Primary", icon: <Inbox size={20} />, color: "var(--primary)" },
  { cat: "promotions", label: "Promotions", icon: <Tag size={20} />, color: "#188038" },
  { cat: "social", label: "Social", icon: <Users size={20} />, color: "#1a73e8" },
  { cat: "updates", label: "Updates", icon: <Info size={20} />, color: "#e8710a" },
];

export function AttachmentIcon({ a, size = 16 }: { a: Attachment; size?: number }) {
  const color = kindColor[a.kind];
  const Icon = {
    image: ImageIcon, pdf: FileText, doc: FileText, sheet: Sheet, slides: Presentation, zip: FileArchive, calendar: Calendar, other: FileIcon,
  }[a.kind];
  return <Icon size={size} style={{ color }} className="shrink-0" />;
}

function Marked({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-[#fde293] px-px text-[#1f1f1f]">{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function participants(t: Thread, view: Route["view"]): ReactNode {
  if (view === "sent" || (t.messages.every((m) => isMe(m.from)))) {
    const to = t.messages[t.messages.length - 1].to;
    return <span>To: {to.map((c) => firstName(c)).join(", ") || "(no recipients)"}</span>;
  }
  const seen: { c: typeof ME; unread: boolean }[] = [];
  t.messages.forEach((m, i) => {
    const existing = seen.find((s) => s.c.email === m.from.email);
    const unread = t.unread && i === t.messages.length - 1;
    if (existing) existing.unread ||= unread;
    else seen.push({ c: m.from, unread });
  });
  const shown = seen.length > 3 ? [seen[0], seen[seen.length - 2], seen[seen.length - 1]] : seen;
  const single = shown.length === 1;
  return (
    <>
      {shown.map((s, i) => (
        <span key={s.c.email + i} className={clsx(t.unread && (s.unread || single) ? "font-bold" : "")}>
          {i > 0 && (seen.length > 3 && i === 1 ? " .. " : ", ")}
          {single ? displayName(s.c) : firstName(s.c)}
        </span>
      ))}
      {t.messages.length > 1 && <span className="ml-1 text-xs font-normal text-ink-3">{t.messages.length}</span>}
    </>
  );
}

function LabelChips({ t, route, max = 3 }: { t: Thread; route: Route; max?: number }) {
  const labels = useMail((s) => s.labels);
  const chips = t.labelIds
    .filter((id) => !(route.view === "label" && route.labelId === id))
    .map((id) => labels.find((l) => l.id === id))
    .filter(Boolean)
    .slice(0, max);
  const showInbox = (route.view === "search" || route.view === "starred" || route.view === "all" || route.view === "important") && t.inInbox && !t.trashed && !t.spam;
  return (
    <>
      {showInbox && (
        <span className="mr-1 shrink-0 rounded bg-chip px-1.5 py-px text-xs text-ink-2">Inbox</span>
      )}
      {chips.map((l) => (
        <span
          key={l!.id}
          className="mr-1 shrink-0 rounded px-1.5 py-px text-xs font-medium"
          style={{ background: l!.color + "2a", color: l!.color }}
        >
          {l!.name}
        </span>
      ))}
    </>
  );
}

interface RowProps {
  t: Thread;
  route: Route;
  selected: boolean;
  cursor: boolean;
  active: boolean;
  hasDraft: boolean;
  density: string;
  terms: string[];
  now: number;
  onCheck: (id: string, v: boolean, shift: boolean) => void;
  onOpen: (id: string) => void;
  selectedIds: string[];
}

const ThreadRow = memo(function ThreadRow({
  t, route, selected, cursor, active, hasDraft, density, terms, now, onCheck, onOpen, selectedIds,
}: RowProps) {
  const a = useMail.getState;
  const snooze = useAnchor();
  const last = t.messages[t.messages.length - 1];
  const snippet = useMemo(() => stripHtml(last.html).slice(0, 220), [last.html]);
  const atts = t.messages.flatMap((m) => m.attachments);
  const snoozed = isSnoozed(t, now);
  const showChips = density === "default" && atts.length > 0;

  return (
    <div
      role="row"
      aria-selected={selected}
      data-thread-row={t.id}
      draggable
      onDragStart={(e) => {
        const ids = selectedIds.includes(t.id) ? selectedIds : [t.id];
        e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(ids));
        e.dataTransfer.effectAllowed = "move";
        const ghost = document.createElement("div");
        ghost.textContent = ids.length === 1 ? t.subject : `Move ${ids.length} conversations`;
        ghost.style.cssText =
          "position:fixed;top:-100px;left:0;padding:8px 14px;border-radius:8px;background:#0b57d0;color:#fff;font:500 13px system-ui;max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 10, 10);
        setTimeout(() => ghost.remove(), 0);
      }}
      onClick={() => onOpen(t.id)}
      className={clsx(
        "group/row relative flex cursor-pointer border-b border-divider pl-1 pr-3 text-sm transition-shadow",
        density === "compact" ? "min-h-8" : "min-h-10",
        showChips ? "flex-col" : "items-center",
        selected || active ? "bg-selected" : t.unread ? "bg-row-unread" : "bg-row-read",
        "hover:z-[1] hover:shadow-rowhover",
      )}
    >
      {cursor && <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
      <div className={clsx("flex w-full items-center", showChips && "h-10")}>
        <div className="flex shrink-0 items-center">
          <GripVertical size={14} className="-mr-1 text-ink-3 opacity-0 group-hover/row:opacity-60" />
          <Checkbox
            checked={selected}
            label={`Select ${t.subject}`}
            onChange={(v, e) => onCheck(t.id, v, e.shiftKey)}
            className={density === "compact" ? "h-8 w-8" : ""}
          />
          <button
            data-tip={t.starred ? "Starred" : "Not starred"}
            aria-label={t.starred ? "Unstar" : "Star"}
            onClick={(e) => {
              e.stopPropagation();
              a().setStarred([t.id], !t.starred);
            }}
            className={clsx("flex h-8 w-8 items-center justify-center rounded-full hover:bg-hover", density === "compact" ? "" : "-ml-1")}
          >
            <Star size={18} className={t.starred ? "fill-star text-star" : "text-ink-3"} strokeWidth={t.starred ? 1.5 : 2} />
          </button>
          <button
            data-tip={t.important ? "Important" : "Mark as important"}
            aria-label={t.important ? "Mark not important" : "Mark important"}
            onClick={(e) => {
              e.stopPropagation();
              a().setImportant([t.id], !t.important);
            }}
            className="hidden h-8 w-7 items-center justify-center rounded-full hover:bg-hover lg:flex"
          >
            <Bookmark size={16} className={t.important ? "fill-star text-star" : "text-ink-3 opacity-0 group-hover/row:opacity-100"} />
          </button>
        </div>
        <div className={clsx("w-[168px] shrink-0 truncate pl-1 pr-4 xl:w-[200px]", t.unread ? "text-ink" : "text-ink")}>
          {participants(t, route.view)}
          {hasDraft && <span className="ml-1 text-danger">Draft</span>}
        </div>
        <div className="flex min-w-0 flex-1 items-center">
          <LabelChips t={t} route={route} />
          {t.muted && <span className="mr-1 shrink-0 rounded bg-chip px-1.5 py-px text-xs text-ink-2">Muted</span>}
          <span className="truncate">
            <span className={clsx(t.unread && "font-bold")}>
              <Marked text={t.subject} terms={terms} />
            </span>
            <span className="text-ink-3">
              {" "}
              - <Marked text={snippet} terms={terms} />
            </span>
          </span>
        </div>
        {!showChips && atts.length > 0 && <Paperclip size={15} className="ml-2 shrink-0 text-ink-3" />}
        <div className="relative ml-3 flex w-[84px] shrink-0 justify-end">
          <span
            className={clsx(
              "text-xs group-hover/row:invisible",
              t.unread ? "font-bold text-ink" : "text-ink-2",
              snoozed && "text-[#b06000]",
            )}
          >
            {snoozed ? shortDateTime(t.snoozedUntil!, now).replace(/^.*?, /, "") : listDate(sortKey(t), now)}
          </span>
          <div className="absolute -right-2 top-1/2 hidden -translate-y-1/2 items-center group-hover/row:flex" onClick={(e) => e.stopPropagation()}>
            {t.trashed || t.spam ? (
              <IconButton size="sm" tip="Move to Inbox" onClick={() => a().moveToInbox([t.id])}>
                <Inbox size={18} />
              </IconButton>
            ) : t.inInbox && !snoozed ? (
              <IconButton size="sm" tip="Archive" onClick={() => a().archive([t.id])}>
                <Archive size={18} />
              </IconButton>
            ) : (
              <IconButton size="sm" tip="Move to Inbox" onClick={() => a().moveToInbox([t.id])}>
                <Inbox size={18} />
              </IconButton>
            )}
            <IconButton size="sm" tip={t.trashed ? "Delete forever" : "Delete"} onClick={() => (t.trashed ? a().deleteForever([t.id]) : a().trash([t.id]))}>
              <Trash2 size={18} />
            </IconButton>
            <IconButton size="sm" tip={t.unread ? "Mark as read" : "Mark as unread"} onClick={() => a().setUnread([t.id], !t.unread, true)}>
              {t.unread ? <MailOpen size={18} /> : <Mail size={18} />}
            </IconButton>
            {!t.trashed && !t.spam && (
              <IconButton size="sm" tip="Snooze" onClick={snooze.open}>
                <Clock size={18} />
              </IconButton>
            )}
          </div>
        </div>
      </div>
      {showChips && (
        <div className="-mt-1 flex gap-2 pb-2 pl-[calc(168px+118px)] xl:pl-[calc(200px+118px)]">
          {atts.slice(0, 3).map((att) => (
            <button
              key={att.id}
              onClick={(e) => {
                e.stopPropagation();
                a().set({ preview: { attachment: att, list: atts } });
              }}
              className="flex h-8 max-w-[190px] items-center gap-2 rounded-full border border-line bg-surface px-3 text-[13px] text-ink-2 hover:bg-hover"
            >
              <AttachmentIcon a={att} />
              <span className="truncate">{att.name}</span>
            </button>
          ))}
          {atts.length > 3 && (
            <span className="flex h-8 items-center rounded-full border border-line px-3 text-[13px] text-ink-2">+{atts.length - 3}</span>
          )}
        </div>
      )}
      <Popover anchor={snooze.anchor} onClose={snooze.close}>
        <SnoozeMenu ids={[t.id]} onDone={snooze.close} />
      </Popover>
    </div>
  );
});

const MobileRow = memo(function MobileRow({
  t, route, selected, active, cursor, hasDraft, terms, now, onCheck, onOpen,
}: RowProps) {
  const a = useMail.getState;
  const last = t.messages[t.messages.length - 1];
  const snippet = stripHtml(last.html).slice(0, 160);
  const sender = t.messages.every((m) => isMe(m.from)) ? last.to[0] ?? ME : [...t.messages].reverse().find((m) => !isMe(m.from))?.from ?? last.from;
  const pressTimer = useRef<number | undefined>(undefined);
  const atts = t.messages.flatMap((m) => m.attachments);
  return (
    <div
      role="row"
      aria-selected={selected}
      data-thread-row={t.id}
      onClick={() => onOpen(t.id)}
      onTouchStart={() => {
        pressTimer.current = window.setTimeout(() => {
          onCheck(t.id, !selected, false);
          pressTimer.current = undefined;
          navigator.vibrate?.(10);
        }, 480);
      }}
      onTouchEnd={(e) => {
        if (pressTimer.current === undefined) e.preventDefault();
        clearTimeout(pressTimer.current);
      }}
      onTouchMove={() => clearTimeout(pressTimer.current)}
      className={clsx(
        "relative flex cursor-pointer gap-3 px-4 py-2.5 active:bg-hover",
        selected || active ? "bg-selected" : "hover:bg-hover",
      )}
    >
      {cursor && <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
      <button
        aria-label={selected ? "Deselect" : "Select"}
        onClick={(e) => {
          e.stopPropagation();
          onCheck(t.id, !selected, false);
        }}
        className="mt-0.5 shrink-0"
      >
        {selected ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary">
            <CheckCheck size={20} />
          </div>
        ) : (
          <Avatar contact={sender} size={40} />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={clsx("min-w-0 flex-1 truncate text-[15px]", t.unread ? "font-bold text-ink" : "text-ink-2")}>
            {participants(t, route.view)}
            {hasDraft && <span className="ml-1 text-danger">Draft</span>}
          </span>
          <span className={clsx("shrink-0 text-xs", t.unread ? "font-bold text-ink" : "text-ink-2")}>{listDate(sortKey(t), now)}</span>
        </div>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className={clsx("truncate text-sm", t.unread ? "font-bold text-ink" : "text-ink-2")}>
              <Marked text={t.subject} terms={terms} />
            </div>
            <div className="truncate text-sm text-ink-3">
              <Marked text={snippet} terms={terms} />
            </div>
            {(t.labelIds.length > 0 || atts.length > 0) && (
              <div className="mt-1 flex items-center gap-1 overflow-hidden">
                {atts.length > 0 && (
                  <span className="flex max-w-[160px] items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs text-ink-2">
                    <AttachmentIcon a={atts[0]} size={13} />
                    <span className="truncate">{atts[0].name}</span>
                  </span>
                )}
                <LabelChips t={t} route={route} max={2} />
              </div>
            )}
          </div>
          <button
            aria-label={t.starred ? "Unstar" : "Star"}
            onClick={(e) => {
              e.stopPropagation();
              a().setStarred([t.id], !t.starred);
            }}
            className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center"
          >
            <Star size={20} className={t.starred ? "fill-star text-star" : "text-ink-3"} />
          </button>
        </div>
      </div>
    </div>
  );
});

function SelectMenu({ list }: { list: Thread[] }) {
  const m = useAnchor();
  const setSelected = useMail((s) => s.setSelected);
  const pick = (f: (t: Thread) => boolean) => {
    setSelected(list.filter(f).map((t) => t.id));
    m.close();
  };
  return (
    <>
      <button aria-label="Select options" onClick={m.open} className="-ml-2.5 flex h-8 w-5 items-center justify-center rounded hover:bg-hover">
        <ChevronDown size={14} />
      </button>
      <Popover anchor={m.anchor} onClose={m.close} className="w-40">
        <MenuItem autoFocus label="All" onClick={() => pick(() => true)} />
        <MenuItem label="None" onClick={() => pick(() => false)} />
        <MenuItem label="Read" onClick={() => pick((t) => !t.unread)} />
        <MenuItem label="Unread" onClick={() => pick((t) => t.unread)} />
        <MenuItem label="Starred" onClick={() => pick((t) => t.starred)} />
        <MenuItem label="Unstarred" onClick={() => pick((t) => !t.starred)} />
      </Popover>
    </>
  );
}

function ListMoreMenu({ list, route }: { list: Thread[]; route: Route }) {
  const m = useAnchor();
  const a = useMail.getState;
  return (
    <>
      <IconButton tip="More" onClick={m.open}>
        <MoreVertical size={20} />
      </IconButton>
      <Popover anchor={m.anchor} onClose={m.close} className="w-56">
        <MenuItem
          autoFocus
          label="Mark all as read"
          disabled={!list.some((t) => t.unread)}
          onClick={() => {
            m.close();
            a().setUnread(list.filter((t) => t.unread).map((t) => t.id), false);
          }}
        />
        {(route.view === "trash" || route.view === "spam") && (
          <MenuItem
            label={`Empty ${route.view === "trash" ? "Trash" : "Spam"}`}
            danger
            disabled={!list.length}
            onClick={() => {
              m.close();
              if (confirm(`Delete all ${list.length} conversations forever?`)) a().emptyFolder(route.view as "trash" | "spam");
            }}
          />
        )}
        <MenuDivider />
        <MenuItem label="Check for new mail" onClick={() => { m.close(); a().refresh(); }} />
      </Popover>
    </>
  );
}

function Pager({ page, setPage, total, size }: { page: number; setPage: (n: number) => void; total: number; size: number }) {
  const start = total === 0 ? 0 : page * size + 1;
  const end = Math.min(total, (page + 1) * size);
  return (
    <div className="ml-auto flex items-center text-xs text-ink-2">
      <span className="px-2">
        {start}–{end} of {total.toLocaleString()}
      </span>
      <IconButton size="sm" tip="Newer" disabled={page === 0} onClick={() => setPage(page - 1)}>
        <ChevronLeft size={18} />
      </IconButton>
      <IconButton size="sm" tip="Older" disabled={end >= total} onClick={() => setPage(page + 1)}>
        <ChevronRight size={18} />
      </IconButton>
    </div>
  );
}

function CategoryTabs({ route, compact }: { route: Route; compact?: boolean }) {
  const threads = useMail((s) => s.threads);
  const now = useMail((s) => s.now);
  const current = route.category ?? "primary";
  const info = useMemo(() => {
    const out: Record<string, { unread: number; senders: string[] }> = {};
    for (const tab of TABS) {
      const list = Object.values(threads)
        .filter((t) => t.inInbox && !t.trashed && !t.spam && !isSnoozed(t, now) && t.category === tab.cat && t.unread)
        .sort((x, y) => sortKey(y) - sortKey(x));
      out[tab.cat] = {
        unread: list.length,
        senders: [...new Set(list.map((t) => t.messages[t.messages.length - 1].from.name))].slice(0, 3),
      };
    }
    return out;
  }, [threads, now]);
  return (
    <div role="tablist" className="flex border-b border-divider" onDragOver={(e) => e.preventDefault()}>
      {TABS.map((tab) => {
        const active = tab.cat === current;
        const i = info[tab.cat];
        return (
          <button
            key={tab.cat}
            role="tab"
            aria-selected={active}
            onClick={() => navigate({ view: "inbox", category: tab.cat })}
            onDragOver={(e) => e.dataTransfer.types.includes(DRAG_TYPE) && e.preventDefault()}
            onDrop={(e) => {
              const raw = e.dataTransfer.getData(DRAG_TYPE);
              if (!raw) return;
              const ids: string[] = JSON.parse(raw);
              useMail.setState((s) => {
                const th = { ...s.threads };
                for (const id of ids) th[id] = { ...th[id], category: tab.cat };
                return { threads: th, selected: [] };
              });
              useMail.getState().toast({ text: `${ids.length === 1 ? "Conversation" : ids.length + " conversations"} moved to ${tab.label}.` });
            }}
            data-tip={compact ? `${tab.label}${i.unread && tab.cat !== "primary" ? ` · ${i.unread} new` : ""}` : undefined}
            className={clsx(
              "relative flex h-14 min-w-0 flex-1 items-center gap-4 text-left text-sm hover:bg-hover lg:max-w-[250px]",
              compact ? "justify-center px-2" : "px-4",
              active ? "font-medium" : "text-ink-2",
            )}
            style={active ? { color: tab.color } : undefined}
          >
            <span className="relative shrink-0">
              {tab.icon}
              {compact && tab.cat !== "primary" && i.unread > 0 && (
                <span className="absolute -right-2 -top-1.5 rounded-full px-1 text-[10px] font-semibold leading-4 text-white" style={{ background: tab.color }}>
                  {i.unread}
                </span>
              )}
            </span>
            <span className={clsx("min-w-0 flex-1", compact && "hidden")}>
              <span className="flex items-center gap-2">
                <span className="truncate">{tab.label}</span>
                {tab.cat !== "primary" && i.unread > 0 && (
                  <span className="shrink-0 rounded-full px-2 text-[11px] font-medium leading-[18px] text-white" style={{ background: tab.color }}>
                    {i.unread} new
                  </span>
                )}
              </span>
              {tab.cat !== "primary" && i.unread > 0 && !active && (
                <span className="block truncate text-xs font-normal text-ink-3">{i.senders.join(", ")}</span>
              )}
            </span>
            {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t" style={{ background: tab.color }} />}
          </button>
        );
      })}
    </div>
  );
}

function SearchChips({ query }: { query: string }) {
  const toggles: { label: string; token: string }[] = [
    { label: "Has attachment", token: "has:attachment" },
    { label: "Is unread", token: "is:unread" },
    { label: "Starred", token: "is:starred" },
    { label: "Last 7 days", token: "newer_than:7d" },
    { label: "From me", token: "from:me" },
  ];
  const tokens = query.split(/\s+/);
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2">
      {toggles.map((t) => {
        const on = tokens.includes(t.token);
        return (
          <button
            key={t.token}
            onClick={() => runSearch(on ? tokens.filter((x) => x !== t.token).join(" ") || "in:anywhere" : `${query} ${t.token}`)}
            className={clsx(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm",
              on ? "border-transparent bg-nav-active text-nav-active-ink" : "border-line text-ink-2 hover:bg-hover",
            )}
          >
            {on && <X size={14} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

const EMPTY: Record<string, { title: string; body: string }> = {
  inbox: { title: "You're all caught up", body: "No new mail here. Enjoy the quiet." },
  starred: { title: "No starred messages", body: "Stars let you give messages a special status to make them easier to find. To star a message, click on the star next to any message or conversation." },
  snoozed: { title: "Nothing snoozed", body: "Snooze a conversation to remove it from your inbox until the time you pick." },
  important: { title: "No important messages", body: "Mark conversations as important to see them here." },
  sent: { title: "No sent messages!", body: "Send one now." },
  drafts: { title: "You don't have any saved drafts.", body: "Saving a draft allows you to keep a message you aren't ready to send yet." },
  scheduled: { title: "Nothing scheduled", body: "Use the arrow next to Send in compose to schedule a message." },
  all: { title: "No conversations", body: "" },
  spam: { title: "Hooray, no spam here!", body: "" },
  trash: { title: "No conversations in Trash.", body: "" },
  label: { title: "There are no conversations with this label.", body: "" },
  search: { title: "No messages matched your search.", body: "Try using search options such as sender, date, or attachment." },
};

function EmptyState({ view }: { view: string }) {
  const e = EMPTY[view] ?? EMPTY.all;
  return (
    <div className="anim-fade flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-search text-ink-3">
        {view === "search" ? <Search size={34} /> : view === "sent" ? <Send size={34} /> : <Inbox size={34} />}
      </div>
      <div className="text-base text-ink">{e.title}</div>
      {e.body && <div className="mt-2 max-w-md text-sm text-ink-3">{e.body}</div>}
    </div>
  );
}

function DraftRows({ route, mobile }: { route: Route; mobile: boolean }) {
  const drafts = useMail((s) => s.drafts);
  const now = useMail((s) => s.now);
  const a = useMail.getState;
  const [sel, setSel] = useState<string[]>([]);
  const scheduled = route.view === "scheduled";
  const list = useMemo(
    () =>
      Object.values(drafts)
        .filter((d) => !d.sending && (scheduled ? !!d.scheduledAt : !d.scheduledAt))
        .sort((x, y) => (scheduled ? x.scheduledAt! - y.scheduledAt! : y.updatedAt - x.updatedAt)),
    [drafts, scheduled],
  );
  const open = (d: Draft) => {
    if (d.scheduledAt) a().cancelSchedule(d.id);
    if (d.threadId && a().threads[d.threadId] && !d.scheduledAt) navigate({ view: "inbox", threadId: d.threadId });
    else a().openCompose(d.id);
  };
  const all = list.length > 0 && sel.length === list.length;
  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-1 px-2 md:px-4">
        <Checkbox
          checked={all}
          indeterminate={sel.length > 0 && !all}
          label="Select all"
          onChange={(v) => setSel(v ? list.map((d) => d.id) : [])}
        />
        {sel.length > 0 ? (
          <button
            className="ml-2 rounded-full px-4 py-1.5 text-sm font-medium text-primary hover:bg-hover"
            onClick={() => {
              for (const id of sel) a().discardDraft(id);
              a().toast({ text: scheduled ? "Scheduled messages canceled and deleted." : `${sel.length === 1 ? "Draft" : sel.length + " drafts"} discarded.` });
              setSel([]);
            }}
          >
            {scheduled ? "Cancel & delete" : "Discard drafts"}
          </button>
        ) : (
          <IconButton tip="Refresh" onClick={() => a().refresh()}>
            <RotateCw size={18} />
          </IconButton>
        )}
        <div className="ml-auto pr-2 text-xs text-ink-2">
          {list.length ? `1–${list.length} of ${list.length}` : ""}
        </div>
      </div>
      {scheduled && list.length > 0 && (
        <div className="border-b border-divider bg-search px-6 py-2.5 text-center text-sm text-ink-2">
          Opening a scheduled message cancels its send so you can edit it.
        </div>
      )}
      {list.length === 0 && <EmptyState view={route.view} />}
      {list.map((d) => {
        const recips = [...d.to, ...d.cc].map((c) => firstName(c)).join(", ");
        const snippet = stripHtml(d.html.replace(/<div data-signature[\s\S]*?<\/div>/, "")).slice(0, 180);
        const checked = sel.includes(d.id);
        return (
          <div
            key={d.id}
            onClick={() => open(d)}
            className={clsx(
              "group/row flex cursor-pointer items-center border-b border-divider pr-3 text-sm hover:z-[1] hover:shadow-rowhover",
              checked ? "bg-selected" : "bg-row-unread",
              mobile ? "py-2 pl-2" : "min-h-10 pl-2",
            )}
          >
            <Checkbox checked={checked} label="Select" onChange={(v) => setSel(v ? [...sel, d.id] : sel.filter((x) => x !== d.id))} />
            <div className={clsx("shrink-0 truncate pr-4", mobile ? "w-28" : "w-[200px]")}>
              {scheduled ? <span>To: {recips || "(no recipients)"}</span> : <><span className="text-danger">Draft</span>{recips && <span className="text-ink-2">, {recips}</span>}</>}
            </div>
            <div className="min-w-0 flex-1 truncate">
              <span>{d.subject || "(no subject)"}</span>
              <span className="text-ink-3"> - {snippet}</span>
            </div>
            <div className="relative ml-3 shrink-0 text-right text-xs">
              <span className={clsx("group-hover/row:invisible", scheduled ? "text-[#b06000]" : "text-ink-2")}>
                {scheduled ? shortDateTime(d.scheduledAt!, now) : listDate(d.updatedAt, now)}
              </span>
              <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 group-hover/row:flex" onClick={(e) => e.stopPropagation()}>
                {scheduled && (
                  <button className="mr-1 rounded-full px-3 py-1 text-xs font-medium text-primary hover:bg-hover" onClick={() => a().cancelSchedule(d.id)}>
                    Cancel send
                  </button>
                )}
                <IconButton
                  size="sm"
                  tip={scheduled ? "Delete" : "Discard draft"}
                  onClick={() => {
                    a().discardDraft(d.id);
                    a().toast({ text: "Draft discarded." });
                  }}
                >
                  <Trash2 size={18} />
                </IconButton>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function MailList({ compactPane }: { compactPane?: boolean }) {
  const route = useRoute();
  const isMobile = useIsMobile();
  const list = useThreadList(route);
  const selected = useMail((s) => s.selected);
  const cursorId = useMail((s) => s.cursorId);
  const drafts = useMail((s) => s.drafts);
  const settings = useMail((s) => s.settings);
  const labels = useMail((s) => s.labels);
  const now = useMail((s) => s.now);
  const refreshing = useMail((s) => s.refreshing);
  const a = useMail.getState;
  const [page, setPage] = useState(0);
  const lastChecked = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lr = listRoute(route);
  const listKey = `${lr.view}|${lr.category}|${lr.labelId}|${lr.query}`;

  useEffect(() => {
    setPage(0);
    scrollRef.current?.scrollTo(0, 0);
  }, [listKey]);

  const size = settings.pageSize;
  const maxPage = Math.max(0, Math.ceil(list.length / size) - 1);
  const pg = Math.min(page, maxPage);
  const rows = list.slice(pg * size, (pg + 1) * size);
  visibleRows.ids = rows.map((t) => t.id);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visibleSelected = rows.filter((t) => selectedSet.has(t.id)).map((t) => t.id);
  const allChecked = rows.length > 0 && visibleSelected.length === rows.length;
  const draftThreads = useMemo(() => new Set(Object.values(drafts).filter((d) => d.threadId && !d.scheduledAt && !d.sending).map((d) => d.threadId!)), [drafts]);
  const terms = useMemo(() => (route.view === "search" ? highlightTerms(route.query ?? "") : []), [route.view, route.query]);

  useEffect(() => {
    if (!cursorId) return;
    const el = scrollRef.current?.querySelector(`[data-thread-row="${CSS.escape(cursorId)}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursorId]);

  const onCheck = (id: string, v: boolean, shift: boolean) => {
    const cur = a().selected;
    if (shift && lastChecked.current) {
      const ids = rows.map((t) => t.id);
      const i1 = ids.indexOf(lastChecked.current);
      const i2 = ids.indexOf(id);
      if (i1 >= 0 && i2 >= 0) {
        const range = ids.slice(Math.min(i1, i2), Math.max(i1, i2) + 1);
        a().setSelected(v ? [...new Set([...cur, ...range])] : cur.filter((x) => !range.includes(x)));
        lastChecked.current = id;
        return;
      }
    }
    lastChecked.current = id;
    a().setSelected(v ? [...cur, id] : cur.filter((x) => x !== id));
  };
  const onOpen = (id: string) => {
    if (isMobile && a().selected.length > 0) {
      onCheck(id, !a().selected.includes(id), false);
      return;
    }
    a().setCursor(id);
    navigate({ ...lr, threadId: id });
  };

  const isDraftView = route.view === "drafts" || route.view === "scheduled";
  const label = route.view === "label" ? labels.find((l) => l.id === route.labelId) : undefined;
  const title =
    route.view === "search" ? "Search results" : route.view === "label" ? label?.name ?? "Label" : route.view === "inbox" && settings.inboxTabs && isMobile ? TABS.find((t) => t.cat === (route.category ?? "primary"))!.label : VIEW_TITLES[route.view as keyof typeof VIEW_TITLES];

  const Row = isMobile || compactPane ? MobileRow : ThreadRow;
  const unreadInView = list.filter((t) => t.unread).length;

  return (
    <div className="flex h-full min-w-0 flex-col">
      {!isMobile && (
        <div className="flex h-12 shrink-0 items-center gap-1 pl-2 pr-2">
          {!isDraftView && (
            <>
              <div className="flex items-center">
                <Checkbox
                  checked={allChecked}
                  indeterminate={visibleSelected.length > 0 && !allChecked}
                  label="Select all"
                  onChange={(v) => a().setSelected(v ? rows.map((t) => t.id) : [])}
                />
                <SelectMenu list={rows} />
              </div>
              {visibleSelected.length > 0 ? (
                <>
                  <ConversationActions ids={visibleSelected} route={route} />
                  {!compactPane && <span className="ml-2 text-xs text-ink-2">{visibleSelected.length} selected</span>}
                </>
              ) : (
                <>
                  <IconButton tip="Refresh" onClick={() => a().refresh()}>
                    <RotateCw size={18} className={refreshing ? "anim-spin" : ""} />
                  </IconButton>
                  <ListMoreMenu list={list} route={route} />
                </>
              )}
              <Pager page={pg} setPage={setPage} total={list.length} size={size} />
            </>
          )}
        </div>
      )}

      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto" role="grid" aria-label={title}>
        {route.view === "inbox" && settings.inboxTabs && !isMobile && <CategoryTabs route={route} compact={compactPane} />}
        {route.view === "search" && <SearchChips query={route.query ?? ""} />}
        {isMobile && (
          <div className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-2">
            <h1 className="font-display text-base text-ink">Claude Opus 5.5</h1>
            <span className="truncate text-xs text-ink-3">
              {title}
              {!isDraftView && unreadInView > 0 && ` · ${unreadInView} unread`}
            </span>
          </div>
        )}
        {(route.view === "trash" || route.view === "spam") && list.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-divider bg-search px-4 py-2.5 text-center text-sm text-ink-2">
            {route.view === "trash"
              ? "Messages that have been in Trash more than 30 days will be automatically deleted."
              : "Messages that have been in Spam more than 30 days will be automatically deleted."}
            <button
              className="rounded-full px-3 py-1 font-medium text-primary hover:bg-hover"
              onClick={() => confirm(`Delete all ${list.length} conversations forever?`) && a().emptyFolder(route.view as "trash" | "spam")}
            >
              Empty {route.view === "trash" ? "Trash" : "Spam"} now
            </button>
          </div>
        )}
        {route.view === "label" && label && !isMobile && (
          <div className="flex items-center gap-2 border-b border-divider px-5 py-2 text-sm text-ink-2">
            <Tag size={16} style={{ color: label.color }} fill={label.color} />
            <span className="font-medium text-ink">{label.name}</span>
            <Chevron size={14} />
            <span>{list.length} conversations</span>
          </div>
        )}
        {route.view === "search" && !isMobile && list.length > 0 && (
          <div className="px-5 pb-1 text-xs text-ink-3">
            {list.length} result{list.length === 1 ? "" : "s"} for <span className="font-medium text-ink-2">{route.query}</span>
            {!parseQuery(route.query ?? "").in && " · excluding Spam and Trash"}
          </div>
        )}

        {isDraftView ? (
          <DraftRows route={route} mobile={isMobile} />
        ) : rows.length === 0 ? (
          <EmptyState view={route.view} />
        ) : (
          <div className={clsx(isMobile ? "pb-24" : "")}>
            {rows.map((t) => (
              <Row
                key={t.id}
                t={t}
                route={route}
                selected={selectedSet.has(t.id)}
                cursor={!isMobile && cursorId === t.id}
                active={route.threadId === t.id}
                hasDraft={draftThreads.has(t.id)}
                density={settings.density}
                terms={terms}
                now={now}
                onCheck={onCheck}
                onOpen={onOpen}
                selectedIds={selected}
              />
            ))}
            {!isMobile && list.length > 0 && (
              <div className="px-6 py-6 text-center text-xs text-ink-3">
                {Object.keys(a().threads).length} conversations · Stored locally in this browser · Last checked {listDate(now, now)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function MobileSelectionBar() {
  const route = useRoute();
  const selected = useMail((s) => s.selected);
  const a = useMail.getState;
  if (!selected.length) return null;
  return (
    <div className="no-print flex h-14 items-center gap-1 px-2">
      <IconButton tip="Clear selection" onClick={() => a().setSelected([])}>
        <X size={22} />
      </IconButton>
      <span className="ml-1 text-lg">{selected.length}</span>
      <div className="ml-auto">
        <ConversationActions ids={selected} route={route} mobile size={22} />
      </div>
    </div>
  );
}
