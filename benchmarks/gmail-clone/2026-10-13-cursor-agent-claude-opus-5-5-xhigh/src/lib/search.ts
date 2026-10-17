import type { Message, Thread, UserLabel, Settings, Account } from "./types";
import { DAY } from "./date";

export interface Term {
  field?: string;
  value: string;
  negate: boolean;
}

export interface ParsedQuery {
  terms: Term[];
  raw: string;
}

const FIELDS = new Set([
  "from", "to", "cc", "bcc", "subject", "label", "in", "is", "has", "filename", "before", "after",
  "older_than", "newer_than", "category", "larger", "smaller", "list", "deliveredto",
]);

/** Tokenizes Gmail-style queries: from:x "exact phrase" -term subject:(a b) OR. */
export function parseQuery(raw: string): ParsedQuery {
  const terms: Term[] = [];
  const re = /(-)?(?:([a-z_]+):)?(?:"([^"]*)"|\(([^)]*)\)|(\S+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const negate = !!m[1];
    let field: string | undefined = m[2]?.toLowerCase();
    let value = (m[3] ?? m[4] ?? m[5] ?? "").trim();
    if (field && !FIELDS.has(field)) {
      value = `${field}:${value}`;
      field = undefined;
    }
    if (!value && !field) continue;
    if (!field && value.toUpperCase() === "OR") continue;
    terms.push({ field, value: value.toLowerCase(), negate });
  }
  return { terms, raw };
}

interface Ctx {
  messages: Record<string, Message>;
  labels: UserLabel[];
  settings: Settings;
  account: Account;
}

const addrText = (list: { name: string; email: string }[]) => list.map((a) => `${a.name} ${a.email}`.toLowerCase()).join(" ");

function parseDate(v: string) {
  const parts = v.split(/[/-]/).map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

function parseRelative(v: string) {
  const m = v.match(/^(\d+)([dmy])$/);
  if (!m) return null;
  const n = Number(m[1]);
  return n * (m[2] === "d" ? DAY : m[2] === "m" ? 30 * DAY : 365 * DAY);
}

function parseSize(v: string) {
  const m = v.match(/^(\d+(?:\.\d+)?)(k|m)?b?$/i);
  if (!m) return null;
  return Number(m[1]) * (m[2]?.toLowerCase() === "m" ? 1024 * 1024 : m[2]?.toLowerCase() === "k" ? 1024 : 1);
}

function matchesTerm(t: Thread, ms: Message[], term: Term, ctx: Ctx): boolean {
  const v = term.value;
  const me = ctx.account.email.toLowerCase();
  switch (term.field) {
    case "from":
      return ms.some((m) => (v === "me" ? m.from.email.toLowerCase() === me : addrText([m.from]).includes(v)));
    case "to":
      return ms.some((m) => (v === "me" ? [...m.to, ...m.cc].some((a) => a.email.toLowerCase() === me) : addrText(m.to).includes(v)));
    case "cc":
      return ms.some((m) => addrText(m.cc).includes(v));
    case "bcc":
      return ms.some((m) => addrText(m.bcc).includes(v));
    case "deliveredto":
      return ms.some((m) => addrText([...m.to, ...m.cc, ...m.bcc]).includes(v));
    case "subject":
      return t.subject.toLowerCase().includes(v);
    case "filename":
      return ms.some((m) => m.attachments.some((a) => a.name.toLowerCase().includes(v) || a.kind === v));
    case "label": {
      const norm = v.replace(/[-_]/g, " ");
      if (norm === "inbox") return t.labels.includes("INBOX");
      if (norm === "important") return t.labels.includes("IMPORTANT");
      const lbl = ctx.labels.find((l) => l.name.toLowerCase() === norm || l.name.toLowerCase().replace(/\s+/g, "-") === v);
      return !!lbl && t.labels.includes(lbl.id);
    }
    case "category":
      return t.category === v;
    case "in":
      switch (v) {
        case "inbox": return t.labels.includes("INBOX") && !t.snoozedUntil;
        case "trash": return t.labels.includes("TRASH");
        case "spam": return t.labels.includes("SPAM");
        case "sent": return ms.some((m) => m.status === "sent");
        case "drafts": case "draft": return ms.some((m) => m.status === "draft");
        case "snoozed": return !!t.snoozedUntil;
        case "scheduled": return ms.some((m) => m.status === "scheduled");
        case "starred": return t.starred;
        case "anywhere": return true;
        case "archive": return !t.labels.includes("INBOX");
        default: return matchesTerm(t, ms, { field: "label", value: v, negate: false }, ctx);
      }
    case "is":
      switch (v) {
        case "unread": return t.unread;
        case "read": return !t.unread;
        case "starred": return t.starred;
        case "important": return t.labels.includes("IMPORTANT");
        case "snoozed": return !!t.snoozedUntil;
        case "muted": return !!t.muted;
        default: return false;
      }
    case "has":
      switch (v) {
        case "attachment": return ms.some((m) => m.attachments.length > 0);
        case "invite": return ms.some((m) => !!m.invite);
        case "userlabels": return t.labels.some((l) => l.startsWith("lbl"));
        case "nouserlabels": return !t.labels.some((l) => l.startsWith("lbl"));
        case "pdf": return ms.some((m) => m.attachments.some((a) => a.kind === "pdf"));
        case "image": return ms.some((m) => m.attachments.some((a) => a.kind === "image"));
        default: return false;
      }
    case "before":
    case "after": {
      const d = parseDate(v);
      if (d == null) return false;
      return ms.some((m) => (term.field === "before" ? m.date < d : m.date >= d));
    }
    case "older_than":
    case "newer_than": {
      const r = parseRelative(v);
      if (r == null) return false;
      const cutoff = Date.now() - r;
      return ms.some((m) => (term.field === "older_than" ? m.date < cutoff : m.date >= cutoff));
    }
    case "larger":
    case "smaller": {
      const sz = parseSize(v);
      if (sz == null) return false;
      const total = ms.reduce((n, m) => n + m.text.length + m.attachments.reduce((k, a) => k + a.size, 0), 0);
      return term.field === "larger" ? total > sz : total < sz;
    }
    default: {
      const hay = `${t.subject} ${ms.map((m) => `${m.text} ${addrText([m.from, ...m.to, ...m.cc])} ${m.attachments.map((a) => a.name).join(" ")}`).join(" ")}`.toLowerCase();
      return hay.includes(v);
    }
  }
}

const SCOPE_IN = new Set(["trash", "spam", "anywhere"]);

export function matchThread(t: Thread, q: ParsedQuery, ctx: Ctx) {
  if (!q.terms.length) return false;
  const ms = t.messageIds.map((id) => ctx.messages[id]).filter(Boolean);
  const scoped = q.terms.some((x) => x.field === "in" && SCOPE_IN.has(x.value) && !x.negate);
  if (!scoped && (t.labels.includes("TRASH") || t.labels.includes("SPAM"))) return false;
  const searchDrafts = q.terms.some((x) => x.field === "in" && (x.value === "drafts" || x.value === "draft" || x.value === "scheduled"));
  const pool = searchDrafts ? ms : ms.filter((m) => m.status === "sent" || m.status === "received");
  if (!pool.length) return false;
  return q.terms.every((term) => matchesTerm(t, pool, term, ctx) !== term.negate);
}

/** Free-text words (no operators) used for highlighting results. */
export function highlightWords(raw: string) {
  return parseQuery(raw)
    .terms.filter((t) => !t.field && !t.negate && t.value.length > 1)
    .map((t) => t.value);
}

export function buildQuery(o: {
  from?: string; to?: string; subject?: string; words?: string; without?: string;
  hasAttachment?: boolean; within?: string; date?: string; scope?: string; unread?: boolean;
}) {
  const q: string[] = [];
  const wrap = (s: string) => (/\s/.test(s.trim()) ? `(${s.trim()})` : s.trim());
  if (o.from?.trim()) q.push(`from:${wrap(o.from)}`);
  if (o.to?.trim()) q.push(`to:${wrap(o.to)}`);
  if (o.subject?.trim()) q.push(`subject:${wrap(o.subject)}`);
  if (o.words?.trim()) q.push(o.words.trim());
  if (o.without?.trim()) o.without.trim().split(/\s+/).forEach((w) => q.push(`-${w}`));
  if (o.hasAttachment) q.push("has:attachment");
  if (o.unread) q.push("is:unread");
  if (o.within && o.date) {
    const base = new Date(o.date).getTime();
    const span = { "1d": 1, "3d": 3, "1w": 7, "2w": 14, "1m": 30, "2m": 60, "6m": 180, "1y": 365 }[o.within] || 0;
    if (span) {
      const fmt = (t: number) => {
        const d = new Date(t);
        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
      };
      q.push(`after:${fmt(base - span * DAY)}`, `before:${fmt(base + span * DAY)}`);
    }
  }
  if (o.scope && o.scope !== "all") q.push(`in:${o.scope}`);
  return q.join(" ");
}
