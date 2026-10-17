import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { HoverCard, Popover } from "radix-ui";
import { useMail, getMail } from "../lib/store";
import { useUI, ui } from "../lib/ui";
import { navigate, routeHash } from "../lib/router";
import { actions } from "../lib/actions";
import { msgsOf, viewThreads } from "../lib/selectors";
import { highlightWords } from "../lib/search";
import { highlight, isRichHtml, sanitize } from "../lib/html";
import { formatHeaderDate, messageDate, shortMessageDate } from "../lib/date";
import type { Address, Category, Message, Thread, ViewRef } from "../lib/types";
import { cn, colorFor, escapeHtml, firstName } from "../lib/utils";
import { downloadBlob } from "../lib/files";
import { bodyHtml } from "../lib/body";
import { Avatar, Button, Dialog, Icon, IconButton, LabelChip, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Tip } from "./ui";
import { ThreadActions } from "./ThreadActions";
import { AttachmentGrid, InviteCard } from "./Attachments";
import { Composer } from "./LazyComposer";
import { useIsMobile, useNow } from "../hooks/useMedia";
import { runSearch } from "./SearchBar";

const NO_REPLY = /(no-?reply|notifications?|digest|statements|billing|tracking|offers|orders|picks|events|kudos|hello@|brew@|team@canvasly|reservations|appointments|leasing|claim@|security@|webinars)/i;

export function smartReplies(m: Message | undefined): string[] {
  if (!m || NO_REPLY.test(m.from.email)) return [];
  const t = m.text.toLowerCase();
  if (m.invite || /(meeting|call|review|sync|standup|coffee|lunch|meetup)/.test(t))
    return ["Sounds good, see you then!", "I'll be there.", "Can we push this by 30 minutes?"];
  if (/(attached|attachment|deck|invoice|photos|notes)/.test(t)) return ["Thanks, I'll take a look!", "Got it, thank you!", "These look great!"];
  if (/thank/.test(t)) return ["You're welcome!", "Happy to help!", "Anytime!"];
  if (t.includes("?")) return ["Yes, that works for me.", "Let me check and get back to you.", "Sounds good!"];
  return ["Thanks!", "Sounds good.", "Got it, thanks!"];
}

function toEml(m: Message, subject: string) {
  const line = (a: Address[]) => a.map((x) => (x.name ? `"${x.name}" <${x.email}>` : x.email)).join(", ");
  const headers = [
    `From: ${line([m.from])}`,
    `To: ${line(m.to)}`,
    m.cc.length ? `Cc: ${line(m.cc)}` : "",
    `Subject: ${m.subject || subject}`,
    `Date: ${new Date(m.date).toUTCString()}`,
    `Message-ID: <${m.id}@local.mail>`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
  ].filter(Boolean);
  return `${headers.join("\r\n")}\r\n\r\n<html><body>${bodyHtml(m)}${m.quoted ? `<div class="quote">${m.quoted}</div>` : ""}</body></html>`;
}

function SenderCard({ addr, children }: { addr: Address; children: React.ReactNode }) {
  const contact = useMail((s) => s.contacts[addr.email.toLowerCase()]);
  const me = useMail((s) => s.account);
  const isMe = addr.email.toLowerCase() === me.email.toLowerCase();
  return (
    <HoverCard.Root openDelay={450} closeDelay={120}>
      <HoverCard.Trigger asChild>{children}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content side="bottom" align="start" sideOffset={6} collisionPadding={8} className="no-print z-[80] w-80 rounded-2xl bg-menu font-sans text-fg shadow-e3 animate-pop">
          <div className="flex gap-4 p-5">
            <Avatar name={addr.name || addr.email} email={addr.email} size={56} color={isMe ? me.color : contact?.color} />
            <div className="min-w-0">
              <div className="truncate text-base">{isMe ? me.name : addr.name || addr.email}</div>
              <div className="truncate font-body text-sm text-fg-2">{addr.email}</div>
              {contact?.title && <div className="mt-1 truncate font-body text-xs text-fg-3">{contact.title}{contact.company ? ` · ${contact.company}` : ""}</div>}
              {contact?.phone && <div className="truncate font-body text-xs text-fg-3">{contact.phone}</div>}
            </div>
          </div>
          <div className="flex items-center gap-1 border-t border-line px-3 py-2">
            <Tip label="Send email">
              <button type="button" aria-label="Send email" onClick={() => actions.compose({ kind: "new", to: [addr] })} className="inline-flex size-10 items-center justify-center rounded-full text-icon hover:bg-hover">
                <Icon name="mail" size={20} />
              </button>
            </Tip>
            <Tip label="Copy email address">
              <button
                type="button"
                aria-label="Copy email address"
                onClick={() => {
                  navigator.clipboard?.writeText(addr.email).catch(() => undefined);
                  ui().showToast({ message: "Email address copied to clipboard." });
                }}
                className="inline-flex size-10 items-center justify-center rounded-full text-icon hover:bg-hover"
              >
                <Icon name="content_copy" size={20} />
              </button>
            </Tip>
            <Tip label="Search emails from this sender">
              <button type="button" aria-label="Search emails" onClick={() => runSearch(`from:${addr.email}`)} className="inline-flex size-10 items-center justify-center rounded-full text-icon hover:bg-hover">
                <Icon name="person_search" size={20} />
              </button>
            </Tip>
            <button type="button" onClick={() => ui().set({ sidePanel: "contacts" })} className="ml-auto rounded-full px-3 py-2 text-sm font-medium text-primary hover:bg-hover">
              Open contact
            </button>
          </div>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

function Recipients({ m, subject }: { m: Message; subject: string }) {
  const me = useMail((s) => s.account.email.toLowerCase());
  const nm = (a: Address) => (a.email.toLowerCase() === me ? "me" : firstName(a));
  const all = [...m.to, ...m.cc];
  const summary = all.length ? `to ${all.slice(0, 3).map(nm).join(", ")}${all.length > 3 ? ` +${all.length - 3}` : ""}` : "to (no recipients)";
  const row = (k: string, v: React.ReactNode) => (
    <tr>
      <td className="whitespace-nowrap py-0.5 pr-3 text-right align-top text-fg-3">{k}:</td>
      <td className="py-0.5 text-fg">{v}</td>
    </tr>
  );
  const fmt = (list: Address[]) => list.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)).join(", ");
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" onClick={(e) => e.stopPropagation()} className="inline-flex max-w-full items-center rounded text-xs text-fg-3 hover:text-fg-2">
          <span className="truncate">{summary}</span>
          <Icon name="arrow_drop_down" size={18} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} collisionPadding={8} className="no-print z-[80] max-w-[min(520px,94vw)] rounded-lg bg-menu p-4 font-body text-xs text-fg shadow-e2 animate-pop">
          <table>
            <tbody>
              {row("from", <><b className="font-medium">{m.from.name}</b> &lt;{m.from.email}&gt;</>)}
              {row("to", fmt(m.to) || "—")}
              {m.cc.length > 0 && row("cc", fmt(m.cc))}
              {m.bcc.length > 0 && row("bcc", fmt(m.bcc))}
              {row("date", formatHeaderDate(m.date))}
              {row("subject", m.subject || subject)}
              {row("mailed-by", m.from.email.split("@")[1])}
              {row("signed-by", m.from.email.split("@")[1])}
              {row("security", <span className="inline-flex items-center gap-1"><Icon name="lock" size={14} /> Standard encryption (TLS)</span>)}
            </tbody>
          </table>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function onBodyClick(e: MouseEvent, threadId: string) {
  const a = (e.target as HTMLElement).closest("a");
  if (!a) return;
  e.preventDefault();
  const href = a.getAttribute("href") || "";
  if (href.startsWith("#unsubscribe")) return ui().set({ confirm: { title: "Unsubscribe?", body: "You'll stop getting marketing emails from this sender.", confirmLabel: "Unsubscribe", onConfirm: () => actions.unsubscribe(threadId) } });
  if (href.startsWith("mailto:")) {
    const email = href.slice(7).split("?")[0];
    return actions.compose({ kind: "new", to: [{ name: "", email }] });
  }
  if (/^https?:/i.test(href)) ui().set({ linkWarning: href });
}

function MessageItem({
  m, thread, expanded, onToggle, isLast, words, compact, onReply,
}: {
  m: Message; thread: Thread; expanded: boolean; onToggle: () => void; isLast: boolean; words: string[]; compact: boolean;
  onReply: (kind: "reply" | "replyAll" | "forward") => void;
}) {
  const now = useNow(60_000);
  const account = useMail((s) => s.account);
  const contact = useMail((s) => s.contacts[m.from.email.toLowerCase()]);
  const isMe = m.from.email.toLowerCase() === account.email.toLowerCase();
  const [showQuote, setShowQuote] = useState(false);
  const [original, setOriginal] = useState(false);
  const html = useMemo(() => (expanded ? highlight(sanitize(bodyHtml(m)), words) : ""), [expanded, m.html, m.signature, words]);
  const quoted = useMemo(() => (expanded && m.quoted ? sanitize(m.quoted) : ""), [expanded, m.quoted]);
  const rich = isRichHtml(m.html);
  const multi = m.to.length + m.cc.length > 1;
  const promo = thread.category === "promotions" || thread.category === "social";
  const name = isMe ? account.name : m.from.name || m.from.email;
  const avatar = <Avatar name={name} email={m.from.email} color={isMe ? account.color : contact?.color || colorFor(m.from.email)} size={compact ? 32 : 40} />;

  if (!expanded) {
    return (
      <div role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => e.key === "Enter" && onToggle()} className={cn("flex cursor-pointer items-center gap-3 border-t border-line py-3 hover:bg-surface-2", compact ? "px-3" : "px-4 sm:px-6")}>
        {avatar}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-sans text-sm font-medium text-fg">{name}</span>
            {m.attachments.length > 0 && <Icon name="attach_file" size={14} className="shrink-0 text-fg-3" />}
            <span className="ml-auto shrink-0 font-body text-xs text-fg-3">{compact ? shortMessageDate(m.date, now) : messageDate(m.date, now)}</span>
          </div>
          <div className="truncate font-body text-sm text-fg-3">{m.text}</div>
        </div>
      </div>
    );
  }

  return (
    <article className={cn("border-t border-line pb-4 pt-4 first:border-t-0", compact ? "px-3" : "px-4 sm:px-6")} aria-label={`Message from ${name}`}>
      <div className="flex gap-3">
        <SenderCard addr={m.from}>
          <button type="button" className="h-fit rounded-full" aria-label={`Contact card for ${name}`}>{avatar}</button>
        </SenderCard>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 cursor-pointer" onClick={isLast ? undefined : onToggle}>
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                <SenderCard addr={m.from}>
                  <span className="truncate font-sans text-sm font-bold text-fg">{name}</span>
                </SenderCard>
                {!compact && <span className="truncate font-body text-xs text-fg-3">&lt;{m.from.email}&gt;</span>}
                {promo && !isMe && !thread.unsubscribed && (
                  <button type="button" onClick={(e) => (e.stopPropagation(), actions.unsubscribe(thread.id))} className="font-body text-xs text-fg-3 underline hover:text-fg">
                    Unsubscribe
                  </button>
                )}
                {thread.unsubscribed && promo && <span className="font-body text-xs text-fg-3">· Unsubscribed</span>}
              </div>
              <Recipients m={m} subject={thread.subject} />
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {m.attachments.length > 0 && !compact && <Icon name="attach_file" size={16} className="mr-1 text-fg-3" />}
              <Tip label={formatHeaderDate(m.date)}>
                <span className="mr-1 whitespace-nowrap font-body text-xs text-fg-3">{compact ? shortMessageDate(m.date, now) : messageDate(m.date, now)}</span>
              </Tip>
              {!compact && (
                <IconButton
                  icon="star"
                  fill={thread.starred}
                  size="sm"
                  label={thread.starred ? "Starred" : "Not starred"}
                  className={thread.starred ? "text-star" : ""}
                  onClick={() => actions.star([thread.id], !thread.starred)}
                />
              )}
              {m.status !== "scheduled" && <IconButton icon="reply" size="sm" label="Reply" onClick={() => onReply("reply")} />}
              <Menu>
                <Tip label="More">
                  <MenuTrigger asChild>
                    <button type="button" aria-label="More message options" className="inline-flex size-8 items-center justify-center rounded-full text-icon hover:bg-hover">
                      <Icon name="more_vert" size={18} />
                    </button>
                  </MenuTrigger>
                </Tip>
                <MenuContent align="end">
                  <MenuItem icon="reply" onSelect={() => onReply("reply")}>Reply</MenuItem>
                  {multi && <MenuItem icon="reply_all" onSelect={() => onReply("replyAll")}>Reply all</MenuItem>}
                  <MenuItem icon="forward" onSelect={() => onReply("forward")}>Forward</MenuItem>
                  <MenuSeparator />
                  <MenuItem icon="filter_alt" onSelect={() => runSearch(`from:${m.from.email}`)}>Find messages from {firstName(m.from)}</MenuItem>
                  <MenuItem icon="print" onSelect={() => setTimeout(() => window.print(), 50)}>Print</MenuItem>
                  <MenuItem icon="download" onSelect={() => downloadBlob(new Blob([toEml(m, thread.subject)], { type: "message/rfc822" }), `${(m.subject || thread.subject || "message").replace(/[^\w\- ]+/g, "").trim() || "message"}.eml`)}>
                    Download message
                  </MenuItem>
                  <MenuItem icon="code" onSelect={() => setOriginal(true)}>Show original</MenuItem>
                  <MenuSeparator />
                  <MenuItem icon="mark_email_unread" onSelect={() => { getMail().setUnread([thread.id], true); navigate(routeHash({ view: { kind: "folder", folder: "inbox" } })); }}>
                    Mark as unread
                  </MenuItem>
                  {thread.messageIds.length > 1 && (
                    <MenuItem
                      icon="delete"
                      danger
                      onSelect={() => {
                        const snap = getMail().snapshot([thread.id]);
                        getMail().deleteMessage(m.id);
                        const undo = () => getMail().restore(snap);
                        ui().showToast({ message: "Message deleted.", undo, actions: [{ label: "Undo", run: undo }] });
                      }}
                    >
                      Delete this message
                    </MenuItem>
                  )}
                </MenuContent>
              </Menu>
            </div>
          </div>
        </div>
      </div>
      <div className={cn("min-w-0", compact ? "mt-3" : "mt-3 sm:pl-[52px]")}>
        {m.status === "scheduled" && m.scheduledAt && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-primary-soft px-4 py-2.5 font-sans text-sm text-on-primary-soft">
            <Icon name="schedule_send" size={20} />
            <span className="flex-1">Send scheduled for {formatHeaderDate(m.scheduledAt)}</span>
            <Button variant="text" className="h-8" onClick={() => actions.cancelScheduled(m.id)}>Cancel send</Button>
          </div>
        )}
        <div
          className={cn("mail-body", rich && "rounded-lg dark:bg-white dark:p-3 dark:text-[#202124]")}
          onClick={(e) => onBodyClick(e, thread.id)}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {m.quoted && (
          <>
            <Tip label={showQuote ? "Hide expanded content" : "Show trimmed content"}>
              <button
                type="button"
                aria-label={showQuote ? "Hide trimmed content" : "Show trimmed content"}
                onClick={() => setShowQuote(!showQuote)}
                className="mt-2 inline-flex h-3.5 w-6 items-center justify-center rounded-sm bg-surface-3 text-fg-2 hover:bg-hover-strong"
              >
                <Icon name="more_horiz" size={16} />
              </button>
            </Tip>
            {showQuote && <div className="mail-body mt-2" dangerouslySetInnerHTML={{ __html: quoted }} />}
          </>
        )}
        {m.invite && <InviteCard messageId={m.id} />}
        <AttachmentGrid atts={m.attachments} messageId={m.id} invite={m.invite} inSpam={thread.labels.includes("SPAM")} />
      </div>
      <Dialog open={original} onOpenChange={setOriginal} title="Original message" className="w-[min(94vw,760px)]" footer={<Button onClick={() => setOriginal(false)}>Close</Button>}>
        <table className="mb-4 w-full font-body text-xs">
          <tbody>
            {[["Message ID", `<${m.id}@local.mail>`], ["Created at", formatHeaderDate(m.date)], ["From", `${m.from.name} <${m.from.email}>`], ["To", m.to.map((a) => a.email).join(", ")], ["Subject", m.subject || thread.subject], ["SPF", `PASS with domain ${m.from.email.split("@")[1]}`], ["DKIM", `'PASS' with domain ${m.from.email.split("@")[1]}`], ["DMARC", "'PASS'"]].map(([k, v]) => (
              <tr key={k} className="border-b border-line">
                <td className="w-32 py-1.5 pr-3 text-fg-3">{k}</td>
                <td className="py-1.5 font-mono text-fg">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-fg-2">{toEml(m, thread.subject)}</pre>
      </Dialog>
    </article>
  );
}

export function ThreadView({ threadId, view, tab, page, split }: { threadId: string; view: ViewRef; tab: Category; page: number; split?: boolean }) {
  const isMobile = useIsMobile();
  const thread = useMail((s) => s.threads[threadId]);
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const settings = useMail((s) => s.settings);
  const account = useMail((s) => s.account);
  const labels = useMail((s) => s.labels);
  const composers = useUI((s) => s.composers);
  const reveal = useUI((s) => s.revealMessage);
  const scrollRef = useRef<HTMLDivElement>(null);
  const compact = isMobile || !!split;

  const ordered = useMemo(() => viewThreads({ threads, messages, settings, account, labels }, view, tab).map((t) => t.id), [threads, messages, settings, account, labels, view, tab]);
  const idx = ordered.indexOf(threadId);

  const ms = thread ? msgsOf(thread, messages) : [];
  const real = ms.filter((m) => m.status !== "draft");
  const drafts = ms.filter((m) => m.status === "draft");
  const lastReal = real[real.length - 1];
  const lastReceived = [...real].reverse().find((m) => m.status === "received");

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const seenCount = useRef(0);

  useEffect(() => {
    const t = getMail().threads[threadId];
    if (t?.unread) getMail().setUnread([threadId], false);
    const list = t ? msgsOf(t, getMail().messages).filter((m) => m.status !== "draft") : [];
    setExpanded(new Set(list.length ? [list[list.length - 1].id] : []));
    setShowAll(false);
    seenCount.current = list.length;
    scrollRef.current?.scrollTo({ top: 0 });
    ui().set({ focusedId: threadId });
  }, [threadId]);

  useEffect(() => {
    if (real.length > seenCount.current && lastReal) {
      setExpanded((e) => new Set([...e, lastReal.id]));
      if (thread?.unread) getMail().setUnread([threadId], false);
    }
    seenCount.current = real.length;
  }, [real.length, lastReal, thread?.unread, threadId]);

  useEffect(() => {
    if (!reveal) return;
    const el = document.getElementById(`draft-${reveal}`);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      ui().set({ revealMessage: null });
    }
  });

  const back = () => navigate(routeHash({ view, tab, page }));
  const goTo = (id: string | undefined) => id && navigate(routeHash({ view, tab, page, threadId: id }));

  if (!thread || !real.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center font-sans text-fg-2">
        <Icon name="mail" size={48} className="text-fg-3" />
        <div>{thread ? "This conversation only contains a draft." : "This conversation was deleted or moved."}</div>
        <Button variant="tonal" onClick={back}>Back to {view.kind === "search" ? "search results" : "the list"}</Button>
      </div>
    );
  }

  const afterRemove = () => {
    const mode = settings.autoAdvance;
    const target = mode === "newer" ? ordered[idx - 1] : mode === "older" ? ordered[idx + 1] : undefined;
    navigate(routeHash({ view, tab, page, threadId: split ? (ordered[idx + 1] ?? ordered[idx - 1]) ?? null : target ?? null }));
  };

  const reply = (m: Message, kind: "reply" | "replyAll" | "forward", html?: string) => {
    actions.reply(m.id, kind, !isMobile, html);
  };

  const words = view.kind === "search" ? highlightWords(view.query) : [];
  const inlineDrafts = drafts.filter((d) => !composers.some((c) => c.id === d.id));
  const poppedDrafts = drafts.filter((d) => composers.some((c) => c.id === d.id));
  const userLabels = thread.labels.map((l) => labels.find((x) => x.id === l)).filter(Boolean) as typeof labels;
  const important = thread.labels.includes("IMPORTANT");
  const collapseMiddle = !showAll && real.length >= 5;
  const hiddenMiddle = collapseMiddle ? real.slice(1, -2).filter((m) => !expanded.has(m.id)) : [];
  const smart = !inlineDrafts.length && lastReal && lastReal === lastReceived ? smartReplies(lastReceived) : [];
  const multi = lastReal ? lastReal.to.length + lastReal.cc.length > 1 : false;
  const toggle = (id: string) => setExpanded((e) => {
    const n = new Set(e);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col" aria-label={`Conversation: ${thread.subject}`}>
      <div className={cn("no-print flex h-12 shrink-0 items-center gap-0.5 border-line pr-2", isMobile ? "border-b px-1" : "pl-2", split && "border-b")}>
        {!split && <IconButton icon="arrow_back" label={`Back to ${view.kind === "search" ? "Search results" : "list"}`} shortcut="u" onClick={back} />}
        {split && <IconButton icon="close" label="Close" onClick={back} />}
        <ThreadActions ids={[threadId]} view={view} hotkeys inThread onRemoved={afterRemove} compact={compact} />
        <div className="ml-auto flex shrink-0 items-center">
          {!compact && idx >= 0 && (
            <span className="px-2 font-body text-xs text-fg-2 tabular-nums">
              {idx + 1} of {ordered.length}
            </span>
          )}
          <IconButton icon="chevron_left" label="Newer" shortcut="k" disabled={idx <= 0} onClick={() => goTo(ordered[idx - 1])} />
          <IconButton icon="chevron_right" label="Older" shortcut="j" disabled={idx < 0 || idx >= ordered.length - 1} onClick={() => goTo(ordered[idx + 1])} />
        </div>
      </div>
      <div ref={scrollRef} className="print-area min-h-0 flex-1 overflow-y-auto">
        <div className={cn("flex items-start gap-3 pb-2 pt-5", compact ? "px-3" : "px-4 sm:pl-[72px] sm:pr-6")}>
          <div className="min-w-0 flex-1">
            <h2 className={cn("inline font-sans text-fg", isMobile ? "text-xl leading-7" : "text-[22px] leading-8")}>
              {thread.subject || "(no subject)"}
            </h2>
            {!isMobile && settings.importanceMarkers && (
              <button
                type="button"
                aria-label={important ? "Mark as not important" : "Mark as important"}
                onClick={() => actions.important([threadId], !important)}
                className={cn("no-print ml-2 inline-flex translate-y-0.5 rounded-full", important ? "text-[var(--important)]" : "text-fg-3")}
              >
                <Icon name="label_important" fill={important} size={20} />
              </button>
            )}
            <span className="ml-2 inline-flex translate-y-[-2px] flex-wrap gap-1 align-middle">
              {thread.labels.includes("INBOX") && !thread.labels.includes("TRASH") && !thread.labels.includes("SPAM") && (
                <LabelChip name="Inbox" color="#8e918f" onRemove={() => (actions.archive([threadId]), afterRemove())} />
              )}
              {thread.labels.includes("TRASH") && <LabelChip name="Trash" color="#8e918f" onRemove={() => actions.moveToInbox([threadId])} />}
              {thread.labels.includes("SPAM") && <LabelChip name="Spam" color="#d93025" onRemove={() => actions.notSpam([threadId])} />}
              {thread.snoozedUntil && thread.snoozedUntil > Date.now() && <LabelChip name="Snoozed" color="#e37400" onRemove={() => actions.unsnooze([threadId])} />}
              {userLabels.map((l) => (
                <LabelChip key={l.id} name={l.name} color={l.color} onRemove={() => actions.labels([threadId], [], [l.id])} />
              ))}
            </span>
          </div>
          <div className="no-print flex shrink-0 items-center">
            {isMobile ? (
              <IconButton icon="star" fill={thread.starred} label={thread.starred ? "Remove star" : "Add star"} className={thread.starred ? "text-star" : ""} onClick={() => actions.star([threadId], !thread.starred)} />
            ) : (
              <>
                {real.length > 1 && (
                  <IconButton
                    icon={expanded.size >= real.length ? "unfold_less" : "unfold_more"}
                    label={expanded.size >= real.length ? "Collapse all" : "Expand all"}
                    onClick={() => {
                      if (expanded.size >= real.length) setExpanded(new Set([lastReal.id]));
                      else {
                        setShowAll(true);
                        setExpanded(new Set(real.map((m) => m.id)));
                      }
                    }}
                  />
                )}
                <IconButton icon="print" label="Print all" onClick={() => setTimeout(() => window.print(), 50)} />
              </>
            )}
          </div>
        </div>

        {thread.labels.includes("SPAM") && (
          <div className={cn("mb-2 flex flex-wrap items-center gap-3 rounded-lg bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface))] px-4 py-3 font-sans text-sm text-fg", compact ? "mx-3" : "mx-4 sm:ml-[72px] sm:mr-6")}>
            <Icon name="warning" size={20} className="text-danger" />
            <span className="flex-1">Why is this message in spam? It is similar to messages that were identified as spam in the past.</span>
            <Button variant="outlined" className="h-8" onClick={() => actions.notSpam([threadId])}>Report not spam</Button>
          </div>
        )}

        <div>
          {real.map((m, i) => {
            if (collapseMiddle && hiddenMiddle.includes(m)) {
              if (m !== hiddenMiddle[0]) return null;
              return (
                <div key="more" className="relative flex h-6 items-center border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className={cn("absolute inline-flex size-10 -translate-y-px items-center justify-center rounded-full border border-outline-soft bg-surface font-sans text-sm font-medium text-fg-2 hover:bg-surface-2", compact ? "left-3" : "left-4 sm:left-6")}
                    aria-label={`Show ${hiddenMiddle.length} older messages`}
                  >
                    {hiddenMiddle.length}
                  </button>
                  <div className="h-px flex-1" />
                </div>
              );
            }
            return (
              <MessageItem
                key={m.id}
                m={m}
                thread={thread}
                expanded={expanded.has(m.id) || i === real.length - 1}
                isLast={i === real.length - 1}
                onToggle={() => toggle(m.id)}
                words={words}
                compact={compact}
                onReply={(kind) => reply(m, kind)}
              />
            );
          })}
        </div>

        <div className={cn("no-print pb-10", compact ? "px-3" : "px-4 sm:pl-[72px] sm:pr-6")}>
          {inlineDrafts.map((d) =>
            isMobile ? (
              <button key={d.id} id={`draft-${d.id}`} type="button" onClick={() => actions.openDraft(d.id)} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-outline-soft px-4 py-3 text-left font-body text-sm hover:bg-hover">
                <Icon name="draft" size={20} className="text-danger" />
                <span className="font-medium text-danger">Draft</span>
                <span className="truncate text-fg-3">{d.text || "(empty)"}</span>
              </button>
            ) : (
              <div key={d.id} id={`draft-${d.id}`} className="mt-3">
                <Composer id={d.id} variant="inline" />
              </div>
            ),
          )}
          {poppedDrafts.map((d) => (
            <button key={d.id} type="button" onClick={() => actions.openDraft(d.id)} className="mt-3 flex items-center gap-2 font-body text-sm text-fg-3 hover:text-fg">
              <Icon name="open_in_new" size={16} />
              <span className="text-danger">Draft</span> — editing in a pop-out window
            </button>
          ))}
          {!inlineDrafts.length && lastReal && (
            <>
              {smart.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {smart.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => reply(lastReceived!, "reply", `<p>${escapeHtml(s)}</p>`)}
                      className="inline-flex h-9 items-center rounded-lg border border-outline px-4 font-sans text-sm font-medium text-primary hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outlined" icon="reply" onClick={() => reply(lastReal, settings.defaultReply === "replyAll" && multi ? "replyAll" : "reply")}>
                  {settings.defaultReply === "replyAll" && multi ? "Reply all" : "Reply"}
                </Button>
                {multi && settings.defaultReply !== "replyAll" && <Button variant="outlined" icon="reply_all" onClick={() => reply(lastReal, "replyAll")}>Reply all</Button>}
                {multi && settings.defaultReply === "replyAll" && <Button variant="outlined" icon="reply" onClick={() => reply(lastReal, "reply")}>Reply</Button>}
                <Button variant="outlined" icon="forward" onClick={() => reply(lastReal, "forward")}>Forward</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function lastMessageOf(threadId: string) {
  const s = getMail();
  const t = s.threads[threadId];
  if (!t) return undefined;
  return msgsOf(t, s.messages).filter((m) => m.status === "received" || m.status === "sent").pop();
}

