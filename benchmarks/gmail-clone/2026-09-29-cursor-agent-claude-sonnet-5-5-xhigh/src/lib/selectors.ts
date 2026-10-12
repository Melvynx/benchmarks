import type { Category, Draft, MailData, Message, Person, Route, Settings, Thread } from './types';
import { ME, isMe } from './people';
import { firstName } from './text';
import { matchThread, parseQuery, type SearchContext } from './search';

export function threadMessages(data: MailData, thread: Thread, includeTrashed = false): Message[] {
  const out: Message[] = [];
  for (const id of thread.messageIds) {
    const m = data.messages[id];
    if (m && (includeTrashed || !m.trashed || thread.trashed)) out.push(m);
  }
  return out.sort((a, b) => a.date - b.date);
}

export function isSnoozed(t: Thread, now: number): boolean {
  return !!t.snoozeUntil && t.snoozeUntil > now;
}

export function effectiveCategory(t: Thread, settings: Settings): Category {
  return settings.categories[t.category] ? t.category : 'primary';
}

export interface ThreadInfo {
  thread: Thread;
  msgs: Message[];
  unread: boolean;
  starred: boolean;
  attachments: number;
  date: number;
  drafts: number;
}

export function threadInfo(data: MailData, thread: Thread, view?: string): ThreadInfo {
  const msgs = threadMessages(data, thread);
  const unread = msgs.some((m) => m.unread);
  const starred = msgs.some((m) => m.starred);
  const attachments = msgs.reduce((n, m) => n + m.attachments.length, 0);
  let date = thread.lastDate;
  if (view === 'sent') {
    const sent = msgs.filter((m) => isMe(m.from));
    if (sent.length) date = sent[sent.length - 1].date;
  }
  const drafts = Object.values(data.drafts).filter((d) => d.threadId === thread.id && !d.sendAt).length;
  return { thread, msgs, unread, starred, attachments, date, drafts };
}

export type ListItem =
  | { kind: 'thread'; id: string; info: ThreadInfo; match?: Message }
  | { kind: 'draft'; id: string; draft: Draft; date: number };

export function participantsLabel(info: ThreadInfo, view: string): { text: string; parts: { name: string; unread: boolean }[] } {
  const { msgs } = info;
  if (view === 'sent') {
    const last = [...msgs].reverse().find((m) => isMe(m.from));
    const to = last ? [...last.to, ...last.cc] : [];
    const names = to.map((p) => (isMe(p) ? 'me' : firstName(p.name || p.email)));
    const uniq = [...new Set(names)];
    const text = uniq.length ? `To: ${uniq.join(', ')}` : 'To: (no recipients)';
    return { text, parts: [{ name: text, unread: false }] };
  }
  const seen: { key: string; person: Person; unread: boolean }[] = [];
  for (const m of msgs) {
    const key = m.from.email.toLowerCase();
    const idx = seen.findIndex((s) => s.key === key);
    if (idx >= 0) {
      seen[idx].unread = seen[idx].unread || m.unread;
      const [item] = seen.splice(idx, 1);
      seen.push(item);
    } else seen.push({ key, person: m.from, unread: m.unread });
  }
  if (!seen.length) return { text: 'me', parts: [{ name: 'me', unread: false }] };
  const single = seen.length === 1;
  const parts = seen.slice(-3).map((s) => ({
    name: isMe(s.person) ? 'me' : single ? s.person.name || s.person.email : firstName(s.person.name || s.person.email),
    unread: s.unread,
  }));
  if (seen.length > 3) parts.unshift({ name: '…', unread: false });
  return { text: parts.map((p) => p.name).join(', '), parts };
}

export function threadsInView(
  data: MailData,
  route: Route,
  settings: Settings,
  now: number,
): ListItem[] {
  const view = route.view;
  const all = Object.values(data.threads);
  const items: ListItem[] = [];
  const add = (t: Thread) => items.push({ kind: 'thread', id: t.id, info: threadInfo(data, t, view) });

  switch (view) {
    case 'inbox':
      for (const t of all) {
        if (!t.inbox || t.trashed || t.spam || isSnoozed(t, now)) continue;
        if (settings.tabsEnabled && effectiveCategory(t, settings) !== route.tab) continue;
        add(t);
      }
      break;
    case 'starred':
      for (const t of all) {
        if (t.trashed || t.spam) continue;
        const info = threadInfo(data, t);
        if (info.starred) items.push({ kind: 'thread', id: t.id, info });
      }
      break;
    case 'snoozed':
      for (const t of all) if (!t.trashed && isSnoozed(t, now)) add(t);
      break;
    case 'important':
      for (const t of all) if (t.important && !t.trashed && !t.spam) add(t);
      break;
    case 'sent':
      for (const t of all) {
        if (t.trashed || t.spam) continue;
        const info = threadInfo(data, t, 'sent');
        if (info.msgs.some((m) => isMe(m.from))) items.push({ kind: 'thread', id: t.id, info });
      }
      break;
    case 'all':
      for (const t of all) if (!t.trashed && !t.spam) add(t);
      break;
    case 'spam':
      for (const t of all) if (t.spam && !t.trashed) add(t);
      break;
    case 'trash':
      for (const t of all) if (t.trashed) add(t);
      break;
    case 'label':
      for (const t of all) if (t.labelIds.includes(route.param ?? '') && !t.trashed && !t.spam) add(t);
      break;
    case 'drafts':
      for (const d of Object.values(data.drafts)) {
        if (d.sendAt) continue;
        items.push({ kind: 'draft', id: d.id, draft: d, date: d.updatedAt });
      }
      return items.sort((a, b) => (b.kind === 'draft' && a.kind === 'draft' ? b.date - a.date : 0));
    case 'scheduled':
      for (const d of Object.values(data.drafts)) {
        if (!d.sendAt) continue;
        items.push({ kind: 'draft', id: d.id, draft: d, date: d.sendAt });
      }
      return items.sort((a, b) => (a.kind === 'draft' && b.kind === 'draft' ? a.date - b.date : 0));
    case 'search': {
      const q = parseQuery(route.param ?? '');
      const ctx: SearchContext = { me: ME.email, labels: data.labels, now };
      if (!q.nodes.length) return [];
      for (const t of all) {
        const msgs = threadMessages(data, t, true);
        const hit = matchThread(q, t, msgs, ctx);
        if (hit) items.push({ kind: 'thread', id: t.id, info: threadInfo(data, t), match: hit });
      }
      break;
    }
    default:
      break;
  }
  return items.sort((a, b) => (b.kind === 'thread' && a.kind === 'thread' ? b.info.date - a.info.date : 0));
}

export function unreadCountForInbox(data: MailData, now: number, settings?: Settings, category?: Category): number {
  let n = 0;
  for (const t of Object.values(data.threads)) {
    if (!t.inbox || t.trashed || t.spam || isSnoozed(t, now)) continue;
    if (category && settings && effectiveCategory(t, settings) !== category) continue;
    if (threadMessages(data, t).some((m) => m.unread)) n++;
  }
  return n;
}

export function unreadCountForLabel(data: MailData, labelId: string): number {
  let n = 0;
  for (const t of Object.values(data.threads)) {
    if (t.trashed || t.spam || !t.labelIds.includes(labelId)) continue;
    if (threadMessages(data, t).some((m) => m.unread)) n++;
  }
  return n;
}

export function unreadCountSpam(data: MailData): number {
  let n = 0;
  for (const t of Object.values(data.threads)) {
    if (!t.spam || t.trashed) continue;
    if (threadMessages(data, t).some((m) => m.unread)) n++;
  }
  return n;
}

export function draftCount(data: MailData): number {
  return Object.values(data.drafts).filter((d) => !d.sendAt).length;
}

export function scheduledCount(data: MailData): number {
  return Object.values(data.drafts).filter((d) => d.sendAt).length;
}

export function snoozedCount(data: MailData, now: number): number {
  return Object.values(data.threads).filter((t) => !t.trashed && isSnoozed(t, now)).length;
}

export function storageUsed(data: MailData): number {
  let bytes = 0;
  for (const m of Object.values(data.messages)) {
    bytes += m.html.length;
    for (const a of m.attachments) bytes += a.size;
  }
  return bytes;
}
