import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ComposeMode, Contact, DraftFields, IncomingItem, Label, LabelColor, Message, PendingReply, Person, Thread } from '../types';
import { ME, buildSeed, cannedReply } from '../data/seed';
import { buildQuote } from '../lib/compose';
import { realMessages } from '../lib/mailbox';
import { hash, sameEmail, uid } from '../lib/utils';

export const MY_EMAIL = ME.email;
const DRIP_MS = 150_000;

export interface Snapshot {
  threads: Record<string, Thread | null>;
  pendingReplies: PendingReply[];
}

export interface DraftInput {
  threadId: string;
  messageId: string;
  from: Person;
  fields: DraftFields;
  mode: ComposeMode;
}

interface MailData {
  threads: Record<string, Thread>;
  labels: Label[];
  contacts: Contact[];
  pendingReplies: PendingReply[];
  incoming: IncomingItem[];
  lastDrip: number;
  unsubscribed: string[];
}

interface MailStore extends MailData {
  patch: (ids: string[], fn: (t: Thread) => Thread) => void;
  snapshot: (ids: string[]) => Snapshot;
  restore: (s: Snapshot) => void;
  remove: (ids: string[]) => void;
  createLabel: (name: string, color: LabelColor) => Label;
  updateLabel: (id: string, patch: Partial<Label>) => void;
  deleteLabel: (id: string) => void;
  saveDraft: (d: DraftInput) => void;
  discardDraft: (threadId: string, messageId: string) => void;
  send: (threadId: string, messageId: string, opts: { scheduledAt?: number; simulate: boolean }) => void;
  unschedule: (threadId: string, messageId: string) => void;
  deleteMessage: (threadId: string, messageId: string) => void;
  tick: (now: number, simulate: boolean) => Thread[];
  deliverNext: (now: number) => Thread | null;
  unsubscribe: (email: string) => void;
  reset: () => void;
}

function seedData(): MailData {
  const seed = buildSeed(Date.now());
  const threads: Record<string, Thread> = {};
  for (const t of seed.threads) threads[t.id] = t;
  return {
    threads,
    labels: seed.labels,
    contacts: seed.contacts,
    pendingReplies: [],
    incoming: seed.incoming,
    lastDrip: Date.now(),
    unsubscribed: [],
  };
}

function mergeContacts(list: Contact[], people: Person[]): Contact[] {
  const out = [...list];
  for (const p of people) {
    if (!p.email || sameEmail(p, MY_EMAIL)) continue;
    const i = out.findIndex((c) => sameEmail(c, p));
    if (i === -1) out.push({ name: p.name, email: p.email, kind: 'person' });
    else if (!out[i].name && p.name) out[i] = { ...out[i], name: p.name };
  }
  return out;
}

function landIncoming(s: MailData, item: IncomingItem, now: number): { threads: Record<string, Thread>; thread: Thread } {
  const target = item.mergeInto ? s.threads[item.mergeInto] : undefined;
  if (target && !target.trashed) {
    const real = realMessages(target);
    const prev = real[real.length - 1];
    const added: Message[] = item.thread.messages.map((m, i) => ({
      ...m,
      id: `${target.id}-in${now}${i}`,
      threadId: target.id,
      date: now,
      quote: prev ? buildQuote(prev) : undefined,
    }));
    const thread: Thread = { ...target, messages: [...target.messages, ...added], inInbox: target.muted ? target.inInbox : true, unread: true, arrivedAt: now, snoozedUntil: null };
    return { threads: { ...s.threads, [thread.id]: thread }, thread };
  }
  const id = `${item.thread.id}-${now.toString(36)}`;
  const thread: Thread = {
    ...item.thread,
    id,
    messages: item.thread.messages.map((m, i) => ({ ...m, id: `${id}-${i}`, threadId: id, date: now })),
    arrivedAt: now,
  };
  return { threads: { ...s.threads, [id]: thread }, thread };
}

export const useMail = create<MailStore>()(
  persist(
    (set, get) => ({
      ...seedData(),

      patch: (ids, fn) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const id of ids) if (threads[id]) threads[id] = fn(threads[id]);
          return { threads };
        }),

      snapshot: (ids) => {
        const s = get();
        const threads: Record<string, Thread | null> = {};
        for (const id of ids) threads[id] = s.threads[id] ?? null;
        return { threads, pendingReplies: s.pendingReplies };
      },

      restore: (snap) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const [id, t] of Object.entries(snap.threads)) {
            if (t) threads[id] = t;
            else delete threads[id];
          }
          return { threads, pendingReplies: snap.pendingReplies };
        }),

      remove: (ids) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const id of ids) delete threads[id];
          return { threads, pendingReplies: s.pendingReplies.filter((p) => !ids.includes(p.threadId)) };
        }),

      createLabel: (name, color) => {
        const existing = get().labels.find((l) => l.name.toLowerCase() === name.trim().toLowerCase());
        if (existing) return existing;
        const label: Label = { id: uid('lbl'), name: name.trim(), color };
        set((s) => ({ labels: [...s.labels, label] }));
        return label;
      },

      updateLabel: (id, patch) => set((s) => ({ labels: s.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

      deleteLabel: (id) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const t of Object.values(threads)) {
            if (t.labelIds.includes(id)) threads[t.id] = { ...t, labelIds: t.labelIds.filter((l) => l !== id) };
          }
          return { labels: s.labels.filter((l) => l.id !== id), threads };
        }),

      saveDraft: ({ threadId, messageId, from, fields, mode }) =>
        set((s) => {
          const now = Date.now();
          const msg: Message = {
            id: messageId,
            threadId,
            from,
            to: fields.to,
            cc: fields.cc,
            bcc: fields.bcc,
            date: now,
            body: fields.body,
            quote: fields.quote,
            attachments: fields.attachments,
            status: 'draft',
            replyMode: mode,
          };
          const existing = s.threads[threadId];
          if (existing) {
            const idx = existing.messages.findIndex((m) => m.id === messageId);
            const messages = idx >= 0 ? existing.messages.map((m, i) => (i === idx ? msg : m)) : [...existing.messages, msg];
            const onlyDrafts = messages.every((m) => m.status === 'draft');
            return { threads: { ...s.threads, [threadId]: { ...existing, messages, subject: onlyDrafts ? fields.subject : existing.subject, trashed: false } } };
          }
          const thread: Thread = {
            id: threadId,
            subject: fields.subject,
            messages: [msg],
            labelIds: [],
            category: 'primary',
            inInbox: false,
            starred: false,
            important: false,
            unread: false,
            trashed: false,
            spam: false,
          };
          return { threads: { ...s.threads, [threadId]: thread } };
        }),

      discardDraft: (threadId, messageId) =>
        set((s) => {
          const t = s.threads[threadId];
          if (!t) return {};
          const messages = t.messages.filter((m) => m.id !== messageId);
          const threads = { ...s.threads };
          if (!messages.length) delete threads[threadId];
          else threads[threadId] = { ...t, messages };
          return { threads };
        }),

      send: (threadId, messageId, { scheduledAt, simulate }) =>
        set((s) => {
          const t = s.threads[threadId];
          if (!t) return {};
          const now = Date.now();
          let sent: Message | undefined;
          const messages = t.messages.map((m) => {
            if (m.id !== messageId) return m;
            sent = { ...m, status: scheduledAt ? 'scheduled' : 'sent', date: now, scheduledAt };
            return sent;
          });
          if (!sent) return {};
          const toSelf = [...sent.to, ...sent.cc, ...sent.bcc].some((p) => sameEmail(p, MY_EMAIL));
          const thread: Thread = { ...t, messages, unread: toSelf && !scheduledAt, inInbox: t.inInbox || (toSelf && !scheduledAt), trashed: false };
          const pendingReplies = [...s.pendingReplies];
          if (!scheduledAt && simulate) {
            const first = sent.to.find((p) => !sameEmail(p, MY_EMAIL));
            const contact = first && s.contacts.find((c) => sameEmail(c, first) && c.kind === 'person');
            if (contact) {
              pendingReplies.push({ threadId, sourceMessageId: sent.id, at: now + 14_000 + (hash(sent.id) % 12_000), from: { name: contact.name, email: contact.email } });
            }
          }
          return {
            threads: { ...s.threads, [threadId]: thread },
            pendingReplies,
            contacts: mergeContacts(s.contacts, [...sent.to, ...sent.cc, ...sent.bcc]),
          };
        }),

      unschedule: (threadId, messageId) =>
        get().patch([threadId], (t) => ({
          ...t,
          messages: t.messages.map((m) => (m.id === messageId ? { ...m, status: 'draft', scheduledAt: undefined, date: Date.now() } : m)),
        })),

      deleteMessage: (threadId, messageId) =>
        set((s) => {
          const t = s.threads[threadId];
          if (!t) return {};
          const messages = t.messages.filter((m) => m.id !== messageId);
          const threads = { ...s.threads };
          if (!messages.length) delete threads[threadId];
          else threads[threadId] = { ...t, messages };
          return { threads };
        }),

      tick: (now, simulate) => {
        const s = get();
        const arrivals: Thread[] = [];
        let threads: Record<string, Thread> | null = null;
        const write = (t: Thread) => {
          if (!threads) threads = { ...s.threads };
          threads[t.id] = t;
        };
        for (const t of Object.values(s.threads)) {
          let next = t;
          if (t.snoozedUntil && t.snoozedUntil <= now) {
            next = { ...next, snoozedUntil: null, inInbox: true, unread: true, returnedAt: t.snoozedUntil, arrivedAt: now };
            arrivals.push(next);
          }
          if (t.messages.some((m) => m.status === 'scheduled' && (m.scheduledAt ?? 0) <= now)) {
            next = {
              ...next,
              messages: next.messages.map((m) => (m.status === 'scheduled' && (m.scheduledAt ?? 0) <= now ? { ...m, status: 'sent', date: m.scheduledAt ?? now } : m)),
            };
          }
          if (next !== t) write(next);
        }
        const due = s.pendingReplies.filter((p) => p.at <= now);
        const pendingReplies = s.pendingReplies.filter((p) => p.at > now);
        for (const p of due) {
          const base = (threads ?? s.threads)[p.threadId];
          if (!base) continue;
          const source = base.messages.find((m) => m.id === p.sourceMessageId);
          if (!source || source.status !== 'sent') continue;
          const reply: Message = {
            id: `${base.id}-r${now.toString(36)}`,
            threadId: base.id,
            from: p.from,
            to: [ME],
            cc: [],
            bcc: [],
            date: now,
            body: cannedReply(p.from.email, hash(source.id)),
            quote: buildQuote(source),
            attachments: [],
            status: 'received',
          };
          const updated: Thread = { ...base, messages: [...base.messages, reply], inInbox: base.muted ? base.inInbox : true, unread: true, arrivedAt: now };
          write(updated);
          arrivals.push(updated);
        }
        let incoming = s.incoming;
        let lastDrip = s.lastDrip;
        if (simulate && incoming.length && now - lastDrip >= DRIP_MS) {
          const landed = landIncoming({ ...s, threads: threads ?? s.threads }, incoming[0], now);
          threads = landed.threads;
          arrivals.push(landed.thread);
          incoming = incoming.slice(1);
          lastDrip = now;
        }
        if (threads || due.length || incoming !== s.incoming) {
          set({ threads: threads ?? s.threads, pendingReplies, incoming, lastDrip });
        }
        return arrivals;
      },

      deliverNext: (now) => {
        const s = get();
        if (!s.incoming.length) return null;
        const landed = landIncoming(s, s.incoming[0], now);
        set({ threads: landed.threads, incoming: s.incoming.slice(1), lastDrip: now });
        return landed.thread;
      },

      unsubscribe: (email) =>
        set((s) => ({
          unsubscribed: [...new Set([...s.unsubscribed, email.toLowerCase()])],
          incoming: s.incoming.filter((it) => !it.thread.messages.some((m) => sameEmail(m.from, email))),
        })),

      reset: () => set(seedData()),
    }),
    {
      name: 'opus-mail-data',
      version: 1,
      partialize: (s) => ({
        threads: s.threads,
        labels: s.labels,
        contacts: s.contacts,
        pendingReplies: s.pendingReplies,
        incoming: s.incoming,
        lastDrip: s.lastDrip,
        unsubscribed: s.unsubscribed,
      }),
    },
  ),
);
