import { useEffect, useMemo, useRef, useState } from "react";
import { act, openDraft, openReply } from "../lib/actions";
import { contactKind, ME } from "../lib/contacts";
import { formatFullDate, formatListDate, formatLongDate, formatScheduleLabel, formatSize } from "../lib/format";
import { useEffectiveView, useIsMobile, useRoute, useViewThreads } from "../lib/hooks";
import { navigate, threadHash, viewHash } from "../lib/router";
import { parseQuery, queryTerms } from "../lib/search";
import { isUnread, messageText, threadMessages } from "../lib/selectors";
import { useMail } from "../lib/store";
import type { Contact, Message, Thread, View } from "../lib/types";
import { useUI } from "../lib/ui";
import { cn } from "../lib/utils";
import { AttachmentCard } from "./Attachments";
import { ComposeForm } from "./Compose";
import { LabelMenuButton, MoveMenuButton, SnoozeMenuButton, StarButton } from "./menus";
import { Avatar, Button, Icon, IconButton, LabelChip, MenuDivider, MenuItem, Popover, useMenu } from "./ui";

const hlCache = new Map<string, string>();
function highlightHtml(html: string, terms: string[]) {
  if (!terms.length) return html;
  const key = `${terms.join("|")}::${html}`;
  const hit = hlCache.get(key);
  if (hit) return hit;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild!;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const n of nodes) {
    if (!re.test(n.data)) continue;
    re.lastIndex = 0;
    const frag = doc.createDocumentFragment();
    n.data.split(re).forEach((part, i) => {
      if (i % 2) {
        const m = doc.createElement("mark");
        m.textContent = part;
        frag.appendChild(m);
      } else if (part) frag.appendChild(doc.createTextNode(part));
    });
    n.replaceWith(frag);
  }
  const out = root.innerHTML;
  if (hlCache.size > 200) hlCache.clear();
  hlCache.set(key, out);
  return out;
}

function nameOf(c: Contact) {
  return c.email === ME.email ? "me" : c.name;
}

export function ThreadView({ view, threadId, split }: { view: View; threadId: string; split?: boolean }) {
  const thread = useMail((s) => s.threads[threadId]) as Thread | undefined;
  const messages = useMail((s) => s.messages);
  const labels = useMail((s) => s.labels);
  const composes = useUI((s) => s.composes);
  const effective = useEffectiveView(view);
  const { threads: list, folder } = useViewThreads(effective);
  const isMobile = useIsMobile();
  const route = useRoute();
  const scrollRef = useRef<HTMLDivElement>(null);

  const ms = useMemo(() => (thread ? threadMessages(thread, messages) : []), [thread, messages]);
  const index = list.findIndex((t) => t.id === threadId);
  const newer = index > 0 ? list[index - 1] : undefined;
  const older = index >= 0 && index < list.length - 1 ? list[index + 1] : undefined;
  const searchQ = view.kind === "search" ? view.q : "";
  const terms = useMemo(() => (searchQ ? queryTerms(parseQuery(searchQ)) : []), [searchQ]);

  useEffect(() => {
    if (thread && isUnread(thread, useMail.getState().messages)) useMail.getState().setRead([thread.id], true);
    useUI.getState().setFocused(threadId);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [threadId]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const known = useRef<Set<string>>(new Set());
  useEffect(() => {
    const cur = thread ? threadMessages(thread, useMail.getState().messages) : [];
    const delivered = cur.filter((m) => m.status !== "draft");
    const e = new Set<string>();
    delivered.forEach((m, i) => {
      if (m.unread || i === delivered.length - 1 || m.status === "scheduled") e.add(m.id);
    });
    known.current = new Set(delivered.map((m) => m.id));
    setExpanded(e);
    setShowAll(false);
  }, [threadId]);

  useEffect(() => {
    const fresh = ms.filter((m) => m.status !== "draft" && !known.current.has(m.id)).map((m) => m.id);
    if (!fresh.length) return;
    fresh.forEach((id) => known.current.add(id));
    setExpanded((s) => new Set([...s, ...fresh]));
  }, [ms]);

  useEffect(() => {
    const onKey = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === "expand-all") setExpanded(new Set(ms.map((m) => m.id)));
      if (detail === "collapse-all") setExpanded(new Set([ms.filter((m) => m.status !== "draft").pop()?.id ?? ""]));
    };
    window.addEventListener("thread-command", onKey);
    return () => window.removeEventListener("thread-command", onKey);
  }, [ms]);

  if (!thread) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-fg-3">
        <Icon name="mail" size={48} />
        <div>This conversation no longer exists.</div>
        <Button variant="tonal" onClick={() => navigate(viewHash(view))}>
          Back to {view.kind === "search" ? "results" : "list"}
        </Button>
      </div>
    );
  }

  const back = () => navigate(viewHash(view));
  const leave = () => {
    if (split && older) navigate(threadHash(view, older.id));
    else if (split && newer) navigate(threadHash(view, newer.id));
    else back();
  };
  const ids = [thread.id];
  const delivered = ms.filter((m) => m.status !== "draft");
  const drafts = ms.filter((m) => m.status === "draft");
  const inlineCompose = isMobile ? undefined : composes.find((c) => c.inline && c.threadId === thread.id);
  const last = delivered[delivered.length - 1];
  const threadLabels = thread.labels.map((id) => labels.find((l) => l.id === id)).filter(Boolean) as typeof labels;
  const multi = last && [...last.to, ...last.cc].filter((c) => c.email !== ME.email).length + (last.from.email === ME.email ? 0 : 1) > 1;

  type Item = { kind: "msg"; m: Message; open: boolean } | { kind: "more"; count: number };
  const items: Item[] = [];
  const lastOpen = delivered.reduce((acc, m, i) => (expanded.has(m.id) ? i : acc), -1);
  for (let i = 0; i < delivered.length; i++) {
    const m = delivered[i];
    const open = expanded.has(m.id);
    if (!showAll && !open && i >= 1 && i < lastOpen - 1) {
      let j = i;
      while (j < lastOpen - 1 && !expanded.has(delivered[j].id)) j++;
      if (j - i >= 2) {
        items.push({ kind: "more", count: j - i });
        i = j - 1;
        continue;
      }
    }
    items.push({ kind: "msg", m, open });
  }

  const toolbar = (
    <div className={cn("no-print flex h-12 shrink-0 items-center gap-0.5 px-2", isMobile && "h-14 border-b border-line-soft")}>
      {!split && <IconButton icon="arrow_back" label={`Back to ${view.kind === "search" ? "Search results" : "list"}`} onClick={back} />}
      {split && isMobile && <IconButton icon="arrow_back" label="Back" onClick={back} />}
      {isMobile && <div className="flex-1" />}
      {thread.trashed ? (
        <>
          <IconButton icon="restore_from_trash" label="Move to Inbox" onClick={() => (act.moveToInbox(ids), leave())} />
          <IconButton icon="delete_forever" label="Delete forever" onClick={() => act.deleteForever(ids, leave)} />
        </>
      ) : thread.spam ? (
        <>
          <IconButton icon="report_off" label="Not spam" onClick={() => (act.notSpam(ids), leave())} />
          <IconButton icon="delete_forever" label="Delete forever" onClick={() => act.deleteForever(ids, leave)} />
        </>
      ) : (
        <>
          {thread.inInbox ? (
            <IconButton icon="archive" label="Archive" onClick={() => (act.archive(ids), leave())} />
          ) : (
            <IconButton icon="move_to_inbox" label="Move to Inbox" onClick={() => act.moveToInbox(ids)} />
          )}
          {!isMobile && <IconButton icon="report" label="Report spam" onClick={() => (act.spam(ids), leave())} />}
          <IconButton icon="delete" label="Delete" onClick={() => (act.trash(ids), leave())} />
        </>
      )}
      {!isMobile && <span className="mx-1.5 h-5 w-px bg-line" />}
      <IconButton icon="mark_email_unread" label="Mark as unread" onClick={() => (act.setRead(ids, false), back())} />
      {!thread.trashed &&
        !thread.spam &&
        (thread.snoozedUntil ? (
          <IconButton icon="alarm_off" label="Unsnooze" onClick={() => act.unsnooze(ids)} />
        ) : (
          <SnoozeMenuButton ids={ids} onDone={leave} />
        ))}
      {!isMobile && (
        <>
          <span className="mx-1.5 h-5 w-px bg-line" />
          <MoveMenuButton ids={ids} folder={folder} currentLabel={view.kind === "label" ? view.id : undefined} onDone={leave} />
        </>
      )}
      <LabelMenuButton ids={ids} />
      <ThreadMoreMenu thread={thread} last={last} onLeave={leave} />
      {!isMobile && index >= 0 && (
        <div className="ml-auto flex items-center gap-0.5">
          <span className="px-2 text-xs text-fg-3">
            <b className="font-medium text-fg-2">{index + 1}</b> of <b className="font-medium text-fg-2">{list.length}</b>
          </span>
          <IconButton icon="chevron_left" label="Newer" disabled={!newer} onClick={() => newer && navigate(threadHash(view, newer.id))} />
          <IconButton icon="chevron_right" label="Older" disabled={!older} onClick={() => older && navigate(threadHash(view, older.id))} />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col" key={route.threadId}>
      {toolbar}
      <div ref={scrollRef} className="print-area min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className={cn("flex items-start gap-3 pb-2 pr-4 pt-4", isMobile ? "pl-4" : "pl-[72px]")}>
          <div className="min-w-0 flex-1">
            <h2 className="inline font-display text-[22px] leading-8 text-fg">{thread.subject || "(no subject)"}</h2>
            <span className="ml-2 inline-flex translate-y-[-3px] flex-wrap items-center gap-1.5 align-middle">
              {thread.important && <Icon name="label_important" fill className="text-star" />}
              {thread.inInbox && !thread.trashed && !thread.spam && (
                <SystemChip name="Inbox" onRemove={() => (act.archive(ids), leave())} />
              )}
              {thread.trashed && <SystemChip name="Trash" />}
              {thread.spam && <SystemChip name="Spam" />}
              {thread.snoozedUntil && <SystemChip name="Snoozed" />}
              {threadLabels.map((l) => (
                <LabelChip
                  key={l.id}
                  name={l.name}
                  color={l.color}
                  onClick={() => navigate(`#label/${l.id}`)}
                  onRemove={() => act.setLabel(ids, l.id, false)}
                />
              ))}
            </span>
          </div>
          <div className="no-print flex shrink-0 items-center">
            <IconButton icon="print" label="Print all" onClick={() => window.print()} />
            {!isMobile && (
              <IconButton
                icon={expanded.size >= delivered.length ? "unfold_less" : "unfold_more"}
                label={expanded.size >= delivered.length ? "Collapse all" : "Expand all"}
                onClick={() =>
                  setExpanded(expanded.size >= delivered.length ? new Set([last?.id ?? ""]) : new Set(delivered.map((m) => m.id)))
                }
              />
            )}
          </div>
        </div>

        {thread.spam && (
          <Notice
            icon="report"
            tone="danger"
            text="Why is this message in spam? It is similar to messages that were identified as spam in the past."
            action="Report not spam"
            onAction={() => act.notSpam(ids)}
          />
        )}
        {thread.trashed && <Notice icon="delete" text="This conversation is in Trash." action="Move to Inbox" onAction={() => act.moveToInbox(ids)} />}
        {thread.snoozedUntil && (
          <Notice icon="schedule" text={`Snoozed until ${formatScheduleLabel(thread.snoozedUntil)}.`} action="Unsnooze" onAction={() => act.unsnooze(ids)} />
        )}
        {thread.muted && <Notice icon="notifications_off" text="This conversation is muted. New replies will skip your inbox." action="Unmute" onAction={() => act.mute(ids, false)} />}

        <div className="pb-4">
          {items.map((it, i) =>
            it.kind === "more" ? (
              <div key={`more-${i}`} className="relative flex h-8 items-center border-y border-line-soft">
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className={cn(
                    "absolute flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-sm font-medium text-fg-2 hover:bg-hover",
                    isMobile ? "left-4" : "left-[20px]",
                  )}
                  aria-label={`Show ${it.count} older messages`}
                  data-tip={`${it.count} older messages`}
                >
                  {it.count}
                </button>
              </div>
            ) : (
              <MessageItem
                key={it.m.id}
                m={it.m}
                thread={thread}
                open={it.open}
                isLast={it.m.id === last?.id}
                terms={terms}
                onToggle={() =>
                  setExpanded((s) => {
                    const n = new Set(s);
                    if (n.has(it.m.id)) n.delete(it.m.id);
                    else n.add(it.m.id);
                    return n;
                  })
                }
              />
            ),
          )}
          {drafts.map((d) =>
            inlineCompose?.messageId === d.id ? null : <DraftBlock key={d.id} m={d} />,
          )}
        </div>

        <div className="no-print pb-10">
          {inlineCompose ? (
            <div className={cn("pb-6", isMobile ? "px-2" : "pl-[72px] pr-6")}>
              <ComposeForm compose={inlineCompose} variant="inline" />
            </div>
          ) : (
            last &&
            !thread.spam && (
              <div className={cn("flex gap-3", isMobile ? "px-4 [&>button]:flex-1 [&>button]:justify-center [&>button]:px-2" : "flex-wrap pl-[72px] pr-6")}>
                <ReplyButton icon="reply" label="Reply" onClick={() => openReply(thread.id, "reply", undefined, true)} />
                {multi && <ReplyButton icon="reply_all" label="Reply all" onClick={() => openReply(thread.id, "replyAll", undefined, true)} />}
                <ReplyButton icon="forward" label="Forward" onClick={() => openReply(thread.id, "forward", undefined, false)} />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ReplyButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-5 text-sm font-medium text-fg-2 transition-colors hover:bg-hover"
    >
      <Icon name={icon} size={20} />
      {label}
    </button>
  );
}

function SystemChip({ name, onRemove }: { name: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex h-6 items-center gap-0.5 rounded bg-[#ddd] px-2 text-xs font-medium text-[#444] dark:bg-[#444746] dark:text-[#e3e3e3]">
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove this conversation from ${name}`}
          data-tip={`Remove this from ${name} (archive)`}
          className="-mr-1 ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm opacity-70 hover:bg-black/10 hover:opacity-100"
        >
          <Icon name="close" size={13} />
        </button>
      )}
    </span>
  );
}

function Notice({ icon, text, action, onAction, tone }: { icon: string; text: string; action: string; onAction: () => void; tone?: "danger" }) {
  return (
    <div
      className={cn(
        "mx-4 mb-3 flex flex-wrap items-center gap-3 rounded-lg px-4 py-3 text-sm sm:ml-[72px] sm:mr-6",
        tone === "danger" ? "bg-[#fce8e6] text-[#8c1d18] dark:bg-[#5c1d18] dark:text-[#f6aea9]" : "bg-surface-3 text-fg-2",
      )}
    >
      <Icon name={icon} />
      <span className="min-w-0 flex-1">{text}</span>
      <Button variant="outline" className="h-8 border-current/30 bg-surface/60 px-4" onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}

function recipientSummary(m: Message) {
  const all = [...m.to, ...m.cc];
  if (!all.length) return "to (no recipients)";
  const names = all.map((c) => (c.email === ME.email ? "me" : c.name.split(" ")[0]));
  const bcc = m.bcc.length ? `, bcc: ${m.bcc.map((c) => c.name.split(" ")[0]).join(", ")}` : "";
  return `to ${names.slice(0, 4).join(", ")}${names.length > 4 ? ` +${names.length - 4}` : ""}${bcc}`;
}

function MessageItem({
  m,
  thread,
  open,
  isLast,
  terms,
  onToggle,
}: {
  m: Message;
  thread: Thread;
  open: boolean;
  isLast: boolean;
  terms: string[];
  onToggle: () => void;
}) {
  const isMobile = useIsMobile();
  const openDialog = useUI((s) => s.openDialog);
  const cancelScheduled = useMail((s) => s.cancelScheduled);
  const unsubscribed = useMail((s) => s.unsubscribed);
  const now = useUI((s) => s.now);
  const [showQuote, setShowQuote] = useState(false);
  const details = useMenu<HTMLButtonElement>();
  const more = useMenu();
  const isService = contactKind(m.from.email) === "service" && thread.category !== "primary";
  const rich = /style="/.test(m.html);
  const html = useMemo(() => highlightHtml(m.html, terms), [m.html, terms]);

  if (!open) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
        className={cn("flex cursor-pointer items-center gap-3 border-t border-line-soft py-3 pr-4 hover:bg-hover sm:pr-6", isMobile ? "pl-4" : "pl-4")}
      >
        <Avatar name={m.from.name} email={m.from.email} size={40} />
        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
          <div className={cn("shrink-0 truncate text-sm sm:w-48", m.unread ? "font-bold" : "font-medium")}>{m.from.email === ME.email ? ME.name : m.from.name}</div>
          <div className="min-w-0 truncate text-sm text-fg-3">{messageText(m).slice(0, 200)}</div>
        </div>
        {m.attachments.length > 0 && <Icon name="attach_file" size={18} className="text-fg-3" />}
        <div className="shrink-0 text-xs text-fg-3">{isMobile ? formatListDate(m.date, now) : formatFullDate(m.date, now).replace(/ \(.+\)$/, "")}</div>
      </div>
    );
  }

  const dateLabel = m.status === "scheduled" && m.scheduledAt ? `Scheduled for ${formatScheduleLabel(m.scheduledAt, now)}` : formatFullDate(m.date, now);

  const unsub = () =>
    openDialog({
      type: "confirm",
      title: `Unsubscribe from ${m.from.name}?`,
      body: `You'll stop receiving marketing email from ${m.from.email}. It may take a few days to take effect.`,
      confirmLabel: "Unsubscribe",
      onConfirm: () => {
        useMail.getState().unsubscribe(m.from.email);
        useUI.getState().showToast({ message: `Unsubscribed from ${m.from.name}.` });
      },
    });

  const downloadEml = () => {
    const eml = [
      `From: ${m.from.name} <${m.from.email}>`,
      `To: ${m.to.map((c) => `${c.name} <${c.email}>`).join(", ")}`,
      m.cc.length ? `Cc: ${m.cc.map((c) => `${c.name} <${c.email}>`).join(", ")}` : "",
      `Subject: ${thread.subject}`,
      `Date: ${new Date(m.date).toUTCString()}`,
      `Message-ID: <${m.id}@mail.local>`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
      m.html,
    ]
      .filter((l, i) => l || i > 5)
      .join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([eml], { type: "message/rfc822" }));
    a.download = `${thread.subject.replace(/[^\w\s-]/g, "").trim().slice(0, 60) || "message"}.eml`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  };

  return (
    <article className={cn("border-t border-line-soft pb-5 pt-4", isMobile ? "px-4" : "pl-4 pr-6")} aria-label={`Message from ${m.from.name}`}>
      <div className="flex gap-3">
        <Avatar name={m.from.name} email={m.from.email} size={40} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => !isLast && onToggle()}>
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-sm font-bold text-fg">{m.from.email === ME.email ? ME.name : m.from.name}</span>
                {!isMobile && <span className="text-xs text-fg-3">&lt;{m.from.email}&gt;</span>}
                {isService && !unsubscribed.includes(m.from.email) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      unsub();
                    }}
                    className="text-xs text-fg-3 underline hover:text-fg"
                  >
                    Unsubscribe
                  </button>
                )}
                {unsubscribed.includes(m.from.email) && <span className="text-xs text-fg-3">· Unsubscribed</span>}
              </div>
              <button
                ref={details.ref}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  details.toggle();
                }}
                className="-ml-1 flex max-w-full items-center rounded px-1 text-xs text-fg-3 hover:bg-hover"
              >
                <span className="truncate">{recipientSummary(m)}</span>
                <Icon name="arrow_drop_down" size={18} />
              </button>
              <Popover anchor={details.ref.current} open={details.open} onClose={details.close} className="w-[min(460px,calc(100vw-16px))] px-5 py-3">
                <table className="text-xs">
                  <tbody className="[&_td]:py-1 [&_td]:align-top [&_th]:py-1 [&_th]:pr-4 [&_th]:text-right [&_th]:align-top [&_th]:font-normal [&_th]:text-fg-3">
                    <tr>
                      <th>from:</th>
                      <td>
                        <b>{m.from.name}</b> &lt;{m.from.email}&gt;
                      </td>
                    </tr>
                    <tr>
                      <th>to:</th>
                      <td>{m.to.map((c) => `${nameOf(c)} <${c.email}>`).join(", ") || "(no recipients)"}</td>
                    </tr>
                    {m.cc.length > 0 && (
                      <tr>
                        <th>cc:</th>
                        <td>{m.cc.map((c) => `${nameOf(c)} <${c.email}>`).join(", ")}</td>
                      </tr>
                    )}
                    {m.bcc.length > 0 && (
                      <tr>
                        <th>bcc:</th>
                        <td>{m.bcc.map((c) => `${c.name} <${c.email}>`).join(", ")}</td>
                      </tr>
                    )}
                    <tr>
                      <th>date:</th>
                      <td>{formatLongDate(m.date)}</td>
                    </tr>
                    <tr>
                      <th>subject:</th>
                      <td>{thread.subject}</td>
                    </tr>
                    <tr>
                      <th>mailed-by:</th>
                      <td>{m.from.email.split("@")[1]}</td>
                    </tr>
                    <tr>
                      <th>security:</th>
                      <td className="flex items-center gap-1">
                        <Icon name="lock" size={14} /> Standard encryption (TLS)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Popover>
            </div>
            <div className="no-print flex shrink-0 items-center text-xs text-fg-3">
              {m.attachments.length > 0 && <Icon name="attach_file" size={18} className="mr-1" />}
              {!isMobile && <span className="mr-1 whitespace-nowrap">{dateLabel}</span>}
              {!isMobile && <StarButton starred={thread.starred} onToggle={() => act.toggleStar([thread.id])} />}
              <IconButton icon="reply" label="Reply" onClick={() => openReply(thread.id, "reply", m.id, true)} />
              <IconButton ref={more.ref} icon="more_vert" label="More" onClick={more.toggle} active={more.open} />
              <Popover anchor={more.ref.current} open={more.open} onClose={more.close} align="end" className="w-60">
                <MenuItem icon="reply" label="Reply" onClick={() => (more.close(), openReply(thread.id, "reply", m.id, true))} />
                <MenuItem icon="reply_all" label="Reply all" onClick={() => (more.close(), openReply(thread.id, "replyAll", m.id, true))} />
                <MenuItem icon="forward" label="Forward" onClick={() => (more.close(), openReply(thread.id, "forward", m.id, false))} />
                <MenuDivider />
                <MenuItem
                  icon="search"
                  label={`Find emails from ${m.from.email === ME.email ? "me" : m.from.name.split(" ")[0]}`}
                  onClick={() => (more.close(), navigate(`#search/${encodeURIComponent(`from:${m.from.email === ME.email ? "me" : m.from.email}`)}`))}
                />
                <MenuItem icon="print" label="Print" onClick={() => (more.close(), window.print())} />
                <MenuItem icon="delete" label="Delete this message" onClick={() => (more.close(), act.deleteMessage(m.id))} />
                <MenuItem icon="mark_email_unread" label="Mark unread from here" onClick={() => (more.close(), act.markUnreadFrom(m.id), navigate(location.hash.replace(/\/[^/]+$/, "")))} />
                <MenuDivider />
                <MenuItem icon="code" label="Show original" onClick={() => (more.close(), openDialog({ type: "original", messageId: m.id }))} />
                <MenuItem icon="download" label="Download message" onClick={() => (more.close(), downloadEml())} />
              </Popover>
            </div>
          </div>
          {isMobile && <div className="text-xs text-fg-3">{dateLabel}</div>}

          {m.status === "scheduled" && m.scheduledAt && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-accent-soft/60 px-4 py-2.5 text-sm text-on-accent-soft">
              <Icon name="schedule_send" />
              <span className="flex-1">Send scheduled for {formatScheduleLabel(m.scheduledAt, now)}</span>
              <Button
                variant="outline"
                className="h-8 border-current/30 px-4"
                onClick={() => {
                  cancelScheduled(m.id);
                  openDraft(m.id, false);
                  useUI.getState().showToast({ message: "Sending cancelled. Your message is now a draft." });
                }}
              >
                Cancel send
              </Button>
            </div>
          )}
          {m.status === "sending" && <div className="mt-2 text-xs font-medium text-accent">Sending…</div>}

          <div
            className={cn("mail-body mt-4", rich && "mail-rich", isMobile ? "-ml-[52px]" : "-ml-[52px] pl-[52px]")}
            onClick={(e) => {
              const a = (e.target as HTMLElement).closest("a");
              if (!a) return;
              e.preventDefault();
              if (/unsubscribe/i.test(a.textContent ?? "") && isService) return unsub();
              const href = a.getAttribute("href") ?? "";
              if (/^https?:/i.test(href)) window.open(href, "_blank", "noopener,noreferrer");
              else if (/^mailto:/i.test(href)) useUI.getState().openCompose({ to: [{ name: href.slice(7), email: href.slice(7) }] });
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {m.quote && (
            <div className={cn("mt-1", isMobile && "-ml-[52px]")}>
              <button
                type="button"
                onClick={() => setShowQuote((s) => !s)}
                aria-label={showQuote ? "Hide trimmed content" : "Show trimmed content"}
                data-tip={showQuote ? "Hide trimmed content" : "Show trimmed content"}
                className="inline-flex h-3.5 items-center rounded-sm bg-surface-3 px-1.5 text-fg-3 hover:bg-hover-strong"
              >
                <Icon name="more_horiz" size={18} />
              </button>
              {showQuote && <div className="mail-body mt-2" dangerouslySetInnerHTML={{ __html: m.quote }} />}
            </div>
          )}

          {m.attachments.length > 0 && (
            <div className={cn("mt-5 border-t border-line-soft pt-4", isMobile && "-ml-[52px]")}>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-fg-2">
                {m.attachments.length === 1 ? "One attachment" : `${m.attachments.length} attachments`}
                <span className="text-xs font-normal text-fg-3">· {formatSize(m.attachments.reduce((s, a) => s + a.size, 0))}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {m.attachments.map((a, i) => (
                  <AttachmentCard
                    key={a.id}
                    att={a}
                    sender={m.from.name}
                    subject={thread.subject}
                    onOpen={() => openDialog({ type: "attachment", attachments: m.attachments, index: i, sender: m.from.name })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function DraftBlock({ m }: { m: Message }) {
  const now = useUI((s) => s.now);
  const openDialog = useUI((s) => s.openDialog);
  return (
    <div className="flex items-center gap-3 border-t border-line-soft py-3 pl-4 pr-4 hover:bg-hover sm:pr-6">
      <Avatar name={ME.name} email={ME.email} size={40} />
      <button type="button" onClick={() => openDraft(m.id, true)} className="min-w-0 flex-1 text-left">
        <div className="text-sm">
          <span className="font-medium text-danger">Draft</span>
          <span className="ml-2 text-xs text-fg-3">{m.to.length ? recipientSummary(m) : "to (no recipients)"}</span>
        </div>
        <div className="truncate text-sm text-fg-3">{messageText(m) || "(empty)"}</div>
      </button>
      <span className="hidden text-xs text-fg-3 sm:block">{formatFullDate(m.date, now).replace(/ \(.+\)$/, "")}</span>
      <Button variant="text" className="h-8 px-3" onClick={() => openDraft(m.id, true)}>
        Edit
      </Button>
      <IconButton
        icon="delete"
        label="Discard draft"
        onClick={() =>
          openDialog({
            type: "confirm",
            title: "Discard draft?",
            body: "This draft will be permanently deleted.",
            confirmLabel: "Discard",
            danger: true,
            onConfirm: () => {
              useMail.getState().deleteDraft(m.id);
              useUI.getState().showToast({ message: "Draft discarded." });
            },
          })
        }
      />
    </div>
  );
}

function ThreadMoreMenu({ thread, last, onLeave }: { thread: Thread; last?: Message; onLeave: () => void }) {
  const menu = useMenu();
  const isMobile = useIsMobile();
  const ids = [thread.id];
  const close = menu.close;
  return (
    <>
      <IconButton ref={menu.ref} icon="more_vert" label="More" onClick={menu.toggle} active={menu.open} />
      <Popover anchor={menu.ref.current} open={menu.open} onClose={close} align={isMobile ? "end" : "start"} className="w-64">
        {isMobile && (
          <>
            <MenuItem icon="reply" label="Reply" onClick={() => (close(), openReply(thread.id, "reply", undefined, true))} />
            <MenuItem icon="forward" label="Forward" onClick={() => (close(), openReply(thread.id, "forward", undefined, false))} />
            <MenuItem icon="star" label={thread.starred ? "Remove star" : "Add star"} onClick={() => (close(), act.toggleStar(ids))} />
            {!thread.spam && !thread.trashed && <MenuItem icon="report" label="Report spam" onClick={() => (close(), act.spam(ids), onLeave())} />}
            <MenuDivider />
          </>
        )}
        <MenuItem
          icon="label_important"
          label={thread.important ? "Mark as not important" : "Mark as important"}
          onClick={() => (close(), act.setImportant(ids, !thread.important))}
        />
        <MenuItem icon="notifications_off" label={thread.muted ? "Unmute" : "Mute"} onClick={() => (close(), act.mute(ids, !thread.muted), !thread.muted && onLeave())} />
        {last && (
          <MenuItem
            icon="search"
            label={`Find emails from ${last.from.email === ME.email ? "me" : last.from.name.split(" ")[0]}`}
            onClick={() => (close(), navigate(`#search/${encodeURIComponent(`from:${last.from.email === ME.email ? "me" : last.from.email}`)}`))}
          />
        )}
        <MenuDivider />
        <MenuItem icon="unfold_more" label="Expand all" onClick={() => (close(), window.dispatchEvent(new CustomEvent("thread-command", { detail: "expand-all" })))} />
        <MenuItem icon="print" label="Print all" onClick={() => (close(), window.print())} />
      </Popover>
    </>
  );
}
