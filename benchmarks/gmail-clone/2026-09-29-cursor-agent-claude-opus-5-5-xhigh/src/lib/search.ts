import type { Label, Thread } from '../types';
import { DAY } from './date';
import { htmlToText, stripQuote } from './utils';

export interface ParsedQuery {
  terms: string[];
  neg: string[];
  from: string[];
  to: string[];
  subject: string[];
  label: string[];
  is: string[];
  has: string[];
  filename: string[];
  category: string[];
  in?: string;
  before?: number;
  after?: number;
  olderThan?: number;
  newerThan?: number;
  empty: boolean;
}

const TOKEN = /(-?)(\w+):("[^"]*"|\S+)|(-?)"([^"]*)"|(-?)(\S+)/g;

function parseDate(v: string): number | undefined {
  const m = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

function parseSpan(v: string): number | undefined {
  const m = v.match(/^(\d+)([dwmy])$/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = { d: 1, w: 7, m: 30, y: 365 }[m[2].toLowerCase() as 'd' | 'w' | 'm' | 'y'];
  return n * unit * DAY;
}

export function parseQuery(q: string): ParsedQuery {
  const pq: ParsedQuery = { terms: [], neg: [], from: [], to: [], subject: [], label: [], is: [], has: [], filename: [], category: [], empty: true };
  for (const m of q.matchAll(TOKEN)) {
    if (m[2]) {
      const neg = m[1] === '-';
      const key = m[2].toLowerCase();
      const val = m[3].replace(/^"|"$/g, '').toLowerCase();
      if (neg) {
        pq.neg.push(val);
        continue;
      }
      switch (key) {
        case 'from':
          pq.from.push(val);
          break;
        case 'to':
        case 'cc':
          pq.to.push(val);
          break;
        case 'subject':
          pq.subject.push(val);
          break;
        case 'label':
          pq.label.push(val);
          break;
        case 'is':
          pq.is.push(val);
          break;
        case 'has':
          pq.has.push(val);
          break;
        case 'filename':
          pq.filename.push(val);
          break;
        case 'category':
          pq.category.push(val);
          break;
        case 'in':
          pq.in = val;
          break;
        case 'before':
          pq.before = parseDate(val);
          break;
        case 'after':
          pq.after = parseDate(val);
          break;
        case 'older_than':
          pq.olderThan = parseSpan(val);
          break;
        case 'newer_than':
          pq.newerThan = parseSpan(val);
          break;
        default:
          pq.terms.push(`${key}:${val}`);
      }
    } else if (m[5] !== undefined) {
      (m[4] === '-' ? pq.neg : pq.terms).push(m[5].toLowerCase());
    } else if (m[7]) {
      (m[6] === '-' ? pq.neg : pq.terms).push(m[7].toLowerCase());
    }
  }
  pq.empty = !q.trim();
  return pq;
}

const textCache = new WeakMap<Thread, { all: string; from: string; to: string; files: string }>();

export function threadText(t: Thread) {
  let v = textCache.get(t);
  if (!v) {
    const msgs = t.messages;
    const from = msgs.map((m) => `${m.from.name} ${m.from.email}`).join(' ').toLowerCase();
    const to = msgs.map((m) => [...m.to, ...m.cc].map((p) => `${p.name} ${p.email}`).join(' ')).join(' ').toLowerCase();
    const files = msgs.flatMap((m) => m.attachments.map((a) => a.name)).join(' ').toLowerCase();
    const body = msgs.map((m) => htmlToText(stripQuote(m.body))).join(' ').toLowerCase();
    v = { all: `${t.subject.toLowerCase()} ${from} ${to} ${files} ${body}`, from, to, files };
    textCache.set(t, v);
  }
  return v;
}

export function matchesQuery(t: Thread, pq: ParsedQuery, labels: Label[], now: number): boolean {
  const txt = threadText(t);
  const real = t.messages.filter((m) => m.status !== 'draft');
  const latest = (real.length ? real : t.messages).reduce((a, m) => Math.max(a, m.date), 0);

  const scope = pq.in;
  if (scope === 'trash') {
    if (!t.trashed) return false;
  } else if (scope === 'spam') {
    if (!t.spam || t.trashed) return false;
  } else if (scope !== 'anywhere') {
    if (t.trashed || t.spam) return false;
  }
  if (scope === 'inbox' && !(t.inInbox && !t.snoozedUntil)) return false;
  if (scope === 'sent' && !t.messages.some((m) => m.status === 'sent')) return false;
  if (scope === 'drafts' && !t.messages.some((m) => m.status === 'draft')) return false;
  if (scope === 'starred' && !t.starred) return false;
  if (scope === 'snoozed' && !t.snoozedUntil) return false;
  if (scope === 'scheduled' && !t.messages.some((m) => m.status === 'scheduled')) return false;
  if (scope === 'important' && !t.important) return false;

  for (const term of pq.terms) if (!txt.all.includes(term)) return false;
  for (const term of pq.neg) if (txt.all.includes(term)) return false;
  for (const f of pq.from) {
    if (f === 'me') {
      if (!t.messages.some((m) => m.status !== 'received')) return false;
    } else if (!txt.from.includes(f)) return false;
  }
  for (const f of pq.to) if (!txt.to.includes(f)) return false;
  for (const s of pq.subject) if (!t.subject.toLowerCase().includes(s)) return false;
  for (const f of pq.filename) if (!txt.files.includes(f)) return false;
  for (const l of pq.label) {
    const label = labels.find((x) => x.name.toLowerCase() === l || x.name.toLowerCase().replace(/\s+/g, '-') === l || x.id === l);
    if (!label || !t.labelIds.includes(label.id)) return false;
  }
  for (const cat of pq.category) if (t.category !== cat) return false;
  for (const i of pq.is) {
    if (i === 'unread' && !t.unread) return false;
    if (i === 'read' && t.unread) return false;
    if (i === 'starred' && !t.starred) return false;
    if (i === 'important' && !t.important) return false;
    if (i === 'snoozed' && !t.snoozedUntil) return false;
    if (i === 'muted' && !t.muted) return false;
  }
  for (const h of pq.has) {
    if (h === 'attachment' && !t.messages.some((m) => m.attachments.length)) return false;
    if (h === 'userlabels' && !t.labelIds.length) return false;
    if (h === 'nouserlabels' && t.labelIds.length) return false;
  }
  if (pq.before !== undefined && latest >= pq.before) return false;
  if (pq.after !== undefined && latest < pq.after) return false;
  if (pq.olderThan !== undefined && latest > now - pq.olderThan) return false;
  if (pq.newerThan !== undefined && latest < now - pq.newerThan) return false;
  return true;
}

export function highlightTerms(pq: ParsedQuery): string[] {
  return [...pq.terms, ...pq.subject].filter((t) => t.length > 1);
}

export function toggleToken(query: string, token: string): string {
  const parts = query.split(/\s+/).filter(Boolean);
  const i = parts.findIndex((p) => p.toLowerCase() === token.toLowerCase());
  if (i >= 0) parts.splice(i, 1);
  else parts.push(token);
  return parts.join(' ');
}

export function replaceToken(query: string, prefix: string, token: string | null): string {
  const parts = query.split(/\s+/).filter(Boolean).filter((p) => !p.toLowerCase().startsWith(prefix));
  if (token) parts.push(token);
  return parts.join(' ');
}
