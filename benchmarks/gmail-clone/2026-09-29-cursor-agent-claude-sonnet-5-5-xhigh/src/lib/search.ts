import type { Label, Message, Thread } from './types';
import { htmlToText } from './text';
import { DAY, HOUR } from './date';

export interface Term {
  neg: boolean;
  key: string;
  value: string;
}

export type Node = { type: 'term'; term: Term } | { type: 'or'; terms: Term[] };

export interface ParsedQuery {
  raw: string;
  nodes: Node[];
}

const OPERATORS = new Set([
  'from',
  'to',
  'cc',
  'bcc',
  'subject',
  'label',
  'has',
  'filename',
  'is',
  'in',
  'category',
  'before',
  'after',
  'older',
  'newer',
  'older_than',
  'newer_than',
  'larger',
  'smaller',
]);

export const OPERATOR_HINTS: { token: string; hint: string }[] = [
  { token: 'from:', hint: 'Sender name or address' },
  { token: 'to:', hint: 'Recipient name or address' },
  { token: 'subject:', hint: 'Words in the subject' },
  { token: 'label:', hint: 'Messages with a label' },
  { token: 'has:attachment', hint: 'Messages with attachments' },
  { token: 'is:unread', hint: 'Unread conversations' },
  { token: 'is:starred', hint: 'Starred conversations' },
  { token: 'in:sent', hint: 'Search within Sent' },
  { token: 'in:anywhere', hint: 'Include Spam and Trash' },
  { token: 'category:promotions', hint: 'Inbox category' },
  { token: 'newer_than:7d', hint: 'Received within the last week' },
  { token: 'filename:pdf', hint: 'Attachment file name or type' },
  { token: 'larger:1M', hint: 'Attachments bigger than a size' },
];

export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      inQuote = !inQuote;
      cur += ch;
    } else if (/\s/.test(ch) && !inQuote) {
      if (cur) tokens.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

function unquote(v: string): string {
  return v.replace(/^"/, '').replace(/"$/, '');
}

function toTerm(token: string): Term | null {
  let neg = false;
  let t = token;
  if (t.startsWith('-') && t.length > 1) {
    neg = true;
    t = t.slice(1);
  }
  const m = /^([a-z_]+):(.*)$/i.exec(t);
  if (m && OPERATORS.has(m[1].toLowerCase())) {
    const value = unquote(m[2]);
    if (!value) return null;
    return { neg, key: m[1].toLowerCase(), value };
  }
  const v = unquote(t);
  if (!v) return null;
  return { neg, key: 'text', value: v };
}

export function parseQuery(raw: string): ParsedQuery {
  const tokens = tokenize(raw);
  const nodes: Node[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === 'OR' || tok === '|') continue;
    const term = toTerm(tok);
    if (!term) continue;
    const orChain = [term];
    while (tokens[i + 1] === 'OR' && tokens[i + 2]) {
      const next = toTerm(tokens[i + 2]);
      i += 2;
      if (next) orChain.push(next);
    }
    if (orChain.length > 1) nodes.push({ type: 'or', terms: orChain });
    else nodes.push({ type: 'term', term });
  }
  return { raw, nodes };
}

export function allTerms(q: ParsedQuery): Term[] {
  return q.nodes.flatMap((n) => (n.type === 'term' ? [n.term] : n.terms));
}

export function highlightTerms(q: ParsedQuery): string[] {
  return allTerms(q)
    .filter((t) => !t.neg && (t.key === 'text' || t.key === 'subject'))
    .map((t) => t.value.toLowerCase())
    .filter((v) => v.length > 0);
}

export interface SearchContext {
  me: string;
  labels: Label[];
  now: number;
}

const textCache = new WeakMap<Message, string>();
function bodyText(m: Message): string {
  let t = textCache.get(m);
  if (t === undefined) {
    t = htmlToText(m.html, { keepQuote: false }).toLowerCase();
    textCache.set(m, t);
  }
  return t;
}

function personHay(p: { name: string; email: string }): string {
  return `${p.name} ${p.email}`.toLowerCase();
}

export function parseDate(v: string): number | null {
  const s = v.trim();
  let m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return new Date(+m[3], +m[1] - 1, +m[2]).getTime();
  return null;
}

export function parseDuration(v: string): number | null {
  const m = /^(\d+)([hdwmy])?$/i.exec(v.trim());
  if (!m) return null;
  const n = +m[1];
  switch ((m[2] || 'd').toLowerCase()) {
    case 'h':
      return n * HOUR;
    case 'd':
      return n * DAY;
    case 'w':
      return n * 7 * DAY;
    case 'm':
      return n * 30 * DAY;
    case 'y':
      return n * 365 * DAY;
  }
  return null;
}

export function parseSize(v: string): number | null {
  const m = /^(\d+(?:\.\d+)?)([kmg]?)b?$/i.exec(v.trim());
  if (!m) return null;
  const mult = { '': 1, k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 }[m[2].toLowerCase() as '' | 'k' | 'm' | 'g'];
  return Math.round(parseFloat(m[1]) * mult);
}

function labelMatches(thread: Thread, value: string, labels: Label[]): boolean {
  const v = value.toLowerCase().replace(/-/g, ' ');
  const sys: Record<string, boolean> = {
    inbox: thread.inbox,
    starred: false,
    important: thread.important,
    trash: thread.trashed,
    spam: thread.spam,
    snoozed: !!thread.snoozeUntil,
  };
  if (v in sys) return sys[v];
  return thread.labelIds.some((id) => {
    const l = labels.find((x) => x.id === id);
    if (!l) return false;
    const n = l.name.toLowerCase();
    return n === v || n.replace(/\s+/g, '') === v.replace(/\s+/g, '') || id === value;
  });
}

function evalTerm(term: Term, thread: Thread, msg: Message, ctx: SearchContext): boolean {
  const v = term.value.toLowerCase();
  let hit: boolean;
  switch (term.key) {
    case 'text': {
      const hay = `${thread.subject} ${personHay(msg.from)} ${msg.to.map(personHay).join(' ')} ${bodyText(msg)} ${msg.attachments
        .map((a) => a.name)
        .join(' ')}`.toLowerCase();
      hit = v.split(/\s+/).every((w) => hay.includes(w));
      break;
    }
    case 'from':
      hit = personHay(msg.from).includes(v === 'me' ? ctx.me : v);
      break;
    case 'to':
      hit = msg.to.some((p) => personHay(p).includes(v === 'me' ? ctx.me : v));
      break;
    case 'cc':
      hit = msg.cc.some((p) => personHay(p).includes(v));
      break;
    case 'bcc':
      hit = msg.bcc.some((p) => personHay(p).includes(v));
      break;
    case 'subject':
      hit = v.split(/\s+/).every((w) => thread.subject.toLowerCase().includes(w));
      break;
    case 'label':
      hit = labelMatches(thread, v, ctx.labels);
      break;
    case 'category':
      hit = thread.category === v;
      break;
    case 'has':
      hit = v === 'attachment' || v === 'attachments' ? msg.attachments.length > 0 : v === 'invite' ? !!msg.invite : false;
      break;
    case 'filename':
      hit = msg.attachments.some((a) => a.name.toLowerCase().includes(v) || a.kind === v);
      break;
    case 'is':
      switch (v) {
        case 'unread':
          hit = msg.unread;
          break;
        case 'read':
          hit = !msg.unread;
          break;
        case 'starred':
          hit = msg.starred;
          break;
        case 'important':
          hit = thread.important;
          break;
        case 'snoozed':
          hit = !!thread.snoozeUntil && thread.snoozeUntil > ctx.now;
          break;
        default:
          hit = false;
      }
      break;
    case 'in':
      switch (v) {
        case 'inbox':
          hit = thread.inbox && !thread.trashed && !thread.spam;
          break;
        case 'sent':
          hit = msg.from.email.toLowerCase() === ctx.me;
          break;
        case 'trash':
          hit = thread.trashed;
          break;
        case 'spam':
          hit = thread.spam;
          break;
        case 'starred':
          hit = msg.starred;
          break;
        case 'snoozed':
          hit = !!thread.snoozeUntil && thread.snoozeUntil > ctx.now;
          break;
        case 'important':
          hit = thread.important;
          break;
        case 'anywhere':
        case 'all':
          hit = true;
          break;
        default:
          hit = labelMatches(thread, v, ctx.labels);
      }
      break;
    case 'before': {
      const d = parseDate(v);
      hit = d === null ? true : msg.date < d;
      break;
    }
    case 'after': {
      const d = parseDate(v);
      hit = d === null ? true : msg.date >= d;
      break;
    }
    case 'older':
    case 'older_than': {
      const d = parseDuration(v);
      hit = d === null ? true : msg.date < ctx.now - d;
      break;
    }
    case 'newer':
    case 'newer_than': {
      const d = parseDuration(v);
      hit = d === null ? true : msg.date >= ctx.now - d;
      break;
    }
    case 'larger': {
      const s = parseSize(v);
      hit = s === null ? true : msg.attachments.some((a) => a.size > s);
      break;
    }
    case 'smaller': {
      const s = parseSize(v);
      hit = s === null ? true : msg.attachments.length > 0 && msg.attachments.every((a) => a.size < s);
      break;
    }
    default:
      hit = true;
  }
  return term.neg ? !hit : hit;
}

export function matchThread(
  q: ParsedQuery,
  thread: Thread,
  messages: Message[],
  ctx: SearchContext,
): Message | null {
  const scoped = allTerms(q).some((t) => !t.neg && (t.key === 'in' || (t.key === 'label' && /^(trash|spam)$/i.test(t.value))));
  if (!scoped && (thread.trashed || thread.spam)) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.trashed && !thread.trashed) continue;
    const ok = q.nodes.every((n) =>
      n.type === 'term' ? evalTerm(n.term, thread, msg, ctx) : n.terms.some((t) => evalTerm(t, thread, msg, ctx)),
    );
    if (ok) return msg;
  }
  return null;
}

export function hasToken(q: string, token: string): boolean {
  return tokenize(q).includes(token);
}

export function toggleToken(q: string, token: string): string {
  const tokens = tokenize(q);
  if (tokens.includes(token)) return tokens.filter((t) => t !== token).join(' ');
  return [...tokens, token].join(' ');
}

export function setKeyToken(q: string, key: string, token: string | null): string {
  const tokens = tokenize(q).filter((t) => !t.toLowerCase().startsWith(`${key}:`));
  if (token) tokens.push(token);
  return tokens.join(' ');
}

export interface AdvancedFilter {
  from: string;
  to: string;
  subject: string;
  has: string;
  doesnt: string;
  attachment: boolean;
  within: string;
  scope: string;
  larger: string;
}

export const emptyAdvanced: AdvancedFilter = {
  from: '',
  to: '',
  subject: '',
  has: '',
  doesnt: '',
  attachment: false,
  within: '',
  scope: '',
  larger: '',
};

function q1(v: string): string {
  return /\s/.test(v) ? `"${v}"` : v;
}

export function buildQuery(f: AdvancedFilter): string {
  const parts: string[] = [];
  if (f.from.trim()) parts.push(`from:${q1(f.from.trim())}`);
  if (f.to.trim()) parts.push(`to:${q1(f.to.trim())}`);
  if (f.subject.trim()) parts.push(`subject:${q1(f.subject.trim())}`);
  if (f.has.trim()) parts.push(f.has.trim());
  if (f.doesnt.trim()) {
    for (const w of tokenize(f.doesnt.trim())) parts.push(`-${w}`);
  }
  if (f.attachment) parts.push('has:attachment');
  if (f.within.trim()) parts.push(`newer_than:${f.within.trim()}`);
  if (f.larger.trim()) parts.push(`larger:${f.larger.trim()}`);
  if (f.scope.trim()) parts.push(`in:${f.scope.trim()}`);
  return parts.join(' ');
}

export function parseAdvanced(raw: string): AdvancedFilter {
  const f: AdvancedFilter = { ...emptyAdvanced };
  const words: string[] = [];
  const doesnt: string[] = [];
  for (const tok of tokenize(raw)) {
    const m = /^(-?)([a-z_]+):(.*)$/i.exec(tok);
    if (m && !m[1]) {
      const v = unquote(m[3]);
      switch (m[2].toLowerCase()) {
        case 'from':
          f.from = v;
          continue;
        case 'to':
          f.to = v;
          continue;
        case 'subject':
          f.subject = v;
          continue;
        case 'has':
          if (v === 'attachment') f.attachment = true;
          continue;
        case 'newer_than':
          f.within = v;
          continue;
        case 'larger':
          f.larger = v;
          continue;
        case 'in':
          f.scope = v;
          continue;
      }
    }
    if (tok.startsWith('-') && tok.length > 1) doesnt.push(tok.slice(1));
    else words.push(tok);
  }
  f.has = words.join(' ');
  f.doesnt = doesnt.join(' ');
  return f;
}
