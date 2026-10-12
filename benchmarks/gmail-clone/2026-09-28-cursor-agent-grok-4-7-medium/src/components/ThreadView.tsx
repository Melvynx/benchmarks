import { Paperclip, Star } from "lucide-react";
import { useState } from "react";
import { bodyToHtml, colorFor, formatBytes, formatFull, initials, snippetOf, splitQuote } from "../lib/format";
import { useMail } from "../state/mail-context";
import type { Attachment, Message } from "../types";
import { DraftEditor } from "./Compose";
import { Toolbar } from "./Toolbar";
import { Modal } from "./overlay";

export function ThreadView() {
  const mail = useMail();
  const thread = mail.threads.find((item) => item.threadId === mail.ui.activeThreadId)
    ?? null;
  const fallback = mail.ui.activeThreadId
    ? mail.data.messages.filter((message) => message.threadId === mail.ui.activeThreadId)
    : [];
  const messages = (thread?.messages ?? fallback).filter((message) => !message.labels.includes("draft"));
  const draft = (thread?.messages ?? fallback).find((message) => message.labels.includes("draft"));
  const scheduled = messages.find((message) => message.labels.includes("scheduled"));
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (!mail.ui.activeThreadId) {
    return (
      <section className="thread-pane empty-pane">
        <p>Select a conversation to read it.</p>
      </section>
    );
  }

  const allMessages = thread?.messages ?? fallback;
  const subject = thread?.subject || messages[0]?.subject || "(no subject)";
  const labelIds = thread?.labelIds ?? [...new Set(allMessages.flatMap((message) => message.labels.filter((label) => !["inbox", "sent", "draft", "trash", "spam", "snoozed", "scheduled"].includes(label))))];
  const starred = allMessages.some((message) => message.starred);

  return (
    <section className="thread-pane" aria-label={subject}>
      <Toolbar variant="thread" />
      <div className="thread">
        <header className="subject-head">
          <h2>{subject}</h2>
          <button
            type="button"
            className={`star ${starred ? "on" : ""}`}
            aria-label={starred ? "Unstar" : "Star"}
            onClick={() => mail.star([mail.ui.activeThreadId!])}
          >
            <Star size={20} fill={starred ? "currentColor" : "none"} />
          </button>
          <span className="head-labels">
            {labelIds.map((id) => {
              const label = mail.data.labels.find((item) => item.id === id);
              if (!label) return null;
              return (
                <span key={id} className="pill" style={{ background: `${label.color}22`, color: label.color }}>
                  {label.name}
                </span>
              );
            })}
          </span>
        </header>
        {scheduled?.sendAt && (
          <div className="banner">
            Scheduled for {formatFull(scheduled.sendAt)}
            <button type="button" onClick={() => mail.dispatch({ type: "send", id: scheduled.id, sendAt: null })}>
              Send now
            </button>
            <button
              type="button"
              onClick={() =>
                mail.dispatch({
                  type: "patch",
                  id: scheduled.id,
                  patch: {
                    sendAt: null,
                    labels: [...scheduled.labels.filter((label) => label !== "scheduled"), "draft"],
                  },
                })
              }
            >
              Cancel send
            </button>
          </div>
        )}
        <div className="messages">
          {messages.map((message, index) => {
            const expanded = open[message.id] ?? (mail.ui.expandIds.includes(message.id) || index === messages.length - 1);
            if (!expanded) {
              return (
                <button
                  key={message.id}
                  type="button"
                  className="msg-collapsed"
                  onClick={() => setOpen((current) => ({ ...current, [message.id]: true }))}
                >
                  <span className="avatar sm" style={{ background: colorFor(message.from.email) }}>
                    {initials(message.from.name)}
                  </span>
                  <strong>{message.from.name}</strong>
                  <span>{snippetOf(message.body).slice(0, 96)}</span>
                  <time>{formatFull(message.date)}</time>
                </button>
              );
            }
            return (
              <MessageCard key={message.id} message={message} onPreview={setPreview} onCollapse={messages.length > 1 ? () => setOpen((current) => ({ ...current, [message.id]: false })) : undefined} />
            );
          })}
        </div>
        {draft && <DraftEditor draft={draft} variant="inline" />}
        {!draft && messages.length > 0 && !messages.some((message) => message.labels.includes("scheduled") && messages.length === 1) && (
          <div className="reply-launch" id="inline-reply">
            <button type="button" onClick={() => mail.reply("reply")}>
              Reply
            </button>
            <button type="button" onClick={() => mail.reply("replyAll")}>
              Reply all
            </button>
            <button type="button" onClick={() => mail.reply("forward")}>
              Forward
            </button>
          </div>
        )}
      </div>
      {preview && <AttachmentPreview attachment={preview} onClose={() => setPreview(null)} />}
    </section>
  );
}

function MessageCard({
  message,
  onPreview,
  onCollapse,
}: {
  message: Message;
  onPreview: (attachment: Attachment) => void;
  onCollapse?: () => void;
}) {
  const [details, setDetails] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const parts = splitQuote(message.body);
  const toLine = message.to.map((person) => person.name.split(" ")[0]).join(", ") || "undisclosed";
  return (
    <article className="message">
      <header className="msg-head">
        <button type="button" className="avatar" style={{ background: colorFor(message.from.email) }} onClick={onCollapse} aria-label={onCollapse ? "Collapse message" : message.from.name}>
          {initials(message.from.name)}
        </button>
        <div className="msg-meta">
          <strong>{message.from.name}</strong>
          <em>{message.from.email}</em>
          <button type="button" className="to-line" onClick={() => setDetails((value) => !value)} aria-expanded={details}>
            to {toLine}
          </button>
          {details && (
            <div className="details">
              <p>from: {message.from.name} &lt;{message.from.email}&gt;</p>
              <p>to: {message.to.map((person) => `${person.name} <${person.email}>`).join(", ") || "—"}</p>
              {message.cc.length > 0 && <p>cc: {message.cc.map((person) => person.email).join(", ")}</p>}
              <p>date: {formatFull(message.date)}</p>
              <p>subject: {message.subject || "(no subject)"}</p>
            </div>
          )}
        </div>
        <time>{formatFull(message.date)}</time>
      </header>
      <div className="msg-body" dangerouslySetInnerHTML={{ __html: bodyToHtml(parts.main) }} />
      {parts.signature && <p className="signature">{parts.signature}</p>}
      {parts.quote && (
        <div className="quote-wrap">
          <button type="button" className="quote-toggle" onClick={() => setShowQuote((value) => !value)}>
            {showQuote ? "Hide trimmed content" : "Show trimmed content"}
          </button>
          {showQuote && <div className="quote" dangerouslySetInnerHTML={{ __html: bodyToHtml(parts.quote) }} />}
        </div>
      )}
      {message.attachments.length > 0 && (
        <div className="attachments">
          {message.attachments.map((attachment) => (
            <button key={attachment.id} type="button" className="att" onClick={() => onPreview(attachment)}>
              <Paperclip size={16} />
              <span>{attachment.name}</span>
              <em>{formatBytes(attachment.size)}</em>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function AttachmentPreview({ attachment, onClose }: { attachment: Attachment; onClose: () => void }) {
  return (
    <Modal title={attachment.name} onClose={onClose} wide>
      <p className="modal-copy">
        {attachment.mime} · {formatBytes(attachment.size)}
      </p>
      <pre className="preview">{attachment.preview}</pre>
      <div className="modal-actions">
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            const blob = new Blob([attachment.preview], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = attachment.name.replace(/\.[^.]+$/, "") + ".txt";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download text
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
