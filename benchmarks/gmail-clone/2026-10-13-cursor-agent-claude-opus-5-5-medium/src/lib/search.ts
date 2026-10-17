import type { Contact, Label, Thread } from "../types";
import { contactFor, isMe } from "../data/contacts";
import { htmlToText } from "./html";

export interface ParsedQuery {
  terms: string[];
  exclude: string[];
  ops: { key: string; value: string; neg: boolean }[];
}

const OPS = new Set([
  "from", "to", "cc", "subject", "label", "in", "is", "has", "filename", "category", "before", "after", "newer_than", "older_than",
]);

export function parseQuery(q: string): ParsedQuery {
  const out: ParsedQuery = { terms: [], exclude: [], ops: [] };
  const re = /(-)?(?:(\w+):)?(?:"([^"]*)"|(\S+))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(q))) {
    const neg = !!match[1];
    const key = match[2]?.toLowerCase();
    const value = (match[3] ?? match[4] ?? "").trim();
    if (!value) continue;
    if (key && OPS.has(key)) out.ops.push({ key, value: value.toLowerCase(), neg });
    else {
      const term = (key ? `${match[2]}:` : "") + value;
      (neg ? out.exclude : out.terms).push(term.toLowerCase());
    }
  }
  return out;
}

function parseDate(v: string): number | undefined {
  const m = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!m) return undefined;
  return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
}

function parseAge(v: string): number | undefined {
  const m = v.match(/^(\d+)([dmy])$/);
  if (!m) return undefined;
  const n = +m[1];
  const day = 86400000;
  return n * (m[2] === "d" ? day : m[2] === "m" ? 30 * day : 365 * day);
}

const people = (emails: string[], extra: Contact[]) =>
  emails
    .map((e) => {
      const c = contactFor(e, extra);
      return `${c.name} ${c.email}${isMe(e) ? " me" : ""}`;
    })
    .join(" ")
    .toLowerCase();

export function threadHaystack(t: Thread, extra: Contact[] = []) {
  const parts = [t.subject];
  for (const m of t.messages) {
    parts.push(htmlToText(m.html));
    parts.push(people([m.from, ...m.to, ...(m.cc ?? [])], extra));
    for (const a of m.attachments) parts.push(a.name);
  }
  return parts.join(" ").toLowerCase();
}

export function hasLocationOp(p: ParsedQuery) {
  return p.ops.some((o) => o.key === "in" && !o.neg);
}

export function matches(t: Thread, p: ParsedQuery, labels: Label[], extra: Contact[] = [], now = Date.now()): boolean {
  const hay = threadHaystack(t, extra);
  for (const term of p.terms) if (!hay.includes(term)) return false;
  for (const term of p.exclude) if (hay.includes(term)) return false;

  const last = t.messages[t.messages.length - 1]?.date ?? 0;
  for (const { key, value, neg } of p.ops) {
    let ok = true;
    switch (key) {
      case "from":
        ok = t.messages.some((m) => people([m.from], extra).includes(value));
        break;
      case "to":
        ok = t.messages.some((m) => people([...m.to, ...(m.cc ?? [])], extra).includes(value));
        break;
      case "cc":
        ok = t.messages.some((m) => people(m.cc ?? [], extra).includes(value));
        break;
      case "subject":
        ok = t.subject.toLowerCase().includes(value);
        break;
      case "label": {
        const lbl = labels.find((l) => l.name.toLowerCase() === value || l.id === value || l.name.toLowerCase().replace(/\s+/g, "-") === value);
        ok = !!lbl && t.labels.includes(lbl.id);
        break;
      }
      case "category":
        ok = t.category === value;
        break;
      case "in":
        if (value === "anywhere") ok = true;
        else if (value === "inbox") ok = t.location === "inbox" && !t.snoozedUntil;
        else if (value === "sent") ok = t.messages.some((m) => isMe(m.from));
        else if (value === "starred") ok = t.starred;
        else if (value === "snoozed") ok = !!t.snoozedUntil;
        else if (value === "important") ok = t.important;
        else ok = t.location === value;
        break;
      case "is":
        if (value === "unread") ok = t.unread;
        else if (value === "read") ok = !t.unread;
        else if (value === "starred") ok = t.starred;
        else if (value === "important") ok = t.important;
        else if (value === "snoozed") ok = !!t.snoozedUntil;
        else ok = false;
        break;
      case "has":
        if (value === "attachment" || value === "attachments") ok = t.messages.some((m) => m.attachments.length > 0);
        else if (value === "userlabels") ok = t.labels.length > 0;
        else if (value === "nouserlabels") ok = t.labels.length === 0;
        else ok = false;
        break;
      case "filename":
        ok = t.messages.some((m) => m.attachments.some((a) => a.name.toLowerCase().includes(value) || a.type === value));
        break;
      case "before": {
        const ts = parseDate(value);
        ok = ts === undefined || last < ts;
        break;
      }
      case "after": {
        const ts = parseDate(value);
        ok = ts === undefined || last >= ts;
        break;
      }
      case "newer_than": {
        const age = parseAge(value);
        ok = age === undefined || last >= now - age;
        break;
      }
      case "older_than": {
        const age = parseAge(value);
        ok = age === undefined || last < now - age;
        break;
      }
    }
    if (neg ? ok : !ok) return false;
  }
  if (!hasLocationOp(p) && (t.location === "trash" || t.location === "spam")) return false;
  return true;
}

/** Terms to visually highlight in results. */
export function highlightTerms(p: ParsedQuery): string[] {
  const vals = [...p.terms];
  for (const o of p.ops) if (!o.neg && (o.key === "subject" || o.key === "filename")) vals.push(o.value);
  return vals.filter((v) => v.length > 1);
}

export function toggleToken(q: string, token: string): string {
  const parts = q.split(/\s+/).filter(Boolean);
  const idx = parts.findIndex((p) => p.toLowerCase() === token.toLowerCase());
  if (idx >= 0) parts.splice(idx, 1);
  else parts.push(token);
  return parts.join(" ");
}
