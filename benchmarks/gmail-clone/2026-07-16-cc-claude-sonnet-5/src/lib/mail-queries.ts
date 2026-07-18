import type { FolderId, Message, Thread, ThreadCategory } from "./types";

export const SYSTEM_FOLDER_LABEL: Record<string, string> = {
  INBOX: "Inbox",
  SENT: "Sent",
  DRAFT: "Drafts",
  TRASH: "Trash",
  SPAM: "Spam",
};

export function isInTrash(thread: Thread): boolean {
  return thread.labelIds.includes("TRASH");
}

export function isInSpam(thread: Thread): boolean {
  return thread.labelIds.includes("SPAM");
}

export function threadUnreadCount(thread: Thread, messages: Record<string, Message>): number {
  return thread.messageIds.reduce((count, id) => {
    const m = messages[id];
    return m && !m.isRead && !m.isDraft ? count + 1 : count;
  }, 0);
}

export function isThreadUnread(thread: Thread, messages: Record<string, Message>): boolean {
  return threadUnreadCount(thread, messages) > 0;
}

export function threadHasAttachments(thread: Thread, messages: Record<string, Message>): boolean {
  return thread.messageIds.some((id) => (messages[id]?.attachments.length ?? 0) > 0);
}

export function isSnoozedActive(thread: Thread, now: number): boolean {
  return !!thread.snoozedUntil && new Date(thread.snoozedUntil).getTime() > now;
}

export function matchesFolder(thread: Thread, folder: FolderId, now: number): boolean {
  const trashed = isInTrash(thread);
  const spam = isInSpam(thread);
  switch (folder) {
    case "inbox":
      return (
        thread.labelIds.includes("INBOX") &&
        !trashed &&
        !spam &&
        !isSnoozedActive(thread, now)
      );
    case "starred":
      return thread.isStarred && !trashed && !spam;
    case "important":
      return thread.isImportant && !trashed && !spam;
    case "snoozed":
      return thread.labelIds.includes("INBOX") && !trashed && !spam && isSnoozedActive(thread, now);
    case "sent":
      return thread.labelIds.includes("SENT") && !trashed;
    case "drafts":
      return thread.labelIds.includes("DRAFT") && !trashed;
    case "spam":
      return spam;
    case "trash":
      return trashed;
    case "all":
      return !trashed && !spam;
    default:
      return false;
  }
}

export function matchesLabel(thread: Thread, labelId: string): boolean {
  return thread.labelIds.includes(labelId) && !isInTrash(thread) && !isInSpam(thread);
}

export function matchesCategory(thread: Thread, category: ThreadCategory | "all"): boolean {
  return category === "all" || thread.category === category;
}

export function matchesSearch(
  thread: Thread,
  messages: Record<string, Message>,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const inSubject = thread.subject.toLowerCase().includes(q);
  if (inSubject) return true;

  return thread.messageIds.some((id) => {
    const m = messages[id];
    if (!m) return false;
    const haystack = [
      m.from.name,
      m.from.email,
      ...m.to.map((t) => `${t.name} ${t.email}`),
      m.bodyHtml.replace(/<[^>]+>/g, " "),
      m.snippet,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function sortByRecency(threads: Thread[]): Thread[] {
  return [...threads].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

export function threadParticipants(thread: Thread, messages: Record<string, Message>) {
  return thread.messageIds
    .map((id) => messages[id])
    .filter((m): m is Message => !!m)
    .map((m) => m.from);
}

export function lastMessage(thread: Thread, messages: Record<string, Message>): Message | undefined {
  const id = thread.messageIds[thread.messageIds.length - 1];
  return id ? messages[id] : undefined;
}
