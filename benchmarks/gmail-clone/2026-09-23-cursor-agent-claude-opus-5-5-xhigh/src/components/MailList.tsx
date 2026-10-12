import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { act, openDraft, openNewCompose } from "../lib/actions";
import { useCounts, useEffectiveView, useIsMobile, useViewThreads } from "../lib/hooks";
import { navigate, threadHash, viewHash } from "../lib/router";
import { queryTerms, replaceOperator, toggleToken } from "../lib/search";
import { CATEGORY_META, isUnread, threadMessages, viewTitle } from "../lib/selectors";
import { useMail } from "../lib/store";
import type { Category, Thread, View } from "../lib/types";
import { useUI } from "../lib/ui";
import { cn } from "../lib/utils";
import { atHour } from "../lib/format";
import { ListToolbar } from "./ListToolbar";
import { MailRow } from "./MailRow";
import { LabelPicker, SnoozeList } from "./menus";
import { runSearch } from "./SearchBar";
import { Button, Icon, IconButton, MenuItem, Popover, useMenu } from "./ui";

const NO_TERMS: string[] = [];

export function MailList({ view, activeThreadId, split }: { view: View; activeThreadId?: string; split?: boolean }) {
  const effective = useEffectiveView(view);
  const { threads, folder, query } = useViewThreads(effective);
  const settings = useMail((s) => s.settings);
  const labels = useMail((s) => s.labels);
  const messages = useMail((s) => s.messages);
  const selected = useUI((s) => s.selected);
  const focusedId = useUI((s) => s.focusedId);
  const page = useUI((s) => s.page);
  const setPage = useUI((s) => s.setPage);
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const viewKey = viewHash(effective);
  useEffect(() => {
    setPage(0);
    useUI.getState().clearSelection();
    scrollRef.current?.scrollTo({ top: 0 });
  }, [viewKey, setPage]);

  const sectioned = view.kind === "folder" && view.id === "inbox" && settings.inboxType !== "default";
  const sections = useMemo(() => {
    if (!sectioned) return null;
    const type = settings.inboxType;
    const test = (t: Thread) => (type === "unread" ? isUnread(t, messages) : type === "starred" ? t.starred : t.important);
    const name = type === "unread" ? "Unread" : type === "starred" ? "Starred" : "Important";
    return [
      { key: "first", name, threads: threads.filter(test) },
      { key: "rest", name: "Everything else", threads: threads.filter((t) => !test(t)) },
    ];
  }, [sectioned, settings.inboxType, threads, messages]);

  const pageSize = settings.pageSize;
  const pages = Math.max(1, Math.ceil(threads.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  // Mobile has no pager: pages accumulate as the list scrolls.
  const pageThreads = sections
    ? threads
    : isMobile
      ? threads.slice(0, (safePage + 1) * pageSize)
      : threads.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const loadMore = useCallback(() => setPage(safePage + 1), [setPage, safePage]);
  const visible = useMemo(
    () => (sections ? sections.flatMap((s) => (collapsed[s.key] ? [] : s.threads)) : pageThreads),
    [sections, collapsed, pageThreads],
  );

  useEffect(() => {
    useUI.getState().setVisibleIds(visible.map((t) => t.id));
  }, [visible]);

  useEffect(() => {
    if (!focusedId) return;
    const el = scrollRef.current?.querySelector(`[data-thread="${focusedId}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedId]);

  const onOpen = useCallback(
    (t: Thread) => {
      const ms = threadMessages(t, useMail.getState().messages);
      if (ms.length && ms.every((m) => m.status === "draft")) {
        openDraft(ms[0].id);
        return;
      }
      useUI.getState().setFocused(t.id);
      navigate(threadHash(view, t.id));
    },
    [view],
  );

  const onSelect = useCallback(
    (t: Thread, e: { shiftKey: boolean }) => {
      const ui = useUI.getState();
      if (e.shiftKey && ui.anchor) {
        const ids = visible.map((x) => x.id);
        const a = ids.indexOf(ui.anchor);
        const b = ids.indexOf(t.id);
        if (a >= 0 && b >= 0) {
          const range = ids.slice(Math.min(a, b), Math.max(a, b) + 1);
          ui.setSelected(Array.from(new Set([...ui.selected, ...range])), t.id);
          return;
        }
      }
      ui.toggleSelected(t.id);
    },
    [visible],
  );

  const layout = isMobile || (split && settings.readingPane === "right") ? "stacked" : "line";
  const terms = useMemo(() => (query ? queryTerms(query) : NO_TERMS), [query]);
  const showInboxChip = !(effective.kind === "category" || (effective.kind === "folder" && effective.id === "inbox"));
  const currentLabel = effective.kind === "label" ? effective.id : undefined;
  const allSelected = pageThreads.length > 0 && pageThreads.every((t) => selected.includes(t.id));

  const renderRow = (t: Thread) => (
    <MailRow
      key={t.id}
      thread={t}
      folder={folder}
      currentLabel={currentLabel}
      selected={selected.includes(t.id)}
      focused={focusedId === t.id}
      active={activeThreadId === t.id}
      density={settings.density}
      layout={layout}
      showInboxChip={showInboxChip}
      terms={terms}
      labels={labels}
      swipe={isMobile}
      onOpen={onOpen}
      onSelect={onSelect}
    />
  );

  const range = {
    start: threads.length ? safePage * pageSize + 1 : 0,
    end: Math.min(threads.length, (safePage + 1) * pageSize),
    total: threads.length,
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isMobile ? (
        <MobileListHeader view={effective} threads={pageThreads} folder={folder} currentLabel={currentLabel} />
      ) : (
        <ListToolbar
          pageThreads={visible}
          allThreads={threads}
          folder={folder}
          currentLabel={currentLabel}
          range={sections ? { start: threads.length ? 1 : 0, end: threads.length, total: threads.length } : range}
          onPrev={!sections && safePage > 0 ? () => setPage(safePage - 1) : undefined}
          onNext={!sections && safePage < pages - 1 ? () => setPage(safePage + 1) : undefined}
          compact={split && settings.readingPane === "right"}
        />
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" role="grid" aria-label={viewTitle(effective, labels)}>
        {settings.inboxType === "default" && (effective.kind === "category" || (effective.kind === "folder" && effective.id === "inbox")) && (
          <CategoryTabs active={effective.kind === "category" ? effective.id : "primary"} compact={isMobile || (split && settings.readingPane === "right")} />
        )}
        {view.kind === "search" && <SearchChips q={view.q} />}
        {folder === "trash" && threads.length > 0 && (
          <Banner text="Messages that have been in Trash more than 30 days will be deleted automatically." action="Empty Trash now" onAction={() => act.empty("trash")} />
        )}
        {folder === "spam" && threads.length > 0 && (
          <Banner text="Messages that have been in Spam more than 30 days will be deleted automatically." action="Delete all spam messages now" onAction={() => act.empty("spam")} />
        )}
        {allSelected && !sections && threads.length > pageThreads.length && selected.length < threads.length && (
          <div className="flex h-10 items-center justify-center gap-2 bg-surface-3 text-sm text-fg-2">
            All <b>{pageThreads.length}</b> conversations on this page are selected.
            <button type="button" className="font-medium text-accent hover:underline" onClick={() => useUI.getState().setSelected(threads.map((t) => t.id))}>
              Select all {threads.length} conversations in {viewTitle(effective, labels)}
            </button>
          </div>
        )}
        {selected.length === threads.length && threads.length > pageThreads.length && !sections && (
          <div className="flex h-10 items-center justify-center gap-2 bg-surface-3 text-sm text-fg-2">
            All <b>{threads.length}</b> conversations in {viewTitle(effective, labels)} are selected.
            <button type="button" className="font-medium text-accent hover:underline" onClick={() => useUI.getState().clearSelection()}>
              Clear selection
            </button>
          </div>
        )}

        {threads.length === 0 ? (
          <EmptyState view={effective} />
        ) : sections ? (
          sections.map((s) => (
            <section key={s.key}>
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [s.key]: !c[s.key] }))}
                className="flex h-11 w-full items-center gap-2 border-b border-line-soft px-4 text-left text-sm font-medium hover:bg-hover"
              >
                <Icon name={collapsed[s.key] ? "chevron_right" : "expand_more"} className="text-fg-3" />
                {s.name}
                <span className="text-xs font-normal text-fg-3">{s.threads.length}</span>
              </button>
              {!collapsed[s.key] && s.threads.map(renderRow)}
              {!collapsed[s.key] && !s.threads.length && <div className="px-12 py-4 text-sm text-fg-3">Nothing here. 🎉</div>}
            </section>
          ))
        ) : (
          pageThreads.map(renderRow)
        )}
        {isMobile && !sections && pageThreads.length < threads.length && (
          <LoadMore remaining={threads.length - pageThreads.length} onMore={loadMore} />
        )}
        {threads.length > 0 && <ListFooter />}
        {isMobile && <div className="h-24" />}
      </div>
    </div>
  );
}

function LoadMore({ remaining, onMore }: { remaining: number; onMore: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && onMore(), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onMore]);
  return (
    <button ref={ref} type="button" onClick={onMore} className="flex h-12 w-full items-center justify-center gap-2 text-sm font-medium text-accent">
      <Icon name="expand_more" size={20} />
      Load {remaining} more conversation{remaining === 1 ? "" : "s"}
    </button>
  );
}

function Banner({ text, action, onAction }: { text: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-line-soft bg-surface-2 px-4 py-3 text-center text-sm text-fg-2">
      {text}
      <button type="button" onClick={onAction} className="font-medium text-accent hover:underline">
        {action}
      </button>
    </div>
  );
}

const TABS: Category[] = ["primary", "promotions", "social", "updates"];

function CategoryTabs({ active, compact }: { active: Category; compact?: boolean }) {
  const counts = useCounts();
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const tabs = TABS;
  const senders = useMemo(() => {
    const out: Record<string, string> = {};
    for (const c of TABS) {
      const names = Object.values(threads)
        .filter((t) => t.category === c && t.inInbox && !t.trashed && !t.spam && isUnread(t, messages))
        .map((t) => threadMessages(t, messages).pop()?.from.name ?? "")
        .filter((n, i, a) => n && a.indexOf(n) === i)
        .slice(0, 3);
      out[c] = names.join(", ");
    }
    return out;
  }, [threads, messages]);
  return (
    <div role="tablist" className="flex border-b border-line-soft">
      {tabs.map((c) => {
        const meta = CATEGORY_META[c];
        const isActive = c === active;
        const n = counts.categories[c];
        return (
          <button
            key={c}
            role="tab"
            aria-selected={isActive}
            onClick={() => navigate(c === "primary" ? "#inbox" : `#category/${c}`)}
            className={cn(
              "relative flex h-14 min-w-0 flex-1 items-center gap-3 px-4 text-left text-sm transition-colors hover:bg-hover",
              compact ? "justify-center px-1" : "max-w-[252px]",
              isActive ? "font-medium" : "text-fg-2",
            )}
            style={isActive ? { color: meta.color } : undefined}
            data-tip={compact ? meta.name : undefined}
          >
            <Icon name={meta.icon} size={20} fill={isActive} />
            {!compact && (
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={cn("truncate", isActive ? "" : "text-fg")}>{meta.name}</span>
                  {!isActive && n > 0 && c !== "primary" && (
                    <span className="shrink-0 rounded-full px-2 py-px text-[11px] font-medium text-white" style={{ background: meta.color }}>
                      {n} new
                    </span>
                  )}
                </span>
                {!isActive && n > 0 && c !== "primary" && <span className="block truncate text-xs font-normal text-fg-3">{senders[c]}</span>}
              </span>
            )}
            {compact && !isActive && n > 0 && c !== "primary" && (
              <span className="absolute right-[calc(50%-18px)] top-2.5 h-2 w-2 rounded-full" style={{ background: meta.color }} />
            )}
            {isActive && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-[3px]" style={{ background: meta.color }} />}
          </button>
        );
      })}
    </div>
  );
}

function SearchChips({ q }: { q: string }) {
  const timeMenu = useMenu();
  const lower = q.toLowerCase();
  const chip = (label: string, token: string, icon?: string) => {
    const on = lower.split(/\s+/).includes(token);
    return (
      <button
        type="button"
        onClick={() => runSearch(toggleToken(q, token) || "in:anywhere")}
        aria-pressed={on}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
          on ? "border-transparent bg-accent-soft text-on-accent-soft" : "border-line text-fg-2 hover:bg-hover",
        )}
      >
        {on ? <Icon name="check" size={18} /> : icon && <Icon name={icon} size={18} />}
        {label}
      </button>
    );
  };
  const timeVal = lower.match(/newer_than:(\S+)/)?.[1];
  const timeLabel: Record<string, string> = { "1d": "Last day", "7d": "Last 7 days", "1m": "Last 30 days", "6m": "Last 6 months", "1y": "Last year" };
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-line-soft px-4 py-2.5">
      <button
        ref={timeMenu.ref}
        type="button"
        onClick={timeMenu.toggle}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border pl-3 pr-2 text-sm",
          timeVal ? "border-transparent bg-accent-soft text-on-accent-soft" : "border-line text-fg-2 hover:bg-hover",
        )}
      >
        {timeVal ? timeLabel[timeVal] ?? `Newer than ${timeVal}` : "Any time"}
        <Icon name="arrow_drop_down" size={20} />
      </button>
      <Popover anchor={timeMenu.ref.current} open={timeMenu.open} onClose={timeMenu.close} className="w-48">
        <MenuItem label="Any time" onClick={() => (timeMenu.close(), runSearch(replaceOperator(q, "newer_than", null) || "in:anywhere"))} />
        {Object.entries(timeLabel).map(([k, v]) => (
          <MenuItem key={k} label={v} onClick={() => (timeMenu.close(), runSearch(replaceOperator(q, "newer_than", k)))} />
        ))}
      </Popover>
      {chip("Has attachment", "has:attachment", "attach_file")}
      {chip("Is unread", "is:unread", "mark_email_unread")}
      {chip("Is starred", "is:starred", "star")}
      {chip("From me", "from:me", "send")}
      <button type="button" onClick={() => window.dispatchEvent(new Event("focus-search"))} className="shrink-0 px-2 text-sm font-medium text-accent hover:underline">
        Edit search
      </button>
    </div>
  );
}

function MobileListHeader({ view, threads, folder, currentLabel }: { view: View; threads: Thread[]; folder?: string; currentLabel?: string }) {
  const selected = useUI((s) => s.selected);
  const clear = useUI((s) => s.clearSelection);
  const labels = useMail((s) => s.labels);
  const messages = useMail((s) => s.messages);
  const tMap = useMail((s) => s.threads);
  const more = useMenu();
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const ids = selected.filter((id) => tMap[id]);
  if (ids.length) {
    const anyUnread = ids.some((id) => isUnread(tMap[id], messages));
    const bin = folder === "trash" || folder === "spam";
    return (
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-line-soft bg-surface px-1">
        <IconButton icon="close" label="Clear selection" onClick={clear} />
        <span className="flex-1 pl-1 text-base font-medium">{ids.length}</span>
        {bin ? (
          <>
            {folder === "trash" ? (
              <IconButton icon="restore_from_trash" label="Move to Inbox" onClick={() => act.moveToInbox(ids)} />
            ) : (
              <IconButton icon="report_off" label="Not spam" onClick={() => act.notSpam(ids)} />
            )}
            <IconButton icon="delete_forever" label="Delete forever" onClick={() => act.deleteForever(ids)} />
          </>
        ) : (
          <>
            <IconButton icon="archive" label="Archive" onClick={() => act.archive(ids)} />
            <IconButton icon="delete" label="Delete" onClick={() => act.trash(ids)} />
          </>
        )}
        <IconButton icon={anyUnread ? "drafts" : "mark_email_unread"} label={anyUnread ? "Mark as read" : "Mark as unread"} onClick={() => act.setRead(ids, anyUnread)} />
        <IconButton ref={more.ref} icon="more_vert" label="More" onClick={more.toggle} />
        <Popover anchor={more.ref.current} open={more.open} onClose={more.close} align="end" className="w-56">
          <MenuItem icon="select_all" label="Select all" onClick={() => (more.close(), useUI.getState().setSelected(threads.map((t) => t.id)))} />
          <MenuItem icon="star" label="Add star" onClick={() => (more.close(), act.toggleStar(ids, true))} />
          <MenuItem icon="label_important" label="Mark important" onClick={() => (more.close(), act.setImportant(ids, true))} />
          {!bin && <MenuItem icon="report" label="Report spam" onClick={() => (more.close(), act.spam(ids))} />}
          {!bin && <MenuItem icon="schedule" label="Snooze…" onClick={() => (more.close(), setSnoozeOpen(true))} />}
          <MenuItem icon="label" label="Change labels…" onClick={() => (more.close(), setLabelsOpen(true))} />
        </Popover>
        <Popover anchor={more.ref.current} open={snoozeOpen} onClose={() => setSnoozeOpen(false)} align="end" className="w-72">
          {snoozeOpen && (
            <SnoozeList
              now={Date.now()}
              onPick={(ts) => (setSnoozeOpen(false), act.snooze(ids, ts))}
              onCustom={() => {
                setSnoozeOpen(false);
                useUI.getState().openDialog({ type: "datetime", title: "Pick date & time", initial: atHour(Date.now(), 1, 8), onPick: (ts) => act.snooze(ids, ts) });
              }}
            />
          )}
        </Popover>
        <Popover anchor={more.ref.current} open={labelsOpen} onClose={() => setLabelsOpen(false)} align="end" className="w-64">
          {labelsOpen && <LabelPicker ids={ids} onDone={() => setLabelsOpen(false)} />}
        </Popover>
      </div>
    );
  }
  const title =
    view.kind === "search" ? `Results for “${view.q}”` : view.kind === "label" ? labels.find((l) => l.id === currentLabel)?.name : viewTitle(view, labels);
  return (
    <div className="flex h-9 shrink-0 items-end px-4 pb-1 text-xs font-medium uppercase tracking-wide text-fg-3">
      <span className="truncate">{title}</span>
    </div>
  );
}

function EmptyState({ view }: { view: View }) {
  const data: { icon: string; title: string; body: string } = (() => {
    if (view.kind === "search") return { icon: "search_off", title: "No messages matched your search", body: "Try using search options such as sender, date, size and more." };
    if (view.kind === "label") return { icon: "label_off", title: "There are no conversations with this label.", body: "Drag conversations here or use the Labels menu to add them." };
    if (view.kind === "category")
      return {
        icon: CATEGORY_META[view.id].icon,
        title: view.id === "primary" ? "You're all caught up" : `Your ${CATEGORY_META[view.id].name} tab is empty.`,
        body: view.id === "primary" ? "Nothing new in Primary. Enjoy the quiet." : "Messages from this category will show up here.",
      };
    const map: Partial<Record<string, { icon: string; title: string; body: string }>> = {
      inbox: { icon: "inbox", title: "Your inbox is empty", body: "Nicely done. New mail will appear here." },
      starred: { icon: "star", title: "No starred messages", body: "Stars let you give messages a special status to make them easier to find." },
      snoozed: { icon: "schedule", title: "Nothing snoozed", body: "Snooze a conversation to have it come back to your inbox when you need it." },
      sent: { icon: "send", title: "No sent messages!", body: "Send one now." },
      scheduled: { icon: "schedule_send", title: "Nothing scheduled", body: "Use the arrow next to Send to schedule a message for later." },
      drafts: { icon: "draft", title: "You don't have any saved drafts.", body: "Saving a draft allows you to keep a message you aren't ready to send yet." },
      trash: { icon: "delete", title: "No conversations in Trash", body: "Deleted items appear here." },
      spam: { icon: "verified_user", title: "Hooray, no spam here!", body: "" },
      important: { icon: "label_important", title: "No important messages", body: "Mark a conversation as important to see it here." },
      all: { icon: "stacks", title: "No mail", body: "" },
    };
    return map[view.id] ?? { icon: "inbox", title: "Nothing here", body: "" };
  })();
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-3">
        <Icon name={data.icon} size={44} className="text-fg-3" />
      </div>
      <div className="mt-5 font-display text-lg text-fg">{data.title}</div>
      {data.body && <div className="mt-1 max-w-sm text-sm text-fg-3">{data.body}</div>}
      {view.kind === "search" && (
        <Button variant="outline" className="mt-5" onClick={() => runSearch(`${view.q} in:anywhere`)}>
          Search in Spam and Trash too
        </Button>
      )}
      {view.kind === "folder" && (view.id === "sent" || view.id === "drafts") && (
        <Button variant="tonal" className="mt-5" onClick={() => openNewCompose()}>
          <Icon name="edit" size={18} /> Compose
        </Button>
      )}
    </div>
  );
}

function ListFooter() {
  const seededAt = useMail((s) => s.seededAt);
  const now = useUI((s) => s.now);
  const mins = Math.max(1, Math.round((now - seededAt) / 60000));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-fg-3">
      <span>Stored locally in this browser · works offline</span>
      <span>
        Mailbox session: {mins < 60 ? `${mins} minute${mins === 1 ? "" : "s"}` : `${Math.round(mins / 60)} hours`}
        <span className="hidden md:inline">
          {" "}
          · Press <kbd className="rounded border border-line px-1">?</kbd> for shortcuts
        </span>
      </span>
    </div>
  );
}
