import type { Category, Contact, Draft, Label, Thread } from '../data/types';
import { CONTACTS, ME } from '../data/seed';
import { firstName, htmlToText } from '../lib/format';
import type { Route, SystemFolder } from '../lib/router';
import { parseQuery, threadMatches } from '../lib/search';
import type { MailState } from './mail';

export type Row = { kind: 'thread'; id: string; thread: Thread } | { kind: 'draft'; id: string; draft: Draft };

export function lastDate(t: Thread): number {
  return t.messages[t.messages.length - 1]?.date ?? 0;
}

export function isSnoozed(t: Thread, now: number) {
  return !!t.snoozedUntil && t.snoozedUntil > now;
}

export function isSentByMe(t: Thread) {
  return t.messages.some((m) => m.from.email === ME.email);
}

export function inFolder(t: Thread, folder: SystemFolder, now: number, category?: Category | null): boolean {
  const live = !t.trashed && !t.spam;
  switch (folder) {
    case 'inbox':
      return live && t.inInbox && !isSnoozed(t, now) && (!category || t.category === category);
    case 'starred':
      return live && t.starred;
    case 'snoozed':
      return live && isSnoozed(t, now);
    case 'important':
      return live && t.important;
    case 'sent':
      return live && isSentByMe(t);
    case 'all':
      return live;
    case 'spam':
      return t.spam && !t.trashed;
    case 'trash':
      return t.trashed;
    default:
      return false;
  }
}

function byDateDesc(a: Thread, b: Thread) {
  return lastDate(b) - lastDate(a);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Removes the "-- " signature block compose inserts, wherever the caret left the typed text. */
export function stripSignature(text: string, signature: string): string {
  const lines = signature.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return text;
  const re = new RegExp(`(^|\\n)[^\\S\\n]*--[^\\S\\n]*\\n\\s*${lines.map(escapeRe).join('\\s*\\n\\s*')}[^\\S\\n]*`);
  return text.replace(re, '$1');
}

/** Untouched compose windows (only the auto-inserted signature) aren't real drafts yet, as in Gmail. */
export function isDraftEmpty(d: Draft, signature: string): boolean {
  if (d.to.length || d.cc.length || d.bcc.length || d.subject.trim() || d.attachments.length) return false;
  return !stripSignature(htmlToText(d.html), signature).replace(/^\s*--\s*$/gm, '').trim();
}

export function visibleDrafts(drafts: Record<string, Draft>, signature: string): Draft[] {
  return Object.values(drafts)
    .filter((d) => !d.scheduledAt && !d.outgoing && !isDraftEmpty(d, signature))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function scheduledDrafts(drafts: Record<string, Draft>): Draft[] {
  return Object.values(drafts)
    .filter((d) => d.scheduledAt && !d.outgoing)
    .sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
}

export function rowsForRoute(s: Pick<MailState, 'threads' | 'drafts' | 'labels' | 'settings'>, route: Route, now: number): Row[] {
  if (route.view === 'settings') return [];
  const all = Object.values(s.threads);
  let threads: Thread[];
  if (route.view === 'folder') {
    if (route.folder === 'drafts') return visibleDrafts(s.drafts, s.settings.signature).map((d) => ({ kind: 'draft', id: d.id, draft: d }));
    if (route.folder === 'scheduled') return scheduledDrafts(s.drafts).map((d) => ({ kind: 'draft', id: d.id, draft: d }));
    const category = route.folder === 'inbox' && s.settings.categories ? route.category ?? 'primary' : null;
    threads = all.filter((t) => inFolder(t, route.folder, now, category));
    if (route.folder === 'snoozed') threads.sort((a, b) => (a.snoozedUntil ?? 0) - (b.snoozedUntil ?? 0));
    else threads.sort(byDateDesc);
    if (route.folder === 'inbox' && s.settings.inboxSort !== 'default') {
      const key = s.settings.inboxSort === 'unreadFirst' ? (t: Thread) => (t.unread ? 0 : 1) : (t: Thread) => (t.starred ? 0 : 1);
      threads.sort((a, b) => key(a) - key(b) || byDateDesc(a, b));
    }
  } else if (route.view === 'label') {
    threads = all.filter((t) => !t.trashed && !t.spam && t.labels.includes(route.labelId)).sort(byDateDesc);
  } else {
    const pq = parseQuery(route.query, now);
    threads = all.filter((t) => threadMatches(t, pq, { labels: s.labels, meEmail: ME.email, now })).sort(byDateDesc);
  }
  return threads.map((t) => ({ kind: 'thread', id: t.id, thread: t }));
}

export interface Counts {
  inbox: number;
  categories: Record<Category, number>;
  drafts: number;
  scheduled: number;
  spam: number;
  snoozed: number;
  labels: Record<string, number>;
}

export function computeCounts(s: Pick<MailState, 'threads' | 'drafts' | 'settings'>, now: number): Counts {
  const counts: Counts = {
    inbox: 0,
    categories: { primary: 0, promotions: 0, social: 0, updates: 0 },
    drafts: visibleDrafts(s.drafts, s.settings.signature).length,
    scheduled: scheduledDrafts(s.drafts).length,
    spam: 0,
    snoozed: 0,
    labels: {},
  };
  for (const t of Object.values(s.threads)) {
    if (t.spam && t.unread && !t.trashed) counts.spam++;
    if (isSnoozed(t, now) && !t.trashed) counts.snoozed++;
    if (!t.unread || t.trashed || t.spam) continue;
    if (inFolder(t, 'inbox', now)) {
      counts.categories[t.category]++;
      if (!s.settings.categories || t.category === 'primary') counts.inbox++;
    }
    for (const l of t.labels) counts.labels[l] = (counts.labels[l] ?? 0) + 1;
  }
  return counts;
}

/** "Maya, me, Devon" style participant summary for list rows. */
export function participants(t: Thread, meEmail = ME.email): { names: { label: string; unread: boolean }[]; count: number } {
  const seen = new Map<string, { label: string; unread: boolean }>();
  const multi = new Set(t.messages.map((m) => m.from.email)).size > 1;
  t.messages.forEach((m, i) => {
    const isMe = m.from.email === meEmail;
    const label = isMe ? 'me' : multi ? firstName(m.from) : m.from.name || m.from.email;
    const unread = t.unread && i === t.messages.length - 1;
    const prev = seen.get(m.from.email);
    seen.delete(m.from.email);
    seen.set(m.from.email, { label, unread: unread || !!prev?.unread });
  });
  let names = Array.from(seen.values());
  if (names.length > 3) names = [names[0], { label: '…', unread: false }, ...names.slice(-2)];
  return { names, count: t.messages.length };
}

export function labelMap(labels: Label[]): Record<string, Label> {
  return Object.fromEntries(labels.map((l) => [l.id, l]));
}

/** All addresses the user has corresponded with, ranked by how often they appear. */
export function knownContacts(threads: Record<string, Thread>): Contact[] {
  const score = new Map<string, { c: Contact; n: number }>();
  const byEmail = new Map(Object.values(CONTACTS).map((c) => [c.email.toLowerCase(), c]));
  const bump = (c: Contact, n: number) => {
    const key = c.email.toLowerCase();
    if (key === ME.email) return;
    const cur = score.get(key);
    if (cur) cur.n += n;
    else score.set(key, { c: byEmail.get(key) ?? c, n });
  };
  for (const c of Object.values(CONTACTS)) bump(c, c.kind === 'brand' ? 0 : 1);
  for (const t of Object.values(threads)) {
    for (const m of t.messages) {
      if (m.from.email === ME.email) for (const c of [...m.to, ...m.cc]) bump(c, 4);
      else bump(m.from, 1);
    }
  }
  return Array.from(score.values())
    .sort((a, b) => b.n - a.n)
    .map((x) => x.c);
}

export function folderTitle(route: Route, labels: Label[]): string {
  if (route.view === 'label') return labels.find((l) => l.id === route.labelId)?.name ?? 'Label';
  if (route.view === 'search') return 'Search results';
  if (route.view === 'settings') return 'Settings';
  return FOLDER_NAMES[route.folder];
}

export const FOLDER_NAMES: Record<SystemFolder, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  snoozed: 'Snoozed',
  important: 'Important',
  sent: 'Sent',
  scheduled: 'Scheduled',
  drafts: 'Drafts',
  all: 'All Mail',
  spam: 'Spam',
  trash: 'Trash',
};
