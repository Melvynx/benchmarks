import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ContextMenu } from "radix-ui";
import { useMail, getMail } from "../lib/store";
import { useUI, ui } from "../lib/ui";
import { navigate, routeHash } from "../lib/router";
import { actions } from "../lib/actions";
import {
  CATEGORY_META, enabledTabs, inFolder, isDraftOnly, msgsOf, participants, snippetOf, sortDate, viewThreads, viewTitle,
} from "../lib/selectors";
import { parseQuery } from "../lib/search";
import type { Category, Thread, ViewRef } from "../lib/types";
import { snoozeOptions } from "../lib/date";
import { cn } from "../lib/utils";
import { Button, Checkbox, Icon, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Tip, type IconKey } from "./ui";
import { ThreadActions } from "./ThreadActions";
import { MobileRow, ThreadRow, type RowData } from "./ThreadRow";
import { useIsMobile } from "../hooks/useMedia";
import { useElementWidth } from "../hooks/useElementWidth";
import { storageLabel, useStorage } from "./Header";
import { runSearch } from "./SearchBar";
import { SplitToggle } from "./SplitToggle";

const EMPTY: Record<string, { icon: IconKey; title: string; body?: string }> = {
  inbox: { icon: "celebration", title: "Woohoo! You've read all the messages in your inbox.", body: "Nothing to triage right now — enjoy the quiet." },
  promotions: { icon: "sell", title: "No promotions right now", body: "Deals and offers from brands you follow will show up here." },
  social: { icon: "group", title: "No social updates", body: "Messages from social networks and media-sharing sites land here." },
  updates: { icon: "info", title: "No updates", body: "Confirmations, receipts, bills and statements will appear here." },
  forums: { icon: "forum", title: "No forum messages", body: "Messages from online groups and mailing lists show up here." },
  starred: { icon: "star", title: "No starred messages", body: "Stars let you give messages a special status to make them easier to find. To star a message, click the star outline beside any conversation." },
  snoozed: { icon: "schedule", title: "Nothing snoozed", body: "Snooze emails to get them out of your way until you actually need them." },
  important: { icon: "label_important", title: "No important messages", body: "Mark conversations as important to see them here." },
  sent: { icon: "send", title: "No sent messages!", body: "Send one now!" },
  scheduled: { icon: "schedule_send", title: "Nothing scheduled", body: "Messages you schedule to send later will wait here." },
  drafts: { icon: "draft", title: "You don't have any saved drafts.", body: "Saving a draft allows you to keep a message you aren't ready to send yet." },
  all: { icon: "mail", title: "No conversations", body: "Your mail will appear here." },
  spam: { icon: "report_off", title: "Hooray, no spam here!" },
  trash: { icon: "delete", title: "No conversations in Trash" },
  label: { icon: "label", title: "There are no conversations with this label." },
  search: { icon: "search_off", title: "No messages matched your search.", body: "Try using search options such as sender, date, size and more." },
};

function emptyKey(view: ViewRef, tab: Category) {
  if (view.kind === "folder") return view.folder === "inbox" && tab !== "primary" ? tab : view.folder;
  return view.kind;
}

export function useRows(view: ViewRef, tab: Category) {
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const settings = useMail((s) => s.settings);
  const account = useMail((s) => s.account);
  const labels = useMail((s) => s.labels);
  return useMemo(() => {
    const st = { threads, messages, settings, account, labels };
    const folder = view.kind === "folder" ? view.folder : undefined;
    const list = viewThreads(st, view, tab);
    const labelMap = new Map(labels.map((l) => [l.id, l]));
    const rows: RowData[] = list.map((t) => {
      const { parts, count } = participants(t, st, folder);
      const ms = msgsOf(t, messages);
      let date = sortDate(t, st, folder);
      if (folder === "snoozed" && t.snoozedUntil) date = t.snoozedUntil;
      const atts = ms.filter((m) => m.status !== "draft").flatMap((m) => m.attachments.filter((a) => a.kind !== "calendar").map((a) => ({ ...a, messageId: m.id })));
      return {
        thread: t,
        parts,
        count,
        snippet: snippetOf(t, st),
        date,
        attachments: atts,
        labels: t.labels.filter((l) => labelMap.has(l) && !(view.kind === "label" && view.labelId === l)).map((l) => labelMap.get(l)!),
        inboxChip: view.kind !== "folder" || (view.folder !== "inbox" && view.folder !== "trash" && view.folder !== "spam") ? t.labels.includes("INBOX") && !t.labels.includes("TRASH") && !t.labels.includes("SPAM") && view.kind !== "category" : false,
        firstFrom: ms.find((m) => m.status === "received")?.from ?? ms[0]?.from ?? null,
      };
    });
    return rows;
  }, [threads, messages, settings, account, labels, view, tab]);
}

function CategoryTabs({ tab, view }: { tab: Category; view: ViewRef }) {
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const settings = useMail((s) => s.settings);
  const account = useMail((s) => s.account);
  const labels = useMail((s) => s.labels);
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const tabs = enabledTabs(settings);
  const info = useMemo(() => {
    const st = { threads, messages, settings, account, labels };
    return Object.fromEntries(
      tabs.map((c) => {
        const unread = Object.values(threads).filter((t) => t.unread && inFolder(t, "inbox", st, c));
        unread.sort((a, b) => sortDate(b, st) - sortDate(a, st));
        const names = [...new Set(unread.map((t) => msgsOf(t, messages).filter((m) => m.status === "received").pop()?.from.name).filter(Boolean))];
        return [c, { count: unread.length, names: names.slice(0, 3).join(", ") }];
      }),
    ) as Record<Category, { count: number; names: string }>;
  }, [threads, messages, settings, account, labels, tabs]);
  if (tabs.length < 2) return null;
  const iconOnly = width > 0 && width < tabs.length * 150;
  return (
    <div ref={ref} role="tablist" aria-label="Inbox categories" className="flex shrink-0 border-b border-line">
      {tabs.map((c) => {
        const meta = CATEGORY_META[c];
        const active = tab === c;
        const { count, names } = info[c];
        return (
          <a
            key={c}
            role="tab"
            aria-selected={active}
            href={`#${routeHash({ view, tab: c })}`}
            className={cn("relative flex h-14 min-w-0 flex-1 items-center gap-4 px-4 font-sans text-sm hover:bg-hover sm:max-w-[252px]", active ? "font-medium" : "text-fg-2")}
            style={active ? { color: meta.color } : undefined}
            title={meta.name}
          >
            <Icon name={meta.icon as IconKey} size={20} fill={active} className={iconOnly ? "mx-auto" : ""} />
            {!iconOnly && (
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2">
                  <span className="truncate">{meta.name}</span>
                  {c !== "primary" && count > 0 && (
                    <span className="shrink-0 rounded-full px-1.5 text-[11px] font-medium leading-4 text-white dark:text-[#1f1f1f]" style={{ background: meta.color }}>
                      {count} new
                    </span>
                  )}
                </span>
                {!active && c !== "primary" && names && <span className="truncate font-body text-xs text-fg-3">{names}</span>}
              </span>
            )}
            {iconOnly && c !== "primary" && count > 0 && <span className="absolute right-3 top-3 size-2 rounded-full" style={{ background: meta.color }} />}
            {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-[3px]" style={{ background: meta.color }} />}
          </a>
        );
      })}
    </div>
  );
}

function toggleToken(query: string, token: string) {
  const parts = query.split(/\s+/).filter(Boolean);
  const has = parts.includes(token);
  return (has ? parts.filter((p) => p !== token) : [...parts, token]).join(" ");
}

function setField(query: string, field: string, value: string | null) {
  const parts = query.split(/\s+/).filter((p) => p && !p.startsWith(`${field}:`));
  if (value) parts.push(`${field}:${value}`);
  return parts.join(" ");
}

function Chip({ active, children, onClick, menu }: { active?: boolean; children: ReactNode; onClick?: () => void; menu?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-3 font-sans text-sm",
        active ? "border-transparent bg-primary-soft text-on-primary-soft" : "border-outline text-fg-2 hover:bg-hover",
      )}
    >
      {active && !menu && <Icon name="check" size={18} />}
      {children}
      {menu && <Icon name="arrow_drop_down" size={18} />}
    </button>
  );
}

function SearchChips({ query }: { query: string }) {
  const contacts = useMail((s) => s.contacts);
  const terms = parseQuery(query).terms;
  const fromTerm = terms.find((t) => t.field === "from" && !t.negate);
  const toTerm = terms.find((t) => t.field === "to" && !t.negate);
  const time = terms.find((t) => t.field === "older_than" || t.field === "newer_than");
  const top = Object.values(contacts).slice(0, 12);
  const go = (q: string) => (q.trim() ? runSearch(q) : navigate("inbox"));
  const personMenu = (field: "from" | "to", term: typeof fromTerm, label: string) => (
    <Menu>
      <MenuTrigger asChild>
        <span>
          <Chip menu active={!!term}>{term ? `${label}: ${term.value}` : label}</Chip>
        </span>
      </MenuTrigger>
      <MenuContent className="w-72">
        {term && <MenuItem icon="close" onSelect={() => go(setField(query, field, null))}>Clear</MenuItem>}
        {field === "to" && <MenuItem icon="person" onSelect={() => go(setField(query, field, "me"))}>Me</MenuItem>}
        {top.map((c) => (
          <MenuItem key={c.email} onSelect={() => go(setField(query, field, c.email))}>
            <span className="flex min-w-0 flex-col leading-4">
              <span className="truncate">{c.name}</span>
              <span className="truncate text-xs text-fg-3">{c.email}</span>
            </span>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
  const timeOpts: [string, string][] = [["older_than:7d", "Older than a week"], ["older_than:30d", "Older than a month"], ["older_than:180d", "Older than 6 months"], ["older_than:1y", "Older than a year"], ["newer_than:2d", "Last 2 days"], ["newer_than:7d", "Last 7 days"]];
  return (
    <div className="no-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto px-4 pb-3 pt-1">
      {personMenu("from", fromTerm, "From")}
      <Menu>
        <MenuTrigger asChild>
          <span>
            <Chip menu active={!!time}>{time ? timeOpts.find(([k]) => k === `${time.field}:${time.value}`)?.[1] || `${time.field}:${time.value}` : "Any time"}</Chip>
          </span>
        </MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={() => go(setField(setField(query, "older_than", null), "newer_than", null))}>Any time</MenuItem>
          {timeOpts.map(([k, l]) => (
            <MenuItem key={k} onSelect={() => go(`${setField(setField(query, "older_than", null), "newer_than", null)} ${k}`)}>{l}</MenuItem>
          ))}
        </MenuContent>
      </Menu>
      <Chip active={query.includes("has:attachment")} onClick={() => go(toggleToken(query, "has:attachment"))}>Has attachment</Chip>
      {personMenu("to", toTerm, "To")}
      <Chip active={query.includes("is:unread")} onClick={() => go(toggleToken(query, "is:unread"))}>Is unread</Chip>
      <Chip active={query.includes("is:starred")} onClick={() => go(toggleToken(query, "is:starred"))}>Is starred</Chip>
      <Chip active={query.includes("in:anywhere")} onClick={() => go(toggleToken(query, "in:anywhere"))}>Include Spam &amp; Trash</Chip>
    </div>
  );
}

function ListFooter() {
  const storage = useStorage();
  const online = useUI((s) => s.online);
  const pct = storage.total ? Math.max(1, Math.min(100, (storage.used / storage.total) * 100)) : 0;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5 font-body text-xs text-fg-3">
      <div className="min-w-[150px]">
        <div className="mb-1 h-1 w-40 overflow-hidden rounded-full bg-hover-strong">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        {storageLabel(storage)}
      </div>
      <div className="flex items-center gap-1.5">
        <Icon name={online ? "offline_pin" : "cloud_off"} size={14} />
        {online ? "Saved on this device · Works offline" : "Offline · Changes are saved on this device"}
      </div>
    </div>
  );
}

function EmptyState({ k }: { k: string }) {
  const e = EMPTY[k] || EMPTY.all;
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center font-sans">
      <div className="mb-5 flex size-24 items-center justify-center rounded-full bg-surface-2">
        <Icon name={e.icon} size={44} className="text-primary" />
      </div>
      <div className="max-w-md text-base text-fg">{e.title}</div>
      {e.body && <div className="mt-2 max-w-md font-body text-sm text-fg-3">{e.body}</div>}
    </div>
  );
}

function SelectAllMenu({ pageIds, rows }: { pageIds: string[]; rows: RowData[] }) {
  const selected = useUI((s) => s.selected);
  const selOnPage = pageIds.filter((id) => selected.includes(id)).length;
  const all = pageIds.length > 0 && selOnPage === pageIds.length;
  const some = selOnPage > 0 && !all;
  const pick = (pred: (r: RowData) => boolean) => ui().select(rows.filter(pred).map((r) => r.thread.id));
  return (
    <div className="flex items-center rounded hover:bg-hover">
      <Tip label="Select">
        <span>
          <Checkbox checked={all} indeterminate={some} label="Select all" size="sm" onChange={(v) => (v ? ui().select(pageIds) : ui().clearSelection())} />
        </span>
      </Tip>
      <Menu>
        <MenuTrigger asChild>
          <button type="button" aria-label="Select options" className="-ml-2 inline-flex h-8 w-5 items-center justify-center rounded text-icon">
            <Icon name="arrow_drop_down" size={20} />
          </button>
        </MenuTrigger>
        <MenuContent className="min-w-[140px]">
          <MenuItem onSelect={() => pick(() => true)}>All</MenuItem>
          <MenuItem onSelect={() => ui().clearSelection()}>None</MenuItem>
          <MenuItem onSelect={() => pick((r) => !r.thread.unread)}>Read</MenuItem>
          <MenuItem onSelect={() => pick((r) => r.thread.unread)}>Unread</MenuItem>
          <MenuItem onSelect={() => pick((r) => r.thread.starred)}>Starred</MenuItem>
          <MenuItem onSelect={() => pick((r) => !r.thread.starred)}>Unstarred</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}

function RowContextMenu({ ids, view, children, disabled }: { ids: string[]; view: ViewRef; children: ReactNode; disabled: boolean }) {
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const labels = useMail((s) => s.labels);
  const list = ids.map((id) => threads[id]).filter(Boolean);
  const one = list.length === 1 ? list[0] : null;
  const lastReal = one ? msgsOf(one, messages).filter((m) => m.status === "received" || m.status === "sent").pop() : undefined;
  const anyUnread = list.some((t) => t.unread);
  const item = "flex h-8 cursor-pointer select-none items-center gap-3 px-4 outline-none data-[highlighted]:bg-hover data-[disabled]:opacity-40";
  const content = "no-print z-[80] min-w-[240px] max-h-[80vh] overflow-auto rounded-lg bg-menu py-2 font-sans text-sm text-fg shadow-e2 animate-pop";
  const I = ({ icon, children, onSelect, disabled: d }: { icon: IconKey; children: ReactNode; onSelect: () => void; disabled?: boolean }) => (
    <ContextMenu.Item className={item} onSelect={onSelect} disabled={d}>
      <Icon name={icon} size={20} className="text-icon" />
      {children}
    </ContextMenu.Item>
  );
  const sub = (icon: IconKey, label: string, body: ReactNode) => (
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger className={cn(item, "data-[state=open]:bg-hover")}>
        <Icon name={icon} size={20} className="text-icon" />
        <span className="flex-1">{label}</span>
        <Icon name="chevron_right" size={18} className="text-icon" />
      </ContextMenu.SubTrigger>
      <ContextMenu.Portal>
        <ContextMenu.SubContent className={content} sideOffset={2} collisionPadding={8}>{body}</ContextMenu.SubContent>
      </ContextMenu.Portal>
    </ContextMenu.Sub>
  );
  const sep = <ContextMenu.Separator className="my-2 h-px bg-line" />;
  return (
    <ContextMenu.Root modal={false}>
      <ContextMenu.Trigger asChild disabled={disabled}>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        {list.length > 0 && (
          <ContextMenu.Content className={content} collisionPadding={8}>
            {lastReal && (
              <>
                <I icon="reply" onSelect={() => actions.reply(lastReal.id, "reply", false)}>Reply</I>
                <I icon="reply_all" onSelect={() => actions.reply(lastReal.id, "replyAll", false)}>Reply all</I>
                <I icon="forward" onSelect={() => actions.reply(lastReal.id, "forward", false)}>Forward</I>
                {sep}
              </>
            )}
            <I icon="archive" onSelect={() => actions.archive(ids)}>Archive</I>
            <I icon="delete" onSelect={() => actions.trash(ids)}>Delete</I>
            <I icon={anyUnread ? "mark_email_read" : "mark_email_unread"} onSelect={() => actions.markRead(ids, anyUnread)}>
              {anyUnread ? "Mark as read" : "Mark as unread"}
            </I>
            {sub("schedule", "Snooze", snoozeOptions().map((o) => (
              <ContextMenu.Item key={o.id} className={cn(item, "justify-between gap-6")} onSelect={() => actions.snooze(ids, o.at)}>
                <span>{o.label}</span>
                <span className="text-fg-3">{o.detail}</span>
              </ContextMenu.Item>
            )))}
            {one && <I icon="add_task" onSelect={() => actions.addTask(one.id)}>Add to Tasks</I>}
            {sep}
            {sub("drive_file_move", "Move to", (
              <>
                {!(view.kind === "folder" && view.folder === "inbox") && <I icon="inbox" onSelect={() => actions.moveTo(ids, "INBOX")}>Inbox</I>}
                <I icon="report" onSelect={() => actions.moveTo(ids, "SPAM")}>Spam</I>
                <I icon="delete" onSelect={() => actions.moveTo(ids, "TRASH")}>Trash</I>
                {labels.map((l) => (
                  <ContextMenu.Item key={l.id} className={item} onSelect={() => actions.moveTo(ids, l.id)}>
                    <Icon name="label" fill size={20} style={{ color: l.color }} />
                    {l.name}
                  </ContextMenu.Item>
                ))}
              </>
            ))}
            {sub("label", "Label as", labels.map((l) => {
              const has = list.every((t) => t.labels.includes(l.id));
              return (
                <ContextMenu.CheckboxItem
                  key={l.id}
                  checked={has}
                  className={item}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(v) => actions.labels(ids, v ? [l.id] : [], v ? [] : [l.id])}
                >
                  <Icon name={has ? "check_box" : "check_box_outline_blank"} fill={has} size={20} className="text-icon" />
                  <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                  {l.name}
                </ContextMenu.CheckboxItem>
              );
            }))}
            <I icon="notifications_off" onSelect={() => actions.mute(ids)}>Mute</I>
            {lastReal && (
              <>
                {sep}
                <I icon="person_search" onSelect={() => runSearch(`from:${lastReal.from.email}`)}>
                  Find emails from {lastReal.from.name.split(" ")[0] || lastReal.from.email}
                </I>
                <I icon="search" onSelect={() => runSearch(`subject:(${(one?.subject || "").replace(/^(re|fwd?):\s*/i, "")})`)}>
                  Find emails with this subject
                </I>
              </>
            )}
          </ContextMenu.Content>
        )}
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export function MailList({ view, tab, page, split, activeThreadId }: { view: ViewRef; tab: Category; page: number; split?: boolean; activeThreadId?: string | null }) {
  const isMobile = useIsMobile();
  const rows = useRows(view, tab);
  const settings = useMail((s) => s.settings);
  const messages = useMail((s) => s.messages);
  const labels = useMail((s) => s.labels);
  const selected = useUI((s) => s.selected);
  const focusedId = useUI((s) => s.focusedId);
  const refreshing = useUI((s) => s.refreshing);
  const [ctxIds, setCtxIds] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const lastToggled = useRef<number | null>(null);
  const [listRef, width] = useElementWidth<HTMLDivElement>();
  const narrow = isMobile ? false : width > 0 && width < 720;
  const scrollRef = useRef<HTMLDivElement>(null);

  const pageSize = settings.pageSize;
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(page, pages);
  const sectioned = view.kind === "folder" && view.folder === "inbox" && settings.inboxType !== "default";

  const sections = useMemo(() => {
    if (!sectioned) return [{ key: "all", title: "", rows: rows.slice((p - 1) * pageSize, p * pageSize) }];
    const pred =
      settings.inboxType === "important" ? (r: RowData) => r.thread.labels.includes("IMPORTANT")
      : settings.inboxType === "unread" ? (r: RowData) => r.thread.unread
      : (r: RowData) => r.thread.starred;
    const title = settings.inboxType === "important" ? "Important" : settings.inboxType === "unread" ? "Unread" : "Starred";
    return [
      { key: "first", title, rows: rows.filter(pred).slice(0, pageSize) },
      { key: "rest", title: "Everything else", rows: rows.filter((r) => !pred(r)).slice(0, pageSize) },
    ];
  }, [sectioned, rows, p, pageSize, settings.inboxType]);

  const visible = useMemo(() => sections.flatMap((s) => (collapsedSections[s.key] ? [] : s.rows)), [sections, collapsedSections]);
  const pageIds = visible.map((r) => r.thread.id);
  const allIds = rows.map((r) => r.thread.id);

  const viewKey = JSON.stringify(view) + tab + p;
  useEffect(() => {
    ui().clearSelection();
    scrollRef.current?.scrollTo({ top: 0 });
  }, [viewKey]);

  useEffect(() => {
    if (!focusedId || !pageIds.includes(focusedId)) ui().set({ focusedId: activeThreadId && pageIds.includes(activeThreadId) ? activeThreadId : pageIds[0] ?? null });
  }, [pageIds.join(","), focusedId, activeThreadId]);

  useEffect(() => {
    if (!focusedId) return;
    const el = scrollRef.current?.querySelector(`[data-thread-id="${focusedId}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedId]);

  const open = useCallback(
    (t: Thread) => {
      if (isDraftOnly(t, messages)) {
        const d = t.messageIds.find((id) => messages[id]?.status === "draft" || messages[id]?.status === "scheduled");
        if (d && messages[d].status === "draft") return actions.openDraft(d);
      }
      ui().set({ focusedId: t.id });
      navigate(routeHash({ view, tab, page: p, threadId: t.id }));
    },
    [messages, view, tab, p],
  );

  const toggle = useCallback(
    (id: string, shift: boolean) => {
      const idx = pageIds.indexOf(id);
      if (shift && lastToggled.current != null) {
        const [a, b] = [Math.min(idx, lastToggled.current), Math.max(idx, lastToggled.current)];
        const range = pageIds.slice(a, b + 1);
        const cur = ui().selected;
        ui().select([...cur, ...range]);
      } else ui().toggleSelect(id);
      lastToggled.current = idx;
    },
    [pageIds],
  );

  const folder = view.kind === "folder" ? view.folder : undefined;
  const ek = emptyKey(view, tab);
  const title = view.kind === "folder" && view.folder === "inbox" ? (enabledTabs(settings).length > 1 ? CATEGORY_META[tab].name : "Inbox") : viewTitle(view, { threads: {}, messages, settings, account: getMail().account, labels });
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const everythingSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));
  const go = (np: number) => navigate(routeHash({ view, tab, page: np }));
  const unreadInView = rows.filter((r) => r.thread.unread).map((r) => r.thread.id);

  const toolbar = !isMobile && (
    <div className="flex h-12 shrink-0 items-center gap-0.5 pl-2 pr-2">
      <SelectAllMenu pageIds={pageIds} rows={visible} />
      {selected.length > 0 ? (
        <ThreadActions ids={selected} view={view} hotkeys={!activeThreadId} />
      ) : (
        <>
          <IconButton icon="refresh" label="Refresh" onClick={() => actions.refresh()} iconClassName={refreshing ? "animate-spin-slow" : ""} />
          <Menu>
            <Tip label="More">
              <MenuTrigger asChild>
                <button type="button" aria-label="More" className="inline-flex size-10 items-center justify-center rounded-full text-icon hover:bg-hover">
                  <Icon name="more_vert" size={20} />
                </button>
              </MenuTrigger>
            </Tip>
            <MenuContent>
              <MenuItem icon="mark_email_read" disabled={!unreadInView.length} onSelect={() => actions.markRead(unreadInView, true)}>
                Mark all as read
              </MenuItem>
              <MenuSeparator />
              <MenuItem disabled>Select messages to see more actions</MenuItem>
            </MenuContent>
          </Menu>
        </>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        {total > 0 && !sectioned && (
          <span className="px-2 font-body text-xs text-fg-2 tabular-nums">
            {(p - 1) * pageSize + 1}–{Math.min(p * pageSize, total)} of {total.toLocaleString()}
          </span>
        )}
        {!sectioned && (
          <>
            <IconButton icon="chevron_left" label="Newer" disabled={p <= 1} onClick={() => go(p - 1)} />
            <IconButton icon="chevron_right" label="Older" disabled={p >= pages} onClick={() => go(p + 1)} />
          </>
        )}
        <SplitToggle />
      </div>
    </div>
  );

  const selectBanner = !isMobile && allOnPageSelected && total > pageIds.length && (
    <div className="flex h-9 shrink-0 items-center justify-center gap-1 border-b border-line bg-surface-2 font-body text-[13px] text-fg-2">
      {everythingSelected ? (
        <>
          All <b>{total}</b> conversations in {title} are selected.
          <button type="button" className="rounded px-1 font-medium text-primary hover:underline" onClick={() => ui().clearSelection()}>Clear selection</button>
        </>
      ) : (
        <>
          All <b>{pageIds.length}</b> conversations on this page are selected.
          <button type="button" className="rounded px-1 font-medium text-primary hover:underline" onClick={() => ui().select(allIds)}>
            Select all {total} conversations in {title}
          </button>
        </>
      )}
    </div>
  );

  const banner =
    folder === "trash" && total > 0 ? (
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 border-b border-line px-4 py-2.5 text-center font-body text-[13px] text-fg-2">
        Messages that have been in Trash more than 30 days will be automatically deleted.
        <button type="button" className="font-medium text-primary hover:underline" onClick={() => actions.deleteForever(allIds)}>Empty Trash now</button>
      </div>
    ) : folder === "spam" && total > 0 ? (
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 border-b border-line px-4 py-2.5 text-center font-body text-[13px] text-fg-2">
        Messages that have been in Spam more than 30 days will be automatically deleted.
        <button type="button" className="font-medium text-primary hover:underline" onClick={() => actions.deleteForever(allIds)}>Delete all spam messages now</button>
      </div>
    ) : null;

  const body = (
    <div
      role="grid"
      aria-label={title}
      ref={listRef}
      onContextMenu={(e) => {
        const row = (e.target as HTMLElement).closest("[data-thread-id]") as HTMLElement | null;
        const id = row?.dataset.threadId;
        if (!id) return setCtxIds([]);
        setCtxIds(selected.includes(id) ? selected : [id]);
      }}
    >
      {sections.map((sec) => (
        <div key={sec.key}>
          {sec.title && (
            <button
              type="button"
              onClick={() => setCollapsedSections({ ...collapsedSections, [sec.key]: !collapsedSections[sec.key] })}
              className="flex h-10 w-full items-center gap-2 border-b border-line px-4 text-left font-sans text-sm font-medium text-fg hover:bg-hover"
            >
              <Icon name={collapsedSections[sec.key] ? "chevron_right" : "keyboard_arrow_down"} size={20} className="text-icon" />
              {sec.title}
              <span className="ml-auto font-body text-xs font-normal text-fg-3">{sec.rows.length ? `1–${sec.rows.length}` : "0"}</span>
            </button>
          )}
          {!collapsedSections[sec.key] &&
            sec.rows.map((r) =>
              isMobile ? (
                <MobileRow
                  key={r.thread.id}
                  row={r}
                  selected={selected.includes(r.thread.id)}
                  selecting={selected.length > 0}
                  showSnippet={settings.showSnippets}
                  swipe={settings.swipeAction}
                  onOpen={() => open(r.thread)}
                  onToggle={() => ui().toggleSelect(r.thread.id)}
                />
              ) : (
                <ThreadRow
                  key={r.thread.id}
                  row={r}
                  selected={selected.includes(r.thread.id) || (split === true && activeThreadId === r.thread.id)}
                  focused={focusedId === r.thread.id}
                  density={settings.density}
                  folder={folder}
                  narrow={narrow}
                  showSnippet={settings.showSnippets}
                  showChips={settings.showAttachmentChips}
                  hoverActions={settings.hoverActions}
                  markers={settings.importanceMarkers}
                  dragIds={() => (ui().selected.includes(r.thread.id) ? ui().selected : [r.thread.id])}
                  onOpen={() => open(r.thread)}
                  onToggle={(shift) => toggle(r.thread.id, shift)}
                />
              ),
            )}
          {sectioned && !collapsedSections[sec.key] && !sec.rows.length && <div className="border-b border-line px-12 py-4 font-body text-sm text-fg-3">No conversations</div>}
        </div>
      ))}
      {!sectioned && total === 0 && <EmptyState k={ek} />}
    </div>
  );

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col" aria-label={title}>
      {toolbar}
      {isMobile && <MobileListHeader title={view.kind === "search" ? `Results for “${view.query}”` : title} count={total} />}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {view.kind === "folder" && view.folder === "inbox" && !isMobile && <CategoryTabs tab={tab} view={view} />}
        {view.kind === "search" && <SearchChips query={view.query} />}
        {selectBanner}
        {banner}
        <RowContextMenu ids={ctxIds} view={view} disabled={isMobile}>
          {body}
        </RowContextMenu>
        {isMobile && pages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button variant="outlined" disabled={p <= 1} onClick={() => go(p - 1)}>Newer</Button>
            <span className="font-body text-xs text-fg-3">Page {p} of {pages}</span>
            <Button variant="outlined" disabled={p >= pages} onClick={() => go(p + 1)}>Older</Button>
          </div>
        )}
        {!isMobile && <ListFooter />}
        {isMobile && <div className="h-24" />}
      </div>
    </section>
  );
}

function MobileListHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex h-9 shrink-0 items-end justify-between px-4 pb-1 font-sans text-xs font-medium uppercase tracking-wide text-fg-3">
      <span className="truncate">{title}</span>
      <span className="normal-case tracking-normal">{count ? `${count} conversation${count === 1 ? "" : "s"}` : ""}</span>
    </div>
  );
}

