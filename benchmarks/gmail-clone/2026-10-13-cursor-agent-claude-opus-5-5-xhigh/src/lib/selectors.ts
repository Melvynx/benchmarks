import type { Address, Category, Message, Settings, SystemFolder, Thread, ViewRef } from "./types";
import type { MailStore } from "./store";
import { firstName } from "./utils";
import { matchThread, parseQuery } from "./search";

type S = Pick<MailStore, "threads" | "messages" | "settings" | "account" | "labels">;

export const FOLDER_META: Record<SystemFolder, { name: string; icon: string }> = {
  inbox: { name: "Inbox", icon: "inbox" },
  starred: { name: "Starred", icon: "star" },
  snoozed: { name: "Snoozed", icon: "schedule" },
  important: { name: "Important", icon: "label_important" },
  sent: { name: "Sent", icon: "send" },
  scheduled: { name: "Scheduled", icon: "schedule_send" },
  drafts: { name: "Drafts", icon: "draft" },
  all: { name: "All Mail", icon: "mail" },
  spam: { name: "Spam", icon: "report" },
  trash: { name: "Trash", icon: "delete" },
};

export const CATEGORY_META: Record<Category, { name: string; icon: string; color: string }> = {
  primary: { name: "Primary", icon: "inbox", color: "var(--primary)" },
  promotions: { name: "Promotions", icon: "sell", color: "var(--cat-promotions)" },
  social: { name: "Social", icon: "group", color: "var(--cat-social)" },
  updates: { name: "Updates", icon: "info", color: "var(--cat-updates)" },
  forums: { name: "Forums", icon: "forum", color: "var(--cat-forums)" },
};

export const msgsOf = (t: Thread, messages: Record<string, Message>) =>
  t.messageIds.map((id) => messages[id]).filter(Boolean).sort((a, b) => a.date - b.date);

export const hasStatus = (t: Thread, messages: Record<string, Message>, status: Message["status"]) =>
  t.messageIds.some((id) => messages[id]?.status === status);

export const isDraftOnly = (t: Thread, messages: Record<string, Message>) =>
  t.messageIds.length > 0 && t.messageIds.every((id) => {
    const st = messages[id]?.status;
    return st === "draft" || st === "scheduled";
  });

export const effectiveCategory = (t: Thread, settings: Settings): Category =>
  t.category !== "primary" && !settings.categories[t.category as Exclude<Category, "primary">] ? "primary" : t.category;

export const enabledTabs = (settings: Settings): Category[] =>
  settings.inboxType !== "default"
    ? []
    : (["primary", "promotions", "social", "updates", "forums"] as Category[]).filter(
        (c) => c === "primary" || settings.categories[c as Exclude<Category, "primary">],
      );

const now = () => Date.now();

export function inFolder(t: Thread, folder: SystemFolder, s: S, tab?: Category) {
  const L = t.labels;
  const trash = L.includes("TRASH");
  const spam = L.includes("SPAM");
  const draftOnly = isDraftOnly(t, s.messages);
  switch (folder) {
    case "inbox": {
      if (!L.includes("INBOX") || trash || spam || draftOnly) return false;
      if (t.snoozedUntil && t.snoozedUntil > now()) return false;
      if (tab && enabledTabs(s.settings).length > 1) return effectiveCategory(t, s.settings) === tab;
      return true;
    }
    case "starred":
      return t.starred && !trash && !spam;
    case "snoozed":
      return !!t.snoozedUntil && t.snoozedUntil > now() && !trash;
    case "important":
      return L.includes("IMPORTANT") && !trash && !spam && !draftOnly;
    case "sent":
      return !trash && hasStatus(t, s.messages, "sent");
    case "scheduled":
      return hasStatus(t, s.messages, "scheduled");
    case "drafts":
      return hasStatus(t, s.messages, "draft");
    case "all":
      return !trash && !spam;
    case "spam":
      return spam && !trash;
    case "trash":
      return trash;
  }
}

/** Timestamp used to order a thread within a given view. */
export function sortDate(t: Thread, s: S, folder?: SystemFolder) {
  const ms = msgsOf(t, s.messages);
  let pick: Message[];
  if (folder === "sent") pick = ms.filter((m) => m.status === "sent");
  else if (folder === "drafts") pick = ms.filter((m) => m.status === "draft");
  else if (folder === "scheduled") return Math.min(...ms.filter((m) => m.status === "scheduled").map((m) => m.scheduledAt || m.date));
  else {
    pick = ms.filter((m) => m.status === "sent" || m.status === "received");
    if (!pick.length) pick = ms;
  }
  const last = pick.length ? pick[pick.length - 1].date : 0;
  return Math.max(last, folder === "inbox" || !folder ? t.bumpedAt || 0 : 0);
}

export function viewThreads(s: S, view: ViewRef, tab: Category = "primary"): Thread[] {
  const all = Object.values(s.threads);
  let list: Thread[] = [];
  let folder: SystemFolder | undefined;
  if (view.kind === "folder") {
    folder = view.folder;
    list = all.filter((t) => inFolder(t, view.folder, s, view.folder === "inbox" ? tab : undefined));
  } else if (view.kind === "category") {
    list = all.filter((t) => t.category === view.category && !t.labels.includes("TRASH") && !t.labels.includes("SPAM"));
  } else if (view.kind === "label") {
    list = all.filter((t) => t.labels.includes(view.labelId) && !t.labels.includes("TRASH") && !t.labels.includes("SPAM") && !isDraftOnly(t, s.messages));
  } else if (view.kind === "search") {
    const q = parseQuery(view.query);
    list = all.filter((t) => matchThread(t, q, s));
  }
  const dated = list.map((t) => [t, sortDate(t, s, folder)] as const);
  dated.sort((a, b) => b[1] - a[1]);
  return dated.map((d) => d[0]);
}

export function folderCount(s: S, folder: SystemFolder) {
  const all = Object.values(s.threads);
  if (folder === "drafts") return all.reduce((n, t) => n + t.messageIds.filter((id) => s.messages[id]?.status === "draft").length, 0);
  if (folder === "scheduled") return all.filter((t) => inFolder(t, "scheduled", s)).length;
  if (folder === "inbox") {
    const tabs = enabledTabs(s.settings);
    return all.filter((t) => t.unread && inFolder(t, "inbox", s, tabs.length > 1 ? "primary" : undefined)).length;
  }
  if (folder === "spam" || folder === "important" || folder === "snoozed") return all.filter((t) => t.unread && inFolder(t, folder, s)).length;
  return 0;
}

export function tabUnread(s: S, tab: Category) {
  return Object.values(s.threads).filter((t) => t.unread && inFolder(t, "inbox", s, tab)).length;
}

export function labelUnread(s: S, labelId: string) {
  return Object.values(s.threads).filter((t) => t.unread && t.labels.includes(labelId) && !t.labels.includes("TRASH") && !t.labels.includes("SPAM")).length;
}

export interface Participant {
  label: string;
  unread: boolean;
  draft?: boolean;
}

/** Gmail-style sender summary: "Priya, Marcus, me 4" or "To: Rachel". */
export function participants(t: Thread, s: S, folder?: SystemFolder): { parts: Participant[]; count: number } {
  const me = s.account.email.toLowerCase();
  const ms = msgsOf(t, s.messages);
  const real = ms.filter((m) => m.status === "sent" || m.status === "received");
  const drafts = ms.filter((m) => m.status === "draft" || m.status === "scheduled");
  const isMe = (a: Address) => a.email.toLowerCase() === me;

  if ((folder === "sent" || folder === "scheduled" || (folder === "drafts" && !real.length)) && ms.length) {
    const src = folder === "sent" ? real.filter((m) => m.status === "sent") : ms;
    const last = src[src.length - 1] || ms[ms.length - 1];
    const rec = [...last.to, ...last.cc];
    if (folder === "drafts") return { parts: [{ label: "Draft", unread: false, draft: true }], count: 0 };
    const names = rec.length ? rec.map((a) => (isMe(a) ? "me" : rec.length > 1 ? firstName(a) : a.name || a.email)) : ["(no recipients)"];
    return { parts: [{ label: `To: ${names.join(", ")}`, unread: false }], count: 0 };
  }

  const seen = new Map<string, Participant>();
  for (const m of real) {
    const key = m.from.email.toLowerCase();
    const label = isMe(m.from) ? "me" : m.from.name || m.from.email;
    const prev = seen.get(key);
    seen.delete(key);
    seen.set(key, { label, unread: (prev?.unread || false) || (t.unread && m === real[real.length - 1] && !isMe(m.from)) });
  }
  let parts = [...seen.values()];
  if (parts.length > 1) {
    parts = parts.map((p) => ({ ...p, label: p.label === "me" ? "me" : p.label.split(/\s+/)[0] }));
    if (parts.length > 3) parts = [parts[0], { label: "..", unread: false }, ...parts.slice(-2)];
  }
  if (drafts.some((d) => d.status === "draft")) parts.push({ label: "Draft", unread: false, draft: true });
  return { parts, count: real.length > 1 ? real.length : 0 };
}

export function snippetOf(t: Thread, s: S) {
  const ms = msgsOf(t, s.messages);
  const real = ms.filter((m) => m.status === "sent" || m.status === "received");
  const last = (real.length ? real : ms)[(real.length ? real : ms).length - 1];
  return last?.text || "";
}

export function attachmentsOf(t: Thread, s: S) {
  return msgsOf(t, s.messages).flatMap((m) => (m.status === "draft" ? [] : m.attachments));
}

export function viewTitle(view: ViewRef, s: S) {
  if (view.kind === "folder") return FOLDER_META[view.folder].name;
  if (view.kind === "category") return CATEGORY_META[view.category].name;
  if (view.kind === "label") return s.labels.find((l) => l.id === view.labelId)?.name || "Label";
  if (view.kind === "search") return "Search results";
  return "Settings";
}
