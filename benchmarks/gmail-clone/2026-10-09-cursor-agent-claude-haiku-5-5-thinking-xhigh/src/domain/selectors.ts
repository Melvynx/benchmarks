import { searchThreads } from '../lib/search';
import type { Section } from '../lib/route';
import { draftHasContent } from './drafts';
import { isExcluded, isUnread, sentBy, sortRecent } from './threads';
import type { Address, Category, Folder, MailData, Thread } from './types';

export const PAGE_SIZE = 50;

export function folderThreads(d: MailData, folder: Folder): Thread[] {
  const me = d.account.email;
  switch (folder) {
    case 'inbox':
      return sortRecent(d.threads.filter((t) => t.location === 'inbox' && t.snoozedUntil === null));
    case 'starred':
      return sortRecent(d.threads.filter((t) => t.starred && !isExcluded(t)));
    case 'snoozed':
      return sortRecent(d.threads.filter((t) => t.snoozedUntil !== null && !isExcluded(t)));
    case 'sent':
      return sortRecent(d.threads.filter((t) => sentBy(t, me) && !isExcluded(t)));
    case 'all':
      return sortRecent(d.threads.filter((t) => !isExcluded(t)));
    case 'spam':
      return sortRecent(d.threads.filter((t) => t.location === 'spam'));
    case 'trash':
      return sortRecent(d.threads.filter((t) => t.location === 'trash'));
    default:
      return [];
  }
}

export function labelThreads(d: MailData, labelId: string): Thread[] {
  return sortRecent(d.threads.filter((t) => t.labelIds.includes(labelId) && !isExcluded(t)));
}

export function listThreads(
  d: MailData,
  section: Section,
  category: Category,
  now: number,
): Thread[] {
  if (section.kind === 'label') return labelThreads(d, section.labelId);
  if (section.kind === 'search') {
    return searchThreads(d.threads, section.q, { account: d.account.email, labels: d.labels, now });
  }
  if (section.folder === 'drafts' || section.folder === 'scheduled') return [];
  const list = folderThreads(d, section.folder);
  if (section.folder === 'inbox' && d.settings.categories) {
    return list.filter((t) => t.category === category);
  }
  return list;
}

export function categoryUnread(d: MailData): Record<Category, number> {
  const counts: Record<Category, number> = { primary: 0, social: 0, promotions: 0, updates: 0 };
  for (const t of folderThreads(d, 'inbox')) {
    if (isUnread(t)) counts[t.category] += 1;
  }
  return counts;
}

export function visibleDrafts(d: MailData): MailData['drafts'] {
  return [...d.drafts].filter(draftHasContent).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function scheduledItems(d: MailData): MailData['outgoing'] {
  return d.outgoing.filter((o) => o.kind !== 'undo').sort((a, b) => a.sendAt - b.sendAt);
}

export function sidebarCounts(d: MailData) {
  return {
    inboxUnread: folderThreads(d, 'inbox').filter(isUnread).length,
    drafts: visibleDrafts(d).length,
    scheduled: scheduledItems(d).length,
    spamUnread: d.threads.filter((t) => t.location === 'spam' && isUnread(t)).length,
  };
}

export function draftThreadIds(d: MailData): Set<string> {
  const ids = new Set<string>();
  for (const draft of d.drafts) if (draft.threadId && draftHasContent(draft)) ids.add(draft.threadId);
  return ids;
}

export function storageBytes(d: MailData): number {
  let total = 0;
  for (const t of d.threads) {
    for (const m of t.messages) {
      total += m.text.length;
      for (const a of m.attachments) total += a.size;
    }
  }
  return total;
}

export interface Contact {
  name: string;
  email: string;
  count: number;
}

export function contactsOf(account: Address, threads: Thread[]): Contact[] {
  const map = new Map<string, Contact>();
  const add = (a: Address) => {
    if (!a.email || a.email.toLowerCase() === account.email.toLowerCase()) return;
    const key = a.email.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (!existing.name && a.name) existing.name = a.name;
    } else {
      map.set(key, { name: a.name, email: a.email, count: 1 });
    }
  };
  for (const t of threads) {
    for (const m of t.messages) {
      add(m.from);
      m.to.forEach(add);
      m.cc.forEach(add);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
