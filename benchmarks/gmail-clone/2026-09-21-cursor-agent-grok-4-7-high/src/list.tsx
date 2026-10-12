import type { Draft, Thread } from "./types";
import { htmlToText, snippetOf } from "./format";
import { listSender } from "./format";
import { Icon } from "./icons";
import { useMail } from "./store";
import { Avatar, Highlight, formatWhen, rowSnippet } from "./shell";

export function MailList() {
  const mail = useMail();
  const draftsMode = !mail.query && (mail.mailbox === "drafts" || mail.mailbox === "scheduled");
  const drafts = draftsMode ? mail.matchingDrafts : mail.query ? mail.matchingDrafts : [];
  const threads = draftsMode ? [] : mail.visible;

  if (!threads.length && !drafts.length) {
    return (
      <div className="list-scroll">
        <div className="empty">
          <Icon name={mail.query ? "search" : mail.mailbox === "trash" ? "trash" : "inbox"} size={48} />
          <h2>{emptyTitle(mail.mailbox, mail.query)}</h2>
          <p>{emptyBody(mail.mailbox, mail.query)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="list-scroll" data-testid="mail-list" role="list">
      {drafts.map((draft) => (
        <DraftRow key={draft.id} draft={draft} />
      ))}
      {threads.map((thread) => (
        <ThreadRow key={thread.id} thread={thread} />
      ))}
    </div>
  );
}

function ThreadRow({ thread }: { thread: Thread }) {
  const mail = useMail();
  const selected = mail.selected.includes(thread.id);
  const draft = mail.drafts.find((item) => item.threadId === thread.id && !item.scheduledFor);
  const labels = mail.labels.filter((label) => thread.labels.includes(label.id)).slice(0, 2);
  const attached = thread.messages.some((message) => message.attachments?.length);
  const open = () => mail.dispatch({ type: "open", id: thread.id });
  return (
    <div
      role="listitem"
      className={["row", thread.read ? "read" : "unread", selected ? "selected" : "", mail.cursorId === thread.id ? "cursor" : ""].filter(Boolean).join(" ")}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, input")) return;
        if (event.shiftKey) mail.dispatch({ type: "select", id: thread.id, shift: true, visibleIds: mail.visible.map((item) => item.id) });
        else open();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        mail.dispatch({ type: "menu", menu: { type: "row", x: event.clientX, y: event.clientY, threadId: thread.id } });
      }}
    >
      <input
        type="checkbox"
        checked={selected}
        aria-label={`Select ${thread.subject}`}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          mail.dispatch({ type: "select", id: thread.id, shift: event.shiftKey, visibleIds: mail.visible.map((item) => item.id) });
        }}
        onChange={() => undefined}
      />
      <button
        className={thread.starred ? "ib sm star-on" : "ib sm"}
        aria-label={thread.starred ? "Unstar" : "Star"}
        onClick={(event) => {
          event.stopPropagation();
          mail.dispatch({ type: "star", ids: [thread.id] });
        }}
      >
        <Icon name="star" size={18} filled={thread.starred} />
      </button>
      <div className="sender-col">
        {thread.important && <span className="bang" title="Important">!</span>}
        <span className="sender">
          <Highlight text={listSender(thread)} query={mail.query} />
        </span>
        {thread.messages.length > 1 && <span className="count">{thread.messages.length}</span>}
      </div>
      <div className="subject-cell">
        <div className="subject-line">
          <span className="subject-strong">
            <Highlight text={thread.subject || "(no subject)"} query={mail.query} />
          </span>
          <span className="snippet">— <Highlight text={rowSnippet(thread)} query={mail.query} /></span>
        </div>
        <span className="chips">
          {draft && <span className="chip draft">Draft</span>}
          {labels.map((label) => (
            <span key={label.id} className="chip" style={{ ["--c" as string]: label.color }}>{label.name}</span>
          ))}
          {attached && <Icon name="paperclip" size={16} />}
        </span>
      </div>
      <span className="date">{formatWhen(thread.messages[thread.messages.length - 1].date, mail.now)}</span>
      <div className="row-actions">
        <button className="ib sm" aria-label="Archive" onClick={() => mail.dispatch({ type: "archive", ids: [thread.id] })}><Icon name="archive" size={18} /></button>
        <button className="ib sm" aria-label="Delete" onClick={() => mail.dispatch({ type: "trash", ids: [thread.id] })}><Icon name="trash" size={18} /></button>
        <button className="ib sm" aria-label={thread.read ? "Mark as unread" : "Mark as read"} onClick={() => mail.dispatch({ type: "read", ids: [thread.id], read: !thread.read })}><Icon name="mail" size={18} /></button>
        <button className="ib sm" aria-label="Snooze" data-menu-root onClick={() => mail.dispatch({ type: "menu", menu: { type: "snooze", ids: [thread.id] } })}><Icon name="clock" size={18} /></button>
      </div>
    </div>
  );
}

function DraftRow({ draft }: { draft: Draft }) {
  const mail = useMail();
  const text = htmlToText(draft.bodyHtml);
  const who = draft.to[0] ? draft.to.join(", ") : "(no recipient)";
  return (
    <div role="listitem" className="row unread" onClick={() => mail.dispatch({ type: "open-draft", id: draft.id })}>
      <span />
      <span className="ib sm" aria-hidden><Icon name="pencil" size={16} /></span>
      <div className="sender-col">
        <span className="sender">{draft.scheduledFor ? "Scheduled" : "Draft"}</span>
      </div>
      <div className="subject-cell">
        <div className="subject-line">
          <span className="subject-strong">{draft.subject || "(no subject)"}</span>
          <span className="snippet">— {snippetOf(text || who)}</span>
        </div>
        <span className="chips"><span className="chip draft">{draft.scheduledFor ? "Scheduled" : "Draft"}</span></span>
      </div>
      <span className="date">{draft.scheduledFor ? formatWhen(draft.scheduledFor, mail.now) : formatWhen(draft.updatedAt, mail.now)}</span>
    </div>
  );
}

function emptyTitle(mailbox: string, query: string): string {
  if (query) return "No results";
  if (mailbox === "inbox") return "You're all caught up";
  if (mailbox === "starred") return "No starred conversations";
  if (mailbox === "snoozed") return "Nothing snoozed";
  if (mailbox === "sent") return "No sent mail";
  if (mailbox === "drafts") return "No drafts";
  if (mailbox === "scheduled") return "Nothing scheduled";
  if (mailbox === "trash") return "Trash is empty";
  if (mailbox === "spam") return "No spam";
  return "Nothing here";
}

function emptyBody(mailbox: string, query: string): string {
  if (query) return `Nothing matched “${query}”. Try a name, a subject, or from:someone.`;
  if (mailbox === "inbox") return "New mail shows up here. Check for mail if you're expecting something.";
  if (mailbox === "drafts") return "Close a compose window and the draft stays in this list.";
  if (mailbox === "trash") return "Deleted conversations wait here until you empty trash.";
  return "When conversations land in this view, they'll show up in this list.";
}

export function People({ name, email }: { name: string; email: string }) {
  return <Avatar name={name} email={email} size={28} />;
}
