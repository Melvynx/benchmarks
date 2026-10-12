import type { Label, Thread } from '../data/types';
import { TIME } from './format';

export interface ParsedQuery {
  terms: string[];
  excluded: string[];
  from: string[];
  to: string[];
  subject: string[];
  labels: string[];
  in: string[];
  is: string[];
  has: string[];
  filename: string[];
  category: string[];
  after: number | null;
  before: number | null;
  larger: number | null;
  smaller: number | null;
  /** One single-operator query per `-op:value` token; a thread must match none of them. */
  negated: ParsedQuery[];
}

const OPERATORS = [
  'from', 'to', 'cc', 'subject', 'label', 'in', 'is', 'has', 'filename', 'category', 'after', 'before',
  'newer_than', 'older_than', 'larger', 'smaller',
] as const;

/** Splits a query into tokens, honouring "quoted phrases" and op:"quoted values". */
export function tokenize(q: string): string[] {
  const out: string[] = [];
  const re = /(-?[a-z_]+:"[^"]*"|-?"[^"]*"|\S+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q))) out.push(m[1]);
  return out;
}

function unquote(s: string) {
  return s.replace(/^"|"$/g, '');
}

function parseDate(v: string): number | null {
  const m = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

function parseRelative(v: string, now: number): number | null {
  const m = v.match(/^(\d+)([dmy])$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const span = unit === 'd' ? TIME.DAY : unit === 'm' ? 30 * TIME.DAY : 365 * TIME.DAY;
  return now - n * span;
}

function parseSize(v: string): number | null {
  const m = v.match(/^(\d+(?:\.\d+)?)([kmg]?)b?$/i);
  if (!m) return null;
  const mult = { '': 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 }[m[2].toLowerCase() as '' | 'k' | 'm' | 'g'];
  return Number(m[1]) * mult;
}

export function parseQuery(q: string, now = Date.now()): ParsedQuery {
  const pq: ParsedQuery = {
    terms: [], excluded: [], from: [], to: [], subject: [], labels: [], in: [], is: [], has: [], filename: [],
    category: [], after: null, before: null, larger: null, smaller: null, negated: [],
  };
  for (const raw of tokenize(q.trim())) {
    const neg = raw.startsWith('-') && raw.length > 1;
    const tok = neg ? raw.slice(1) : raw;
    const idx = tok.indexOf(':');
    const op = idx > 0 ? tok.slice(0, idx).toLowerCase() : '';
    if (op && (OPERATORS as readonly string[]).includes(op)) {
      const val = unquote(tok.slice(idx + 1)).toLowerCase();
      if (!val) continue;
      if (neg) {
        const sub = parseQuery(tok, now);
        // Location is decided by the outer query; the clause itself should only test its own condition.
        if (op !== 'in') sub.in.push('anywhere');
        pq.negated.push(sub);
        continue;
      }
      switch (op) {
        case 'from': pq.from.push(val); break;
        case 'to':
        case 'cc': pq.to.push(val); break;
        case 'subject': pq.subject.push(val); break;
        case 'label': pq.labels.push(val); break;
        case 'in': pq.in.push(val); break;
        case 'is': pq.is.push(val); break;
        case 'has': pq.has.push(val); break;
        case 'filename': pq.filename.push(val); break;
        case 'category': pq.category.push(val); break;
        case 'after': pq.after = parseDate(val); break;
        case 'before': pq.before = parseDate(val); break;
        case 'newer_than': pq.after = parseRelative(val, now); break;
        case 'older_than': pq.before = parseRelative(val, now); break;
        case 'larger': pq.larger = parseSize(val); break;
        case 'smaller': pq.smaller = parseSize(val); break;
      }
      continue;
    }
    const term = unquote(tok).toLowerCase();
    if (!term) continue;
    (neg ? pq.excluded : pq.terms).push(term);
  }
  return pq;
}

export function isEmptyQuery(pq: ParsedQuery) {
  return (
    !pq.terms.length && !pq.excluded.length && !pq.from.length && !pq.to.length && !pq.subject.length &&
    !pq.labels.length && !pq.in.length && !pq.is.length && !pq.has.length && !pq.filename.length &&
    !pq.category.length && pq.after == null && pq.before == null && pq.larger == null && pq.smaller == null &&
    !pq.negated.length
  );
}

const haystackCache = new WeakMap<Thread, string>();

function haystack(t: Thread, labels: Label[]): string {
  const cached = haystackCache.get(t);
  if (cached) return cached;
  const parts: string[] = [t.subject];
  for (const m of t.messages) {
    parts.push(m.from.name, m.from.email, m.text);
    for (const c of [...m.to, ...m.cc]) parts.push(c.name, c.email);
    for (const a of m.attachments) parts.push(a.name);
  }
  for (const id of t.labels) {
    const l = labels.find((x) => x.id === id);
    if (l) parts.push(l.name);
  }
  const s = parts.join(' \u0001 ').toLowerCase();
  haystackCache.set(t, s);
  return s;
}

function contactMatches(c: { name: string; email: string }, v: string, meEmail: string) {
  if (v === 'me') return c.email.toLowerCase() === meEmail.toLowerCase();
  return c.name.toLowerCase().includes(v) || c.email.toLowerCase().includes(v);
}

export function threadMatches(
  t: Thread,
  pq: ParsedQuery,
  ctx: { labels: Label[]; meEmail: string; now: number },
): boolean {
  const { labels, meEmail, now } = ctx;
  const inOps = pq.in;
  const anywhere = inOps.includes('anywhere');
  if (!anywhere) {
    if (inOps.includes('trash')) {
      if (!t.trashed) return false;
    } else if (inOps.includes('spam')) {
      if (!t.spam) return false;
    } else if (t.trashed || t.spam) return false;
  }
  for (const v of inOps) {
    if (v === 'inbox' && !(t.inInbox && !(t.snoozedUntil && t.snoozedUntil > now))) return false;
    if (v === 'sent' && !t.messages.some((m) => m.from.email === meEmail)) return false;
    if (v === 'starred' && !t.starred) return false;
    if (v === 'snoozed' && !(t.snoozedUntil && t.snoozedUntil > now)) return false;
    if (v === 'important' && !t.important) return false;
    if (v === 'archive' && t.inInbox) return false;
  }
  for (const v of pq.is) {
    if (v === 'unread' && !t.unread) return false;
    if (v === 'read' && t.unread) return false;
    if (v === 'starred' && !t.starred) return false;
    if (v === 'unstarred' && t.starred) return false;
    if (v === 'important' && !t.important) return false;
    if (v === 'snoozed' && !(t.snoozedUntil && t.snoozedUntil > now)) return false;
    if (v === 'muted' && !t.muted) return false;
  }
  for (const v of pq.has) {
    if (v === 'attachment' && !t.messages.some((m) => m.attachments.length)) return false;
    if (v === 'userlabels' && !t.labels.length) return false;
    if (v === 'nouserlabels' && t.labels.length) return false;
    if (v === 'image' && !t.messages.some((m) => m.attachments.some((a) => a.kind === 'image'))) return false;
    if (v === 'pdf' && !t.messages.some((m) => m.attachments.some((a) => a.kind === 'pdf'))) return false;
  }
  for (const v of pq.category) if (t.category !== v) return false;
  for (const v of pq.labels) {
    const hit = t.labels.some((id) => {
      const l = labels.find((x) => x.id === id);
      return id === v || l?.name.toLowerCase() === v || l?.name.toLowerCase().replace(/\s+/g, '-') === v;
    });
    if (!hit) return false;
  }
  for (const v of pq.from) if (!t.messages.some((m) => contactMatches(m.from, v, meEmail))) return false;
  for (const v of pq.to) {
    if (!t.messages.some((m) => [...m.to, ...m.cc, ...m.bcc].some((c) => contactMatches(c, v, meEmail)))) return false;
  }
  for (const v of pq.subject) if (!t.subject.toLowerCase().includes(v)) return false;
  for (const v of pq.filename) {
    if (!t.messages.some((m) => m.attachments.some((a) => a.name.toLowerCase().includes(v) || a.kind === v))) return false;
  }
  if (pq.after != null && !t.messages.some((m) => m.date >= pq.after!)) return false;
  if (pq.before != null && !t.messages.some((m) => m.date < pq.before!)) return false;
  if (pq.larger != null || pq.smaller != null) {
    const size = t.messages.reduce((s, m) => s + m.text.length + m.attachments.reduce((a, x) => a + x.size, 0), 0);
    if (pq.larger != null && size <= pq.larger) return false;
    if (pq.smaller != null && size >= pq.smaller) return false;
  }
  if (pq.terms.length || pq.excluded.length) {
    const hay = haystack(t, labels);
    for (const term of pq.terms) if (!hay.includes(term)) return false;
    for (const term of pq.excluded) if (hay.includes(term)) return false;
  }
  for (const sub of pq.negated) if (threadMatches(t, sub, ctx)) return false;
  return true;
}

export interface AdvancedFields {
  from: string;
  to: string;
  subject: string;
  hasWords: string;
  doesntHave: string;
  hasAttachment: boolean;
  within: '' | '1d' | '3d' | '7d' | '14d' | '1m' | '2m' | '6m' | '1y';
  scope: 'all' | 'inbox' | 'starred' | 'sent' | 'unread' | 'trash' | 'spam' | 'anywhere';
}

export const EMPTY_ADVANCED: AdvancedFields = {
  from: '', to: '', subject: '', hasWords: '', doesntHave: '', hasAttachment: false, within: '', scope: 'all',
};

function quoteIfNeeded(v: string) {
  return /\s/.test(v) ? `"${v}"` : v;
}

export function buildQuery(f: AdvancedFields): string {
  const parts: string[] = [];
  if (f.from.trim()) parts.push(`from:${quoteIfNeeded(f.from.trim())}`);
  if (f.to.trim()) parts.push(`to:${quoteIfNeeded(f.to.trim())}`);
  if (f.subject.trim()) parts.push(`subject:${quoteIfNeeded(f.subject.trim())}`);
  if (f.hasWords.trim()) parts.push(f.hasWords.trim());
  if (f.doesntHave.trim()) parts.push(...f.doesntHave.trim().split(/\s+/).map((w) => `-${w}`));
  if (f.hasAttachment) parts.push('has:attachment');
  if (f.within) parts.push(`newer_than:${f.within}`);
  if (f.scope === 'unread') parts.push('is:unread');
  else if (f.scope !== 'all') parts.push(`in:${f.scope}`);
  return parts.join(' ');
}

/** Best-effort inverse of buildQuery so the advanced form can be pre-filled from the current query. */
export function queryToFields(q: string): AdvancedFields {
  const f: AdvancedFields = { ...EMPTY_ADVANCED };
  const words: string[] = [];
  const neg: string[] = [];
  for (const raw of tokenize(q)) {
    const m = raw.match(/^([a-z_]+):(.+)$/i);
    if (m) {
      const v = unquote(m[2]);
      const op = m[1].toLowerCase();
      if (op === 'from') f.from = v;
      else if (op === 'to') f.to = v;
      else if (op === 'subject') f.subject = v;
      else if (op === 'has' && v === 'attachment') f.hasAttachment = true;
      else if (op === 'newer_than') f.within = v as AdvancedFields['within'];
      else if (op === 'in') f.scope = v as AdvancedFields['scope'];
      else if (op === 'is' && v === 'unread') f.scope = 'unread';
      else words.push(raw);
    } else if (raw.startsWith('-')) neg.push(raw.slice(1));
    else words.push(raw);
  }
  f.hasWords = words.join(' ');
  f.doesntHave = neg.join(' ');
  return f;
}
