import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { contactKind, ME, PEOPLE } from "./contacts";
import { escapeHtml, firstName } from "./format";
import { AUTO_REPLIES, buildSeed, SEED_LABELS } from "./seed";
import { md } from "./templates";
import type {
  Attachment,
  Category,
  Contact,
  Label,
  LabelColor,
  Message,
  PendingDelivery,
  Settings,
  Thread,
} from "./types";
import { uid } from "./utils";

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  density: "default",
  readingPane: "none",
  inboxType: "default",
  undoSeconds: 5,
  signature: "Avery Chen\nProduct Lead · Lumen Labs",
  shortcuts: true,
  pageSize: 50,
  sidebarCollapsed: false,
  paneSize: 42,
};

export interface DraftInput {
  messageId?: string;
  threadId?: string;
  to: Contact[];
  cc: Contact[];
  bcc: Contact[];
  subject: string;
  html: string;
  quote?: string;
  attachments: Attachment[];
}

export interface Delivered {
  threadId: string;
  subject: string;
  from: Contact;
}

interface MailData {
  version: number;
  seededAt: number;
  threads: Record<string, Thread>;
  messages: Record<string, Message>;
  labels: Label[];
  extraContacts: Contact[];
  incoming: PendingDelivery[];
  unsubscribed: string[];
  settings: Settings;
}

interface MailActions {
  setRead: (ids: string[], read: boolean) => void;
  setStarred: (ids: string[], starred: boolean) => void;
  setImportant: (ids: string[], important: boolean) => void;
  archive: (ids: string[]) => void;
  moveToInbox: (ids: string[]) => void;
  trash: (ids: string[]) => void;
  deleteForever: (ids: string[]) => void;
  setSpam: (ids: string[], spam: boolean) => void;
  setLabel: (ids: string[], labelId: string, on: boolean) => void;
  moveToLabel: (ids: string[], labelId: string, fromLabel?: string) => void;
  snooze: (ids: string[], until: number) => void;
  unsnooze: (ids: string[]) => void;
  setCategory: (ids: string[], category: Category) => void;
  setMuted: (ids: string[], muted: boolean) => void;
  restore: (threads: Record<string, Thread | null>, messages?: Record<string, Message | null>) => void;
  markUnreadFrom: (messageId: string) => void;
  deleteMessage: (messageId: string) => void;

  createLabel: (name: string, color: LabelColor) => string;
  updateLabel: (id: string, patch: Partial<Omit<Label, "id">>) => void;
  deleteLabel: (id: string) => void;

  saveDraft: (input: DraftInput) => { threadId: string; messageId: string };
  deleteDraft: (messageId: string) => void;
  send: (messageId: string, scheduledAt?: number) => void;
  finalizeSend: (messageId: string) => void;
  undoSend: (messageId: string) => void;
  cancelScheduled: (messageId: string) => void;

  tick: (now: number) => Delivered[];
  deliverNext: () => Delivered[];
  unsubscribe: (email: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetDemo: () => void;
}

export type MailState = MailData & MailActions;

const SEED_VERSION = 4;

function freshData(): Omit<MailData, "settings"> {
  const now = Date.now();
  const seed = buildSeed(now);
  return {
    version: SEED_VERSION,
    seededAt: now,
    threads: seed.threads,
    messages: seed.messages,
    labels: SEED_LABELS,
    extraContacts: [],
    incoming: seed.incoming,
    unsubscribed: [],
  };
}

// Serializing the whole mailbox on every state change is expensive (drag, typing, bulk actions),
// so writes are coalesced and flushed shortly after, or immediately when the page is hidden.
let pendingWrite: { name: string; value: StorageValue<unknown> } | null = null;
let writeTimer = 0;

function flushWrite() {
  window.clearTimeout(writeTimer);
  writeTimer = 0;
  if (!pendingWrite) return;
  const { name, value } = pendingWrite;
  pendingWrite = null;
  try {
    localStorage.setItem(name, JSON.stringify(value));
  } catch (e) {
    console.warn("Mailbox could not be persisted (storage quota exceeded).", e);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushWrite);
  window.addEventListener("beforeunload", flushWrite);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushWrite());
}

function deferredStorage<S>(): PersistStorage<S> {
  return {
    getItem: (name) => {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as StorageValue<S>;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      pendingWrite = { name, value };
      if (!writeTimer) writeTimer = window.setTimeout(flushWrite, 400);
    },
    removeItem: (name) => {
      pendingWrite = null;
      localStorage.removeItem(name);
    },
  };
}

function mapThreads(
  threads: Record<string, Thread>,
  ids: string[],
  fn: (t: Thread) => Partial<Thread>,
): Record<string, Thread> {
  const next = { ...threads };
  for (const id of ids) {
    const t = next[id];
    if (t) next[id] = { ...t, ...fn(t) };
  }
  return next;
}

function deliver(state: MailData, item: PendingDelivery, now: number) {
  const threads = { ...state.threads };
  const messages = { ...state.messages };
  let thread = item.threadId ? threads[item.threadId] : undefined;
  const threadId = thread?.id ?? uid("t");
  const messageId = uid("m");
  const lastMine = thread
    ? thread.messageIds
        .map((id) => messages[id])
        .filter((m) => m && m.from.email === ME.email)
        .pop()
    : undefined;
  messages[messageId] = {
    id: messageId,
    threadId,
    from: item.from,
    to: [ME],
    cc: lastMine ? lastMine.cc.filter((c) => c.email !== item.from.email) : [],
    bcc: [],
    date: now,
    html: item.html,
    attachments: item.attachments ?? [],
    unread: true,
    status: "received",
  };
  if (thread) {
    thread = {
      ...thread,
      messageIds: [...thread.messageIds, messageId],
      inInbox: thread.muted ? thread.inInbox : true,
      trashed: false,
      snoozedUntil: undefined,
    };
  } else {
    thread = {
      id: threadId,
      subject: item.subject,
      messageIds: [messageId],
      labels: item.labels ?? [],
      inInbox: true,
      trashed: false,
      spam: false,
      starred: false,
      important: !!item.important,
      category: item.category,
    };
  }
  threads[threadId] = thread;
  return { threads, messages, delivered: { threadId, subject: thread.subject, from: item.from } };
}

function autoReplyFor(state: MailData, msg: Message, now: number): PendingDelivery | null {
  const target = [...msg.to, ...msg.cc].find((c) => {
    const k = contactKind(c.email);
    return k && k !== "service" && c.email !== ME.email;
  });
  if (!target) return null;
  const kind = contactKind(target.email)!;
  const pool = AUTO_REPLIES[kind === "client" ? "client" : kind === "work" ? "work" : "personal"];
  const line = pool[Math.floor(Math.random() * pool.length)];
  const person = Object.values(PEOPLE).find((p) => p.email === target.email)!;
  const thread = state.threads[msg.threadId];
  return {
    id: uid("reply"),
    deliverAt: now + 12_000 + Math.random() * 10_000,
    threadId: msg.threadId,
    subject: thread?.subject ?? "",
    from: { name: person.name, email: person.email },
    category: "primary",
    html: md(`Hi ${firstName(ME.name)},\n\n${line}\n\n${firstName(person.name)}`),
  };
}

export const useMail = create<MailState>()(
  persist(
    (set, get) => ({
      ...freshData(),
      settings: DEFAULT_SETTINGS,

      setRead: (ids, read) =>
        set((s) => {
          const messages = { ...s.messages };
          for (const id of ids) {
            for (const mid of s.threads[id]?.messageIds ?? []) {
              const m = messages[mid];
              if (m && m.unread === read) messages[mid] = { ...m, unread: !read };
            }
          }
          return { messages };
        }),
      setStarred: (ids, starred) => set((s) => ({ threads: mapThreads(s.threads, ids, () => ({ starred })) })),
      setImportant: (ids, important) => set((s) => ({ threads: mapThreads(s.threads, ids, () => ({ important })) })),
      archive: (ids) =>
        set((s) => ({ threads: mapThreads(s.threads, ids, () => ({ inInbox: false, snoozedUntil: undefined })) })),
      moveToInbox: (ids) =>
        set((s) => ({
          threads: mapThreads(s.threads, ids, () => ({ inInbox: true, trashed: false, spam: false, snoozedUntil: undefined })),
        })),
      trash: (ids) =>
        set((s) => ({ threads: mapThreads(s.threads, ids, () => ({ trashed: true, snoozedUntil: undefined })) })),
      deleteForever: (ids) =>
        set((s) => {
          const threads = { ...s.threads };
          const messages = { ...s.messages };
          for (const id of ids) {
            for (const mid of threads[id]?.messageIds ?? []) delete messages[mid];
            delete threads[id];
          }
          return { threads, messages };
        }),
      setSpam: (ids, spam) =>
        set((s) => ({
          threads: mapThreads(s.threads, ids, () => (spam ? { spam: true, inInbox: false } : { spam: false, inInbox: true })),
        })),
      setLabel: (ids, labelId, on) =>
        set((s) => ({
          threads: mapThreads(s.threads, ids, (t) => ({
            labels: on ? Array.from(new Set([...t.labels, labelId])) : t.labels.filter((l) => l !== labelId),
          })),
        })),
      moveToLabel: (ids, labelId, fromLabel) =>
        set((s) => ({
          threads: mapThreads(s.threads, ids, (t) => ({
            inInbox: false,
            trashed: false,
            spam: false,
            labels: Array.from(new Set([...t.labels.filter((l) => l !== fromLabel), labelId])),
          })),
        })),
      snooze: (ids, until) => set((s) => ({ threads: mapThreads(s.threads, ids, () => ({ snoozedUntil: until })) })),
      unsnooze: (ids) =>
        set((s) => ({ threads: mapThreads(s.threads, ids, () => ({ snoozedUntil: undefined, inInbox: true })) })),
      setCategory: (ids, category) => set((s) => ({ threads: mapThreads(s.threads, ids, () => ({ category })) })),
      setMuted: (ids, muted) =>
        set((s) => ({ threads: mapThreads(s.threads, ids, () => (muted ? { muted, inInbox: false } : { muted })) })),
      restore: (threadSnap, messageSnap) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const [id, t] of Object.entries(threadSnap)) {
            if (t) threads[id] = t;
            else delete threads[id];
          }
          const messages = { ...s.messages };
          for (const [id, m] of Object.entries(messageSnap ?? {})) {
            if (m) messages[id] = m;
            else delete messages[id];
          }
          return { threads, messages };
        }),
      markUnreadFrom: (messageId) =>
        set((s) => {
          const msg = s.messages[messageId];
          const t = msg && s.threads[msg.threadId];
          if (!t) return {};
          const messages = { ...s.messages };
          for (const mid of t.messageIds) {
            const m = messages[mid];
            if (m && m.date >= msg.date && (m.status === "received" || m.status === "sent")) {
              messages[mid] = { ...m, unread: true };
            }
          }
          return { messages };
        }),
      deleteMessage: (messageId) =>
        set((s) => {
          const msg = s.messages[messageId];
          if (!msg) return {};
          const t = s.threads[msg.threadId];
          const messages = { ...s.messages };
          delete messages[messageId];
          const threads = { ...s.threads };
          const rest = t.messageIds.filter((id) => id !== messageId);
          if (rest.length) threads[t.id] = { ...t, messageIds: rest };
          else delete threads[t.id];
          return { threads, messages };
        }),

      createLabel: (name, color) => {
        const id = uid("label");
        set((s) => ({ labels: [...s.labels, { id, name: name.trim(), color }] }));
        return id;
      },
      updateLabel: (id, patch) => set((s) => ({ labels: s.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      deleteLabel: (id) =>
        set((s) => ({
          labels: s.labels.filter((l) => l.id !== id),
          threads: mapThreads(
            s.threads,
            Object.keys(s.threads).filter((tid) => s.threads[tid].labels.includes(id)),
            (t) => ({ labels: t.labels.filter((l) => l !== id) }),
          ),
        })),

      saveDraft: (input) => {
        const s = get();
        const now = Date.now();
        const existing = input.messageId ? s.messages[input.messageId] : undefined;
        if (existing && s.threads[existing.threadId]) {
          const t = s.threads[existing.threadId];
          const onlyDraft = t.messageIds.length === 1;
          set({
            messages: {
              ...s.messages,
              [existing.id]: {
                ...existing,
                to: input.to,
                cc: input.cc,
                bcc: input.bcc,
                html: input.html,
                quote: input.quote,
                attachments: input.attachments,
                date: now,
              },
            },
            threads: onlyDraft ? { ...s.threads, [t.id]: { ...t, subject: input.subject } } : s.threads,
          });
          return { threadId: t.id, messageId: existing.id };
        }
        const messageId = uid("m");
        const parent = input.threadId ? s.threads[input.threadId] : undefined;
        const threadId = parent?.id ?? uid("t");
        const message: Message = {
          id: messageId,
          threadId,
          from: ME,
          to: input.to,
          cc: input.cc,
          bcc: input.bcc,
          date: now,
          html: input.html,
          quote: input.quote,
          attachments: input.attachments,
          unread: false,
          status: "draft",
        };
        const thread: Thread = parent
          ? { ...parent, messageIds: [...parent.messageIds, messageId] }
          : {
              id: threadId,
              subject: input.subject,
              messageIds: [messageId],
              labels: [],
              inInbox: false,
              trashed: false,
              spam: false,
              starred: false,
              important: false,
              category: "primary",
            };
        set({ messages: { ...s.messages, [messageId]: message }, threads: { ...s.threads, [threadId]: thread } });
        return { threadId, messageId };
      },
      deleteDraft: (messageId) => {
        const m = get().messages[messageId];
        if (m && m.status === "draft") get().deleteMessage(messageId);
      },
      send: (messageId, scheduledAt) =>
        set((s) => {
          const m = s.messages[messageId];
          if (!m) return {};
          const known = new Set([
            ...Object.values(PEOPLE).map((p) => p.email),
            ...s.extraContacts.map((c) => c.email),
            ME.email,
          ]);
          const newContacts = [...m.to, ...m.cc, ...m.bcc].filter((c) => !known.has(c.email));
          const t = s.threads[m.threadId];
          const toSelf = [...m.to, ...m.cc, ...m.bcc].some((c) => c.email === ME.email);
          return {
            messages: {
              ...s.messages,
              [messageId]: {
                ...m,
                status: scheduledAt ? "scheduled" : "sending",
                scheduledAt,
                date: Date.now(),
              },
            },
            threads: t && (toSelf || t.trashed) ? { ...s.threads, [t.id]: { ...t, inInbox: toSelf || t.inInbox, trashed: false } } : s.threads,
            extraContacts: [...s.extraContacts, ...newContacts.filter((c, i, a) => a.findIndex((x) => x.email === c.email) === i)],
          };
        }),
      finalizeSend: (messageId) => {
        const s = get();
        const m = s.messages[messageId];
        if (!m || m.status !== "sending") return;
        const now = Date.now();
        const reply = autoReplyFor(s, m, now);
        set({
          messages: { ...s.messages, [messageId]: { ...m, status: "sent", date: now } },
          incoming: reply ? [...s.incoming, reply] : s.incoming,
        });
      },
      undoSend: (messageId) =>
        set((s) => {
          const m = s.messages[messageId];
          if (!m) return {};
          return { messages: { ...s.messages, [messageId]: { ...m, status: "draft", scheduledAt: undefined } } };
        }),
      cancelScheduled: (messageId) =>
        set((s) => {
          const m = s.messages[messageId];
          if (!m) return {};
          return { messages: { ...s.messages, [messageId]: { ...m, status: "draft", scheduledAt: undefined } } };
        }),

      tick: (now) => {
        let s: MailData = get();
        const delivered: Delivered[] = [];
        let changed = false;

        const due = Object.values(s.threads).filter((t) => t.snoozedUntil && t.snoozedUntil <= now);
        if (due.length) {
          const threads = { ...s.threads };
          const messages = { ...s.messages };
          for (const t of due) {
            threads[t.id] = { ...t, snoozedUntil: undefined, inInbox: true };
            const last = t.messageIds.map((id) => messages[id]).filter(Boolean).pop();
            if (last) messages[last.id] = { ...last, unread: true, date: Math.max(last.date, now - 1000) };
          }
          s = { ...s, threads, messages };
          changed = true;
        }

        const scheduled = Object.values(s.messages).filter((m) => m.status === "scheduled" && (m.scheduledAt ?? 0) <= now);
        const leftover = Object.values(s.messages).filter((m) => m.status === "sending" && now - m.date > 60_000);
        if (scheduled.length || leftover.length) {
          const messages = { ...s.messages };
          const replies: PendingDelivery[] = [];
          for (const m of [...scheduled, ...leftover]) {
            messages[m.id] = { ...m, status: "sent", date: m.scheduledAt ?? m.date };
            const r = autoReplyFor(s, m, now);
            if (r) replies.push(r);
          }
          s = { ...s, messages, incoming: [...s.incoming, ...replies] };
          changed = true;
        }

        const ready = s.incoming.filter((i) => i.deliverAt <= now);
        if (ready.length) {
          for (const item of ready) {
            const r = deliver(s, item, now);
            s = { ...s, threads: r.threads, messages: r.messages };
            delivered.push(r.delivered);
          }
          s = { ...s, incoming: s.incoming.filter((i) => i.deliverAt > now) };
          changed = true;
        }

        if (changed) set({ threads: s.threads, messages: s.messages, incoming: s.incoming });
        return delivered;
      },
      deliverNext: () => {
        const s = get();
        const next = [...s.incoming].sort((a, b) => a.deliverAt - b.deliverAt)[0];
        if (!next) return [];
        const r = deliver(s, next, Date.now());
        set({ threads: r.threads, messages: r.messages, incoming: s.incoming.filter((i) => i.id !== next.id) });
        return [r.delivered];
      },
      unsubscribe: (email) => set((s) => ({ unsubscribed: Array.from(new Set([...s.unsubscribed, email])) })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetDemo: () => set((s) => ({ ...freshData(), settings: { ...DEFAULT_SETTINGS, theme: s.settings.theme } })),
    }),
    {
      name: "mail-store",
      version: SEED_VERSION,
      storage: deferredStorage(),
      partialize: (s) => ({
        version: s.version,
        seededAt: s.seededAt,
        threads: s.threads,
        messages: s.messages,
        labels: s.labels,
        extraContacts: s.extraContacts,
        incoming: s.incoming,
        unsubscribed: s.unsubscribed,
        settings: s.settings,
      }),
      migrate: (persisted) => {
        const p = persisted as Partial<MailData> | undefined;
        return { ...freshData(), settings: { ...DEFAULT_SETTINGS, ...(p?.settings ?? {}) } } as MailState;
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<MailData> | undefined;
        if (!p || !p.threads) return current;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
      },
    },
  ),
);

export function allContacts(extra: Contact[]): Contact[] {
  const list: Contact[] = Object.values(PEOPLE).map((p) => ({ name: p.name, email: p.email }));
  const seen = new Set(list.map((c) => c.email));
  for (const c of extra) if (!seen.has(c.email)) list.push(c);
  return list.filter((c) => !c.name.includes("(via"));
}

export function quoteHtml(m: Message) {
  const when = new Date(m.date).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `<div class="gmail-quote-attr">On ${escapeHtml(when)}, ${escapeHtml(m.from.name)} &lt;${escapeHtml(m.from.email)}&gt; wrote:</div><blockquote class="gmail-quote">${m.html}${m.quote ? m.quote : ""}</blockquote>`;
}
