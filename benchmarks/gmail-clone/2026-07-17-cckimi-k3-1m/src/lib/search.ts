import type { Label, Thread } from '../types';
import { stripHtml } from './utils';
import { displayName } from '../data/seed';

export interface QueryOp {
  key: string;
  value: string;
}

export interface ParsedQuery {
  terms: string[];
  ops: QueryOp[];
}

/** Parse a Gmail-style query: free text plus operators like from:, label:, is:starred, has:attachment. */
export function parseQuery(q: string): ParsedQuery {
  const ops: QueryOp[] = [];
  const terms: string[] = [];
  const re = /(-?)([a-z]+):("([^"]*)"|[^\s]+)|"([^"]+)"|(\S+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q)) !== null) {
    if (m[3] !== undefined) {
      const key = m[2].toLowerCase();
      const value = (m[5] ?? m[3]).replace(/^"|"$/g, '');
      ops.push({ key: m[1] === '-' ? `-${key}` : key, value: value.toLowerCase() });
    } else {
      const term = (m[6] ?? m[7] ?? '').toLowerCase();
      if (term) terms.push(term);
    }
  }
  return { terms, ops };
}

function dayFloor(dateStr: string): number | null {
  const norm = dateStr.replace(/\./g, '/').replace(/-/g, '/');
  const parts = norm.split('/').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [a, b, c] = parts;
  // Accept yyyy/mm/dd or mm/dd/yyyy
  const year = a > 31 ? a : c;
  const month = a > 31 ? b : a;
  const day = a > 31 ? c : b;
  const d = new Date(year < 100 ? 2000 + year : year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function threadText(t: Thread): string {
  const parts: string[] = [t.subject];
  for (const m of t.messages) {
    parts.push(displayName(m.from), m.from, m.to.join(' '), (m.cc ?? []).join(' '), stripHtml(m.body));
  }
  return parts.join(' ').toLowerCase();
}

function lastDate(t: Thread): number {
  return t.messages.length ? t.messages[t.messages.length - 1].date : 0;
}

export function threadMatches(t: Thread, parsed: ParsedQuery, labels: Label[]): boolean {
  const text = threadText(t);
  for (const term of parsed.terms) {
    if (!text.includes(term)) return false;
  }
  for (const op of parsed.ops) {
    const neg = op.key.startsWith('-');
    const key = neg ? op.key.slice(1) : op.key;
    const v = op.value;
    let ok = true;
    switch (key) {
      case 'from':
        ok = t.messages.some(
          (m) => m.from.toLowerCase().includes(v) || displayName(m.from).toLowerCase().includes(v),
        );
        break;
      case 'to':
        ok = t.messages.some((m) =>
          [...m.to, ...(m.cc ?? [])].some(
            (r) => r.toLowerCase().includes(v) || displayName(r).toLowerCase().includes(v),
          ),
        );
        break;
      case 'subject':
        ok = t.subject.toLowerCase().includes(v);
        break;
      case 'label': {
        const lbl = labels.find((l) => l.name.toLowerCase() === v);
        ok = lbl ? t.labels.includes(lbl.id) : t.labels.some((l) => l.toLowerCase() === v);
        break;
      }
      case 'in': {
        const map: Record<string, (th: Thread) => boolean> = {
          inbox: (th) => th.labels.includes('INBOX') && !isSnoozed(th),
          sent: (th) => th.labels.includes('SENT'),
          drafts: (th) => th.labels.includes('DRAFT'),
          draft: (th) => th.labels.includes('DRAFT'),
          trash: (th) => th.labels.includes('TRASH'),
          spam: (th) => th.labels.includes('SPAM'),
          starred: (th) => th.starred,
          snoozed: (th) => isSnoozed(th),
          anywhere: () => true,
          all: () => true,
        };
        ok = (map[v] ?? (() => false))(t);
        break;
      }
      case 'is':
        ok =
          v === 'unread' ? !t.read
          : v === 'read' ? t.read
          : v === 'starred' ? t.starred
          : v === 'snoozed' ? isSnoozed(t)
          : v === 'important' ? t.labels.includes('INBOX') && !t.read
          : false;
        break;
      case 'has':
        ok =
          v === 'attachment'
            ? t.messages.some((m) => (m.attachments ?? []).length > 0) || (t.draftAttachments ?? []).length > 0
            : false;
        break;
      case 'before': {
        const d = dayFloor(v);
        ok = d !== null && lastDate(t) < d;
        break;
      }
      case 'after': {
        const d = dayFloor(v);
        ok = d !== null && lastDate(t) >= d;
        break;
      }
      case 'category':
        ok = t.category === v;
        break;
      case 'filename':
        ok = t.messages.some((m) => (m.attachments ?? []).some((a) => a.name.toLowerCase().includes(v)));
        break;
      default:
        ok = text.includes(`${key}:${v}`) || text.includes(v);
    }
    if (neg ? ok : !ok) return false;
  }
  return true;
}

export function isSnoozed(t: Thread): boolean {
  return !!t.snoozeUntil && t.snoozeUntil > Date.now();
}

export function searchThreads(threads: Thread[], parsed: ParsedQuery, labels: Label[]): Thread[] {
  const searchAll = parsed.ops.some((op) => {
    const k = op.key.replace(/^-/, '');
    return k === 'in' && ['anywhere', 'all', 'trash', 'spam'].includes(op.value);
  });
  return threads.filter((t) => {
    if (!searchAll && (t.labels.includes('TRASH') || t.labels.includes('SPAM'))) return false;
    return threadMatches(t, parsed, labels);
  });
}

export function searchTermsOf(parsed: ParsedQuery): string[] {
  return [
    ...parsed.terms,
    ...parsed.ops
      .filter((o) => ['from', 'to', 'subject', 'filename'].includes(o.key.replace(/^-/, '')))
      .map((o) => o.value),
  ];
}

export const SEARCH_HINTS: Array<{ op: string; desc: string; example: string }> = [
  { op: 'from:', desc: 'Sender', example: 'from:maya' },
  { op: 'to:', desc: 'Recipient', example: 'to:tom' },
  { op: 'subject:', desc: 'Subject words', example: 'subject:invoice' },
  { op: 'label:', desc: 'Label name', example: 'label:work' },
  { op: 'has:attachment', desc: 'Has files', example: 'has:attachment' },
  { op: 'is:unread', desc: 'Unread only', example: 'is:unread' },
  { op: 'is:starred', desc: 'Starred only', example: 'is:starred' },
  { op: 'in:sent', desc: 'Mailbox', example: 'in:trash' },
  { op: 'before:', desc: 'Older than date', example: 'before:2026/07/01' },
  { op: 'after:', desc: 'Newer than date', example: 'after:2026/07/10' },
];
