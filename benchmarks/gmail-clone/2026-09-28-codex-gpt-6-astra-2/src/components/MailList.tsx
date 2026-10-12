import { type Dispatch, type SetStateAction } from "react";
import {
  ACCOUNT,
  type Filter,
  type Mailbox,
  type Thread,
  type View,
} from "../types";
import { dateGroup, formatDate } from "../mail";
import { Avatar, Checkbox, EmptyState, IconButton } from "./ui";
import {
  Archive,
  Clock3,
  FilePenLine,
  Inbox,
  Mail,
  MailOpen,
  Paperclip,
  Pencil,
  Search,
  Star,
  Trash2,
} from "lucide-react";

interface Props {
  isDrafts: boolean;
  mailbox: Mailbox;
  setComposeId: (id: string | null) => void;
  setMenu: (menu: string | null) => void;
  setMailbox: Dispatch<SetStateAction<Mailbox>>;
  composeId: string | null;
  notify: (message: string, undo?: () => void) => void;
  newCompose: () => void;
  visible: Thread[];
  unreadCount: number;
  selected: Set<string>;
  select: (id: string) => void;
  perform: (action: string, ids: string[]) => void;
  openThreadById: (id: string) => void;
  query: string;
  view: View;
  filter: Filter;
  setQuery: (query: string) => void;
  setFilter: (filter: Filter) => void;
}

export default function MailList({
  isDrafts,
  mailbox,
  setComposeId,
  setMenu,
  setMailbox,
  composeId,
  notify,
  newCompose,
  visible,
  unreadCount,
  selected,
  select,
  perform,
  openThreadById,
  query,
  view,
  filter,
  setQuery,
  setFilter,
}: Props) {
  return (
    <div className="mail-list" aria-label="Message list">
      {isDrafts ? (
        mailbox.drafts.length ? (
          mailbox.drafts
            .slice()
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((d) => (
              <div className="draft-row" key={d.id}>
                <Avatar name="Draft" initials="AM" color="account-color" />
                <button
                  className="draft-row-content"
                  onClick={() => {
                    setComposeId(d.id);
                    setMenu(null);
                  }}
                >
                  <span className="draft-to">
                    <span className="draft-tag">Draft</span>
                    {d.to.length ? d.to.join(", ") : "No recipients yet"}
                  </span>
                  <b>{d.subject || "(No subject)"}</b>
                  <p>{d.body || "Your next good idea starts here."}</p>
                </button>
                <time>{formatDate(d.updatedAt)}</time>
                <IconButton
                  icon={Trash2}
                  label={`Discard draft ${d.subject || "Untitled"}`}
                  onClick={() => {
                    setMailbox((prev) => ({
                      ...prev,
                      drafts: prev.drafts.filter((item) => item.id !== d.id),
                    }));
                    if (composeId === d.id) setComposeId(null);
                    notify("Draft discarded", () =>
                      setMailbox((prev) => ({
                        ...prev,
                        drafts: [...prev.drafts, d],
                      })),
                    );
                  }}
                />
              </div>
            ))
        ) : (
          <EmptyState
            icon={FilePenLine}
            title="A fresh page awaits"
            text="Your unfinished thoughts will be safe here."
          >
            <button className="outline-button" onClick={() => newCompose()}>
              <Pencil size={16} />
              Write a message
            </button>
          </EmptyState>
        )
      ) : visible.length > 0 ? (
        visible.map((thread, index) => {
          const group = dateGroup(thread.date);
          const showGroup =
            index === 0 || dateGroup(visible[index - 1].date) !== group;
          const files = thread.messages.flatMap((m) => m.attachments || []);
          return (
            <div key={thread.id} className="thread-group">
              {showGroup && (
                <div className="date-divider">
                  <span>{group}</span>
                  {index === 0 && (
                    <span>
                      {unreadCount > 0
                        ? `${unreadCount} unread`
                        : "All caught up"}
                    </span>
                  )}
                </div>
              )}
              <div
                className={`mail-row ${thread.unread ? "unread" : ""} ${selected.has(thread.id) ? "selected" : ""}`}
                data-thread-id={thread.id}
              >
                <div className="row-selection">
                  <Checkbox
                    checked={selected.has(thread.id)}
                    label={`Select ${thread.subject}`}
                    onChange={() => select(thread.id)}
                  />
                </div>
                <IconButton
                  icon={Star}
                  label={`${thread.starred ? "Unstar" : "Star"} ${thread.subject}`}
                  className={`row-star ${thread.starred ? "starred" : ""}`}
                  onClick={() => perform("star", [thread.id])}
                />
                <button
                  className="mail-row-main"
                  onClick={() => openThreadById(thread.id)}
                  aria-label={`Open ${thread.subject}, from ${thread.name}${thread.unread ? ", unread" : ""}`}
                >
                  <Avatar
                    name={thread.name}
                    initials={thread.initials}
                    color={thread.color}
                    brand={thread.brand}
                  />
                  <span className="sender-column">
                    <span className="sender-name">
                      {thread.folder === "sent" ? "To: " : ""}
                      {thread.name}
                      {thread.messages.length > 1 && (
                        <small>{thread.messages.length}</small>
                      )}
                    </span>
                    <span className="sender-detail">
                      {thread.email.split("@")[1]}
                    </span>
                  </span>
                  <span className="mail-content">
                    <span className="subject-line">
                      <span className="subject-text">{thread.subject}</span>
                      {thread.labels.slice(0, 1).map((id) => {
                        const label = mailbox.labels.find((l) => l.id === id);
                        return (
                          label && (
                            <span
                              key={id}
                              className="label-badge"
                              style={
                                {
                                  "--label-color": label.color,
                                } as React.CSSProperties
                              }
                            >
                              {label.name}
                            </span>
                          )
                        );
                      })}
                    </span>
                    <span className="mail-preview">
                      {thread.messages[thread.messages.length - 1]?.email ===
                        ACCOUNT.email && "You: "}
                      {thread.preview}
                    </span>
                  </span>
                  <span className="row-meta">
                    <span className="row-date">{formatDate(thread.date)}</span>
                    <span className="row-indicators">
                      {files.length > 0 && <Paperclip size={13} />}
                      {thread.snoozedUntil && <Clock3 size={13} />}
                      {thread.unread && <span className="unread-dot" />}
                    </span>
                  </span>
                </button>
                <div className="row-hover-actions">
                  {thread.folder === "trash" ? (
                    <IconButton
                      icon={Inbox}
                      label={`Restore ${thread.subject}`}
                      onClick={() => perform("restore", [thread.id])}
                    />
                  ) : (
                    <>
                      <IconButton
                        icon={Archive}
                        label={`Archive ${thread.subject}`}
                        onClick={() => perform("archive", [thread.id])}
                      />
                      <IconButton
                        icon={Trash2}
                        label={`Delete ${thread.subject}`}
                        onClick={() => perform("delete", [thread.id])}
                      />
                    </>
                  )}
                  <IconButton
                    icon={thread.unread ? MailOpen : Mail}
                    label={`Mark ${thread.subject} as ${thread.unread ? "read" : "unread"}`}
                    onClick={() =>
                      perform(thread.unread ? "read" : "unread", [thread.id])
                    }
                  />
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <EmptyState
          icon={
            query
              ? Search
              : view === "trash"
                ? Trash2
                : view === "starred"
                  ? Star
                  : view === "snoozed"
                    ? Clock3
                    : Inbox
          }
          title={
            query
              ? "Nothing here, just yet"
              : filter !== "all"
                ? "A little too specific?"
                : view === "starred"
                  ? "Keep the good ones close"
                  : view === "trash"
                    ? "A clean slate"
                    : view === "snoozed"
                      ? "Nothing waiting in the wings"
                      : "A little breathing room"
          }
          text={
            query
              ? "Try another name, a different word, or fewer filters."
              : filter !== "all"
                ? "No conversations match this filter. Try showing all messages."
                : view === "starred"
                  ? "Star a conversation and you’ll find it right here."
                  : view === "trash"
                    ? "Your trash is empty. Everything in its place."
                    : view === "snoozed"
                      ? "Snooze a conversation to bring it back when you’re ready."
                      : "You’re all caught up. Go make something good."
          }
        >
          {(query || filter !== "all") && (
            <button
              className="outline-button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
        </EmptyState>
      )}
    </div>
  );
}
