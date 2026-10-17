import { useEffect, useMemo, useRef, useState } from "react";
import type { Message, Route, Thread } from "../types";
import { useMail } from "../store/mail";
import { contactFor, isMe, ME } from "../data/contacts";
import { fullDate, listDate, relative } from "../lib/format";
import { highlightTerms, parseQuery } from "../lib/search";
import { htmlToText } from "../lib/html";
import { Icon, IconButton } from "../ui/Icon";
import { Avatar } from "../ui/Avatar";
import { Popover, usePopover, MenuItem, MenuDivider } from "../ui/Popover";
import { LabelChip } from "./common";
import { AttachmentCard, downloadAttachment } from "./Attachments";
import { LabelMenu, MoveMenu, TimePickerMenu } from "./menus";
import { Composer } from "./Composer";
import { useUI } from "./uiContext";

interface Props {
  thread: Thread;
  route: Route;
  list: Thread[];
  onBack: () => void;
  onGo: (id: string) => void;
  embedded?: boolean;
}

export function ThreadView({ thread: t, route, list, onBack, onGo, embedded }: Props) {
  const { state, api, confirm } = useMail();
  const ui = useUI();
  const labelMenu = usePopover();
  const moveMenu = usePopover();
  const snoozeMenu = usePopover();
  const moreMenu = usePopover();
  const scroller = useRef<HTMLDivElement>(null);

  const idx = list.findIndex((x) => x.id === t.id);
  const newer = idx > 0 ? list[idx - 1] : undefined;
  const older = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined;
  const terms = route.view === "search" ? highlightTerms(parseQuery(route.param ?? "")) : [];

  const initialExpanded = useMemo(() => {
    const s = new Set<string>();
    t.messages.forEach((m, i) => {
      if (m.unread || i === t.messages.length - 1) s.add(m.id);
    });
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id]);
  const [expanded, setExpanded] = useState(initialExpanded);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setExpanded(initialExpanded);
    setShowAll(false);
    scroller.current?.scrollTo(0, 0);
  }, [t.id]);

  // New messages arriving while open get expanded.
  const lastId = t.messages[t.messages.length - 1]?.id;
  useEffect(() => {
    if (lastId) setExpanded((e) => (e.has(lastId) ? e : new Set([...e, lastId])));
  }, [lastId]);

  useEffect(() => {
    if (t.unread) api.setRead([t.id], true);
  }, [t.id, t.unread, t.messages.length]);

  const draft = state.drafts.find((d) => d.threadId === t.id && d.inline && !d.scheduledAt);
  const labels = t.labels.map((id) => state.labels.find((l) => l.id === id)).filter(Boolean) as { id: string; name: string; color: string }[];

  const afterAction = () => {
    if (older) onGo(older.id);
    else if (newer) onGo(newer.id);
    else onBack();
  };
  const backAfter = (fn: () => void) => {
    fn();
    onBack();
  };

  const msgs = t.messages;
  const collapseMiddle = msgs.length >= 5 && !showAll;
  const hiddenIds = collapseMiddle ? msgs.slice(1, -2).filter((m) => !expanded.has(m.id)).map((m) => m.id) : [];
  const hidden = new Set(hiddenIds.length >= 2 ? hiddenIds : []);

  const reply = (mode: "reply" | "replyAll" | "forward", messageId?: string) => {
    api.reply(t.id, mode, messageId, true);
    setTimeout(() => {
      const el = scroller.current?.querySelector(".composer.inline .composer-body");
      (el as HTMLElement | null)?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 30);
  };

  const lastFromOther = [...msgs].reverse().find((m) => !isMe(m.from));
  const multiRecipients = lastFromOther ? lastFromOther.to.length + (lastFromOther.cc?.length ?? 0) > 1 : false;
  const smart = lastFromOther && contactFor(lastFromOther.from, state.contacts).kind === "person" && !isMe(msgs[msgs.length - 1].from) ? smartReplies(htmlToText(lastFromOther.html)) : [];

  return (
    <section className={"thread-pane" + (embedded ? " embedded" : "")} aria-label={t.subject}>
      <div className="toolbar thread-toolbar">
        <div className="toolbar-left">
          {!embedded && <IconButton icon="back" label={`Back to ${route.view === "search" ? "Search results" : "list"}`} shortcut="u" onClick={onBack} />}
          {t.location === "spam" ? (
            <button className="btn text sm" onClick={() => backAfter(() => api.notSpam([t.id]))}>
              Not spam
            </button>
          ) : t.location === "inbox" && !t.snoozedUntil ? (
            <IconButton icon="archive" label="Archive" shortcut="e" onClick={() => (api.archive([t.id]), afterAction())} />
          ) : (
            <IconButton icon="unarchive" label="Move to Inbox" onClick={() => api.moveToInbox([t.id])} />
          )}
          {t.location !== "spam" && <IconButton icon="spam" label="Report spam" shortcut="!" onClick={() => (api.spam([t.id]), afterAction())} />}
          {t.location === "trash" || t.location === "spam" ? (
            <IconButton
              icon="deleteForever"
              label="Delete forever"
              onClick={async () => {
                if (await confirm({ title: "Delete forever?", body: "This conversation will be permanently deleted.", confirmLabel: "Delete forever", danger: true })) {
                  afterAction();
                  api.deleteForever([t.id]);
                }
              }}
            />
          ) : (
            <IconButton icon="trash" label="Delete" shortcut="#" onClick={() => (api.trash([t.id]), afterAction())} />
          )}
          <span className="tb-divider" />
          <IconButton icon="mail" label="Mark as unread" shortcut="Shift+U" onClick={() => backAfter(() => api.setRead([t.id], false))} />
          {t.snoozedUntil ? (
            <IconButton icon="restore" label="Unsnooze" onClick={() => api.unsnooze([t.id])} />
          ) : (
            <IconButton icon="clock" label="Snooze" shortcut="b" onClick={snoozeMenu.toggle} />
          )}
          <span className="tb-divider hide-mobile" />
          <IconButton icon="moveTo" label="Move to" shortcut="v" onClick={moveMenu.toggle} className="hide-mobile" />
          <IconButton icon="label" label="Labels" shortcut="l" onClick={labelMenu.toggle} className="hide-mobile" />
          <IconButton icon="moreVert" label="More" onClick={moreMenu.toggle} />
        </div>
        <div className="toolbar-right">
          {idx >= 0 && (
            <>
              <span className="page-info hide-mobile">
                {idx + 1} of {list.length}
              </span>
              <IconButton icon="chevronLeft" label="Newer" shortcut="k" disabled={!newer} onClick={() => newer && onGo(newer.id)} />
              <IconButton icon="chevronRight" label="Older" shortcut="j" disabled={!older} onClick={() => older && onGo(older.id)} />
            </>
          )}
        </div>
      </div>

      <div className="thread-scroll" ref={scroller}>
        <div className="thread-head">
          <h1 className="thread-subject">
            {terms.length ? <HighlightText text={t.subject} terms={terms} /> : t.subject}
            <span className="thread-chips">
              {t.location === "inbox" && !t.snoozedUntil && <LabelChip label={{ id: "inbox", name: "Inbox", color: "#5f6368" }} onRemove={() => (api.archive([t.id]), afterAction())} />}
              {t.snoozedUntil && <LabelChip label={{ id: "sn", name: `Snoozed · ${listDate(t.snoozedUntil)}`, color: "#e8710a" }} />}
              {t.location === "spam" && <LabelChip label={{ id: "spam", name: "Spam", color: "#c5221f" }} />}
              {t.location === "trash" && <LabelChip label={{ id: "trash", name: "Trash", color: "#5f6368" }} />}
              {labels.map((l) => (
                <LabelChip key={l.id} label={l} onRemove={() => api.setLabel([t.id], l.id, false)} />
              ))}
            </span>
          </h1>
          <div className="thread-head-actions hide-mobile">
            <IconButton icon="print" label="Print all" onClick={() => window.print()} />
            <IconButton
              icon="openNew"
              label="In new window"
              onClick={() => window.open(`${location.pathname}#/all/${t.id}`, "_blank", "width=900,height=800")}
            />
          </div>
        </div>
        {t.location === "spam" && (
          <div className="spam-warning">
            <Icon name="spam" size={20} />
            <div>
              <b>Why is this message in spam?</b> It's similar to messages that were identified as spam in the past. Be careful with links and never share passwords or recovery phrases.
            </div>
          </div>
        )}

        <div className="messages">
          {msgs.map((m, i) => {
            if (hidden.has(m.id)) {
              if (m.id !== hiddenIds[0]) return null;
              return (
                <button key="more" className="older-bubble" onClick={() => setShowAll(true)}>
                  <span className="older-line" />
                  <span className="older-count">{hidden.size}</span>
                  <span className="older-line" />
                </button>
              );
            }
            return (
              <MessageCard
                key={m.id}
                m={m}
                thread={t}
                expanded={expanded.has(m.id)}
                isLast={i === msgs.length - 1}
                terms={terms}
                onToggle={() =>
                  setExpanded((e) => {
                    const n = new Set(e);
                    n.has(m.id) ? n.delete(m.id) : n.add(m.id);
                    return n;
                  })
                }
                onReply={(mode) => reply(mode, m.id)}
                onBack={onBack}
              />
            );
          })}
        </div>

        {draft ? (
          <div className="inline-composer-wrap">
            <Avatar contact={ME} size={40} className="hide-mobile" />
            <Composer draftId={draft.id} variant="inline" />
          </div>
        ) : (
          <div className="reply-area">
            {smart.length > 0 && t.location !== "spam" && (
              <div className="smart-replies">
                {smart.map((s) => (
                  <button
                    key={s}
                    className="smart-chip"
                    onClick={() => {
                      api.reply(t.id, "reply", lastFromOther?.id, true, s);
                      setTimeout(() => scroller.current?.querySelector<HTMLElement>(".composer.inline .composer-body")?.focus(), 40);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="reply-buttons">
              <button className="btn outline" onClick={() => reply("reply")}>
                <Icon name="reply" size={18} /> Reply
              </button>
              {multiRecipients && (
                <button className="btn outline" onClick={() => reply("replyAll")}>
                  <Icon name="replyAll" size={18} /> Reply all
                </button>
              )}
              <button className="btn outline" onClick={() => reply("forward")}>
                <Icon name="forward" size={18} /> Forward
              </button>
            </div>
          </div>
        )}
      </div>

      <LabelMenu anchor={labelMenu.anchor} onClose={labelMenu.close} threadIds={[t.id]} />
      <MoveMenu anchor={moveMenu.anchor} onClose={moveMenu.close} threadIds={[t.id]} />
      <TimePickerMenu
        kind="snooze"
        anchor={snoozeMenu.anchor}
        onClose={snoozeMenu.close}
        onPick={(ts) => {
          api.snooze([t.id], ts);
          afterAction();
        }}
      />
      <Popover anchor={moreMenu.anchor} onClose={moreMenu.close} align="start" width={240}>
        <MenuItem icon={t.starred ? "star" : "starFilled"} label={t.starred ? "Remove star" : "Add star"} hint="s" onClick={() => (api.toggleStar(t.id), moreMenu.close())} />
        <MenuItem
          icon={t.important ? "importantOutline" : "important"}
          label={t.important ? "Mark as not important" : "Mark as important"}
          onClick={() => (api.setImportant([t.id], !t.important), moreMenu.close())}
        />
        {ui.isMobile && (
          <>
            <MenuItem
              icon="label"
              label="Labels"
              onClick={() => {
                const a = moreMenu.anchor;
                moreMenu.close();
                if (a instanceof HTMLElement) labelMenu.open(a);
              }}
            />
            <MenuItem
              icon="moveTo"
              label="Move to"
              onClick={() => {
                const a = moreMenu.anchor;
                moreMenu.close();
                if (a instanceof HTMLElement) moveMenu.open(a);
              }}
            />
          </>
        )}
        <MenuDivider />
        <MenuItem icon="print" label="Print all" onClick={() => (moreMenu.close(), setTimeout(() => window.print(), 50))} />
        <MenuItem
          icon="search"
          label="Filter messages like these"
          onClick={() => {
            moreMenu.close();
            const from = lastFromOther?.from ?? msgs[0].from;
            window.location.hash = `#/search/${encodeURIComponent(`from:${from}`)}`;
          }}
        />
      </Popover>
    </section>
  );
}

function HighlightText({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((p, i) =>
        i % 2 ? (
          <mark key={i} className="hl">
            {p}
          </mark>
        ) : (
          p
        ),
      )}
    </>
  );
}

function highlightHtml(html: string, terms: string[]) {
  if (!terms.length) return html;
  const re = new RegExp(`(${terms.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return html.replace(/>([^<]+)</g, (_, txt: string) => ">" + txt.replace(re, '<mark class="hl">$1</mark>') + "<");
}

function smartReplies(text: string): string[] {
  const t = text.toLowerCase();
  if (/\?|could you|can you|would you/.test(t)) {
    if (/call|chat|coffee|meet|time/.test(t)) return ["Sure, happy to chat!", "Let me check my calendar.", "Not this week, sorry."];
    return ["Yes, will do!", "Let me take a look.", "Sounds good to me."];
  }
  if (/thank|thanks|🙏/.test(t)) return ["You're welcome!", "Anytime!", "Happy to help!"];
  if (/photo|picture|📸/.test(t)) return ["Love these!", "So great, thank you!", "Beautiful photos!"];
  return ["Thanks!", "Sounds good.", "Got it, thanks!"];
}

function MessageCard({
  m,
  thread,
  expanded,
  isLast,
  terms,
  onToggle,
  onReply,
  onBack,
}: {
  onBack: () => void;
  m: Message;
  thread: Thread;
  expanded: boolean;
  isLast: boolean;
  terms: string[];
  onToggle: () => void;
  onReply: (mode: "reply" | "replyAll" | "forward") => void;
}) {
  const { state, api } = useMail();
  const ui = useUI();
  const from = contactFor(m.from, state.contacts);
  const details = usePopover();
  const more = usePopover();
  const [showQuote, setShowQuote] = useState(false);
  const toNames = [...m.to, ...(m.cc ?? [])].map((e) => (isMe(e) ? "me" : contactFor(e, state.contacts).name.split(" ")[0]));
  const html = useMemo(() => highlightHtml(m.html, terms), [m.html, terms]);
  const multi = m.to.length + (m.cc?.length ?? 0) > 1;

  if (!expanded) {
    return (
      <div className="msg collapsed" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onToggle()}>
        <Avatar contact={from} size={40} />
        <div className="msg-collapsed-body">
          <div className="msg-collapsed-top">
            <span className={"msg-from" + (m.unread ? " strong" : "")}>{isMe(m.from) ? ME.name : from.name}</span>
            <span className="msg-date muted">
              {m.attachments.length > 0 && <Icon name="attach" size={16} />}
              {listDate(m.date)}
            </span>
          </div>
          <div className="msg-snippet muted ellipsis">{htmlToText(m.html)}</div>
        </div>
      </div>
    );
  }

  return (
    <article className="msg expanded">
      <Avatar contact={from} size={40} className="msg-avatar" />
      <div className="msg-main">
        <header className="msg-head" onClick={isLast ? undefined : onToggle}>
          <div className="msg-who">
            <span className="msg-from strong">{from.name}</span>
            <span className="msg-email muted">&lt;{from.email}&gt;</span>
            <button
              className="msg-to muted"
              onClick={(e) => {
                e.stopPropagation();
                details.toggle(e);
              }}
            >
              to {toNames.join(", ")}
              <Icon name="dropDown" size={18} />
            </button>
          </div>
          <div className="msg-actions" onClick={(e) => e.stopPropagation()}>
            <span className="msg-date muted" data-tip={fullDate(m.date)}>
              {fullDate(m.date).replace(/^\w+, /, "")} <span className="hide-mobile">({relative(m.date)})</span>
            </span>
            {isLast && (
              <button className={"star-btn" + (thread.starred ? " on" : "")} aria-label={thread.starred ? "Starred" : "Not starred"} onClick={() => api.toggleStar(thread.id)} data-tip={thread.starred ? "Starred" : "Not starred"}>
                <Icon name={thread.starred ? "starFilled" : "star"} size={20} />
              </button>
            )}
            <IconButton icon="reply" label="Reply" onClick={() => onReply("reply")} className="hide-mobile" />
            <IconButton icon="moreVert" label="More" onClick={more.toggle} />
          </div>
        </header>
        <div className="msg-body" dangerouslySetInnerHTML={{ __html: html }} />
        {m.quote && (
          <>
            <button className="quote-toggle" onClick={() => setShowQuote(!showQuote)} aria-label={showQuote ? "Hide trimmed content" : "Show trimmed content"} data-tip={showQuote ? "Hide expanded content" : "Show trimmed content"}>
              <Icon name="moreHoriz" size={18} />
            </button>
            {showQuote && <div className="msg-body quoted" dangerouslySetInnerHTML={{ __html: m.quote }} />}
          </>
        )}
        {m.attachments.length > 0 && (
          <div className="msg-atts">
            <div className="msg-atts-head">
              <span>
                {m.attachments.length} attachment{m.attachments.length === 1 ? "" : "s"}
              </span>
              <span className="muted"> · Scanned locally</span>
              {m.attachments.length > 1 && (
                <button className="link-btn" onClick={() => m.attachments.forEach(downloadAttachment)}>
                  Download all
                </button>
              )}
            </div>
            <div className="att-grid">
              {m.attachments.map((a) => (
                <AttachmentCard key={a.id} a={a} onOpen={() => ui.openPreview(a.id, thread.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
      <Popover anchor={details.anchor} onClose={details.close} width={360} className="details-pop">
        <dl className="details">
          <dt>from:</dt>
          <dd>
            <b>{from.name}</b> &lt;{from.email}&gt;
          </dd>
          <dt>to:</dt>
          <dd>{m.to.map((e) => `${contactFor(e, state.contacts).name} <${e}>`).join(", ")}</dd>
          {m.cc?.length ? (
            <>
              <dt>cc:</dt>
              <dd>{m.cc.map((e) => `${contactFor(e, state.contacts).name} <${e}>`).join(", ")}</dd>
            </>
          ) : null}
          {m.bcc?.length ? (
            <>
              <dt>bcc:</dt>
              <dd>{m.bcc.join(", ")}</dd>
            </>
          ) : null}
          <dt>date:</dt>
          <dd>{fullDate(m.date)}</dd>
          <dt>subject:</dt>
          <dd>{thread.subject}</dd>
          <dt>mailed-by:</dt>
          <dd>{from.email.split("@")[1]}</dd>
          <dt>security:</dt>
          <dd>{thread.location === "spam" ? "⚠️ Unverified sender" : "Standard encryption (TLS)"}</dd>
        </dl>
      </Popover>
      <Popover anchor={more.anchor} onClose={more.close} align="end" width={220}>
        <MenuItem icon="reply" label="Reply" onClick={() => (more.close(), onReply("reply"))} />
        {multi && <MenuItem icon="replyAll" label="Reply all" onClick={() => (more.close(), onReply("replyAll"))} />}
        <MenuItem icon="forward" label="Forward" onClick={() => (more.close(), onReply("forward"))} />
        <MenuDivider />
        <MenuItem
          icon="mail"
          label="Mark unread from here"
          onClick={() => {
            more.close();
            const idx = thread.messages.findIndex((x) => x.id === m.id);
            onBack();
            api.update((s) => ({
              ...s,
              threads: s.threads.map((x) => (x.id === thread.id ? { ...x, unread: true, messages: x.messages.map((mm, i) => (i >= idx ? { ...mm, unread: !isMe(mm.from) } : mm)) } : x)),
            }));
          }}
        />
        <MenuItem icon="print" label="Print" onClick={() => (more.close(), setTimeout(() => window.print(), 50))} />
        <MenuItem
          icon="search"
          label={`Find emails from ${from.name.split(" ")[0]}`}
          onClick={() => {
            more.close();
            window.location.hash = `#/search/${encodeURIComponent(`from:${from.email}`)}`;
          }}
        />
      </Popover>
    </article>
  );
}
