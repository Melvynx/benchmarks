import { ACCOUNT, type Mailbox, type Thread, type View } from "./types";
import { createMailbox } from "./data";

export const STORAGE_KEY = "gpt6-mailbox-v1";

export function loadMailbox(): Mailbox {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "null",
    ) as Mailbox | null;
    if (
      saved?.version === 1 &&
      Array.isArray(saved.threads) &&
      saved.settings &&
      Array.isArray(saved.drafts) &&
      Array.isArray(saved.labels) &&
      Array.isArray(saved.tasks) &&
      typeof saved.notes === "string" &&
      saved.threads.every(
        (thread) =>
          typeof thread.id === "string" &&
          typeof thread.subject === "string" &&
          Array.isArray(thread.labels) &&
          Array.isArray(thread.messages) &&
          thread.messages.length > 0,
      ) &&
      saved.drafts.every(
        (draft) =>
          typeof draft.id === "string" &&
          Array.isArray(draft.to) &&
          Array.isArray(draft.attachments),
      )
    )
      return saved;
  } catch {
    /* An unavailable or invalid store starts a fresh local mailbox. */
  }
  return createMailbox();
}

export function matchesView(thread: Thread, view: View): boolean {
  if (view === "drafts") return false;
  if (view === "trash") return thread.folder === "trash";
  if (thread.folder === "trash") return false;
  if (view === "starred") return thread.starred;
  if (view === "snoozed") return !!thread.snoozedUntil;
  if (view === "sent")
    return thread.messages.some((m) => m.email === ACCOUNT.email);
  if (view === "all") return true;
  if (view.startsWith("label:")) return thread.labels.includes(view.slice(6));
  return thread.folder === "inbox" && !thread.snoozedUntil;
}

export function matchesSearch(
  thread: Thread,
  query: string,
  labels: Mailbox["labels"],
): boolean {
  const tokens = query.toLowerCase().match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const text = [
    thread.name,
    thread.email,
    thread.subject,
    thread.preview,
    ...thread.messages.map((m) => m.body),
    ...thread.labels.map((id) => labels.find((l) => l.id === id)?.name),
  ]
    .join(" ")
    .toLowerCase();
  return tokens.every((token) => {
    const value = token.replaceAll('"', "");
    if (value.startsWith("from:"))
      return thread.messages.some((m) =>
        (m.name + m.email).toLowerCase().includes(value.slice(5)),
      );
    if (value.startsWith("to:"))
      return thread.messages.some((m) =>
        m.to.toLowerCase().includes(value.slice(3)),
      );
    if (value.startsWith("subject:"))
      return thread.subject.toLowerCase().includes(value.slice(8));
    if (value === "is:unread") return thread.unread;
    if (value === "is:read") return !thread.unread;
    if (value === "is:starred") return thread.starred;
    if (value === "has:attachment")
      return thread.messages.some((m) => m.attachments?.length);
    if (value.startsWith("label:"))
      return thread.labels.some((id) =>
        labels
          .find((l) => l.id === id)
          ?.name.toLowerCase()
          .includes(value.slice(6)),
      );
    if (value.startsWith("in:"))
      return value.slice(3) === "anywhere" || thread.folder === value.slice(3);
    if (value.startsWith("after:"))
      return new Date(thread.date) > new Date(value.slice(6));
    if (value.startsWith("before:"))
      return new Date(thread.date) < new Date(value.slice(7));
    return text.includes(value);
  });
}

export function formatDate(value: string): string {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString())
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  today.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function dateGroup(value: string): string {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  today.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Yesterday";
  return "Earlier";
}

export function downloadAttachment(
  attachment: { name: string; data?: string },
  subject: string,
) {
  const url =
    attachment.data ||
    URL.createObjectURL(
      new Blob(
        [
          `${attachment.name}\n\n${subject}\n\nThis is a sample attachment from your local mailbox. Attach a file when composing to try real file downloads.`,
        ],
        { type: "text/plain" },
      ),
    );
  const a = document.createElement("a");
  a.href = url;
  a.download = attachment.data ? attachment.name : `${attachment.name}.txt`;
  a.click();
  if (!attachment.data) URL.revokeObjectURL(url);
}

export function isEmail(value: string) {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value);
}
