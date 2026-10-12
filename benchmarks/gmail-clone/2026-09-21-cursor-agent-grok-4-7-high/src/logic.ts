import type { Contact, Draft, MailboxId, Message, Thread } from "./types";
import { ME, htmlToText, latestMessage, snippetOf, threadTime, unique } from "./format";

export function inMailbox(thread: Thread, mailbox: MailboxId): boolean {
  const labels = new Set(thread.labels);
  const trashed = labels.has("trash");
  const spam = labels.has("spam");
  const snoozed = Boolean(thread.snoozedUntil);
  switch (mailbox) {
    case "inbox":
      return labels.has("inbox") && !trashed && !spam && !snoozed;
    case "starred":
      return thread.starred && !trashed;
    case "snoozed":
      return snoozed && !trashed;
    case "sent":
      return labels.has("sent") && !trashed;
    case "trash":
      return trashed;
    case "spam":
      return spam && !trashed;
    case "all":
      return !trashed && !spam;
    case "drafts":
    case "scheduled":
      return false;
    default:
      return labels.has(mailbox.slice(6)) && !trashed && !spam && !snoozed;
  }
}

function tokenize(query: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(query))) tokens.push(match[1] ?? match[2]);
  return tokens;
}

function blob(thread: Thread): string {
  const chunks = [thread.subject, thread.labels.join(" ")];
  for (const message of thread.messages) {
    chunks.push(
      message.from.name,
      message.from.email,
      message.body,
      message.to.map((contact) => `${contact.name} ${contact.email}`).join(" "),
      (message.cc ?? []).map((contact) => `${contact.name} ${contact.email}`).join(" "),
      (message.attachments ?? []).map((file) => file.name).join(" "),
    );
  }
  return chunks.join("\n").toLowerCase();
}

function matchToken(thread: Thread, token: string): boolean {
  const lower = token.toLowerCase();
  const [op, ...rest] = lower.split(":");
  const value = rest.join(":").replace(/^"|"$/g, "");
  if (rest.length && op) {
    if (op === "from") return thread.messages.some((message) => `${message.from.name} ${message.from.email}`.toLowerCase().includes(value));
    if (op === "to") {
      return thread.messages.some((message) =>
        [...message.to, ...(message.cc ?? [])].some((contact) => `${contact.name} ${contact.email}`.toLowerCase().includes(value)),
      );
    }
    if (op === "subject") return thread.subject.toLowerCase().includes(value);
    if (op === "label") return thread.labels.some((label) => label.toLowerCase().includes(value));
    if (op === "category") return thread.category === value;
    if (op === "filename") {
      return thread.messages.some((message) => (message.attachments ?? []).some((file) => file.name.toLowerCase().includes(value)));
    }
    if (op === "is") {
      if (value === "unread") return !thread.read;
      if (value === "read") return thread.read;
      if (value === "starred") return thread.starred;
      if (value === "important") return thread.important;
      if (value === "snoozed") return Boolean(thread.snoozedUntil);
    }
    if (op === "has" && (value === "attachment" || value === "attachments")) {
      return thread.messages.some((message) => (message.attachments ?? []).length > 0);
    }
    if (op === "in") {
      if (value === "inbox") return inMailbox(thread, "inbox");
      if (value === "starred") return thread.starred;
      if (value === "sent") return thread.labels.includes("sent");
      if (value === "trash") return thread.labels.includes("trash");
      if (value === "spam") return thread.labels.includes("spam");
      if (value === "snoozed") return Boolean(thread.snoozedUntil);
      return thread.labels.includes(value);
    }
  }
  return blob(thread).includes(lower);
}

export function searchThreads(threads: Thread[], query: string): Thread[] {
  const tokens = tokenize(query.trim());
  if (!tokens.length) return threads;
  const wantsTrash = tokens.some((token) => token.toLowerCase() === "in:trash");
  const wantsSpam = tokens.some((token) => token.toLowerCase() === "in:spam");
  return threads.filter((thread) => {
    if (!wantsTrash && thread.labels.includes("trash")) return false;
    if (!wantsSpam && thread.labels.includes("spam")) return false;
    return tokens.every((token) => matchToken(thread, token));
  });
}

export function draftMatches(draft: Draft, query: string): boolean {
  const tokens = tokenize(query.trim()).filter((token) => !token.includes(":"));
  if (!tokens.length) return !query.includes(":");
  const haystack = `${draft.subject} ${draft.to.join(" ")} ${draft.cc.join(" ")} ${draft.bcc.join(" ")} ${htmlToText(draft.bodyHtml)}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token.toLowerCase()));
}

export function visibleThreads(
  threads: Thread[],
  mailbox: MailboxId,
  category: Thread["category"] | "all",
  query: string,
  unreadOnly: boolean,
  sortUnreadFirst: boolean,
): Thread[] {
  const searching = query.trim().length > 0;
  let list = searching ? searchThreads(threads, query) : threads.filter((thread) => inMailbox(thread, mailbox));
  if (!searching && mailbox === "inbox" && category !== "all") {
    list = list.filter((thread) => thread.category === category);
  }
  if (unreadOnly) list = list.filter((thread) => !thread.read);
  return [...list].sort((a, b) => {
    if (!searching && sortUnreadFirst && mailbox === "inbox" && a.read !== b.read) return a.read ? 1 : -1;
    return threadTime(b) - threadTime(a);
  });
}

export function plainBody(message: Message): string {
  return snippetOf(message.body);
}

export function mapThreads(threads: Thread[], ids: string[], update: (thread: Thread) => Thread): Thread[] {
  const wanted = new Set(ids);
  return threads.map((thread) => (wanted.has(thread.id) ? update(thread) : thread));
}

export function withoutLabels(labels: string[], remove: string[]): string[] {
  const drop = new Set(remove);
  return labels.filter((label) => !drop.has(label));
}

export function withLabel(labels: string[], label: string): string[] {
  return labels.includes(label) ? labels : [...labels, label];
}

export function archiveThreads(threads: Thread[], ids: string[]): Thread[] {
  return mapThreads(threads, ids, (thread) => {
    let labels = withoutLabels(thread.labels, ["inbox", "trash", "spam"]);
    if (thread.labels.includes("trash") || thread.labels.includes("spam")) labels = withLabel(labels, "inbox");
    return { ...thread, labels, snoozedUntil: null };
  });
}

export function trashThreads(threads: Thread[], ids: string[]): Thread[] {
  return mapThreads(threads, ids, (thread) => ({
    ...thread,
    snoozedUntil: null,
    labels: withLabel(withoutLabels(thread.labels, ["inbox", "spam"]), "trash"),
  }));
}

export function spamThreads(threads: Thread[], ids: string[], spam: boolean): Thread[] {
  return mapThreads(threads, ids, (thread) => {
    if (spam) {
      return {
        ...thread,
        snoozedUntil: null,
        labels: withLabel(withoutLabels(thread.labels, ["inbox", "trash"]), "spam"),
      };
    }
    return {
      ...thread,
      labels: withLabel(withoutLabels(thread.labels, ["spam", "trash"]), "inbox"),
    };
  });
}

export function restoreThreads(threads: Thread[], ids: string[]): Thread[] {
  return mapThreads(threads, ids, (thread) => {
    let labels = withoutLabels(thread.labels, ["trash", "spam"]);
    const received = thread.messages.some((message) => message.from.email !== ME.email);
    if (received) labels = withLabel(labels, "inbox");
    return { ...thread, labels };
  });
}

export function snoozeThreads(threads: Thread[], ids: string[], until: string): Thread[] {
  return mapThreads(threads, ids, (thread) => ({
    ...thread,
    snoozedUntil: until,
    labels: withoutLabels(thread.labels, ["inbox", "trash", "spam"]),
  }));
}

export function wakeThread(thread: Thread): Thread {
  return {
    ...thread,
    snoozedUntil: null,
    labels: withLabel(withoutLabels(thread.labels, ["trash", "spam"]), "inbox"),
  };
}

export function collectContacts(threads: Thread[], extras: Contact[]): Contact[] {
  const map = new Map<string, Contact>();
  for (const contact of extras) map.set(contact.email.toLowerCase(), contact);
  for (const thread of threads) {
    for (const message of thread.messages) {
      map.set(message.from.email.toLowerCase(), message.from);
      for (const contact of [...message.to, ...(message.cc ?? []), ...(message.bcc ?? [])]) {
        map.set(contact.email.toLowerCase(), contact);
      }
    }
  }
  map.delete(ME.email.toLowerCase());
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function replyTarget(message: Message): string[] {
  if (message.from.email !== ME.email) return [message.from.email];
  const other = message.to.find((contact) => contact.email !== ME.email);
  return other ? [other.email] : message.to.map((contact) => contact.email);
}

export function replyAllFields(message: Message): { to: string[]; cc: string[] } {
  const to = unique([message.from.email, ...message.to.map((contact) => contact.email)]).filter((email) => email !== ME.email);
  const cc = unique((message.cc ?? []).map((contact) => contact.email)).filter((email) => email !== ME.email && !to.includes(email));
  if (!to.length) return { to: message.to.map((contact) => contact.email).filter((email) => email !== ME.email), cc };
  return { to, cc };
}

export function subjectFor(subject: string, mode: Draft["mode"]): string {
  const trimmed = subject.trim() || "(no subject)";
  if (mode === "forward") return /^fwd:/i.test(trimmed) ? trimmed : `Fwd: ${trimmed}`;
  if (/^re:/i.test(trimmed)) return trimmed;
  return `Re: ${trimmed}`;
}

export function quoteMessage(message: Message): string {
  return `On ${new Date(message.date).toLocaleString()}, ${message.from.name} <${message.from.email}> wrote:\n${message.body}`;
}

export function forwardQuote(thread: Thread): string {
  return thread.messages
    .map((message) => {
      const to = message.to.map((contact) => contact.email).join(", ");
      return [`---------- Forwarded message ----------`, `From: ${message.from.name} <${message.from.email}>`, `Date: ${new Date(message.date).toLocaleString()}`, `Subject: ${thread.subject}`, `To: ${to}`, "", message.body].join("\n");
    })
    .join("\n\n");
}

export function messageById(thread: Thread, messageId?: string): Message {
  return thread.messages.find((message) => message.id === messageId) ?? latestMessage(thread);
}
