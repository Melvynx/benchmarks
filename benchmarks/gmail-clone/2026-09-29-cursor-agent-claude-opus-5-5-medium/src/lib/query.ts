import type { Category, Label, Route, SystemView, Thread } from "./types";
import { isMe, stripHtml, time } from "./format";

export const lastDate = (t: Thread) => t.messages[t.messages.length - 1]?.date ?? 0;
export const sortKey = (t: Thread) => Math.max(lastDate(t), t.bumpedAt ?? 0);
export const hasAttachments = (t: Thread) => t.messages.some((m) => m.attachments.length > 0);
export const isSent = (t: Thread) => t.messages.some((m) => isMe(m.from));
export const isSnoozed = (t: Thread, now: number) => !!t.snoozedUntil && t.snoozedUntil > now;

export function inView(t: Thread, view: SystemView | "label", now: number, labelId?: string, category?: Category): boolean {
  const live = !t.trashed && !t.spam;
  switch (view) {
    case "inbox":
      return live && t.inInbox && !isSnoozed(t, now) && (!category || t.category === category);
    case "starred":
      return live && t.starred;
    case "snoozed":
      return live && isSnoozed(t, now);
    case "important":
      return live && t.important && !isSnoozed(t, now);
    case "sent":
      return !t.trashed && isSent(t);
    case "all":
      return live;
    case "spam":
      return t.spam && !t.trashed;
    case "trash":
      return t.trashed;
    case "label":
      return live && !!labelId && t.labelIds.includes(labelId);
    default:
      return false;
  }
}

interface ParsedQuery {
  terms: string[];
  negTerms: string[];
  from: string[];
  to: string[];
  subject: string[];
  labels: string[];
  is: string[];
  has: string[];
  in?: string;
  category?: string;
  filename: string[];
  after?: number;
  before?: number;
}

function tokenize(q: string): string[] {
  const out: string[] = [];
  const re = /(-?[\w.]+:)?("([^"]*)"|\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q))) {
    const prefix = m[1] ?? "";
    const val = m[3] !== undefined ? m[3] : m[2];
    out.push(prefix + val);
  }
  return out;
}

function parseDate(v: string): number | undefined {
  const m = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  return undefined;
}

function parseRel(v: string): number | undefined {
  const m = v.match(/^(\d+)([dmy])$/);
  if (!m) return undefined;
  const n = +m[1];
  const mult = m[2] === "d" ? time.DAY : m[2] === "m" ? 30 * time.DAY : 365 * time.DAY;
  return n * mult;
}

export function parseQuery(q: string, now = Date.now()): ParsedQuery {
  const p: ParsedQuery = { terms: [], negTerms: [], from: [], to: [], subject: [], labels: [], is: [], has: [], filename: [] };
  for (const tok of tokenize(q)) {
    const idx = tok.indexOf(":");
    const key = idx > 0 ? tok.slice(0, idx).toLowerCase() : "";
    const val = (idx > 0 ? tok.slice(idx + 1) : tok).toLowerCase();
    if (!val) continue;
    switch (key) {
      case "from": p.from.push(val); break;
      case "to": p.to.push(val); break;
      case "subject": p.subject.push(val); break;
      case "label": p.labels.push(val); break;
      case "is": p.is.push(val); break;
      case "has": p.has.push(val); break;
      case "in": p.in = val; break;
      case "category": p.category = val; break;
      case "filename": p.filename.push(val); break;
      case "after": case "newer": p.after = parseDate(val); break;
      case "before": case "older": p.before = parseDate(val); break;
      case "newer_than": { const r = parseRel(val); if (r) p.after = now - r; break; }
      case "older_than": { const r = parseRel(val); if (r) p.before = now - r; break; }
      default:
        if (tok.startsWith("-") && tok.length > 1) p.negTerms.push(tok.slice(1).toLowerCase());
        else p.terms.push(tok.toLowerCase());
    }
  }
  return p;
}

const contactText = (c: { name: string; email: string }) => `${c.name} ${c.email}`.toLowerCase();

const textCache = new WeakMap<Thread, string>();
export function threadText(t: Thread): string {
  let s = textCache.get(t);
  if (s) return s;
  s = [
    t.subject,
    ...t.messages.flatMap((m) => [
      contactText(m.from),
      ...m.to.map(contactText),
      ...m.cc.map(contactText),
      stripHtml(m.html),
      ...m.attachments.map((a) => a.name),
    ]),
  ]
    .join(" ")
    .toLowerCase();
  textCache.set(t, s);
  return s;
}

export function matchesQuery(t: Thread, p: ParsedQuery, labels: Label[], now: number): boolean {
  const where = p.in ?? "";
  if (where === "trash") { if (!t.trashed) return false; }
  else if (where === "spam") { if (!t.spam || t.trashed) return false; }
  else if (where === "anywhere") { /* all */ }
  else {
    if (t.trashed || t.spam) return false;
    if (where === "inbox" && !(t.inInbox && !isSnoozed(t, now))) return false;
    if (where === "sent" && !isSent(t)) return false;
    if (where === "snoozed" && !isSnoozed(t, now)) return false;
  }
  const text = threadText(t);
  for (const term of p.terms) if (!text.includes(term)) return false;
  for (const term of p.negTerms) if (text.includes(term)) return false;
  for (const f of p.from) {
    const needle = f === "me" ? "sam.carter@fieldnote.io" : f;
    if (!t.messages.some((m) => contactText(m.from).includes(needle))) return false;
  }
  for (const f of p.to) {
    const needle = f === "me" ? "sam.carter@fieldnote.io" : f;
    if (!t.messages.some((m) => [...m.to, ...m.cc].some((c) => contactText(c).includes(needle)))) return false;
  }
  for (const s of p.subject) if (!t.subject.toLowerCase().includes(s)) return false;
  for (const l of p.labels) {
    const label = labels.find((x) => x.name.toLowerCase() === l || x.id === l);
    if (!label || !t.labelIds.includes(label.id)) return false;
  }
  for (const i of p.is) {
    if (i === "unread" && !t.unread) return false;
    if (i === "read" && t.unread) return false;
    if (i === "starred" && !t.starred) return false;
    if (i === "unstarred" && t.starred) return false;
    if (i === "important" && !t.important) return false;
    if (i === "snoozed" && !isSnoozed(t, now)) return false;
  }
  for (const h of p.has) {
    if (h === "attachment" && !hasAttachments(t)) return false;
    if (h === "userlabels" && t.labelIds.length === 0) return false;
    if (h === "nouserlabels" && t.labelIds.length > 0) return false;
  }
  if (p.category && t.category !== p.category) return false;
  for (const f of p.filename)
    if (!t.messages.some((m) => m.attachments.some((a) => a.name.toLowerCase().includes(f)))) return false;
  const d = sortKey(t);
  if (p.after && d < p.after) return false;
  if (p.before && d >= p.before) return false;
  return true;
}

export function highlightTerms(q: string): string[] {
  return parseQuery(q).terms.filter((t) => t.length > 1);
}

export function filterThreads(threads: Thread[], route: Route, labels: Label[], now: number, tabs: boolean): Thread[] {
  let list: Thread[];
  if (route.view === "search") {
    const p = parseQuery(route.query ?? "", now);
    list = threads.filter((t) => matchesQuery(t, p, labels, now));
  } else if (route.view === "drafts" || route.view === "scheduled") {
    list = [];
  } else {
    const cat = route.view === "inbox" && tabs ? (route.category ?? "primary") : undefined;
    list = threads.filter((t) => inView(t, route.view as SystemView, now, route.labelId, cat));
  }
  return list.sort((a, b) => sortKey(b) - sortKey(a));
}

export const VIEW_TITLES: Record<SystemView, string> = {
  inbox: "Inbox",
  starred: "Starred",
  snoozed: "Snoozed",
  important: "Important",
  sent: "Sent",
  scheduled: "Scheduled",
  drafts: "Drafts",
  all: "All Mail",
  spam: "Spam",
  trash: "Trash",
};
