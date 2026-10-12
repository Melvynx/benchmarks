import { useState } from "react";
import { SYS } from "../constants";
import { draftToCompose } from "../composeDraft";
import { downloadAttachment } from "../files";
import {
  buildForwardHtml,
  buildReplyHtml,
  cx,
  emptyComposeBody,
  formatBytes,
  formatFuture,
  formatMessageDate,
  forwardSubject,
  messageText,
  newId,
  replyAllRecipients,
  replyRecipients,
  replySubject,
  sameEmail,
  userLabelIds,
} from "../logic";
import { useMail } from "../store";
import type { Attachment, ComposeModel, Message, Thread } from "../types";
import { Icon } from "../icons";
import { Avatar, RichText } from "./bits";
import { Compose } from "./Compose";
import { sanitizeHtml } from "../sanitize";

export function ThreadView({ thread, split }: { thread: Thread; split: boolean }) {
  const { state, dispatch, me, openPalette } = useMail();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<string | null>(null);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const labels = userLabelIds(thread, state.labels);
  const inline = state.composes.filter((compose) => compose.placement === "inline" && compose.threadId === thread.id);

  function start(mode: "reply" | "replyAll" | "forward") {
    if (mode !== "forward") {
      const existing = state.composes.find((compose) => compose.threadId === thread.id);
      if (existing) {
        dispatch({ type: "composePatch", id: existing.id, patch: { minimized: false, placement: "inline", maximized: false } });
        return;
      }
    }
    const last = thread.messages[thread.messages.length - 1];
    const signature = state.settings.signature;
    const compose: ComposeModel = {
      id: newId("c"),
      threadId: mode === "forward" ? null : thread.id,
      mode,
      placement: mode === "forward" ? "float" : "inline",
      minimized: false,
      maximized: false,
      to: [],
      cc: [],
      bcc: [],
      subject: thread.subject,
      body: emptyComposeBody(signature),
      attachments: [],
      showCc: false,
      showBcc: false,
    };
    if (mode === "reply" && last) {
      compose.to = replyRecipients(thread, me);
      compose.subject = replySubject(thread.subject);
      compose.body = buildReplyHtml(last, signature);
    } else if (mode === "replyAll" && last) {
      const rec = replyAllRecipients(thread, me);
      compose.to = rec.to;
      compose.cc = rec.cc;
      compose.showCc = rec.cc.length > 0;
      compose.subject = replySubject(thread.subject);
      compose.body = buildReplyHtml(last, signature);
    } else if (mode === "forward" && last) {
      compose.subject = forwardSubject(thread.subject);
      compose.body = buildForwardHtml(thread, last, signature);
      compose.attachments = last.attachments.map((file) => ({ ...file, id: newId("a") }));
    }
    dispatch({ type: "composeOpen", compose });
  }

  return (
    <section className={cx("thread-pane", split && "split")} data-testid="thread-view">
      <div className="toolbar">
        {!split ? (
          <button className="icon-btn" type="button" aria-label="Back to list" data-testid="thread-back" onClick={() => dispatch({ type: "closeThread" })}>
            <Icon name="back" />
          </button>
        ) : (
          <button className="icon-btn" type="button" aria-label="Close conversation" onClick={() => dispatch({ type: "closeThread" })}>
            <Icon name="close" />
          </button>
        )}
        {thread.labels.includes(SYS.TRASH) ? (
          <button className="icon-btn" type="button" aria-label="Move to inbox" onClick={() => dispatch({ type: "restore", ids: [thread.id] })}>
            <Icon name="inbox" />
          </button>
        ) : (
          <button className="icon-btn" type="button" aria-label="Archive" onClick={() => dispatch({ type: "archive", ids: [thread.id] })}>
            <Icon name="archive" />
          </button>
        )}
        <button className="icon-btn" type="button" aria-label="Delete" onClick={() => dispatch({ type: "trash", ids: [thread.id] })}>
          <Icon name="trash" />
        </button>
        <button
          className="icon-btn"
          type="button"
          aria-label={thread.unread ? "Mark as read" : "Mark as unread"}
          onClick={() => dispatch({ type: "read", ids: [thread.id], unread: !thread.unread })}
        >
          <Icon name={thread.unread ? "mail" : "unread"} />
        </button>
        <button className="icon-btn" type="button" aria-label="Snooze" onClick={(event) => openPalette("snooze", event.currentTarget, [thread.id])}>
          <Icon name="snooze" />
        </button>
        <button className="icon-btn" type="button" aria-label="Move to" onClick={(event) => openPalette("move", event.currentTarget, [thread.id])}>
          <Icon name="drafts" />
        </button>
        <button className="icon-btn" type="button" aria-label="Labels" onClick={(event) => openPalette("label", event.currentTarget, [thread.id])}>
          <Icon name="label" />
        </button>
        <div className="spacer" />
        <button className="icon-btn hide-xs" type="button" aria-label="Newer" onClick={() => dispatch({ type: "cursorMove", delta: -1, open: true })}>
          <Icon name="chevronLeft" />
        </button>
        <button className="icon-btn hide-xs" type="button" aria-label="Older" onClick={() => dispatch({ type: "cursorMove", delta: 1, open: true })}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <div className="thread-scroll">
        <div className="thread-subject">
          <h2>{thread.subject || "(no subject)"}</h2>
          <button
            className={cx("icon-btn tiny star", thread.labels.includes(SYS.STARRED) && "on")}
            type="button"
            aria-label="Star"
            onClick={() => dispatch({ type: "star", ids: [thread.id] })}
          >
            <Icon name="star" size={20} />
          </button>
          <div className="thread-chips">
            {thread.labels.includes(SYS.INBOX) ? <i className="chip quiet">Inbox</i> : null}
            {labels.map((label) => (
              <i key={label.id} className="chip" style={{ background: label.bg, color: label.color }}>
                {label.name}
                <button
                  type="button"
                  aria-label={`Remove ${label.name}`}
                  onClick={() => dispatch({ type: "toggleLabel", ids: [thread.id], labelId: label.id })}
                >
                  <Icon name="close" size={12} />
                </button>
              </i>
            ))}
          </div>
        </div>
        {thread.scheduledFor ? (
          <div className="sched-banner">
            <Icon name="clock" size={18} />
            <span>Scheduled for {formatFuture(thread.scheduledFor)}</span>
            <button type="button" onClick={() => dispatch({ type: "cancelSchedule", id: thread.id })}>
              Cancel send
            </button>
          </div>
        ) : null}
        {thread.messages.length > 1 ? (
          <button
            className="text-btn expand-all"
            type="button"
            onClick={() => {
              const open = thread.messages.every((message, index) => expanded[message.id] ?? (index === thread.messages.length - 1 || message.unread));
              const next: Record<string, boolean> = {};
              for (const message of thread.messages) next[message.id] = !open;
              setExpanded(next);
            }}
          >
            <Icon name="expand" size={16} /> Expand / collapse
          </button>
        ) : null}
        <div className="messages">
          {thread.messages.map((message, index) => {
            const isOpen = expanded[message.id] ?? (index === thread.messages.length - 1 || message.unread);
            if (!isOpen) {
              return (
                <button key={message.id} type="button" className={cx("msg collapsed", message.unread && "unread")} onClick={() => setExpanded((cur) => ({ ...cur, [message.id]: true }))}>
                  <Avatar person={message.from} size={32} />
                  <span className="msg-name">{sameEmail(message.from.email, me.email) ? "me" : message.from.name}</span>
                  <span className="snippet">{messageText(message).replace(/\s+/g, " ").slice(0, 120)}</span>
                  <span className="when">{formatMessageDate(message.date)}</span>
                </button>
              );
            }
            return (
              <article key={message.id} className={cx("msg", message.unread && "unread")}>
                <header className="msg-head">
                  <Avatar person={message.from} />
                  <div className="msg-meta">
                    <div className="msg-line">
                      <strong>{message.from.name}</strong>
                      <span className="muted">&lt;{message.from.email}&gt;</span>
                      <span className="spacer" />
                      <time>{formatMessageDate(message.date)}</time>
                    </div>
                    <button type="button" className="to-line" onClick={() => setDetails(details === message.id ? null : message.id)}>
                      {recipientLine(message, me.email)}
                      <Icon name="chevronDown" size={16} />
                    </button>
                    {details === message.id ? (
                      <div className="details">
                        <p><span>from:</span> {message.from.name} &lt;{message.from.email}&gt;</p>
                        <p><span>to:</span> {message.to.map((person) => `${person.name} <${person.email}>`).join(", ")}</p>
                        {message.cc.length ? <p><span>cc:</span> {message.cc.map((person) => person.email).join(", ")}</p> : null}
                        {message.bcc.length && sameEmail(message.from.email, me.email) ? <p><span>bcc:</span> {message.bcc.map((person) => person.email).join(", ")}</p> : null}
                        <p><span>date:</span> {formatMessageDate(message.date)}</p>
                        <p><span>subject:</span> {thread.subject}</p>
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() => {
                            void navigator.clipboard?.writeText(message.from.email).then(
                              () => dispatch({ type: "note", text: "Email address copied" }),
                              () => dispatch({ type: "note", text: message.from.email }),
                            );
                          }}
                        >
                          Copy address
                        </button>
                      </div>
                    ) : null}
                  </div>
                </header>
                <div className="msg-body">
                  {message.format === "html" ? (
                    <div className="rich" dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.body) }} />
                  ) : (
                    <RichText text={message.body} />
                  )}
                </div>
                {message.attachments.length ? (
                  <div className="attach-row">
                    {message.attachments.map((file) => (
                      <button key={file.id} type="button" className="attach" onClick={() => setPreview(file)}>
                        <Icon name={file.mime.startsWith("image/") ? "image" : "file"} />
                        <span>
                          <strong>{file.filename}</strong>
                          <small>{formatBytes(file.size)}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        {inline.map((compose) => (
          <Compose key={compose.id} compose={compose} />
        ))}
        {inline.length === 0 && thread.messages.length > 0 ? (
          <div className="reply-launch">
            <button type="button" onClick={() => start("reply")}>
              <Icon name="reply" /> Reply
            </button>
            <button type="button" onClick={() => start("replyAll")}>
              <Icon name="replyAll" /> Reply all
            </button>
            <button type="button" onClick={() => start("forward")}>
              <Icon name="forward" /> Forward
            </button>
          </div>
        ) : null}
        {thread.draft && inline.length === 0 && thread.messages.length === 0 ? (
          <button type="button" className="text-btn" onClick={() => dispatch({ type: "composeOpen", compose: draftToCompose(thread, "float") })}>
            Open draft
          </button>
        ) : null}
      </div>
      {preview ? (
        <div className="modal-back" onMouseDown={() => setPreview(null)}>
          <div className="modal preview" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-label={preview.filename}>
            <header>
              <strong>{preview.filename}</strong>
              <button className="icon-btn" type="button" aria-label="Close preview" onClick={() => setPreview(null)}>
                <Icon name="close" />
              </button>
            </header>
            {preview.dataUrl && preview.mime.startsWith("image/") ? <img src={preview.dataUrl} alt="" /> : <pre>{preview.text || "No inline preview. Download the file to open it locally."}</pre>}
            <div className="modal-actions">
              <button type="button" className="send-btn" onClick={() => downloadAttachment(preview)}>
                <Icon name="download" size={16} /> Download
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function recipientLine(message: Message, me: string): string {
  const people = [...message.to, ...message.cc];
  const others = people.filter((person) => !sameEmail(person.email, me));
  if (!others.length) return "to me";
  const names = others.map((person) => person.name.split(" ")[0]).slice(0, 3).join(", ");
  return `to ${names}`;
}
