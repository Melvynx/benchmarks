import type { Category, MailState, Route, Thread } from "../types";
import { isMe } from "../data/contacts";
import { matches, parseQuery } from "./search";
import { threadDate } from "../store/mail";

export const CATEGORIES: { id: Category; name: string }[] = [
  { id: "primary", name: "Primary" },
  { id: "promotions", name: "Promotions" },
  { id: "social", name: "Social" },
  { id: "updates", name: "Updates" },
];

const live = (t: Thread) => t.location !== "trash" && t.location !== "spam";
const inInbox = (t: Thread) => t.location === "inbox" && !t.snoozedUntil;

export function threadsForRoute(s: MailState, r: Route): Thread[] {
  let list: Thread[];
  const tabs = s.settings.inboxTabs;
  switch (r.view) {
    case "inbox":
      list = s.threads.filter((t) => inInbox(t) && (!tabs || t.category === "primary"));
      break;
    case "category":
      list = s.threads.filter((t) => inInbox(t) && t.category === r.param);
      break;
    case "starred":
      list = s.threads.filter((t) => t.starred && live(t));
      break;
    case "snoozed":
      list = s.threads.filter((t) => !!t.snoozedUntil && live(t));
      return list.sort((a, b) => (a.snoozedUntil ?? 0) - (b.snoozedUntil ?? 0));
    case "important":
      list = s.threads.filter((t) => t.important && live(t));
      break;
    case "sent":
      list = s.threads.filter((t) => t.location !== "spam" && t.location !== "trash" && t.messages.some((m) => isMe(m.from)));
      return list.sort((a, b) => lastSent(b) - lastSent(a));
    case "all":
      list = s.threads.filter(live);
      break;
    case "spam":
      list = s.threads.filter((t) => t.location === "spam");
      break;
    case "trash":
      list = s.threads.filter((t) => t.location === "trash");
      break;
    case "label":
      list = s.threads.filter((t) => t.labels.includes(r.param ?? "") && live(t));
      break;
    case "search": {
      const p = parseQuery(r.param ?? "");
      list = s.threads.filter((t) => matches(t, p, s.labels, s.contacts));
      break;
    }
    default:
      list = [];
  }
  return list.sort((a, b) => threadDate(b) - threadDate(a));
}

const lastSent = (t: Thread) => {
  for (let i = t.messages.length - 1; i >= 0; i--) if (isMe(t.messages[i].from)) return t.messages[i].date;
  return 0;
};

export function viewTitle(s: MailState, r: Route): string {
  switch (r.view) {
    case "inbox":
      return "Inbox";
    case "category":
      return CATEGORIES.find((c) => c.id === r.param)?.name ?? "Inbox";
    case "all":
      return "All Mail";
    case "label":
      return s.labels.find((l) => l.id === r.param)?.name ?? "Label";
    case "search":
      return "Search results";
    default:
      return r.view[0].toUpperCase() + r.view.slice(1);
  }
}

export function counts(s: MailState) {
  const c = {
    inbox: 0,
    starred: 0,
    snoozed: 0,
    drafts: 0,
    scheduled: 0,
    spam: 0,
    important: 0,
    labels: {} as Record<string, number>,
    categories: { primary: 0, promotions: 0, social: 0, updates: 0 } as Record<Category, number>,
  };
  for (const t of s.threads) {
    const isLive = live(t);
    if (inInbox(t) && t.unread) {
      c.categories[t.category]++;
      if (!s.settings.inboxTabs || t.category === "primary") c.inbox++;
    }
    if (t.snoozedUntil && isLive) c.snoozed++;
    if (t.location === "spam" && t.unread) c.spam++;
    if (isLive && t.unread) {
      if (t.important) c.important++;
      for (const l of t.labels) c.labels[l] = (c.labels[l] ?? 0) + 1;
    }
  }
  for (const d of s.drafts) d.scheduledAt ? c.scheduled++ : c.drafts++;
  return c;
}

export function categoryPreview(s: MailState, cat: Category) {
  const names: string[] = [];
  for (const t of s.threads
    .filter((t) => inInbox(t) && t.category === cat && t.unread)
    .sort((a, b) => threadDate(b) - threadDate(a))) {
    const m = t.messages[t.messages.length - 1];
    if (!m) continue;
    names.push(m.from);
    if (names.length >= 3) break;
  }
  return names;
}
