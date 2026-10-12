import { ME_EMAIL } from "../identity";
import type { CustomLabel, Mailbox, Message, Person, Settings, ThreadSummary } from "../types";
import { cleanSubject, snippetOf } from "./format";
import { parseQuery, type ParsedQuery } from "./search";

export const LOCATIONS = new Set(["inbox", "sent", "draft", "trash", "spam", "snoozed", "scheduled"]);

export function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function hasLabel(message: Message, label: string): boolean {
  return message.labels.includes(label);
}

export function threadMessages(messages: Message[], threadId: string): Message[] {
  return messages.filter((message) => message.threadId === threadId).sort((a, b) => a.date - b.date);
}

function personHit(person: Person, query: string): boolean {
  const hay = `${person.name} ${person.email}`.toLowerCase();
  return hay.includes(query.toLowerCase());
}

function labelHit(message: Message, query: string, labels: CustomLabel[]): boolean {
  const needle = query.toLowerCase();
  if (message.labels.some((label) => label.toLowerCase() === needle)) return true;
  const match = labels.find((label) => label.name.toLowerCase() === needle || label.id.toLowerCase() === needle);
  return match ? message.labels.includes(match.id) : false;
}

function locationOk(message: Message, parsed: ParsedQuery): boolean {
  const loc = parsed.in;
  if (!loc) return !hasLabel(message, "trash") && !hasLabel(message, "spam");
  if (loc === "anywhere") return true;
  if (loc === "trash") return hasLabel(message, "trash");
  if (loc === "spam") return hasLabel(message, "spam");
  if (loc === "inbox") return hasLabel(message, "inbox");
  if (loc === "sent") return hasLabel(message, "sent");
  if (loc === "draft" || loc === "drafts") return hasLabel(message, "draft");
  if (loc === "snoozed") return hasLabel(message, "snoozed");
  if (loc === "scheduled") return hasLabel(message, "scheduled");
  if (loc === "starred") return message.starred && !hasLabel(message, "trash");
  return !hasLabel(message, "trash") && !hasLabel(message, "spam");
}

export function threadMatchesQuery(messages: Message[], parsed: ParsedQuery, labels: CustomLabel[]): boolean {
  let eligible = messages.filter((message) => locationOk(message, parsed));
  if (parsed.in === "starred") eligible = eligible.filter((message) => message.starred);
  if (eligible.length === 0) return false;
  if (parsed.is.includes("unread") && !eligible.some((message) => !message.read)) return false;
  if (parsed.is.includes("read") && eligible.some((message) => !message.read)) return false;
  if (parsed.is.includes("starred") && !eligible.some((message) => message.starred)) return false;
  if (parsed.is.includes("important") && !eligible.some((message) => message.important)) return false;
  if (parsed.has.includes("attachment") && !eligible.some((message) => message.attachments.length > 0)) return false;
  if (parsed.from && !eligible.some((message) => personHit(message.from, parsed.from!))) return false;
  if (
    parsed.to &&
    !eligible.some((message) => [...message.to, ...message.cc, ...message.bcc].some((person) => personHit(person, parsed.to!)))
  ) {
    return false;
  }
  if (parsed.subject && !eligible.some((message) => message.subject.toLowerCase().includes(parsed.subject!.toLowerCase()))) {
    return false;
  }
  if (parsed.label && !eligible.some((message) => labelHit(message, parsed.label!, labels))) return false;
  if (parsed.category && !eligible.some((message) => message.category === parsed.category)) return false;
  if (parsed.in && !["anywhere", "trash", "spam", "inbox", "sent", "draft", "drafts", "snoozed", "scheduled", "starred"].includes(parsed.in)) {
    if (!eligible.some((message) => labelHit(message, parsed.in!, labels))) return false;
  }
  if (parsed.text.length) {
    const blob = eligible
      .map((message) =>
        [
          message.subject,
          message.body,
          message.from.name,
          message.from.email,
          ...message.to.map((person) => `${person.name} ${person.email}`),
          ...message.attachments.map((attachment) => attachment.name),
        ].join(" "),
      )
      .join("\n")
      .toLowerCase();
    if (!parsed.text.every((term) => blob.includes(term.toLowerCase()))) return false;
  }
  return true;
}

export function threadInMailbox(messages: Message[], mailbox: Mailbox): boolean {
  switch (mailbox) {
    case "inbox":
      return messages.some((message) => hasLabel(message, "inbox"));
    case "starred":
      return messages.some((message) => message.starred && !hasLabel(message, "trash") && !hasLabel(message, "spam"));
    case "snoozed":
      return messages.some((message) => hasLabel(message, "snoozed"));
    case "sent":
      return messages.some((message) => hasLabel(message, "sent"));
    case "drafts":
      return messages.some((message) => hasLabel(message, "draft"));
    case "scheduled":
      return messages.some((message) => hasLabel(message, "scheduled"));
    case "spam":
      return messages.some((message) => hasLabel(message, "spam"));
    case "trash":
      return messages.some((message) => hasLabel(message, "trash"));
    case "all":
      return messages.some(
        (message) =>
          !["trash", "spam", "draft", "scheduled", "snoozed"].some((label) => hasLabel(message, label)),
      );
    default:
      if (mailbox.startsWith("label:")) {
        const id = mailbox.slice(6);
        return messages.some(
          (message) => message.labels.includes(id) && !hasLabel(message, "trash") && !hasLabel(message, "spam"),
        );
      }
      return false;
  }
}

export function summarize(messages: Message[], meEmail = ME_EMAIL): ThreadSummary {
  const sorted = [...messages].sort((a, b) => a.date - b.date);
  const latest = sorted[sorted.length - 1];
  const draft = [...sorted].reverse().find((message) => hasLabel(message, "draft"));
  const snippetSource = draft ?? latest;
  const inboxMsgs = sorted.filter((message) => hasLabel(message, "inbox"));
  const category = (inboxMsgs[inboxMsgs.length - 1] ?? latest).category;
  const names: string[] = [];
  const nameSource = [...sorted].reverse().filter((message) => !hasLabel(message, "draft"));
  for (const message of (nameSource.length ? nameSource : [...sorted].reverse())) {
    const label = message.from.email.toLowerCase() === meEmail.toLowerCase() ? "me" : message.from.name;
    if (!names.includes(label)) names.push(label);
  }
  const labelIds = unique(
    sorted.flatMap((message) => message.labels.filter((label) => !LOCATIONS.has(label))),
  );
  const snoozed = sorted.find((message) => message.snoozedUntil);
  const scheduled = sorted.find((message) => message.sendAt && hasLabel(message, "scheduled"));
  return {
    threadId: latest.threadId,
    messages: sorted,
    subject: cleanSubject(sorted[0]?.subject || latest.subject),
    snippet: snippetOf(snippetSource.body),
    date: latest.date,
    people: names.slice(0, 3).join(", "),
    unread: sorted.some((message) => !message.read && !hasLabel(message, "draft")),
    starred: sorted.some((message) => message.starred),
    important: sorted.some((message) => message.important),
    count: sorted.filter((message) => !hasLabel(message, "draft")).length || sorted.length,
    hasAttachment: sorted.some((message) => message.attachments.length > 0),
    labelIds,
    hasDraft: Boolean(draft),
    category,
    snoozedUntil: snoozed?.snoozedUntil ?? null,
    sendAt: scheduled?.sendAt ?? null,
  };
}

export function filterThreads(
  messages: Message[],
  opts: { mailbox: Mailbox; category: ThreadSummary["category"]; query: string; labels: CustomLabel[] },
): ThreadSummary[] {
  const groups = new Map<string, Message[]>();
  for (const message of messages) {
    const list = groups.get(message.threadId);
    if (list) list.push(message);
    else groups.set(message.threadId, [message]);
  }
  const searching = opts.query.trim().length > 0;
  const parsed = parseQuery(opts.query);
  const rows: ThreadSummary[] = [];
  for (const group of groups.values()) {
    if (searching) {
      if (!threadMatchesQuery(group, parsed, opts.labels)) continue;
    } else if (!threadInMailbox(group, opts.mailbox)) continue;
    const summary = summarize(group);
    if (!searching && opts.mailbox === "inbox" && summary.category !== opts.category) continue;
    rows.push(summary);
  }
  rows.sort((a, b) => b.date - a.date);
  return rows;
}

export function inboxUnreadCount(messages: Message[]): number {
  return new Set(messages.filter((message) => hasLabel(message, "inbox") && !message.read).map((message) => message.threadId)).size;
}

export function countWhere(messages: Message[], pred: (message: Message) => boolean): number {
  return new Set(messages.filter(pred).map((message) => message.threadId)).size;
}

export function applySignature(body: string, settings: Settings): string {
  if (!settings.signatureOn) return body;
  const signature = settings.signature.trim();
  if (!signature || body.includes(signature)) return body;
  return `${body.replace(/\s+$/, "")}\n\n--\n${signature}`;
}

export function deliver(message: Message, meEmail = ME_EMAIL): Message {
  const labels = message.labels.filter((label) => !LOCATIONS.has(label));
  labels.push("sent");
  const toMe = [...message.to, ...message.cc, ...message.bcc].some(
    (person) => person.email.toLowerCase() === meEmail.toLowerCase(),
  );
  if (toMe) labels.push("inbox");
  return { ...message, labels: unique(labels), sendAt: null, read: toMe ? message.read : true };
}

export function restoredLabels(message: Message, meEmail = ME_EMAIL): string[] {
  const labels = message.labels.filter((label) => label !== "trash" && label !== "spam");
  const fromMe = message.from.email.toLowerCase() === meEmail.toLowerCase();
  const toMe = [...message.to, ...message.cc, ...message.bcc].some(
    (person) => person.email.toLowerCase() === meEmail.toLowerCase(),
  );
  if (fromMe) labels.push("sent");
  if (!fromMe || toMe) labels.push("inbox");
  return unique(labels);
}

export function collectContacts(messages: Message[], meEmail = ME_EMAIL): Person[] {
  const map = new Map<string, Person>();
  for (const message of messages) {
    for (const person of [message.from, ...message.to, ...message.cc, ...message.bcc]) {
      const email = person.email.toLowerCase();
      if (email === meEmail.toLowerCase()) continue;
      if (!map.has(email)) map.set(email, person);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function replyRecipients(messages: Message[], mode: "reply" | "replyAll", meEmail = ME_EMAIL): { to: Person[]; cc: Person[] } {
  const latest = [...messages].reverse().find((message) => !hasLabel(message, "draft")) ?? messages[messages.length - 1];
  const notMe = (person: Person) => person.email.toLowerCase() !== meEmail.toLowerCase();
  if (mode === "reply") {
    if (latest.from.email.toLowerCase() === meEmail.toLowerCase()) return { to: latest.to.filter(notMe), cc: [] };
    return { to: [latest.from], cc: [] };
  }
  if (latest.from.email.toLowerCase() === meEmail.toLowerCase()) {
    return { to: latest.to.filter(notMe), cc: latest.cc.filter(notMe) };
  }
  const seen = new Set<string>();
  const to: Person[] = [];
  for (const person of [latest.from, ...latest.to]) {
    const email = person.email.toLowerCase();
    if (email === meEmail.toLowerCase() || seen.has(email)) continue;
    seen.add(email);
    to.push(person);
  }
  return { to, cc: latest.cc.filter((person) => notMe(person) && !seen.has(person.email.toLowerCase())) };
}

export function buildDraft(opts: {
  mode: "new" | "reply" | "replyAll" | "forward";
  source: Message[];
  me: Person;
  now: number;
  id?: string;
}): Message {
  const id = opts.id ?? `d-${opts.now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const base = {
    id,
    from: opts.me,
    cc: [] as Person[],
    bcc: [] as Person[],
    date: opts.now,
    read: true,
    starred: false,
    important: false,
    labels: ["draft"],
    category: "primary" as const,
    attachments: [] as Message["attachments"],
    snoozedUntil: null,
    sendAt: null,
  };
  if (opts.mode === "new" || opts.source.length === 0) {
    return {
      ...base,
      threadId: `t-${id}`,
      to: [],
      subject: "",
      body: "",
    };
  }
  const sorted = [...opts.source].sort((a, b) => a.date - b.date);
  const latest = [...sorted].reverse().find((message) => !hasLabel(message, "draft")) ?? sorted[sorted.length - 1];
  const subjectBase = cleanSubject(sorted[0].subject || latest.subject);
  if (opts.mode === "forward") {
    const header = [
      "---------- Forwarded message ----------",
      `From: ${latest.from.name} <${latest.from.email}>`,
      `Date: ${new Date(latest.date).toUTCString()}`,
      `Subject: ${latest.subject}`,
      `To: ${latest.to.map((person) => person.email).join(", ")}`,
    ].join("\n");
    return {
      ...base,
      threadId: `t-${id}`,
      to: [],
      subject: `Fwd: ${subjectBase}`,
      body: `\n\n---\n${header}\n\n${latest.body}`,
      attachments: latest.attachments.map((attachment) => ({ ...attachment, id: `${attachment.id}-fwd` })),
      category: latest.category,
    };
  }
  const people = replyRecipients(sorted, opts.mode, opts.me.email);
  const quote = latest.body.split("\n---\n")[0]?.trim() ?? "";
  return {
    ...base,
    threadId: latest.threadId,
    to: people.to,
    cc: people.cc,
    subject: `Re: ${subjectBase}`,
    body: `\n\n---\nOn ${new Date(latest.date).toUTCString()}, ${latest.from.name} wrote:\n${quote}`,
    category: latest.category,
  };
}
