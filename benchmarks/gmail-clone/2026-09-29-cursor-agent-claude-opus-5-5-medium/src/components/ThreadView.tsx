import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Printer, Star, Reply, ReplyAll, Forward, MoreVertical, MoreHorizontal, X,
  ChevronDown, Download, MapPin, CalendarDays, Check, ChevronsUpDown, BellOff, Clock, Bookmark,
} from "lucide-react";
import { useMail, draftForThread } from "../lib/store";
import { navigate, listRoute, useRoute } from "../lib/router";
import { useThreadList } from "../lib/hooks";
import { isSnoozed } from "../lib/query";
import { ME, displayName, firstName, fullDate, isMe, listDate, relative, shortDateTime, stripHtml } from "../lib/format";
import type { Message, Rsvp, Thread } from "../lib/types";
import { Avatar, IconButton, MenuDivider, MenuItem, Popover, useAnchor, useIsMobile } from "./ui";
import { ConversationActions } from "./Actions";
import { AttachmentCard, downloadAttachment } from "./Attachments";
import { InlineReply } from "./Compose";

function RecipientDetails({ m, subject }: { m: Message; subject: string }) {
  const pop = useAnchor();
  const list = (cs: typeof m.to) => cs.map((c) => (isMe(c) ? "me" : firstName(c))).join(", ");
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex gap-3 py-0.5">
      <span className="w-16 shrink-0 text-right text-ink-3">{k}:</span>
      <span className="min-w-0 break-words">{v}</span>
    </div>
  );
  const full = (cs: typeof m.to) => cs.map((c) => `${c.name ? c.name + " " : ""}<${c.email}>`).join(", ");
  return (
    <>
      <button onClick={pop.open} className="flex max-w-full items-center gap-0.5 rounded text-xs text-ink-3 hover:text-ink-2" aria-label="Show details">
        <span className="truncate">
          to {list(m.to)}
          {m.cc.length > 0 && `, cc: ${list(m.cc)}`}
        </span>
        <ChevronDown size={14} className="shrink-0" />
      </button>
      <Popover anchor={pop.anchor} onClose={pop.close} className="w-[min(440px,calc(100vw-24px))] px-4 !py-3 text-xs">
        {row("from", <><b className="font-semibold">{m.from.name}</b> &lt;{m.from.email}&gt;</>)}
        {row("to", full(m.to))}
        {m.cc.length > 0 && row("cc", full(m.cc))}
        {m.bcc && m.bcc.length > 0 && row("bcc", full(m.bcc))}
        {row("date", fullDate(m.date))}
        {row("subject", subject)}
        {row("mailed-by", m.from.email.split("@")[1])}
        {row("security", "Standard encryption (TLS)")}
      </Popover>
    </>
  );
}

function InviteCard({ threadId, m }: { threadId: string; m: Message }) {
  const rsvp = useMail((s) => s.rsvp);
  const inv = m.invite!;
  const start = new Date(inv.start);
  const opts: { v: Rsvp; label: string }[] = [
    { v: "yes", label: "Yes" },
    { v: "maybe", label: "Maybe" },
    { v: "no", label: "No" },
  ];
  return (
    <div className="mb-4 max-w-xl overflow-hidden rounded-xl border border-line">
      <div className="flex gap-4 p-4">
        <div className="flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-lg border border-line text-center">
          <div className="w-full bg-[#d93025] py-0.5 text-[10px] font-semibold uppercase text-white">{start.toLocaleDateString([], { month: "short" })}</div>
          <div className="py-1 text-xl font-medium">{start.getDate()}</div>
          <div className="pb-1 text-[10px] text-ink-3">{start.toLocaleDateString([], { weekday: "short" })}</div>
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <div className="text-base font-medium">{inv.title}</div>
          <div className="mt-1 flex items-center gap-2 text-ink-2">
            <CalendarDays size={15} />
            {shortDateTime(inv.start)} – {new Date(inv.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-ink-2">
            <MapPin size={15} />
            <span className="truncate">{inv.location}</span>
          </div>
          <div className="mt-0.5 text-xs text-ink-3">Organizer: {inv.organizer.name}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-search/60 px-4 py-2.5">
        <span className="mr-2 text-sm text-ink-2">Going?</span>
        {opts.map((o) => (
          <button
            key={o.v}
            onClick={() => rsvp(threadId, m.id, o.v)}
            className={clsx(
              "flex h-8 items-center gap-1 rounded-full border px-4 text-sm font-medium",
              inv.rsvp === o.v ? "border-transparent bg-nav-active text-nav-active-ink" : "border-line text-ink-2 hover:bg-hover",
            )}
          >
            {inv.rsvp === o.v && <Check size={14} />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageView({
  t, m, expanded, onToggle, isLast, onReply,
}: {
  t: Thread;
  m: Message;
  expanded: boolean;
  onToggle: () => void;
  isLast: boolean;
  onReply: (mode: "reply" | "replyAll" | "forward", messageId: string) => void;
}) {
  const now = useMail((s) => s.now);
  const route = useRoute();
  const a = useMail.getState;
  const more = useAnchor();
  const [showQuote, setShowQuote] = useState(false);
  const isMobile = useIsMobile();
  const multiRecipients = [...m.to, ...m.cc].filter((c) => !isMe(c)).length + (isMe(m.from) ? 0 : 1) > 1;

  if (!expanded) {
    return (
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 border-t border-divider px-0 py-3 text-left md:gap-4"
      >
        <Avatar contact={m.from} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-semibold">{isMe(m.from) ? "me" : displayName(m.from)}</span>
            <span className="ml-auto shrink-0 text-xs text-ink-3">{listDate(m.date, now)}</span>
          </div>
          <div className="truncate text-sm text-ink-3">{stripHtml(m.html).slice(0, 180)}</div>
        </div>
      </button>
    );
  }

  return (
    <div className={clsx("border-t border-divider pt-4 first:border-t-0", isLast ? "pb-2" : "pb-4")}>
      <div className="flex items-start gap-3 md:gap-4">
        <Avatar contact={m.from} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 cursor-pointer" onClick={isLast ? undefined : onToggle}>
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-sm font-semibold">{isMe(m.from) ? ME.name : displayName(m.from)}</span>
                <span className="truncate text-xs text-ink-3">&lt;{m.from.email}&gt;</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <RecipientDetails m={m} subject={t.subject} />
              </div>
            </div>
            <span className="hidden shrink-0 pt-0.5 text-xs text-ink-3 sm:inline" data-tip={fullDate(m.date)}>
              {listDate(m.date, now)} ({relative(m.date, now)})
            </span>
            <div className="-mt-2 flex shrink-0 items-center">
              {isLast && !isMobile && (
                <IconButton size="sm" tip={t.starred ? "Starred" : "Not starred"} onClick={() => a().setStarred([t.id], !t.starred)}>
                  <Star size={18} className={t.starred ? "fill-star text-star" : ""} />
                </IconButton>
              )}
              <IconButton size="sm" tip="Reply" onClick={() => onReply("reply", m.id)}>
                <Reply size={18} />
              </IconButton>
              <IconButton size="sm" tip="More" onClick={more.open}>
                <MoreVertical size={18} />
              </IconButton>
            </div>
          </div>
          <div className="text-xs text-ink-3 sm:hidden">{listDate(m.date, now)} · {relative(m.date, now)}</div>
        </div>
      </div>
      <Popover anchor={more.anchor} onClose={more.close} align="end" className="w-56">
        <MenuItem autoFocus icon={<Reply size={18} />} label="Reply" onClick={() => { more.close(); onReply("reply", m.id); }} />
        {multiRecipients && <MenuItem icon={<ReplyAll size={18} />} label="Reply all" onClick={() => { more.close(); onReply("replyAll", m.id); }} />}
        <MenuItem icon={<Forward size={18} />} label="Forward" onClick={() => { more.close(); onReply("forward", m.id); }} />
        <MenuDivider />
        <MenuItem icon={<Printer size={18} />} label="Print" onClick={() => { more.close(); setTimeout(() => window.print(), 50); }} />
        {m.attachments.length > 0 && (
          <MenuItem icon={<Download size={18} />} label="Download all attachments" onClick={() => { more.close(); m.attachments.forEach(downloadAttachment); }} />
        )}
        <MenuItem label="Mark unread from here" onClick={() => { more.close(); a().setUnread([t.id], true); navigate(listRoute(route)); }} />
        {!isMe(m.from) && (
          <MenuItem
            label={`Search mail from ${firstName(m.from)}`}
            onClick={() => { more.close(); navigate({ view: "search", query: `from:${m.from.email}` }); }}
          />
        )}
      </Popover>

      <div className="pt-3 md:pl-14">
        {m.invite && <InviteCard threadId={t.id} m={m} />}
        <div className="mail-body" dangerouslySetInnerHTML={{ __html: m.html }} />
        {m.quoteHtml && (
          <div className="pt-2">
            <button
              data-tip={showQuote ? "Hide expanded content" : "Show trimmed content"}
              onClick={() => setShowQuote(!showQuote)}
              className="flex h-4 items-center rounded bg-chip px-1.5 text-ink-2 hover:bg-hover-strong"
            >
              <MoreHorizontal size={16} />
            </button>
            {showQuote && <div className="mail-body anim-fade pt-2" dangerouslySetInnerHTML={{ __html: m.quoteHtml }} />}
          </div>
        )}
        {m.attachments.length > 0 && (
          <div className="mt-5 border-t border-divider pt-4">
            <div className="mb-3 flex items-center gap-3 text-sm">
              <span className="font-medium">
                {m.attachments.length} attachment{m.attachments.length === 1 ? "" : "s"}
              </span>
              <span className="text-xs text-ink-3">· Scanned for viruses</span>
              {m.attachments.length > 1 && (
                <button className="ml-auto text-xs font-medium text-primary hover:underline" onClick={() => m.attachments.forEach(downloadAttachment)}>
                  Download all
                </button>
              )}
            </div>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 md:flex-wrap">
              {m.attachments.map((att) => (
                <AttachmentCard key={att.id} a={att} list={m.attachments} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function smartReplies(t: Thread): string[] {
  const last = t.messages[t.messages.length - 1];
  if (isMe(last.from) || t.category !== "primary") return [];
  if (last.invite) return ["See you there!", "Thanks, I'll be there.", "Can we push it 30 minutes?"];
  const text = stripHtml(last.html).toLowerCase();
  if (/coffee|free for|chat|meet|available/.test(text)) return ["Sounds great!", "Wednesday works for me.", "Let me check my calendar."];
  if (/\?/.test(text)) return ["Yes, sounds good.", "Let me check and get back to you.", "Thanks, will do!"];
  if (/attached|attach|photos|round/.test(text)) return ["Thank you!", "These look great!", "Got it, thanks."];
  return ["Thanks!", "Got it, thank you!", "Thanks for the update."];
}

export function ThreadView({ threadId, pane }: { threadId: string; pane?: boolean }) {
  const route = useRoute();
  const t = useMail((s) => s.threads[threadId]);
  const drafts = useMail((s) => s.drafts);
  const labels = useMail((s) => s.labels);
  const now = useMail((s) => s.now);
  const a = useMail.getState;
  const isMobile = useIsMobile();
  const list = useThreadList(route);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAllCollapsed, setShowAllCollapsed] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(true);

  const draft = draftForThread(drafts, threadId);

  useEffect(() => {
    const th = a().threads[threadId];
    if (!th) return;
    setExpanded(new Set([th.messages[th.messages.length - 1].id]));
    setShowAllCollapsed(false);
    setInlineOpen(true);
    if (th.unread) a().setUnread([threadId], false, true);
    a().setCursor(threadId);
    scrollRef.current?.scrollTo(0, 0);
  }, [threadId, a]);

  const lastId = t?.messages[t.messages.length - 1]?.id;
  useEffect(() => {
    if (lastId) setExpanded((s) => new Set(s).add(lastId));
    const th = a().threads[threadId];
    if (th?.unread) a().setUnread([threadId], false, true);
  }, [lastId, threadId, a]);

  const idx = list.findIndex((x) => x.id === threadId);
  const back = () => navigate(listRoute(route));
  const goRel = (d: number) => {
    const next = list[idx + d];
    if (next) navigate({ ...route, threadId: next.id });
  };

  const onReply = (mode: "reply" | "replyAll" | "forward", messageId?: string) => {
    const id = a().replyDraft(threadId, mode, messageId);
    if (mode === "forward" || isMobile) a().openCompose(id);
    else setInlineOpen(true);
  };

  useEffect(() => {
    const on = (e: Event) => onReply((e as CustomEvent).detail);
    window.addEventListener("mail:reply", on);
    return () => window.removeEventListener("mail:reply", on);
  });

  const threadLabels = useMemo(() => (t ? t.labelIds.map((id) => labels.find((l) => l.id === id)).filter(Boolean) : []), [t, labels]);

  if (!t) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-3">
        <div>This conversation could not be found. It may have been deleted.</div>
        <button className="rounded-full px-4 py-2 text-sm font-medium text-primary hover:bg-hover" onClick={back}>
          Back to list
        </button>
      </div>
    );
  }

  const msgs = t.messages;
  const collapsedRun = !showAllCollapsed && msgs.length > 4
    ? msgs.slice(1, -2).filter((m) => !expanded.has(m.id))
    : [];
  const hiddenIds = new Set(collapsedRun.length >= 2 ? collapsedRun.map((m) => m.id) : []);
  const multi = (() => {
    const last = msgs[msgs.length - 1];
    return [...last.to, ...last.cc].filter((c) => !isMe(c)).length + (isMe(last.from) ? 0 : 1) > 1;
  })();
  const suggestions = smartReplies(t);
  const snoozed = isSnoozed(t, now);

  const actionsBar = (
    <div className={clsx("no-print flex h-12 shrink-0 items-center gap-1", isMobile ? "px-1" : "pl-2 pr-2")}>
      {!pane && (
        <IconButton tip={`Back to ${route.view === "search" ? "Search results" : "list"} (u)`} onClick={back}>
          <ArrowLeft size={20} />
        </IconButton>
      )}
      <div className={clsx(isMobile && "ml-auto")}>
        <ConversationActions ids={[t.id]} route={route} onAfter={back} mobile={isMobile} size={isMobile ? 22 : 20} />
      </div>
      {!isMobile && idx >= 0 && (
        <div className="ml-auto flex items-center text-xs text-ink-2">
          <span className="px-2">
            {idx + 1} of {list.length}
          </span>
          <IconButton size="sm" tip="Newer (k)" disabled={idx <= 0} onClick={() => goRel(-1)}>
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton size="sm" tip="Older (j)" disabled={idx >= list.length - 1} onClick={() => goRel(1)}>
            <ChevronRight size={18} />
          </IconButton>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-w-0 flex-col">
      {actionsBar}
      <div ref={scrollRef} className="print-area scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className={clsx("mx-auto", isMobile ? "px-4 pb-28" : "px-4 pb-10 md:pl-[72px] md:pr-6", pane && "md:!pl-6")}>
          <div className="flex items-start gap-3 pb-3 pt-3">
            <h2 className="min-w-0 flex-1 font-display text-[22px] leading-8 text-ink">
              {t.subject}
              <span className="ml-2 inline-flex translate-y-[-3px] flex-wrap gap-1 align-middle">
                {t.important && (
                  <Bookmark size={16} className="inline fill-star text-star" aria-label="Important" />
                )}
                {t.inInbox && !t.trashed && !t.spam && !snoozed && (
                  <Chip label="Inbox" onRemove={() => { a().archive([t.id]); back(); }} />
                )}
                {t.trashed && <Chip label="Trash" />}
                {t.spam && <Chip label="Spam" color="#d93025" />}
                {snoozed && <Chip label={`Snoozed until ${shortDateTime(t.snoozedUntil!, now)}`} icon={<Clock size={12} />} color="#b06000" />}
                {t.muted && <Chip label="Muted" icon={<BellOff size={12} />} />}
                {threadLabels.map((l) => (
                  <Chip key={l!.id} label={l!.name} color={l!.color} onRemove={() => a().applyLabels([t.id], [], [l!.id])} />
                ))}
              </span>
            </h2>
            {!isMobile && (
              <div className="no-print flex shrink-0 items-center">
                {msgs.length > 1 && (
                  <IconButton
                    tip={expanded.size === msgs.length ? "Collapse all" : "Expand all"}
                    onClick={() => {
                      if (expanded.size === msgs.length) setExpanded(new Set([msgs[msgs.length - 1].id]));
                      else {
                        setExpanded(new Set(msgs.map((m) => m.id)));
                        setShowAllCollapsed(true);
                      }
                    }}
                  >
                    <ChevronsUpDown size={18} />
                  </IconButton>
                )}
                <IconButton tip="Print all" onClick={() => window.print()}>
                  <Printer size={18} />
                </IconButton>
              </div>
            )}
            {isMobile && (
              <button onClick={() => a().setStarred([t.id], !t.starred)} aria-label="Star" className="no-print pt-1">
                <Star size={22} className={t.starred ? "fill-star text-star" : "text-ink-3"} />
              </button>
            )}
          </div>

          <div>
            {msgs.map((m, i) => {
              if (hiddenIds.has(m.id)) {
                if (m.id !== collapsedRun[0].id) return null;
                return (
                  <button
                    key="collapsed"
                    onClick={() => setShowAllCollapsed(true)}
                    className="relative my-1 flex h-8 w-full items-center"
                    aria-label={`Show ${collapsedRun.length} older messages`}
                  >
                    <span className="absolute inset-x-0 top-1/2 border-t border-divider" />
                    <span className="absolute inset-x-0 top-[calc(50%+4px)] border-t border-divider" />
                    <span className="relative ml-1 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-sm font-medium text-ink-2 hover:bg-hover">
                      {collapsedRun.length}
                    </span>
                  </button>
                );
              }
              return (
                <MessageView
                  key={m.id}
                  t={t}
                  m={m}
                  isLast={i === msgs.length - 1}
                  expanded={expanded.has(m.id)}
                  onToggle={() =>
                    setExpanded((s) => {
                      const n = new Set(s);
                      if (n.has(m.id)) n.delete(m.id);
                      else n.add(m.id);
                      return n;
                    })
                  }
                  onReply={onReply}
                />
              );
            })}
          </div>

          {draft && inlineOpen && !isMobile ? (
            <div className="no-print pt-4 md:-ml-14">
              <InlineReply draftId={draft.id} onClosed={() => setInlineOpen(false)} />
            </div>
          ) : (
            <div className="no-print pt-4 md:pl-14">
              {draft && (
                <button
                  onClick={() => (isMobile ? a().openCompose(draft.id) : setInlineOpen(true))}
                  className="mb-4 flex w-full items-center gap-2 rounded-lg border border-line px-4 py-3 text-left text-sm hover:bg-hover"
                >
                  <span className="text-danger">Draft</span>
                  <span className="truncate text-ink-3">{stripHtml(draft.html.replace(/<div data-signature[\s\S]*?<\/div>/, "")) || "(empty)"}</span>
                </button>
              )}
              {!draft && suggestions.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        const id = a().replyDraft(threadId, "reply");
                        const d = a().drafts[id];
                        a().updateDraft(id, { html: `<p>${s}</p>` + d.html });
                        if (isMobile) a().openCompose(id);
                        else setInlineOpen(true);
                      }}
                      className="rounded-lg border border-[#a8c7fa] px-4 py-1.5 text-sm text-primary hover:bg-nav-active"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {!draft && !isMobile && (
                <div className="flex flex-wrap gap-3">
                  <ReplyButton icon={<Reply size={18} />} label="Reply" onClick={() => onReply("reply")} />
                  {multi && <ReplyButton icon={<ReplyAll size={18} />} label="Reply all" onClick={() => onReply("replyAll")} />}
                  <ReplyButton icon={<Forward size={18} />} label="Forward" onClick={() => onReply("forward")} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {isMobile && (
        <div className="no-print fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-divider bg-surface px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))]">
          <ReplyButton icon={<Reply size={18} />} label="Reply" onClick={() => onReply("reply")} grow />
          {multi && <ReplyButton icon={<ReplyAll size={18} />} label="Reply all" onClick={() => onReply("replyAll")} grow />}
          <ReplyButton icon={<Forward size={18} />} label="Forward" onClick={() => onReply("forward")} grow />
        </div>
      )}
    </div>
  );
}

function ReplyButton({ icon, label, onClick, grow }: { icon: React.ReactNode; label: string; onClick: () => void; grow?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line px-5 text-sm font-medium text-ink-2 hover:bg-hover",
        grow && "flex-1 px-2",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Chip({ label, color, onRemove, icon }: { label: string; color?: string; onRemove?: () => void; icon?: React.ReactNode }) {
  return (
    <span
      className="group/chip inline-flex h-5 items-center gap-1 rounded px-1.5 font-sans text-xs font-normal"
      style={color ? { background: color + "26", color } : { background: "var(--chip)", color: "var(--text-2)" }}
    >
      {icon}
      {label}
      {onRemove && (
        <button
          aria-label={`Remove label ${label}`}
          data-tip={`Remove this label`}
          onClick={onRemove}
          className="no-print -mr-1 hidden h-4 w-4 items-center justify-center rounded hover:bg-black/10 group-hover/chip:flex"
        >
          <X size={11} />
        </button>
      )}
    </span>
  );
}

export function EmptyPane() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-3">
      <svg width="96" height="72" viewBox="0 0 96 72" aria-hidden>
        <rect x="4" y="8" width="88" height="58" rx="8" fill="none" stroke="currentColor" strokeWidth="3" opacity=".4" />
        <path d="M10 16l38 28 38-28" fill="none" stroke="currentColor" strokeWidth="3" opacity=".4" strokeLinecap="round" />
      </svg>
      <div className="text-sm">No conversations selected</div>
    </div>
  );
}
