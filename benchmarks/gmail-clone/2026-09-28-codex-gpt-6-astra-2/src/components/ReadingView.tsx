import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Forward,
  Inbox,
  Mail,
  MoreHorizontal,
  Paperclip,
  Printer,
  Reply,
  Star,
  Tag,
  Trash2,
  Archive,
  Check,
} from "lucide-react";
import { ACCOUNT, type Label, type Message, type Thread } from "../types";
import { downloadAttachment } from "../mail";
import { Avatar, IconButton } from "./ui";

interface Props {
  thread: Thread;
  labels: Label[];
  position: number;
  total: number;
  onBack: () => void;
  onAction: (action: string) => void;
  onReply: (forward?: boolean) => void;
  onMove: (direction: number) => void;
  onLabels: () => void;
  onSnooze: () => void;
}

export default function ReadingView({
  thread,
  labels,
  position,
  total,
  onBack,
  onAction,
  onReply,
  onMove,
  onLabels,
  onSnooze,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const newestMessageId = thread.messages[thread.messages.length - 1].id;
  useEffect(() => {
    setExpanded((previous) => new Set([...previous, newestMessageId]));
  }, [newestMessageId]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function printConversation() {
    setExpanded(new Set(thread.messages.map((message) => message.id)));
    setMore(false);
    setTimeout(() => window.print(), 0);
  }
  function fullDate(value: string) {
    return new Date(value).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  function attachments(message: Message) {
    if (!message.attachments?.length) return null;
    return (
      <div className="message-attachments">
        <div className="attachment-caption">
          <Paperclip size={14} />
          <span>
            {message.attachments.length} attachment
            {message.attachments.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="attachment-cards">
          {message.attachments.map((file) => (
            <button
              className="attachment-card"
              key={file.id}
              onClick={() => downloadAttachment(file, thread.subject)}
              title={
                file.data
                  ? `Download ${file.name}`
                  : "Download sample attachment details"
              }
            >
              <div className={`file-preview ${file.type}`}>
                <span>{file.type.toUpperCase()}</span>
                {file.type === "fig" ? (
                  <div className="mini-shapes">
                    <i />
                    <i />
                    <i />
                  </div>
                ) : (
                  <div className="mini-document">
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                )}
              </div>
              <div className="file-details">
                <span>
                  <b>{file.name}</b>
                  <small>
                    {file.size}
                    {!file.data && " · Sample"}
                  </small>
                </span>
                <ArrowDownToLine size={16} />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="reading-view">
      <div className="mail-toolbar reading-toolbar">
        <IconButton
          icon={ArrowLeft}
          label="Back to messages"
          onClick={onBack}
        />
        <span className="toolbar-divider" />
        {thread.folder === "trash" ? (
          <IconButton
            icon={Inbox}
            label="Restore to inbox"
            onClick={() => onAction("restore")}
          />
        ) : (
          <>
            <IconButton
              icon={Archive}
              label="Archive conversation"
              onClick={() => onAction("archive")}
            />
            <IconButton
              icon={Trash2}
              label="Delete conversation"
              onClick={() => onAction("delete")}
            />
          </>
        )}
        <span className="toolbar-divider" />
        <IconButton
          icon={Mail}
          label="Mark as unread"
          onClick={() => onAction("unread")}
        />
        <IconButton
          icon={Clock3}
          label="Snooze conversation"
          onClick={onSnooze}
        />
        <IconButton icon={Tag} label="Label conversation" onClick={onLabels} />
        <div className="menu-anchor">
          <IconButton
            icon={MoreHorizontal}
            label="More conversation actions"
            onClick={() => setMore(!more)}
          />
          {more && (
            <div className="dropdown-menu">
              <button
                onClick={() => {
                  onAction("star");
                  setMore(false);
                }}
              >
                <Star size={15} />
                {thread.starred ? "Remove star" : "Add star"}
              </button>
              <button
                onClick={() => {
                  onAction("important");
                  setMore(false);
                }}
              >
                <Check size={15} />
                {thread.important
                  ? "Mark as not important"
                  : "Mark as important"}
              </button>
              <button onClick={printConversation}>
                <Printer size={15} />
                Print conversation
              </button>
            </div>
          )}
        </div>
        <div className="toolbar-end">
          <span>
            {position + 1} of {total}
          </span>
          <IconButton
            icon={ChevronLeft}
            label="Previous conversation"
            disabled={position <= 0}
            onClick={() => onMove(-1)}
          />
          <IconButton
            icon={ChevronRight}
            label="Next conversation"
            disabled={position >= total - 1}
            onClick={() => onMove(1)}
          />
        </div>
      </div>
      <div className="conversation-scroll">
        {thread.snoozedUntil && (
          <div className="snoozed-banner">
            <Clock3 size={15} />
            <span>Snoozed until {fullDate(thread.snoozedUntil)}</span>
            <button onClick={() => onAction("unsnooze")}>
              Return to Inbox
            </button>
          </div>
        )}
        <div className="conversation-title">
          <div>
            <h2>{thread.subject}</h2>
            <div className="conversation-labels">
              {thread.important && (
                <span className="important-badge">Important</span>
              )}
              <span className="neutral-badge">
                {thread.folder === "inbox"
                  ? "Inbox"
                  : thread.folder === "trash"
                    ? "Trash"
                    : thread.folder === "sent"
                      ? "Sent"
                      : "Archived"}
              </span>
              {thread.labels.map((id) => {
                const label = labels.find((l) => l.id === id);
                return (
                  label && (
                    <button
                      key={id}
                      className="label-badge"
                      style={
                        { "--label-color": label.color } as React.CSSProperties
                      }
                      onClick={onLabels}
                    >
                      {label.name}
                    </button>
                  )
                );
              })}
            </div>
          </div>
          <IconButton
            icon={Printer}
            label="Print conversation"
            onClick={printConversation}
          />
        </div>
        <div className="messages">
          {thread.messages.map((message, index) => {
            const open = expanded.has(message.id);
            const own = message.email === ACCOUNT.email;
            return (
              <article
                className={`message ${open ? "is-open" : ""}`}
                key={message.id}
              >
                <div className="message-heading">
                  <Avatar
                    name={message.name}
                    initials={own ? "AM" : thread.initials}
                    color={own ? "account-color" : thread.color}
                    brand={own ? undefined : thread.brand}
                  />
                  <button
                    className="message-identity"
                    aria-expanded={open}
                    onClick={() => toggle(message.id)}
                  >
                    <span>
                      <b>{message.name}</b>
                      {open && <small>&lt;{message.email}&gt;</small>}
                    </span>
                    {open ? (
                      <span
                        className="message-to"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetails(
                            details === message.id ? null : message.id,
                          );
                        }}
                      >
                        to {message.to === ACCOUNT.email ? "me" : message.to}
                        <ChevronDown size={12} />
                      </span>
                    ) : (
                      <span className="collapsed-preview">
                        {message.body.replaceAll("\n", " ")}
                      </span>
                    )}
                  </button>
                  <time>{fullDate(message.date)}</time>
                  {index === thread.messages.length - 1 && (
                    <>
                      <IconButton
                        icon={Star}
                        label={
                          thread.starred
                            ? "Unstar conversation"
                            : "Star conversation"
                        }
                        className={thread.starred ? "starred" : ""}
                        onClick={() => onAction("star")}
                      />
                      <IconButton
                        icon={Reply}
                        label="Reply to message"
                        onClick={() => onReply()}
                      />
                    </>
                  )}
                </div>
                {details === message.id && (
                  <div className="message-details">
                    <p>
                      <span>From</span>
                      {message.name} &lt;{message.email}&gt;
                    </p>
                    <p>
                      <span>To</span>
                      {message.to}
                    </p>
                    {message.cc && (
                      <p>
                        <span>Cc</span>
                        {message.cc}
                      </p>
                    )}
                    {own && message.bcc && (
                      <p>
                        <span>Bcc</span>
                        {message.bcc}
                      </p>
                    )}
                    <p>
                      <span>Date</span>
                      {fullDate(message.date)}
                    </p>
                    <p>
                      <span>Subject</span>
                      {thread.subject}
                    </p>
                  </div>
                )}
                {open && (
                  <div className="message-content">
                    <div className="message-body">
                      {message.html ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: message.html }}
                        />
                      ) : (
                        message.body
                      )}
                    </div>
                    {attachments(message)}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <div className="reply-actions">
          <button className="outline-button" onClick={() => onReply()}>
            <Reply size={17} />
            Reply
          </button>
          <button className="outline-button" onClick={() => onReply(true)}>
            <Forward size={17} />
            Forward
          </button>
        </div>
        <div className="conversation-end">
          <span />
          You’re all caught up
          <span />
        </div>
      </div>
    </div>
  );
}
