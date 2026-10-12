import type { Address, Attachment, CategoryId, Contact, Message, Thread } from '../lib/types';
import { htmlToText, md } from '../lib/md';
import { mimeFromName } from '../lib/files';
import { ME } from './contacts';

/**
 * Compact, hand-authorable description of a thread. Seed files export
 * `SeedThread[]`; `materialize` turns them into real `Thread` objects.
 *
 * Time offsets are strings such as "35m", "2h", "1d 4h 10m", "3w" and mean
 * "this long BEFORE now" (for `ago`) or "this long AFTER now" (`scheduledIn`,
 * `snoozed`).
 */
export interface SeedMessage {
  /** Contact id (see contacts.ts and each seed file's own contacts) or 'me'. */
  from: string;
  to?: string[]; // defaults to ['me'] (or the thread's previous sender when from === 'me')
  cc?: string[];
  bcc?: string[];
  ago: string;
  /** Mini-markdown body (see lib/md.ts). Use either `md` or `html`. */
  md?: string;
  /** Raw trusted HTML body (marketing layouts etc.). */
  html?: string;
  /** [file name, size in bytes] */
  files?: Array<[string, number]>;
  /** Default false (read). */
  unread?: boolean;
  draft?: boolean;
  /** Scheduled-send message: delivers this long from now. */
  scheduledIn?: string;
  unsubscribe?: boolean;
  /** Set false to omit the auto-generated quoted history (default: quote previous message for replies). */
  quote?: boolean;
}

export interface SeedThread {
  subject: string;
  messages: SeedMessage[];
  /** Default 'primary'. */
  category?: CategoryId;
  /** User label ids: work, family, travel, finance, receipts, design, ideas */
  labels?: string[];
  starred?: boolean;
  important?: boolean;
  /** Archived: not in the inbox (still in All Mail). */
  archived?: boolean;
  trashed?: boolean;
  /** How long ago it was trashed, e.g. "2d". */
  trashedAgo?: string;
  spam?: boolean;
  /** Snoozed until this long from now, e.g. "3h" or "1d 18h". */
  snoozed?: string;
}

const UNITS: Record<string, number> = { w: 7 * 864e5, d: 864e5, h: 36e5, m: 6e4, s: 1e3 };

export function parseOffset(s: string): number {
  let total = 0;
  const re = /(\d+(?:\.\d+)?)\s*([wdhms])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) total += parseFloat(m[1]) * UNITS[m[2]];
  return Math.round(total);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function attributionDate(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${((h + 11) % 12) + 1}:${mm} ${ap}`;
}

export function quoteFor(prev: Pick<Message, 'from' | 'date' | 'html'>): string {
  const who = `${prev.from.name} &lt;${prev.from.email}&gt;`;
  return `<div class="mail-quote-attr">On ${attributionDate(prev.date)}, ${who} wrote:</div><blockquote>${prev.html}</blockquote>`;
}

export function toAddress(c: Contact): Address {
  return { name: c.name, email: c.email };
}

/** Deterministic pseudo-size for attachments etc. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function materialize(
  seeds: SeedThread[],
  contactsById: Map<string, Contact>,
  now: number,
  idPrefix: string,
): Thread[] {
  const addr = (id: string): Address => {
    const c = id === 'me' ? ME : contactsById.get(id);
    if (!c) throw new Error(`Unknown contact id "${id}" in seed "${idPrefix}"`);
    return toAddress(c);
  };

  return seeds.map((seed, ti) => {
    const threadId = `t_${idPrefix}${ti}`;
    const messages: Message[] = [];
    seed.messages.forEach((sm, mi) => {
      const prev = messages[mi - 1];
      const from = addr(sm.from);
      const defaultTo = sm.from === 'me' ? (prev && prev.from.email !== ME.email ? [prev.from] : []) : [addr('me')];
      const html = sm.html ?? md(sm.md ?? '');
      const attachments: Attachment[] = (sm.files ?? []).map(([name, size], ai) => ({
        id: `a_${threadId}_${mi}_${ai}`,
        name,
        size,
        mime: mimeFromName(name),
      }));
      const scheduledAt = sm.scheduledIn ? now + parseOffset(sm.scheduledIn) : undefined;
      messages.push({
        id: `m_${threadId}_${mi}`,
        threadId,
        from,
        to: sm.to ? sm.to.map(addr) : defaultTo,
        cc: (sm.cc ?? []).map(addr),
        bcc: (sm.bcc ?? []).map(addr),
        date: scheduledAt ? now : now - parseOffset(sm.ago),
        html,
        quoteHtml: prev && sm.quote !== false && !sm.draft && !sm.html ? quoteFor(prev) : undefined,
        text: htmlToText(html),
        attachments,
        unread: !!sm.unread,
        draft: !!sm.draft,
        scheduledAt,
        unsubscribe: sm.unsubscribe,
      });
    });
    messages.sort((a, b) => a.date - b.date);
    const hasIncoming = messages.some((m) => m.from.email !== ME.email && !m.draft);
    const trashed = !!seed.trashed;
    return {
      id: threadId,
      subject: seed.subject,
      messages,
      labelIds: seed.labels ?? [],
      category: seed.category ?? 'primary',
      inbox: hasIncoming && !seed.archived && !trashed && !seed.spam,
      starred: !!seed.starred,
      important: !!seed.important,
      trashed,
      trashedAt: trashed ? now - parseOffset(seed.trashedAgo ?? '1d') : undefined,
      spam: !!seed.spam,
      snoozedUntil: seed.snoozed ? now + parseOffset(seed.snoozed) : undefined,
    } satisfies Thread;
  });
}
