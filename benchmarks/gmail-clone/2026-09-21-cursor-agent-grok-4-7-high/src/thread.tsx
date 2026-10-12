import { useEffect, useState } from "react";
import type { Message, Thread } from "./types";
import { ME, formatBytes, formatFull, sanitizeHtml } from "./format";
import { Icon } from "./icons";
import { useMail } from "./store";
import { Avatar } from "./shell";
import { InlineComposer } from "./compose";

export function ThreadView() {
  const mail = useMail();
  const thread = mail.threads.find((item) => item.id === mail.openThreadId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showMiddle, setShowMiddle] = useState(false);
  useEffect(() => {
    if (!thread) return;
    const last = thread.messages[thread.messages.length - 1];
    setExpanded({ [last.id]: true });
    setShowMiddle(false);
  }, [thread?.id]);

  if (!thread) return null;
  const labels = mail.labels.filter((label) => thread.labels.includes(label.id));
  const list = mail.visible;
  const index = list.findIndex((item) => item.id === thread.id);
  const messages = thread.messages;
  const hideMiddle = messages.length > 3 && !showMiddle;

  return (
    <div className="thread-scroll" data-testid="thread-view">
      <ThreadBar thread={thread} index={index} total={list.length} />
      <div className="thread-subject">
        <h2>{thread.subject || "(no subject)"}</h2>
        {labels.map((label) => (
          <span key={label.id} className="chip" style={{ ["--c" as string]: label.color }}>{label.name}</span>
        ))}
        <span className="subject-tools">
          <button className={thread.starred ? "ib sm star-on" : "ib sm"} aria-label={thread.starred ? "Unstar" : "Star"} onClick={() => mail.dispatch({ type: "star", ids: [thread.id] })}>
            <Icon name="star" size={18} filled={thread.starred} />
          </button>
        </span>
      </div>
      {messages.map((message, messageIndex) => {
        if (hideMiddle && messageIndex > 0 && messageIndex < messages.length - 1) {
          if (messageIndex !== 1) return null;
          return (
            <button key="earlier" className="earlier" onClick={() => setShowMiddle(true)}>
              {messages.length - 2} earlier messages
            </button>
          );
        }
        const open = expanded[message.id] || messageIndex === messages.length - 1;
        return (
          <article key={message.id} className={open ? "message" : "message collapsed"} onClick={() => !open && setExpanded((current) => ({ ...current, [message.id]: true }))}>
            <header className="message-head">
              <Avatar name={message.from.name} email={message.from.email} size={40} />
              <div className="message-meta">
                <div className="who">
                  <span className="name">{message.from.name}</span>
                  {open && <span className="email">&lt;{message.from.email}&gt;</span>}
                </div>
                {open ? <RecipientLine message={message} /> : <div className="to-line">{message.body.replace(/\s+/g, " ").slice(0, 90)}</div>}
              </div>
              <span className="when">{formatFull(message.date)}</span>
              <div className="msg-actions">
                <button className="ib sm" aria-label="Reply" onClick={(event) => { event.stopPropagation(); mail.dispatch({ type: "compose", mode: "reply", threadId: thread.id, messageId: message.id }); }}><Icon name="reply" size={18} /></button>
                <button className="ib sm" aria-label="More" data-menu-root onClick={(event) => { event.stopPropagation(); mail.dispatch({ type: "menu", menu: { type: "more", ids: [thread.id] } }); }}><Icon name="more" size={18} /></button>
              </div>
            </header>
            {open && <MessageBody message={message} />}
          </article>
        );
      })}
      <InlineComposer thread={thread} />
    </div>
  );
}

function ThreadBar({ thread, index, total }: { thread: Thread; index: number; total: number }) {
  const mail = useMail();
  const list = mail.visible;
  const newer = index > 0 ? list[index - 1] : null;
  const older = index >= 0 && index < list.length - 1 ? list[index + 1] : null;
  return (
    <div className="toolbar">
      <button className="ib" aria-label="Back to list" onClick={() => mail.dispatch({ type: "open", id: null })}><Icon name="back" /></button>
      <button className="ib" aria-label="Archive" onClick={() => mail.dispatch({ type: "archive", ids: [thread.id] })}><Icon name="archive" /></button>
      <button className="ib" aria-label="Report spam" onClick={() => mail.dispatch({ type: "spam", ids: [thread.id], spam: !thread.labels.includes("spam") })}><Icon name="spam" /></button>
      <button className="ib" aria-label="Delete" onClick={() => mail.dispatch({ type: thread.labels.includes("trash") ? "delete-forever" : "trash", ids: [thread.id] })}><Icon name="trash" /></button>
      <button className="ib" aria-label="Mark as unread" onClick={() => { mail.dispatch({ type: "read", ids: [thread.id], read: false }); mail.dispatch({ type: "open", id: null }); }}><Icon name="mail" /></button>
      <span className="pop-anchor" data-menu-root>
        <button className="ib" aria-label="Snooze" onClick={() => mail.dispatch({ type: "menu", menu: { type: "snooze", ids: [thread.id] } })}><Icon name="clock" /></button>
      </span>
      <span className="pop-anchor" data-menu-root>
        <button className="ib" aria-label="Move to" onClick={() => mail.dispatch({ type: "menu", menu: { type: "move", ids: [thread.id] } })}><Icon name="layers" /></button>
      </span>
      <span className="pop-anchor" data-menu-root>
        <button className="ib" aria-label="Label" onClick={() => mail.dispatch({ type: "menu", menu: { type: "labels", ids: [thread.id] } })}><Icon name="tag" /></button>
      </span>
      <span className="grow" />
      <span className="pager">
        {index >= 0 ? `${index + 1} of ${total}` : ""}
        <button className="ib sm" aria-label="Newer" disabled={!newer} onClick={() => newer && mail.dispatch({ type: "open", id: newer.id })}><Icon name="chevron-left" size={18} /></button>
        <button className="ib sm" aria-label="Older" disabled={!older} onClick={() => older && mail.dispatch({ type: "open", id: older.id })}><Icon name="chevron-right" size={18} /></button>
      </span>
    </div>
  );
}

function RecipientLine({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  const mine = message.to.some((contact) => contact.email === ME.email);
  const others = [...message.to, ...(message.cc ?? [])].filter((contact) => contact.email !== ME.email).map((contact) => contact.name.split(" ")[0]);
  const summary = mine ? (others.length ? `to me, ${others.join(", ")}` : "to me") : `to ${others.join(", ") || message.to.map((contact) => contact.name).join(", ")}`;
  return (
    <span className="pop-anchor">
      <button className="to-line" onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}>{summary}</button>
      {open && (
        <div className="menu" data-menu onClick={(event) => event.stopPropagation()}>
          <div className="quiet">from: {message.from.name} &lt;{message.from.email}&gt;</div>
          <div className="quiet">to: {message.to.map((contact) => contact.email).join(", ")}</div>
          {message.cc?.length ? <div className="quiet">cc: {message.cc.map((contact) => contact.email).join(", ")}</div> : null}
          {message.bcc?.length ? <div className="quiet">bcc: {message.bcc.map((contact) => contact.email).join(", ")}</div> : null}
          <div className="quiet">{formatFull(message.date)}</div>
        </div>
      )}
    </span>
  );
}

function MessageBody({ message }: { message: Message }) {
  const mail = useMail();
  const [quote, setQuote] = useState(false);
  return (
    <>
      {message.confidential && <div className="banner">Confidential mode is on for this message. In this mailbox it stays on this device and is marked to expire after 7 days.</div>}
      {message.bodyHtml ? (
        <div className="body html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.bodyHtml) }} />
      ) : (
        <div className="body">{message.body}</div>
      )}
      {message.attachments?.length ? (
        <div className="files">
          {message.attachments.map((file) => (
            <button key={file.id} className="file-chip" onClick={() => mail.dispatch({ type: "dialog", dialog: { type: "attachment", attachment: file } })}>
              <Icon name={file.mime.startsWith("image/") ? "image" : "file"} size={20} />
              <span>
                {file.name}
                <small>{formatBytes(file.size)}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {message.quote && (
        quote ? <div className="quote">{message.quote}</div> : <button className="quote-toggle" onClick={() => setQuote(true)} aria-label="Show quoted text">…</button>
      )}
    </>
  );
}
