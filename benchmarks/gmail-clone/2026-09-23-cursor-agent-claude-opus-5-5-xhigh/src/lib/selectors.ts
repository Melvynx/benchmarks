import { ME } from "./contacts";
import { firstName, htmlToText } from "./format";
import { parseQuery, type Query } from "./search";
import type { Category, FolderId, Label, Message, Thread, View } from "./types";

type Messages = Record<string, Message>;

const textCache = new WeakMap<Message, string>();
export function messageText(m: Message) {
  let t = textCache.get(m);
  if (t === undefined) {
    t = htmlToText(m.html);
    textCache.set(m, t);
  }
  return t;
}

export function threadMessages(t: Thread, messages: Messages) {
  return t.messageIds
    .map((id) => messages[id])
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);
}

export const isDelivered = (m: Message) => m.status === "received" || m.status === "sent" || m.status === "sending";

export function isUnread(t: Thread, messages: Messages) {
  return t.messageIds.some((id) => messages[id]?.unread);
}

export function hasDraft(t: Thread, messages: Messages) {
  return t.messageIds.some((id) => messages[id]?.status === "draft");
}

export function hasSent(t: Thread, messages: Messages) {
  return t.messageIds.some((id) => {
    const m = messages[id];
    return m && (m.status === "sent" || m.status === "sending");
  });
}

export function hasScheduled(t: Thread, messages: Messages) {
  return t.messageIds.some((id) => messages[id]?.status === "scheduled");
}

export function hasAttachments(t: Thread, messages: Messages) {
  return t.messageIds.some((id) => (messages[id]?.attachments.length ?? 0) > 0);
}

export function threadAttachments(t: Thread, messages: Messages) {
  return threadMessages(t, messages)
    .filter((m) => m.status !== "draft")
    .flatMap((m) => m.attachments);
}

export function isSnoozed(t: Thread, now: number) {
  return !!t.snoozedUntil && t.snoozedUntil > now;
}

/** A thread exists in the given folder, independent of search. */
export function inFolder(t: Thread, id: FolderId, messages: Messages, now: number) {
  const live = !t.trashed && !t.spam;
  switch (id) {
    case "inbox":
      return live && t.inInbox && !isSnoozed(t, now) && t.messageIds.some((mid) => messages[mid] && isDeliveredOrIncoming(messages[mid]));
    case "starred":
      return live && t.starred;
    case "snoozed":
      return live && isSnoozed(t, now);
    case "important":
      return live && t.important;
    case "sent":
      return !t.trashed && hasSent(t, messages);
    case "scheduled":
      return !t.trashed && hasScheduled(t, messages);
    case "drafts":
      return !t.trashed && hasDraft(t, messages);
    case "all":
      return live && t.messageIds.some((mid) => messages[mid] && messages[mid].status !== "scheduled");
    case "spam":
      return t.spam && !t.trashed;
    case "trash":
      return t.trashed;
  }
}

function isDeliveredOrIncoming(m: Message) {
  return m.status === "received" || m.status === "sent" || m.status === "sending";
}

export function threadDate(t: Thread, messages: Messages, folder?: FolderId) {
  const ms = t.messageIds.map((id) => messages[id]).filter(Boolean);
  let pool = ms;
  if (folder === "drafts") pool = ms.filter((m) => m.status === "draft");
  else if (folder === "sent") pool = ms.filter((m) => m.status === "sent" || m.status === "sending");
  else if (folder === "scheduled") pool = ms.filter((m) => m.status === "scheduled");
  else {
    const delivered = ms.filter(isDelivered);
    if (delivered.length) pool = delivered;
  }
  if (folder === "scheduled") return Math.min(...pool.map((m) => m.scheduledAt ?? m.date));
  return Math.max(0, ...pool.map((m) => m.date));
}

export function matchesQuery(t: Thread, messages: Messages, q: Query, labels: Label[], now: number) {
  const ms = threadMessages(t, messages);
  if (!q.in || !["trash", "spam", "anywhere"].includes(q.in)) {
    if (t.trashed || t.spam) return false;
  }
  if (q.in && q.in !== "anywhere" && q.in !== "all") {
    const map: Record<string, FolderId> = {
      inbox: "inbox",
      sent: "sent",
      drafts: "drafts",
      draft: "drafts",
      trash: "trash",
      spam: "spam",
      starred: "starred",
      snoozed: "snoozed",
      scheduled: "scheduled",
      important: "important",
    };
    const f = map[q.in];
    if (f && !inFolder(t, f, messages, now)) return false;
  }
  for (const is of q.is) {
    const neg = is.startsWith("-");
    const key = neg ? is.slice(1) : is;
    let v: boolean;
    if (key === "unread") v = isUnread(t, messages);
    else if (key === "read") v = !isUnread(t, messages);
    else if (key === "starred") v = t.starred;
    else if (key === "important") v = t.important;
    else if (key === "snoozed") v = isSnoozed(t, now);
    else if (key === "muted") v = !!t.muted;
    else continue;
    if (v === neg) return false;
  }
  for (const has of q.has) {
    const neg = has.startsWith("-");
    const key = neg ? has.slice(1) : has;
    let v: boolean;
    if (key === "attachment") v = hasAttachments(t, messages);
    else if (key === "userlabels") v = t.labels.length > 0;
    else if (key === "nouserlabels") v = t.labels.length === 0;
    else if (key === "star" || key === "yellow-star") v = t.starred;
    else continue;
    if (v === neg) return false;
  }
  if (q.category && t.category !== q.category) return false;
  for (const l of q.label) {
    const label = labels.find((x) => x.id === l || x.name.toLowerCase().replace(/\s+/g, "-") === l || x.name.toLowerCase() === l);
    if (!label || !t.labels.includes(label.id)) return false;
  }
  const dated = ms.filter((m) => m.status !== "draft");
  const pool = dated.length ? dated : ms;
  if (q.before !== undefined && !pool.some((m) => m.date < q.before!)) return false;
  if (q.after !== undefined && !pool.some((m) => m.date >= q.after!)) return false;
  if (q.larger !== undefined && !ms.some((m) => m.attachments.reduce((s, a) => s + a.size, 0) >= q.larger!)) return false;
  for (const f of q.from) {
    if (!ms.some((m) => (f === "me" ? m.from.email === ME.email : `${m.from.name} ${m.from.email}`.toLowerCase().includes(f)))) return false;
  }
  for (const f of q.to) {
    if (
      !ms.some((m) =>
        [...m.to, ...m.cc, ...m.bcc].some((c) => (f === "me" ? c.email === ME.email : `${c.name} ${c.email}`.toLowerCase().includes(f))),
      )
    )
      return false;
  }
  for (const s of q.subject) if (!t.subject.toLowerCase().includes(s)) return false;
  for (const f of q.filename) {
    if (!ms.some((m) => m.attachments.some((a) => a.name.toLowerCase().includes(f)))) return false;
  }
  if (q.text.length || q.exclude.length) {
    const hay = [
      t.subject,
      ...ms.flatMap((m) => [
        m.from.name,
        m.from.email,
        ...m.to.map((c) => `${c.name} ${c.email}`),
        messageText(m),
        ...m.attachments.map((a) => a.name),
      ]),
      ...t.labels.map((id) => labels.find((l) => l.id === id)?.name ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    for (const term of q.text) if (!hay.includes(term)) return false;
    for (const term of q.exclude) if (hay.includes(term)) return false;
  }
  for (const group of q.any ?? []) {
    if (!group.some((alt) => matchesQuery(t, messages, alt, labels, now))) return false;
  }
  return true;
}

export interface ViewResult {
  threads: Thread[];
  folder?: FolderId;
  query?: Query;
}

export function viewThreads(
  view: View,
  threads: Record<string, Thread>,
  messages: Messages,
  labels: Label[],
  now: number,
): ViewResult {
  const all = Object.values(threads);
  let list: Thread[];
  let folder: FolderId | undefined;
  let query: Query | undefined;
  if (view.kind === "folder") {
    folder = view.id;
    list = all.filter((t) => inFolder(t, view.id, messages, now));
  } else if (view.kind === "category") {
    folder = "inbox";
    list = all.filter((t) => inFolder(t, "inbox", messages, now) && t.category === view.id);
  } else if (view.kind === "label") {
    list = all.filter((t) => t.labels.includes(view.id) && !t.trashed && !t.spam);
  } else {
    query = parseQuery(view.q, now);
    list = all.filter((t) => matchesQuery(t, messages, query!, labels, now));
  }
  const sortFolder = folder === "inbox" ? undefined : folder;
  const withDates = list.map((t) => [t, threadDate(t, messages, sortFolder)] as const);
  if (folder === "scheduled") withDates.sort((a, b) => a[1] - b[1]);
  else withDates.sort((a, b) => b[1] - a[1]);
  return { threads: withDates.map(([t]) => t), folder, query };
}

export function participants(t: Thread, messages: Messages, folder?: FolderId) {
  const ms = threadMessages(t, messages);
  if (folder === "sent" || folder === "drafts" || folder === "scheduled") {
    const mine = ms.filter((m) => m.from.email === ME.email).pop();
    const to = mine ? [...mine.to, ...mine.cc] : [];
    if (!to.length) return { text: "(no recipients)", prefix: folder === "drafts" ? "" : "To: ", count: 0 };
    return {
      text: to.map((c) => (to.length > 1 ? firstName(c.name) : c.name)).join(", "),
      prefix: "To: ",
      count: ms.filter(isDelivered).length > 1 ? ms.filter(isDelivered).length : 0,
    };
  }
  const delivered = ms.filter(isDelivered);
  const pool = delivered.length ? delivered : ms;
  const names: { name: string; unread: boolean }[] = [];
  for (const m of pool) {
    const n = m.from.email === ME.email ? "me" : pool.length > 1 ? firstName(m.from.name) : m.from.name;
    const i = names.findIndex((x) => x.name === n);
    if (i >= 0) names.splice(i, 1);
    names.push({ name: n, unread: m.unread });
  }
  let shown = names;
  if (names.length > 3) shown = [names[0], { name: "..", unread: false }, ...names.slice(-2)];
  return {
    text: shown.map((n) => n.name).join(", "),
    parts: shown,
    prefix: "",
    count: pool.length > 1 ? pool.length : 0,
  };
}

export function snippet(t: Thread, messages: Messages) {
  const ms = threadMessages(t, messages);
  const delivered = ms.filter((m) => m.status !== "draft");
  const last = (delivered.length ? delivered : ms).pop();
  return last ? messageText(last).slice(0, 220) : "";
}

export function lastMessage(t: Thread, messages: Messages) {
  const ms = threadMessages(t, messages);
  const delivered = ms.filter(isDelivered);
  return (delivered.length ? delivered : ms).pop();
}

export interface Counts {
  inbox: number;
  drafts: number;
  spam: number;
  scheduled: number;
  snoozed: number;
  starred: number;
  categories: Record<Category, number>;
  labels: Record<string, number>;
}

export function computeCounts(threads: Record<string, Thread>, messages: Messages, now: number): Counts {
  const c: Counts = {
    inbox: 0,
    drafts: 0,
    spam: 0,
    scheduled: 0,
    snoozed: 0,
    starred: 0,
    categories: { primary: 0, promotions: 0, social: 0, updates: 0 },
    labels: {},
  };
  for (const t of Object.values(threads)) {
    const unread = isUnread(t, messages);
    if (inFolder(t, "inbox", messages, now) && unread) {
      c.categories[t.category]++;
      if (t.category === "primary") c.inbox++;
    }
    if (!t.trashed) {
      for (const id of t.messageIds) {
        const m = messages[id];
        if (m?.status === "draft") c.drafts++;
        if (m?.status === "scheduled") c.scheduled++;
      }
    }
    if (t.spam && !t.trashed && unread) c.spam++;
    if (inFolder(t, "snoozed", messages, now)) c.snoozed++;
    if (!t.trashed && !t.spam && unread) {
      for (const l of t.labels) c.labels[l] = (c.labels[l] ?? 0) + 1;
    }
  }
  return c;
}

export const FOLDER_META: Record<FolderId, { name: string; icon: string }> = {
  inbox: { name: "Inbox", icon: "inbox" },
  starred: { name: "Starred", icon: "star" },
  snoozed: { name: "Snoozed", icon: "schedule" },
  important: { name: "Important", icon: "label_important" },
  sent: { name: "Sent", icon: "send" },
  scheduled: { name: "Scheduled", icon: "schedule_send" },
  drafts: { name: "Drafts", icon: "draft" },
  all: { name: "All Mail", icon: "stacks" },
  spam: { name: "Spam", icon: "report" },
  trash: { name: "Trash", icon: "delete" },
};

export const CATEGORY_META: Record<Category, { name: string; icon: string; color: string }> = {
  primary: { name: "Primary", icon: "inbox", color: "#0b57d0" },
  promotions: { name: "Promotions", icon: "sell", color: "#188038" },
  social: { name: "Social", icon: "group", color: "#1a73e8" },
  updates: { name: "Updates", icon: "info", color: "#e37400" },
};

export function viewTitle(view: View, labels: Label[]) {
  if (view.kind === "folder") return FOLDER_META[view.id].name;
  if (view.kind === "category") return CATEGORY_META[view.id].name;
  if (view.kind === "label") return labels.find((l) => l.id === view.id)?.name ?? "Label";
  return "Search results";
}
