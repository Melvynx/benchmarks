import { Archive, Clock3, Mail, MailOpen, Paperclip, Star, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { formatListDate, snoozePresets } from "../lib/format";
import { useMail } from "../state/mail-context";
import type { Category } from "../types";
import { mailboxTitle } from "./Sidebar";

function rowPeople(thread: { messages: { labels: string[]; to: { name: string; email: string }[]; from: { name: string } }[]; people: string }, mailbox: string) {
  const want =
    mailbox === "sent" ? "sent" : mailbox === "drafts" ? "draft" : mailbox === "scheduled" ? "scheduled" : "";
  if (!want) return thread.people;
  const message = [...thread.messages].reverse().find((item) => item.labels.includes(want)) ?? thread.messages.at(-1);
  const names = message?.to.map((person) => person.name || person.email).filter(Boolean) ?? [];
  return names.length ? names.slice(0, 3).join(", ") : thread.people;
}

const TABS: { id: Category; label: string }[] = [
  { id: "primary", label: "Primary" },
  { id: "promotions", label: "Promotions" },
  { id: "social", label: "Social" },
  { id: "updates", label: "Updates" },
];

export function MailList() {
  const mail = useMail();
  const { threads, ui, data, openThread, toggleSelect, star, archive, trash, mark } = mail;

  useEffect(() => {
    document.querySelector<HTMLElement>('[data-cursor="true"]')?.scrollIntoView?.({ block: "nearest" });
  }, [ui.cursor, ui.mailbox, ui.query, ui.category]);

  const folderCopy: Record<string, string> = {
    inbox: "You're all caught up in this tab.",
    starred: "No starred conversations.",
    snoozed: "Nothing is snoozed.",
    sent: "No sent messages yet.",
    drafts: "No drafts saved.",
    scheduled: "Nothing is scheduled.",
    all: "All mail is empty.",
    spam: "Spam is empty.",
    trash: "Trash is empty.",
  };
  const empty = ui.query ? `No messages matched “${ui.query}”.` : (folderCopy[ui.mailbox] ?? "Nothing here.");

  return (
    <section className="list-pane" aria-label={mailboxTitle(ui.mailbox, data.labels, ui.query)}>
      <div className="list-head">
        <h2>{mailboxTitle(ui.mailbox, data.labels, ui.query)}</h2>
      </div>
      {ui.mailbox === "inbox" && !ui.query && (
        <div className="tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={ui.category === tab.id}
              className={`tab ${tab.id} ${ui.category === tab.id ? "active" : ""}`}
              onClick={() => mail.patchUi({ category: tab.id, cursor: 0, selected: [] })}
            >
              <span>{tab.label}</span>
              {mail.counts.categories[tab.id] > 0 && <em>{mail.counts.categories[tab.id]}</em>}
            </button>
          ))}
        </div>
      )}
      <div className="rows" role="list">
        {threads.length === 0 && <div className="empty">{empty}</div>}
        {threads.map((thread, index) => {
          const selected = ui.selected.includes(thread.threadId);
          const active = ui.activeThreadId === thread.threadId;
          const people = rowPeople(thread, ui.mailbox);
          const whenSource =
            ui.mailbox === "snoozed" && thread.snoozedUntil
              ? thread.snoozedUntil
              : ui.mailbox === "scheduled" && thread.sendAt
                ? thread.sendAt
                : thread.date;
          return (
            <div
              key={thread.threadId}
              role="listitem"
              data-cursor={index === ui.cursor}
              className={`row ${thread.unread ? "unread" : ""} ${selected ? "selected" : ""} ${active ? "active" : ""} ${index === ui.cursor ? "cursor" : ""}`}
              onClick={() => {
                mail.patchUi({ cursor: index });
                openThread(thread.threadId);
              }}
            >
              <label className="check" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={`Select ${thread.subject}`}
                  checked={selected}
                  onChange={(event) => toggleSelect(thread.threadId, index, (event.nativeEvent as MouseEvent).shiftKey)}
                />
              </label>
              <button
                type="button"
                className={`star ${thread.starred ? "on" : ""}`}
                aria-label={thread.starred ? "Unstar" : "Star"}
                onClick={(event) => {
                  event.stopPropagation();
                  star([thread.threadId]);
                }}
              >
                <Star size={18} fill={thread.starred ? "currentColor" : "none"} />
              </button>
              <span className="people">
                {thread.important && <i className="important" title="Important" />}
                {people}
              </span>
              <span className="subject-line">
                <span className="subject">{thread.subject}</span>
                {thread.count > 1 && <span className="thread-count">{thread.count}</span>}
                {thread.hasDraft && <span className="draft-tag">Draft</span>}
                {thread.snippet && <span className="sep">–</span>}
                <span className="snippet">{thread.snippet}</span>
                {thread.labelIds.slice(0, 2).map((id) => {
                  const label = data.labels.find((item) => item.id === id);
                  if (!label) return null;
                  return (
                    <span key={id} className="pill" style={{ background: `${label.color}22`, color: label.color }}>
                      {label.name}
                    </span>
                  );
                })}
                {thread.hasAttachment && <Paperclip size={14} className="clip" />}
              </span>
              <time className="when" dateTime={new Date(whenSource).toISOString()}>
                {ui.mailbox === "scheduled" ? "Scheduled" : formatListDate(whenSource)}
              </time>
              <span className="row-actions">
                <button type="button" aria-label="Archive" onClick={(event) => { event.stopPropagation(); archive([thread.threadId]); }}>
                  <Archive size={18} />
                </button>
                <button type="button" aria-label="Delete" onClick={(event) => { event.stopPropagation(); trash([thread.threadId]); }}>
                  <Trash2 size={18} />
                </button>
                <button
                  type="button"
                  aria-label={thread.unread ? "Mark as read" : "Mark as unread"}
                  onClick={(event) => {
                    event.stopPropagation();
                    mark([thread.threadId], thread.unread);
                  }}
                >
                  {thread.unread ? <MailOpen size={18} /> : <Mail size={18} />}
                </button>
                <button
                  type="button"
                  aria-label="Snooze until tomorrow"
                  onClick={(event) => {
                    event.stopPropagation();
                    const tomorrow = snoozePresets().find((preset) => preset.id === "tomorrow");
                    if (tomorrow) mail.snooze([thread.threadId], tomorrow.until);
                  }}
                >
                  <Clock3 size={18} />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
