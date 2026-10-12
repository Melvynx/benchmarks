import type { Category, FolderId, Label, Message, Thread } from '../types';
import type { Route } from './router';
import { matchesQuery, parseQuery } from './search';
import { firstName, htmlToText, sameEmail, stripQuote } from './utils';

export type InboxType = 'default' | 'important' | 'unread' | 'starred';

export interface ListContext {
  labels: Label[];
  now: number;
  inboxType: InboxType;
  categories: Category[];
}

export const FOLDER_NAMES: Record<FolderId, string> = {
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

export const CATEGORY_NAMES: Record<Category, string> = {
  primary: 'Primary',
  promotions: 'Promotions',
  social: 'Social',
  updates: 'Updates',
};

export function realMessages(t: Thread): Message[] {
  return t.messages.filter((m) => m.status === 'received' || m.status === 'sent');
}

export function hasStatus(t: Thread, s: Message['status']): boolean {
  return t.messages.some((m) => m.status === s);
}

export function isSnoozed(t: Thread, now: number): boolean {
  return !!t.snoozedUntil && t.snoozedUntil > now;
}

export function categoriesActive(ctx: ListContext): boolean {
  return ctx.inboxType === 'default' && ctx.categories.length > 0;
}

export function effectiveCategory(t: Thread, ctx: ListContext): Category {
  return ctx.categories.includes(t.category) ? t.category : 'primary';
}

export function inFolder(t: Thread, folder: FolderId, now: number): boolean {
  const real = t.messages.some((m) => m.status === 'received' || m.status === 'sent');
  switch (folder) {
    case 'inbox':
      return t.inInbox && real && !t.trashed && !t.spam && !isSnoozed(t, now);
    case 'starred':
      return t.starred && !t.trashed && !t.spam;
    case 'snoozed':
      return isSnoozed(t, now) && !t.trashed;
    case 'important':
      return t.important && real && !t.trashed && !t.spam;
    case 'sent':
      return hasStatus(t, 'sent') && !t.trashed && !t.spam;
    case 'scheduled':
      return hasStatus(t, 'scheduled') && !t.trashed;
    case 'drafts':
      return hasStatus(t, 'draft') && !t.trashed;
    case 'all':
      return (real || hasStatus(t, 'scheduled')) && !t.trashed && !t.spam;
    case 'spam':
      return t.spam && !t.trashed;
    case 'trash':
      return t.trashed;
  }
}

export function inRoute(t: Thread, route: Route, ctx: ListContext): boolean {
  switch (route.view) {
    case 'folder':
      if (route.folder === 'inbox') {
        if (!inFolder(t, 'inbox', ctx.now)) return false;
        return categoriesActive(ctx) ? effectiveCategory(t, ctx) === 'primary' : true;
      }
      return inFolder(t, route.folder, ctx.now);
    case 'category':
      return inFolder(t, 'inbox', ctx.now) && t.category === route.category;
    case 'label':
      return t.labelIds.includes(route.labelId) && !t.trashed && !t.spam && t.messages.some((m) => m.status !== 'draft');
    case 'search':
      return matchesQuery(t, parseQuery(route.query), ctx.labels, ctx.now);
    case 'settings':
      return false;
  }
}

export function latestDate(t: Thread): number {
  const real = realMessages(t);
  const list = real.length ? real : t.messages;
  return Math.max(t.returnedAt ?? 0, ...list.map((m) => m.date));
}

export function displayDate(t: Thread, route: Route): number {
  if (route.view === 'folder') {
    if (route.folder === 'drafts') return Math.max(...t.messages.filter((m) => m.status === 'draft').map((m) => m.date));
    if (route.folder === 'sent') return Math.max(...t.messages.filter((m) => m.status === 'sent').map((m) => m.date));
    if (route.folder === 'scheduled') return Math.min(...t.messages.filter((m) => m.status === 'scheduled').map((m) => m.scheduledAt ?? m.date));
    if (route.folder === 'snoozed') return t.snoozedUntil ?? latestDate(t);
  }
  return latestDate(t);
}

export function sectionOf(t: Thread, type: InboxType): 0 | 1 {
  if (type === 'unread') return t.unread ? 0 : 1;
  if (type === 'starred') return t.starred ? 0 : 1;
  if (type === 'important') return t.important ? 0 : 1;
  return 0;
}

export const SECTION_TITLES: Record<InboxType, [string, string]> = {
  default: ['', ''],
  unread: ['Unread', 'Everything else'],
  starred: ['Starred', 'Everything else'],
  important: ['Important and unread', 'Everything else'],
};

export function computeList(threads: Record<string, Thread>, route: Route, ctx: ListContext): Thread[] {
  const list = Object.values(threads).filter((t) => inRoute(t, route, ctx));
  const ascending = route.view === 'folder' && (route.folder === 'scheduled' || route.folder === 'snoozed');
  const sectioned = route.view === 'folder' && route.folder === 'inbox' && ctx.inboxType !== 'default';
  const keyed = list.map((t) => ({ t, k: displayDate(t, route), s: sectioned ? sectionOf(t, ctx.inboxType) : 0 }));
  keyed.sort((a, b) => a.s - b.s || (ascending ? a.k - b.k : b.k - a.k));
  return keyed.map((x) => x.t);
}

export interface NamePart {
  text: string;
  bold?: boolean;
  draft?: boolean;
}

export function participants(t: Thread, route: Route, meEmail: string): { parts: NamePart[]; count: number } {
  const real = realMessages(t);
  const drafts = hasStatus(t, 'draft');
  const scheduled = hasStatus(t, 'scheduled');
  const toMode = route.view === 'folder' && (route.folder === 'sent' || route.folder === 'scheduled');

  if (!real.length) {
    if (scheduled && toMode) {
      const m = t.messages.find((x) => x.status === 'scheduled')!;
      return { parts: [{ text: `To: ${recipientNames(m, meEmail)}` }], count: 0 };
    }
    return { parts: [{ text: scheduled ? 'Scheduled' : 'Draft', draft: true }], count: 0 };
  }

  if (toMode) {
    const m = [...real].reverse().find((x) => x.status === 'sent') ?? real[real.length - 1];
    return { parts: [{ text: `To: ${recipientNames(m, meEmail)}` }], count: real.length > 1 ? real.length : 0 };
  }

  const seen = new Map<string, NamePart>();
  real.forEach((m, i) => {
    const key = m.from.email.toLowerCase();
    const isMe = sameEmail(m.from, meEmail);
    const bold = t.unread && (i === real.length - 1 || !isMe);
    const existing = seen.get(key);
    if (existing) {
      seen.delete(key);
      seen.set(key, { ...existing, bold: existing.bold || bold });
    } else {
      seen.set(key, { text: isMe ? 'me' : m.from.name || m.from.email, bold });
    }
  });
  let parts = [...seen.values()];
  if (parts.length > 1) parts = parts.map((x) => ({ ...x, text: x.text === 'me' ? 'me' : firstName(x.text) }));
  if (parts.length > 3) parts = [parts[0], { text: '..' }, ...parts.slice(-2)];
  if (drafts) parts.push({ text: 'Draft', draft: true });
  return { parts, count: real.length > 1 ? real.length : 0 };
}

function recipientNames(m: Message, meEmail: string): string {
  const all = [...m.to, ...m.cc];
  if (!all.length) return '(no recipients)';
  const names = all.map((p) => (sameEmail(p, meEmail) ? 'me' : firstName(p.name || p.email)));
  return names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '');
}

const snippetCache = new WeakMap<Thread, string>();

export function snippet(t: Thread): string {
  let s = snippetCache.get(t);
  if (s === undefined) {
    const real = realMessages(t);
    const m = real[real.length - 1] ?? t.messages[t.messages.length - 1];
    s = m ? htmlToText(stripQuote(m.body)).slice(0, 220) : '';
    snippetCache.set(t, s);
  }
  return s;
}

export function threadAttachments(t: Thread) {
  return t.messages.filter((m) => m.status !== 'draft').flatMap((m) => m.attachments);
}

export interface Counts {
  inbox: number;
  drafts: number;
  spam: number;
  scheduled: number;
  snoozed: number;
  labels: Record<string, number>;
  categories: Record<Category, { unread: number; senders: string[] }>;
}

export function computeCounts(threads: Record<string, Thread>, ctx: ListContext): Counts {
  const counts: Counts = {
    inbox: 0,
    drafts: 0,
    spam: 0,
    scheduled: 0,
    snoozed: 0,
    labels: {},
    categories: { primary: { unread: 0, senders: [] }, promotions: { unread: 0, senders: [] }, social: { unread: 0, senders: [] }, updates: { unread: 0, senders: [] } },
  };
  const sorted = Object.values(threads).sort((a, b) => latestDate(b) - latestDate(a));
  const cats = categoriesActive(ctx);
  for (const t of sorted) {
    const inbox = inFolder(t, 'inbox', ctx.now);
    if (inbox && t.unread) {
      const cat = cats ? effectiveCategory(t, ctx) : 'primary';
      if (cat === 'primary') counts.inbox++;
      const bucket = counts.categories[t.category];
      bucket.unread++;
      const real = realMessages(t);
      const sender = real[real.length - 1]?.from.name;
      if (sender && !bucket.senders.includes(sender) && bucket.senders.length < 3) bucket.senders.push(sender);
    }
    if (inFolder(t, 'drafts', ctx.now)) counts.drafts++;
    if (inFolder(t, 'spam', ctx.now) && t.unread) counts.spam++;
    if (inFolder(t, 'scheduled', ctx.now)) counts.scheduled++;
    if (inFolder(t, 'snoozed', ctx.now)) counts.snoozed++;
    if (t.unread && !t.trashed && !t.spam) for (const l of t.labelIds) counts.labels[l] = (counts.labels[l] ?? 0) + 1;
  }
  return counts;
}

export function routeTitle(route: Route, labels: Label[]): string {
  switch (route.view) {
    case 'folder':
      return FOLDER_NAMES[route.folder];
    case 'category':
      return CATEGORY_NAMES[route.category];
    case 'label':
      return labels.find((l) => l.id === route.labelId)?.name ?? 'Label';
    case 'search':
      return 'Search results';
    case 'settings':
      return 'Settings';
  }
}
