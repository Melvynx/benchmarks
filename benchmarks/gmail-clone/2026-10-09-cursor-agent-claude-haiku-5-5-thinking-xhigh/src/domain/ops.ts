import { uid } from '../lib/ids';
import { htmlToText } from '../lib/text';
import type {
  Address,
  Draft,
  Label,
  LabelColor,
  Location,
  MailData,
  Message,
  Outgoing,
  Settings,
  Thread,
} from './types';

/** Pure mailbox mutations. The store applies them; tests exercise them directly. */

type Ids = Iterable<string>;

export function mapThreads(d: MailData, ids: Ids, fn: (t: Thread) => Thread): MailData {
  const set = new Set(ids);
  if (set.size === 0) return d;
  return { ...d, threads: d.threads.map((t) => (set.has(t.id) ? fn(t) : t)) };
}

export function moveThreads(d: MailData, ids: Ids, location: Location): MailData {
  return mapThreads(d, ids, (t) => ({
    ...t,
    location,
    snoozedUntil: location === 'inbox' ? t.snoozedUntil : null,
  }));
}

export function setRead(d: MailData, ids: Ids, read: boolean): MailData {
  return mapThreads(d, ids, (t) => ({ ...t, messages: t.messages.map((m) => ({ ...m, unread: !read })) }));
}

export function setMessageUnread(d: MailData, threadId: string, messageId: string, unread: boolean): MailData {
  return mapThreads(d, [threadId], (t) => ({
    ...t,
    messages: t.messages.map((m) => (m.id === messageId ? { ...m, unread } : m)),
  }));
}

export function setStarred(d: MailData, ids: Ids, starred: boolean): MailData {
  return mapThreads(d, ids, (t) => ({ ...t, starred }));
}

export function setImportant(d: MailData, ids: Ids, important: boolean): MailData {
  return mapThreads(d, ids, (t) => ({ ...t, important }));
}

export function snoozeThreads(d: MailData, ids: Ids, until: number | null): MailData {
  return mapThreads(d, ids, (t) => ({ ...t, snoozedUntil: until }));
}

export function toggleLabel(d: MailData, ids: Ids, labelId: string, on: boolean): MailData {
  return mapThreads(d, ids, (t) => ({
    ...t,
    labelIds: on
      ? Array.from(new Set([...t.labelIds, labelId]))
      : t.labelIds.filter((id) => id !== labelId),
  }));
}

export function addLabel(d: MailData, name: string, color: LabelColor): { data: MailData; label: Label } {
  const label: Label = { id: uid('label'), name, color };
  return { data: { ...d, labels: [...d.labels, label] }, label };
}

export function deleteLabel(d: MailData, labelId: string): MailData {
  return {
    ...d,
    labels: d.labels.filter((l) => l.id !== labelId),
    threads: d.threads.map((t) => ({ ...t, labelIds: t.labelIds.filter((id) => id !== labelId) })),
  };
}

export function removeThreads(d: MailData, ids: Ids): MailData {
  const set = new Set(ids);
  return { ...d, threads: d.threads.filter((t) => !set.has(t.id)) };
}

/** Restores previously captured thread snapshots (used by undo). */
export function replaceThreads(d: MailData, snapshots: Thread[]): MailData {
  const byId = new Map(snapshots.map((t) => [t.id, t]));
  const threads = d.threads.map((t) => byId.get(t.id) ?? t);
  const missing = snapshots.filter((s) => !d.threads.some((t) => t.id === s.id));
  return { ...d, threads: [...threads, ...missing] };
}

export function saveDraft(d: MailData, draft: Draft): MailData {
  const exists = d.drafts.some((x) => x.id === draft.id);
  return {
    ...d,
    drafts: exists ? d.drafts.map((x) => (x.id === draft.id ? draft : x)) : [draft, ...d.drafts],
  };
}

export function removeDraft(d: MailData, draftId: string): MailData {
  return { ...d, drafts: d.drafts.filter((x) => x.id !== draftId) };
}

export function queueOutgoing(d: MailData, out: Outgoing): MailData {
  return {
    ...d,
    outgoing: [...d.outgoing, out],
    drafts: d.drafts.filter((x) => x.id !== out.draft.id),
  };
}

/** Cancels a pending send and gives the draft back to the Drafts folder. */
export function cancelOutgoing(d: MailData, outId: string, now: number): { data: MailData; draft: Draft | null } {
  const out = d.outgoing.find((o) => o.id === outId);
  if (!out) return { data: d, draft: null };
  const draft: Draft = { ...out.draft, updatedAt: now, pristine: false };
  return {
    draft,
    data: {
      ...d,
      outgoing: d.outgoing.filter((o) => o.id !== outId),
      drafts: [draft, ...d.drafts.filter((x) => x.id !== draft.id)],
    },
  };
}

export function rescheduleOutgoing(d: MailData, outId: string, sendAt: number): MailData {
  return { ...d, outgoing: d.outgoing.map((o) => (o.id === outId ? { ...o, sendAt } : o)) };
}

export function deliver(d: MailData, out: Outgoing, now: number): MailData {
  const { draft } = out;
  const message: Message = {
    id: uid('msg'),
    from: d.account,
    to: draft.to,
    cc: draft.cc,
    date: now,
    html: draft.html,
    text: htmlToText(draft.html),
    attachments: draft.attachments,
    unread: false,
  };

  const index = draft.threadId ? d.threads.findIndex((t) => t.id === draft.threadId) : -1;
  let threads: Thread[];
  if (index >= 0) {
    const existing = d.threads[index];
    const updated: Thread = {
      ...existing,
      messages: [...existing.messages, message],
      // Replying to an archived conversation brings it back, like Gmail.
      location: existing.location === 'archive' ? 'inbox' : existing.location,
    };
    threads = d.threads.map((t, i) => (i === index ? updated : t));
  } else {
    const thread: Thread = {
      id: uid('thr'),
      subject: draft.subject.trim() || '(no subject)',
      messages: [message],
      location: 'archive',
      category: 'primary',
      starred: false,
      important: false,
      labelIds: [],
      snoozedUntil: null,
    };
    threads = [thread, ...d.threads];
  }
  return { ...d, threads, outgoing: d.outgoing.filter((o) => o.id !== out.id) };
}

/** Brings back snoozed conversations whose time has passed. */
export function wakeSnoozed(d: MailData, now: number): MailData {
  return {
    ...d,
    threads: d.threads.map((t) => {
      if (t.snoozedUntil === null || t.snoozedUntil > now) return t;
      const messages = t.messages.map((m, i, all) =>
        i === all.length - 1 ? { ...m, unread: true } : m,
      );
      return { ...t, snoozedUntil: null, messages };
    }),
  };
}

export function receiveThread(d: MailData, thread: Thread): MailData {
  return { ...d, threads: [thread, ...d.threads] };
}

export function updateAccount(d: MailData, patch: Partial<Address>): MailData {
  return { ...d, account: { ...d.account, ...patch } };
}

export function updateSettings(d: MailData, patch: Partial<Settings>): MailData {
  return { ...d, settings: { ...d.settings, ...patch } };
}

export function addRecentSearch(d: MailData, query: string): MailData {
  const trimmed = query.trim();
  if (!trimmed) return d;
  return { ...d, recentSearches: [trimmed, ...d.recentSearches.filter((q) => q !== trimmed)].slice(0, 6) };
}

export function setNextIncoming(d: MailData, at: number): MailData {
  return { ...d, nextIncomingAt: at };
}
