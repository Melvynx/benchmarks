import { ACCOUNT, type Draft, type Mailbox, type Thread } from "./types";

export function changeThreads(
  threads: Thread[],
  ids: string[],
  action: string,
  until?: string,
): Thread[] {
  const selected = new Set(ids);
  return threads.map((thread) => {
    if (!selected.has(thread.id)) return thread;
    switch (action) {
      case "star":
        return { ...thread, starred: !thread.starred };
      case "important":
        return { ...thread, important: !thread.important };
      case "archive":
        return { ...thread, folder: "archived", snoozedUntil: undefined };
      case "delete":
        return {
          ...thread,
          folder: "trash",
          previousFolder: thread.folder,
          snoozedUntil: undefined,
        };
      case "restore":
        return { ...thread, folder: "inbox", snoozedUntil: undefined };
      case "read":
        return { ...thread, unread: false };
      case "unread":
        return { ...thread, unread: true };
      case "snooze":
        return { ...thread, snoozedUntil: until, folder: "inbox" };
      case "unsnooze":
        return { ...thread, snoozedUntil: undefined, folder: "inbox" };
      default:
        return thread;
    }
  });
}

export function changeLabels(
  threads: Thread[],
  ids: string[],
  labels: string[],
): Thread[] {
  const selected = threads.filter((thread) => ids.includes(thread.id));
  const common = selected.length
    ? selected[0].labels.filter((id) =>
        selected.every((thread) => thread.labels.includes(id)),
      )
    : [];
  const added = labels.filter((id) => !common.includes(id));
  const removed = common.filter((id) => !labels.includes(id));
  return threads.map((thread) =>
    ids.includes(thread.id)
      ? {
          ...thread,
          labels: [
            ...new Set([
              ...thread.labels.filter((id) => !removed.includes(id)),
              ...added,
            ]),
          ],
        }
      : thread,
  );
}

export function deliverDraft(
  mailbox: Mailbox,
  draft: Draft,
  messageId: string,
  threadId: string,
  sentAt: string,
): Mailbox {
  const previous = mailbox.threads.find(
    (thread) => thread.id === draft.replyTo,
  );
  const signatureText = mailbox.settings.signature
    ? "\n\n—\nAlex Morgan\nDesigner, Studio"
    : "";
  const signatureHtml = mailbox.settings.signature
    ? "<br><br>—<br>Alex Morgan<br>Designer, Studio"
    : "";
  const message = {
    id: messageId,
    name: ACCOUNT.name,
    email: ACCOUNT.email,
    to: draft.to.join(", "),
    cc: draft.cc,
    bcc: draft.bcc,
    body: draft.body + signatureText,
    html: draft.html ? draft.html + signatureHtml : undefined,
    date: sentAt,
    attachments: draft.attachments,
  };
  const outgoing: Thread = {
    id: threadId,
    name: draft.to.map((email) => email.split("@")[0]).join(", "),
    email: draft.to[0],
    initials: "AM",
    color: "account-color",
    subject: draft.subject,
    preview: draft.body,
    date: sentAt,
    unread: false,
    starred: false,
    important: false,
    folder: "sent",
    category: "primary",
    labels: [],
    messages: [message],
  };
  return {
    ...mailbox,
    drafts: mailbox.drafts.filter((saved) => saved.id !== draft.id),
    threads: previous
      ? mailbox.threads.map((thread) =>
          thread.id === previous.id
            ? {
                ...thread,
                messages: [...thread.messages, message],
                preview: draft.body,
                date: sentAt,
                unread: false,
                folder: thread.folder === "trash" ? "inbox" : thread.folder,
                snoozedUntil: undefined,
              }
            : thread,
        )
      : [outgoing, ...mailbox.threads],
  };
}

export function wakeSnoozed(threads: Thread[], now: number): Thread[] {
  return threads.map((thread) =>
    thread.snoozedUntil && new Date(thread.snoozedUntil).getTime() <= now
      ? { ...thread, snoozedUntil: undefined, folder: "inbox", unread: true }
      : thread,
  );
}
