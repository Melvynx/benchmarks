import type { Address, CategoryId, Contact, MailState, Message, Settings, SystemFolder, Thread } from './types';
import { CONTACT_COLORS, ME } from '../data/contacts';

export const CATEGORIES: { id: CategoryId; label: string; icon: string; color: string }[] = [
  { id: 'primary', label: 'Primary', icon: 'inbox', color: 'var(--blue)' },
  { id: 'promotions', label: 'Promotions', icon: 'sell', color: '#188038' },
  { id: 'social', label: 'Social', icon: 'group', color: '#1a73e8' },
  { id: 'updates', label: 'Updates', icon: 'info', color: '#e8710a' },
];

export const FOLDER_META: Record<SystemFolder, { label: string; icon: string; path: string }> = {
  inbox: { label: 'Inbox', icon: 'inbox', path: 'inbox' },
  starred: { label: 'Starred', icon: 'star', path: 'starred' },
  snoozed: { label: 'Snoozed', icon: 'schedule', path: 'snoozed' },
  important: { label: 'Important', icon: 'label_important', path: 'important' },
  sent: { label: 'Sent', icon: 'send', path: 'sent' },
  drafts: { label: 'Drafts', icon: 'draft', path: 'drafts' },
  scheduled: { label: 'Scheduled', icon: 'schedule_send', path: 'scheduled' },
  all: { label: 'All Mail', icon: 'mail', path: 'all' },
  spam: { label: 'Spam', icon: 'report', path: 'spam' },
  trash: { label: 'Trash', icon: 'delete', path: 'trash' },
};

export const isMeAddr = (a: Address) => a.email.toLowerCase() === ME.email;
export const isPendingSend = (m: Message) => !!m.scheduledAt;
export const isDelivered = (m: Message) => !m.draft && !m.scheduledAt;

export function deliveredMessages(t: Thread): Message[] {
  return t.messages.filter(isDelivered);
}

export function threadDate(t: Thread): number {
  const d = deliveredMessages(t);
  const list = d.length ? d : t.messages;
  let max = 0;
  for (const m of list) if (m.date > max) max = m.date;
  return max;
}

export function isSnoozed(t: Thread, now: number): boolean {
  return !!t.snoozedUntil && t.snoozedUntil > now;
}

export function isUnread(t: Thread): boolean {
  return t.messages.some((m) => m.unread && isDelivered(m));
}

export function hasAttachments(t: Thread): boolean {
  return t.messages.some((m) => m.attachments.length > 0 && !m.draft);
}

export function attachmentsOf(t: Thread) {
  return t.messages.filter((m) => !m.draft).flatMap((m) => m.attachments);
}

export function drafts(t: Thread): Message[] {
  return t.messages.filter((m) => m.draft);
}

export function scheduled(t: Thread): Message[] {
  return t.messages.filter(isPendingSend);
}

export function effectiveCategory(t: Thread, settings: Settings): CategoryId {
  return settings.categoriesEnabled[t.category] ? t.category : 'primary';
}

export function inFolder(t: Thread, folder: SystemFolder, now: number): boolean {
  switch (folder) {
    case 'inbox':
      return t.inbox && !t.trashed && !t.spam && !isSnoozed(t, now) && deliveredMessages(t).length > 0;
    case 'starred':
      return t.starred && !t.trashed && !t.spam;
    case 'snoozed':
      return isSnoozed(t, now) && !t.trashed && !t.spam;
    case 'important':
      return t.important && !t.trashed && !t.spam;
    case 'sent':
      return !t.trashed && !t.spam && t.messages.some((m) => isDelivered(m) && isMeAddr(m.from));
    case 'drafts':
      return !t.trashed && t.messages.some((m) => m.draft);
    case 'scheduled':
      return !t.trashed && t.messages.some(isPendingSend);
    case 'all':
      return !t.trashed && !t.spam;
    case 'spam':
      return t.spam && !t.trashed;
    case 'trash':
      return t.trashed;
  }
}

export interface Row {
  key: string;
  thread: Thread;
  /** Draft message this row represents (Drafts view) or scheduled message (Scheduled view). */
  message?: Message;
}

export type ViewSpec =
  | { kind: 'folder'; folder: SystemFolder; tab?: CategoryId }
  | { kind: 'label'; labelId: string }
  | { kind: 'search'; query: string };

export function rowDate(r: Row): number {
  return r.message ? r.message.date : threadDate(r.thread);
}

export function listRowsForFolder(
  state: MailState,
  folder: SystemFolder,
  now: number,
  tab?: CategoryId,
): Row[] {
  const rows: Row[] = [];
  const all = Object.values(state.threads);
  if (folder === 'drafts' || folder === 'scheduled') {
    for (const t of all) {
      if (!inFolder(t, folder, now)) continue;
      for (const m of t.messages) {
        if (folder === 'drafts' ? m.draft : isPendingSend(m)) rows.push({ key: `d:${m.id}`, thread: t, message: m });
      }
    }
  } else {
    for (const t of all) {
      if (!inFolder(t, folder, now)) continue;
      if (folder === 'inbox' && tab && effectiveCategory(t, state.settings) !== tab) continue;
      rows.push({ key: t.id, thread: t });
    }
  }
  rows.sort((a, b) => (folder === 'scheduled' ? rowDate(a) - rowDate(b) : rowDate(b) - rowDate(a)));
  if (folder === 'scheduled') rows.sort((a, b) => (a.message!.scheduledAt ?? 0) - (b.message!.scheduledAt ?? 0));
  return rows;
}

export function listRowsForLabel(state: MailState, labelId: string): Row[] {
  return Object.values(state.threads)
    .filter((t) => t.labelIds.includes(labelId) && !t.trashed && !t.spam)
    .sort((a, b) => threadDate(b) - threadDate(a))
    .map((t) => ({ key: t.id, thread: t }));
}

export interface Counts {
  inbox: number;
  drafts: number;
  spam: number;
  scheduled: number;
  snoozed: number;
  byCategory: Record<CategoryId, number>;
  byLabel: Record<string, number>;
}

export function computeCounts(state: MailState, now: number): Counts {
  const c: Counts = {
    inbox: 0,
    drafts: 0,
    spam: 0,
    scheduled: 0,
    snoozed: 0,
    byCategory: { primary: 0, promotions: 0, social: 0, updates: 0 },
    byLabel: {},
  };
  for (const t of Object.values(state.threads)) {
    if (!t.trashed && !t.spam) {
      c.drafts += t.messages.filter((m) => m.draft).length;
      c.scheduled += t.messages.filter(isPendingSend).length;
    }
    if (t.spam && !t.trashed && isUnread(t)) c.spam++;
    if (inFolder(t, 'snoozed', now)) c.snoozed++;
    const unread = isUnread(t);
    if (unread && inFolder(t, 'inbox', now)) {
      c.inbox++;
      c.byCategory[effectiveCategory(t, state.settings)]++;
    }
    if (unread && !t.trashed && !t.spam) {
      for (const l of t.labelIds) c.byLabel[l] = (c.byLabel[l] ?? 0) + 1;
    }
  }
  return c;
}

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

export function messageSnippet(m: Message, max = 160): string {
  return collapse(m.text).slice(0, max);
}

export function threadSnippet(t: Thread, max = 160): string {
  const d = deliveredMessages(t);
  const m = d[d.length - 1] ?? t.messages[t.messages.length - 1];
  return m ? messageSnippet(m, max) : '';
}

export function firstName(a: Address): string {
  const n = a.name.trim();
  if (!n) return a.email.split('@')[0];
  return n.split(/\s+/)[0];
}

export function displayName(a: Address): string {
  return isMeAddr(a) ? 'me' : a.name || a.email;
}

export interface SenderPart {
  name: string;
  unread: boolean;
}

/** Sender summary for the conversation list ("Priya, me, Marcus"). */
export function senderSummary(t: Thread, mode: 'received' | 'sent'): SenderPart[] {
  if (mode === 'sent') {
    const sent = deliveredMessages(t).filter((m) => isMeAddr(m.from));
    const last = sent[sent.length - 1] ?? t.messages[t.messages.length - 1];
    const to = [...(last?.to ?? []), ...(last?.cc ?? [])];
    const parts = to.map((a) => ({ name: to.length > 1 ? firstName(a) : displayName(a), unread: false }));
    return [{ name: 'To: ', unread: false }, ...(parts.length ? joinParts(parts) : [{ name: '(no recipient)', unread: false }])];
  }
  const seen = new Map<string, SenderPart>();
  for (const m of deliveredMessages(t)) {
    const key = m.from.email.toLowerCase();
    const prev = seen.get(key);
    if (prev) prev.unread = prev.unread || m.unread;
    else seen.set(key, { name: '', unread: m.unread });
  }
  const order: Address[] = [];
  for (const m of deliveredMessages(t)) if (!order.some((a) => a.email === m.from.email)) order.push(m.from);
  const multi = order.length > 1;
  let parts: SenderPart[] = order.map((a) => ({
    name: isMeAddr(a) ? 'me' : multi ? firstName(a) : a.name || a.email,
    unread: seen.get(a.email.toLowerCase())?.unread ?? false,
  }));
  if (parts.length > 3) {
    parts = [parts[0], { name: '…', unread: false }, parts[parts.length - 2], parts[parts.length - 1]];
  }
  return joinParts(parts);
}

function joinParts(parts: SenderPart[]): SenderPart[] {
  const out: SenderPart[] = [];
  parts.forEach((p, i) => {
    out.push(p);
    const next = parts[i + 1];
    if (next && p.name !== '…' && next.name !== '…') out.push({ name: ', ', unread: false });
    else if (next && (p.name === '…' || next.name === '…')) out.push({ name: ' ', unread: false });
  });
  return out;
}

export function avatarColor(name: string, explicit?: string): string {
  if (explicit) return explicit;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CONTACT_COLORS[h % CONTACT_COLORS.length];
}

export function initialOf(name: string): string {
  const n = name.trim();
  if (!n) return '?';
  const cp = Array.from(n.replace(/^[^\p{L}\p{N}]+/u, ''))[0] ?? n[0];
  return cp.toUpperCase();
}

export function contactFor(state: Pick<MailState, 'contacts'>, email: string): Contact | undefined {
  const e = email.toLowerCase();
  return state.contacts.find((c) => c.email.toLowerCase() === e);
}

export function subjectOf(t: Thread): string {
  return t.subject.trim() || '(no subject)';
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/.test(s.trim());
}

/** Parse "Name <mail@x.y>", "mail@x.y" strings. Returns null when invalid. */
export function parseAddress(raw: string): Address | null {
  const s = raw.trim();
  if (!s) return null;
  const m = /^(?:"?([^"<]*?)"?\s*)?<([^>]+)>$/.exec(s);
  if (m && isValidEmail(m[2])) return { name: (m[1] ?? '').trim(), email: m[2].trim().toLowerCase() };
  if (isValidEmail(s)) return { name: '', email: s.toLowerCase() };
  return null;
}

export function formatAddress(a: Address): string {
  return a.name ? `${a.name} <${a.email}>` : a.email;
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
