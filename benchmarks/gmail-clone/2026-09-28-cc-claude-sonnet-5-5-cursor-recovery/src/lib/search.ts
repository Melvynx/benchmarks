import type { MailState, Message, Thread } from './types';
import { DAY } from './dates';
import { inFolder, isMeAddr, isDelivered, isSnoozed, isUnread, threadDate, type Row } from './mail';
import type { SystemFolder } from './types';

export interface ParsedQuery {
  terms: string[];
  phrases: string[];
  exclude: string[];
  from: string[];
  to: string[];
  cc: string[];
  subject: string[];
  label: string[];
  in: string[];
  is: string[];
  has: string[];
  filename: string[];
  category: string[];
  before?: number;
  after?: number;
  olderThan?: number;
  newerThan?: number;
  larger?: number;
  smaller?: number;
}

const emptyQuery = (): ParsedQuery => ({
  terms: [],
  phrases: [],
  exclude: [],
  from: [],
  to: [],
  cc: [],
  subject: [],
  label: [],
  in: [],
  is: [],
  has: [],
  filename: [],
  category: [],
});

const TOKEN_RE = /(-?)(?:([a-z_]+):)?(?:"([^"]*)"|(\S+))/gi;

export function parseDateOperand(v: string): number | undefined {
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(v.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  const t = Date.parse(v);
  return Number.isNaN(t) ? undefined : t;
}

export function parseDuration(v: string): number | undefined {
  const m = /^(\d+)([dwmy])$/i.exec(v.trim());
  if (!m) return undefined;
  const n = Number(m[1]);
  switch (m[2].toLowerCase()) {
    case 'd':
      return n * DAY;
    case 'w':
      return n * 7 * DAY;
    case 'm':
      return n * 30 * DAY;
    default:
      return n * 365 * DAY;
  }
}

export function parseSize(v: string): number | undefined {
  const m = /^(\d+(?:\.\d+)?)\s*([kmg]?)b?$/i.exec(v.trim());
  if (!m) return undefined;
  const mult = { '': 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 }[m[2].toLowerCase() as '' | 'k' | 'm' | 'g'];
  return Math.round(parseFloat(m[1]) * mult);
}

function parseOne(src: string): ParsedQuery {
  const q = emptyQuery();
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(src))) {
    const neg = m[1] === '-';
    const op = m[2]?.toLowerCase();
    const quoted = m[3] !== undefined;
    const value = (m[3] ?? m[4] ?? '').trim();
    if (!value) continue;
    const lower = value.toLowerCase();
    if (!op) {
      if (neg) q.exclude.push(lower);
      else if (quoted) q.phrases.push(lower);
      else q.terms.push(lower);
      continue;
    }
    switch (op) {
      case 'from':
        q.from.push(lower);
        break;
      case 'to':
        q.to.push(lower);
        break;
      case 'cc':
        q.cc.push(lower);
        break;
      case 'subject':
        q.subject.push(lower);
        break;
      case 'label':
        q.label.push(lower);
        break;
      case 'in':
        q.in.push(lower);
        break;
      case 'is':
        q.is.push(lower);
        break;
      case 'has':
        q.has.push(lower);
        break;
      case 'filename':
        q.filename.push(lower);
        break;
      case 'category':
        q.category.push(lower);
        break;
      case 'before':
        q.before = parseDateOperand(value);
        break;
      case 'after':
        q.after = parseDateOperand(value);
        break;
      case 'older_than':
        q.olderThan = parseDuration(value);
        break;
      case 'newer_than':
        q.newerThan = parseDuration(value);
        break;
      case 'larger':
      case 'size':
        q.larger = parseSize(value);
        break;
      case 'smaller':
        q.smaller = parseSize(value);
        break;
      default:
        // Unknown operator: treat "foo:bar" as a plain term.
        (neg ? q.exclude : q.terms).push(`${op}:${lower}`);
    }
  }
  return q;
}

/** Split on top-level OR, parse each alternative. */
export function parseQuery(src: string): ParsedQuery[] {
  return src
    .split(/\s+OR\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseOne);
}

export function isEmptyQuery(q: ParsedQuery): boolean {
  return (
    !q.terms.length &&
    !q.phrases.length &&
    !q.exclude.length &&
    !q.from.length &&
    !q.to.length &&
    !q.cc.length &&
    !q.subject.length &&
    !q.label.length &&
    !q.in.length &&
    !q.is.length &&
    !q.has.length &&
    !q.filename.length &&
    !q.category.length &&
    q.before === undefined &&
    q.after === undefined &&
    q.olderThan === undefined &&
    q.newerThan === undefined &&
    q.larger === undefined &&
    q.smaller === undefined
  );
}

const addrText = (m: Message, kind: 'from' | 'to' | 'cc'): string => {
  const list = kind === 'from' ? [m.from] : kind === 'to' ? [...m.to, ...m.bcc] : m.cc;
  return list.map((a) => `${a.name} ${a.email}${isMeAddr(a) ? ' me' : ''}`).join(' ').toLowerCase();
};

function threadHaystack(t: Thread): string {
  const parts: string[] = [t.subject];
  for (const m of t.messages) {
    parts.push(m.text, m.from.name, m.from.email, ...m.to.map((a) => `${a.name} ${a.email}`), ...m.cc.map((a) => `${a.name} ${a.email}`));
    for (const a of m.attachments) parts.push(a.name);
  }
  return parts.join('\n').toLowerCase();
}

const haystackCache = new WeakMap<Thread, string>();
function haystackOf(t: Thread): string {
  let h = haystackCache.get(t);
  if (h === undefined) {
    h = threadHaystack(t);
    haystackCache.set(t, h);
  }
  return h;
}

export interface SearchCtx {
  state: MailState;
  now: number;
}

function matchesOne(t: Thread, q: ParsedQuery, ctx: SearchCtx): boolean {
  const { state, now } = ctx;
  const msgs = t.messages.filter((m) => !m.draft || q.in.includes('drafts'));
  if (!msgs.length) return false;
  const hay = haystackOf(t);

  for (const term of q.terms) if (!hay.includes(term)) return false;
  for (const p of q.phrases) if (!hay.includes(p)) return false;
  for (const x of q.exclude) if (hay.includes(x)) return false;

  for (const v of q.from) if (!msgs.some((m) => (v === 'me' ? isMeAddr(m.from) : addrText(m, 'from').includes(v)))) return false;
  for (const v of q.to) if (!msgs.some((m) => addrText(m, 'to').includes(v))) return false;
  for (const v of q.cc) if (!msgs.some((m) => addrText(m, 'cc').includes(v))) return false;
  for (const v of q.subject) if (!t.subject.toLowerCase().includes(v)) return false;

  for (const v of q.label) {
    const wanted = v.replace(/-/g, ' ');
    const ok = t.labelIds.some((id) => {
      const l = state.labels.find((x) => x.id === id);
      return id === v || (l && (l.name.toLowerCase() === wanted || l.name.toLowerCase().replace(/\s+/g, '-') === v));
    });
    if (!ok) return false;
  }

  for (const v of q.category) if (t.category !== v) return false;

  for (const v of q.is) {
    switch (v) {
      case 'unread':
        if (!isUnread(t)) return false;
        break;
      case 'read':
        if (isUnread(t)) return false;
        break;
      case 'starred':
        if (!t.starred) return false;
        break;
      case 'important':
        if (!t.important) return false;
        break;
      case 'snoozed':
        if (!isSnoozed(t, now)) return false;
        break;
      case 'muted':
        if (!t.muted) return false;
        break;
      default:
        break;
    }
  }

  for (const v of q.has) {
    if (v === 'attachment' || v === 'attachments') {
      if (!msgs.some((m) => m.attachments.length)) return false;
    } else if (v === 'nouserlabels') {
      if (t.labelIds.length) return false;
    } else if (v === 'userlabels') {
      if (!t.labelIds.length) return false;
    } else if (v === 'image' || v === 'pdf' || v === 'document' || v === 'spreadsheet' || v === 'presentation') {
      const tests: Record<string, (mime: string) => boolean> = {
        image: (x) => x.startsWith('image/'),
        pdf: (x) => x === 'application/pdf',
        document: (x) => x.includes('word'),
        spreadsheet: (x) => x.includes('sheet') || x.includes('excel'),
        presentation: (x) => x.includes('presentation') || x.includes('powerpoint'),
      };
      if (!msgs.some((m) => m.attachments.some((a) => tests[v](a.mime)))) return false;
    }
  }

  for (const v of q.filename) if (!msgs.some((m) => m.attachments.some((a) => a.name.toLowerCase().includes(v)))) return false;

  const dates = msgs.map((m) => m.date);
  if (q.after !== undefined && !dates.some((d) => d >= q.after!)) return false;
  if (q.before !== undefined && !dates.some((d) => d < q.before!)) return false;
  if (q.olderThan !== undefined && !(Math.max(...dates) < now - q.olderThan)) return false;
  if (q.newerThan !== undefined && !(Math.max(...dates) >= now - q.newerThan)) return false;

  if (q.larger !== undefined || q.smaller !== undefined) {
    const biggest = Math.max(0, ...msgs.map((m) => m.attachments.reduce((s, a) => s + a.size, 0)));
    if (q.larger !== undefined && !(biggest > q.larger)) return false;
    if (q.smaller !== undefined && !(biggest < q.smaller)) return false;
  }

  // Scope: "in:" folders. Default = everything except Trash and Spam.
  if (q.in.length) {
    const ok = q.in.some((v) => {
      if (v === 'anywhere') return true;
      if (v === 'all' || v === 'all_mail') return !t.trashed && !t.spam;
      const folder = (v === 'draft' ? 'drafts' : v) as SystemFolder;
      if (['inbox', 'starred', 'snoozed', 'important', 'sent', 'drafts', 'scheduled', 'spam', 'trash'].includes(folder)) {
        return inFolder(t, folder, now);
      }
      return false;
    });
    if (!ok) return false;
  } else if (t.trashed || t.spam) {
    return false;
  }
  return true;
}

export function matchThread(t: Thread, queries: ParsedQuery[], ctx: SearchCtx): boolean {
  return queries.some((q) => matchesOne(t, q, ctx));
}

export interface SearchResult {
  rows: Row[];
  /** Lower-cased strings to highlight in results. */
  highlight: string[];
}

export function runSearch(state: MailState, query: string, now: number): SearchResult {
  const queries = parseQuery(query).filter((q) => !isEmptyQuery(q));
  if (!queries.length) return { rows: [], highlight: [] };
  const ctx: SearchCtx = { state, now };
  const rows: Row[] = [];
  for (const t of Object.values(state.threads)) {
    if (matchThread(t, queries, ctx)) rows.push({ key: t.id, thread: t });
  }
  rows.sort((a, b) => threadDate(b.thread) - threadDate(a.thread));
  const highlight = new Set<string>();
  for (const q of queries) {
    for (const x of [...q.terms, ...q.phrases, ...q.subject]) highlight.add(x);
  }
  return { rows, highlight: [...highlight].filter((h) => h.length > 0).sort((a, b) => b.length - a.length) };
}

/** Best snippet for a search hit: window around the first highlighted term in the newest matching message. */
export function searchSnippet(t: Thread, highlight: string[], max = 150): string {
  if (!highlight.length) return '';
  const msgs = t.messages.filter(isDelivered).slice().reverse();
  for (const m of msgs) {
    const text = m.text.replace(/\s+/g, ' ');
    const lower = text.toLowerCase();
    for (const h of highlight) {
      const i = lower.indexOf(h);
      if (i >= 0) {
        const start = Math.max(0, i - 40);
        return (start > 0 ? '…' : '') + text.slice(start, start + max);
      }
    }
  }
  return '';
}

export interface AdvancedFields {
  from: string;
  to: string;
  subject: string;
  has: string;
  exclude: string;
  size: '' | 'larger' | 'smaller';
  sizeValue: string;
  sizeUnit: 'K' | 'M' | 'G';
  within: string;
  date: string;
  scope: string;
  attachment: boolean;
}

export const emptyAdvanced = (): AdvancedFields => ({
  from: '',
  to: '',
  subject: '',
  has: '',
  exclude: '',
  size: '',
  sizeValue: '',
  sizeUnit: 'M',
  within: '',
  date: '',
  scope: '',
  attachment: false,
});

const quoteIfNeeded = (v: string) => (/\s/.test(v) && !/^".*"$/.test(v) ? `"${v}"` : v);

export function buildQueryFromAdvanced(f: AdvancedFields): string {
  const parts: string[] = [];
  if (f.from.trim()) parts.push(`from:${quoteIfNeeded(f.from.trim())}`);
  if (f.to.trim()) parts.push(`to:${quoteIfNeeded(f.to.trim())}`);
  if (f.subject.trim()) parts.push(`subject:${quoteIfNeeded(f.subject.trim())}`);
  if (f.has.trim()) parts.push(f.has.trim());
  if (f.exclude.trim()) {
    for (const w of f.exclude.trim().split(/\s+/)) parts.push(`-${w}`);
  }
  if (f.size && f.sizeValue.trim()) parts.push(`${f.size}:${f.sizeValue.trim()}${f.sizeUnit}`);
  if (f.date) {
    const center = parseDateOperand(f.date);
    if (center !== undefined) {
      const span = parseDuration(f.within || '1d') ?? DAY;
      const fmt = (ts: number) => {
        const d = new Date(ts);
        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
      };
      parts.push(`after:${fmt(center - span)}`, `before:${fmt(center + span + DAY)}`);
    }
  }
  if (f.scope && f.scope !== 'all') parts.push(`in:${f.scope}`);
  if (f.attachment) parts.push('has:attachment');
  return parts.join(' ');
}
