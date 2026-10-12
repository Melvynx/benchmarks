import { create } from 'zustand';
import type {
  Category,
  Draft,
  DraftKind,
  Label,
  MailData,
  Message,
  Person,
  Rsvp,
  Settings,
  Thread,
} from './types';
import { ME, isMe } from './people';
import { buildSeed } from './seed';
import { avatarColor, escapeHtml, htmlToText, makeSnippet, nameFromEmail, uid } from './text';
import { generateReply } from './autoreply';
import { quoteBlock } from './seed-kit';

export const STORAGE_KEY = 'sonnet-mail:v3';
export const STORAGE_VERSION = 3;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accent: 'blue',
  density: 'default',
  pane: 'off',
  categories: { primary: true, promotions: true, social: true, updates: true },
  tabsEnabled: true,
  undoSendSeconds: 10,
  defaultReplyAll: false,
  afterAction: 'list',
  shortcuts: true,
  showSnippets: true,
  showImportant: true,
  signatureEnabled: true,
  signature: 'Avery Quinn\nProduct Lead · Brightlane',
  sidebarCollapsed: false,
  autoReplies: true,
  pageSize: 50,
};

export type Undo = () => void;

export interface TickResult {
  arrived: Message[];
  sent: Draft[];
  woken: Thread[];
}

export interface MailActions {
  archive(ids: string[]): Undo;
  moveToInbox(ids: string[]): Undo;
  trash(ids: string[]): Undo;
  deleteForever(ids: string[]): Undo;
  markSpam(ids: string[]): Undo;
  markNotSpam(ids: string[]): Undo;
  markRead(ids: string[], read: boolean): Undo;
  toggleStarThread(id: string): Undo;
  setStarThreads(ids: string[], on: boolean): Undo;
  setImportant(ids: string[], on: boolean): Undo;
  applyLabel(ids: string[], labelId: string, on: boolean): Undo;
  snooze(ids: string[], until: number): Undo;
  unsnooze(ids: string[]): Undo;
  moveToCategory(ids: string[], cat: Category): Undo;
  toggleMessageStar(messageId: string): void;
  markMessageUnread(messageId: string): Undo;
  deleteMessage(messageId: string): Undo;
  setRsvp(messageId: string, rsvp: Rsvp): void;
  emptyFolder(kind: 'trash' | 'spam'): Undo;

  createLabel(name: string, color: string): string;
  updateLabel(id: string, patch: Partial<Label>): void;
  deleteLabel(id: string): Undo;

  createDraft(init?: Partial<Draft>): string;
  startReply(threadId: string, kind: DraftKind, messageId?: string): string;
  updateDraft(id: string, patch: Partial<Draft>): void;
  discardDraft(id: string): Undo;
  sendDraft(id: string): { threadId: string; messageId: string; undo: Undo } | null;
  scheduleDraft(id: string, at: number): void;
  cancelSend(id: string): void;

  tick(now?: number): TickResult;
  addRecentSearch(q: string): void;
  removeRecentSearch(q: string): void;
  setSettings(patch: Partial<Settings>): void;
  resetData(): void;
}

export type MailState = MailData & { settings: Settings } & MailActions;

interface Persisted {
  version: number;
  data: MailData;
  settings: Settings;
}

function toMap<T extends { id: string }>(arr: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const x of arr) out[x.id] = x;
  return out;
}

export function signatureHtml(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => escapeHtml(l))
    .join('<br>');
  return `<div class="sig">-- <br>${lines}</div>`;
}

export function subjectWithPrefix(subject: string, prefix: 'Re' | 'Fwd'): string {
  const re = new RegExp(`^${prefix}:\\s*`, 'i');
  return re.test(subject) ? subject : `${prefix}: ${subject}`;
}

function dedupePeople(list: Person[]): Person[] {
  const seen = new Set<string>();
  const out: Person[] = [];
  for (const p of list) {
    const k = p.email.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function forwardHeader(m: Message, subject: string): string {
  const person = (p: Person) => `${escapeHtml(p.name)} &lt;${escapeHtml(p.email)}&gt;`;
  const date = new Date(m.date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `<div class="q"><div>---------- Forwarded message ---------<br>From: <b>${person(m.from)}</b><br>Date: ${escapeHtml(date)}<br>Subject: ${escapeHtml(
    subject,
  )}<br>To: ${m.to.map(person).join(', ')}</div><br>${m.html}</div>`;
}

export function loadPersisted(): Persisted | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Persisted;
    if (p.version !== STORAGE_VERSION || !p.data?.threads) return null;
    p.settings = { ...DEFAULT_SETTINGS, ...p.settings, categories: { ...DEFAULT_SETTINGS.categories, ...p.settings?.categories } };
    return p;
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

function serialize(s: MailState): string {
  const data: MailData = {
    threads: s.threads,
    messages: s.messages,
    drafts: s.drafts,
    labels: s.labels,
    contacts: s.contacts,
    pending: s.pending,
    recentSearches: s.recentSearches,
  };
  return JSON.stringify({ version: STORAGE_VERSION, data, settings: s.settings } satisfies Persisted);
}

export interface StoreOptions {
  persist: boolean;
  seed?: MailData;
  settings?: Settings;
}

export function createMailStore(opts: StoreOptions) {
  const stored = opts.persist ? loadPersisted() : null;
  const initialData: MailData = stored?.data ?? opts.seed ?? buildSeed();
  const initialSettings: Settings = stored?.settings ?? opts.settings ?? DEFAULT_SETTINGS;

  const store = create<MailState>()((set, get) => {
    const snapshot = (ids: string[]) => {
      const s = get();
      const threads = ids.map((id) => s.threads[id]).filter(Boolean) as Thread[];
      const messages = threads.flatMap((t) => t.messageIds.map((id) => s.messages[id]).filter(Boolean)) as Message[];
      return { threads, messages };
    };
    const restore = (snap: { threads: Thread[]; messages: Message[] }): Undo => () =>
      set((s) => ({
        threads: { ...s.threads, ...toMap(snap.threads) },
        messages: { ...s.messages, ...toMap(snap.messages) },
      }));

    const patchThreads = (ids: string[], patch: Partial<Thread> | ((t: Thread) => Partial<Thread>)): Undo => {
      const snap = snapshot(ids);
      set((s) => {
        const threads = { ...s.threads };
        for (const id of ids) {
          const t = threads[id];
          if (!t) continue;
          threads[id] = { ...t, ...(typeof patch === 'function' ? patch(t) : patch) };
        }
        return { threads };
      });
      return restore(snap);
    };

    const patchMessages = (ids: string[], fn: (m: Message, index: number, all: Message[]) => Partial<Message> | null): Undo => {
      const snap = snapshot(ids);
      set((s) => {
        const messages = { ...s.messages };
        for (const id of ids) {
          const t = s.threads[id];
          if (!t) continue;
          const all = t.messageIds.map((mid) => messages[mid]).filter(Boolean) as Message[];
          all.sort((a, b) => a.date - b.date);
          all.forEach((m, i) => {
            const p = fn(m, i, all);
            if (p) messages[m.id] = { ...messages[m.id], ...p };
          });
        }
        return { messages };
      });
      return restore(snap);
    };

    const deliver = (draftId: string): { threadId: string; messageId: string; undo: Undo } | null => {
      const s = get();
      const d = s.drafts[draftId];
      if (!d) return null;
      const now = Date.now();
      const toMe = [...d.to, ...d.cc, ...d.bcc].some(isMe);
      const html = d.html + d.quoteHtml;
      const existing = d.threadId ? s.threads[d.threadId] : undefined;
      const threadId = existing?.id ?? uid('t');
      const messageId = uid('m');
      const message: Message = {
        id: messageId,
        threadId,
        from: ME,
        to: d.to,
        cc: d.cc,
        bcc: d.bcc,
        date: now,
        html,
        snippet: makeSnippet(d.html) || '(no content)',
        unread: toMe,
        starred: false,
        attachments: d.attachments,
      };
      const thread: Thread = existing
        ? {
            ...existing,
            messageIds: [...existing.messageIds, messageId],
            lastDate: now,
            inbox: existing.inbox || toMe,
            trashed: false,
          }
        : {
            id: threadId,
            subject: d.subject.trim() || '(no subject)',
            messageIds: [messageId],
            labelIds: [],
            inbox: toMe,
            trashed: false,
            spam: false,
            important: false,
            category: 'primary',
            lastDate: now,
          };

      const contacts = [...s.contacts];
      for (const p of [...d.to, ...d.cc, ...d.bcc]) {
        if (isMe(p)) continue;
        const idx = contacts.findIndex((c) => c.email.toLowerCase() === p.email.toLowerCase());
        if (idx >= 0) contacts[idx] = { ...contacts[idx], freq: contacts[idx].freq + 3 };
        else
          contacts.push({
            name: p.name || nameFromEmail(p.email),
            email: p.email.toLowerCase(),
            color: avatarColor(p.email),
            freq: 3,
          });
      }

      const pending = [...s.pending];
      const addedPending: string[] = [];
      if (s.settings.autoReplies) {
        for (const p of [...d.to, ...d.cc]) {
          const c = contacts.find((x) => x.email.toLowerCase() === p.email.toLowerCase());
          if (!c || !c.persona || isMe(c)) continue;
          const pid = uid('p');
          addedPending.push(pid);
          pending.push({
            id: pid,
            dueAt: now + s.settings.undoSendSeconds * 1000 + 4000 + Math.floor(Math.random() * 6000),
            threadId,
            from: { name: c.name, email: c.email },
            subject: thread.subject,
            html: generateReply(c, d.html, thread.subject) + quoteBlock({ from: ME, date: now, html }),
            inReplyTo: messageId,
          });
        }
      }

      const drafts = { ...s.drafts };
      delete drafts[draftId];
      set({
        threads: { ...s.threads, [threadId]: thread },
        messages: { ...s.messages, [messageId]: message },
        drafts,
        contacts,
        pending,
      });
      const undo: Undo = () =>
        set((st) => {
          const threads = { ...st.threads };
          const messages = { ...st.messages };
          delete messages[messageId];
          const cur = threads[threadId];
          if (existing && cur) {
            threads[threadId] = {
              ...cur,
              messageIds: cur.messageIds.filter((id) => id !== messageId),
              lastDate: existing.lastDate,
              inbox: existing.inbox,
              trashed: existing.trashed,
            };
          } else delete threads[threadId];
          return {
            threads,
            messages,
            drafts: { ...st.drafts, [draftId]: d },
            pending: st.pending.filter((p) => !addedPending.includes(p.id)),
          };
        });
      return { threadId, messageId, undo };
    };

    return {
      ...initialData,
      settings: initialSettings,

      archive: (ids) => patchThreads(ids, { inbox: false, snoozeUntil: undefined }),
      moveToInbox: (ids) => patchThreads(ids, { inbox: true, trashed: false, spam: false, snoozeUntil: undefined }),
      trash: (ids) => patchThreads(ids, { trashed: true, inbox: false, snoozeUntil: undefined }),
      markSpam: (ids) => patchThreads(ids, { spam: true, inbox: false, snoozeUntil: undefined }),
      markNotSpam: (ids) => patchThreads(ids, { spam: false, inbox: true }),
      deleteForever: (ids) => {
        const snap = snapshot(ids);
        set((s) => {
          const threads = { ...s.threads };
          const messages = { ...s.messages };
          for (const id of ids) {
            const t = threads[id];
            if (!t) continue;
            t.messageIds.forEach((m) => delete messages[m]);
            delete threads[id];
          }
          return { threads, messages };
        });
        return restore(snap);
      },
      emptyFolder: (kind) => {
        const s = get();
        const ids = Object.values(s.threads)
          .filter((t) => (kind === 'trash' ? t.trashed : t.spam && !t.trashed))
          .map((t) => t.id);
        return get().deleteForever(ids);
      },
      markRead: (ids, read) =>
        patchMessages(ids, (m, i, all) => {
          if (read) return m.unread ? { unread: false } : null;
          return i === all.length - 1 && !m.unread ? { unread: true } : null;
        }),
      toggleStarThread: (id) => {
        const s = get();
        const t = s.threads[id];
        if (!t) return () => undefined;
        const msgs = t.messageIds.map((m) => s.messages[m]).filter(Boolean);
        const starred = msgs.some((m) => m.starred);
        return get().setStarThreads([id], !starred);
      },
      setStarThreads: (ids, on) =>
        patchMessages(ids, (m, i, all) => {
          if (on) return i === all.length - 1 && !m.starred ? { starred: true } : null;
          return m.starred ? { starred: false } : null;
        }),
      setImportant: (ids, on) => patchThreads(ids, { important: on }),
      applyLabel: (ids, labelId, on) =>
        patchThreads(ids, (t) => {
          const has = t.labelIds.includes(labelId);
          if (on && !has) return { labelIds: [...t.labelIds, labelId] };
          if (!on && has) return { labelIds: t.labelIds.filter((l) => l !== labelId) };
          return {};
        }),
      snooze: (ids, until) => patchThreads(ids, { snoozeUntil: until, snoozedAt: Date.now() }),
      unsnooze: (ids) => patchThreads(ids, { snoozeUntil: undefined, inbox: true }),
      moveToCategory: (ids, cat) => patchThreads(ids, { category: cat }),

      toggleMessageStar: (messageId) =>
        set((s) => {
          const m = s.messages[messageId];
          return m ? { messages: { ...s.messages, [messageId]: { ...m, starred: !m.starred } } } : {};
        }),
      markMessageUnread: (messageId) => {
        const s = get();
        const m = s.messages[messageId];
        if (!m) return () => undefined;
        const prev = m;
        set({ messages: { ...s.messages, [messageId]: { ...m, unread: true } } });
        return () => set((st) => ({ messages: { ...st.messages, [messageId]: prev } }));
      },
      deleteMessage: (messageId) => {
        const s = get();
        const m = s.messages[messageId];
        if (!m) return () => undefined;
        const t = s.threads[m.threadId];
        const live = t.messageIds.filter((id) => !s.messages[id]?.trashed);
        if (live.length <= 1) return get().trash([t.id]);
        const snap = snapshot([t.id]);
        set((st) => ({ messages: { ...st.messages, [messageId]: { ...st.messages[messageId], trashed: true, unread: false } } }));
        return restore(snap);
      },
      setRsvp: (messageId, rsvp) =>
        set((s) => {
          const m = s.messages[messageId];
          if (!m?.invite) return {};
          return { messages: { ...s.messages, [messageId]: { ...m, invite: { ...m.invite, rsvp } } } };
        }),

      createLabel: (name, color) => {
        const trimmed = name.trim();
        const existing = get().labels.find((l) => l.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) return existing.id;
        const id = uid('l');
        set((s) => ({ labels: [...s.labels, { id, name: trimmed, color }] }));
        return id;
      },
      updateLabel: (id, patch) => set((s) => ({ labels: s.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      deleteLabel: (id) => {
        const s = get();
        const affected = Object.values(s.threads).filter((t) => t.labelIds.includes(id));
        const label = s.labels.find((l) => l.id === id);
        const snap = { threads: affected, messages: [] as Message[] };
        set((st) => {
          const threads = { ...st.threads };
          for (const t of affected) threads[t.id] = { ...t, labelIds: t.labelIds.filter((l) => l !== id) };
          return { threads, labels: st.labels.filter((l) => l.id !== id) };
        });
        return () => {
          restore(snap)();
          if (label) set((st) => ({ labels: st.labels.some((l) => l.id === id) ? st.labels : [...st.labels, label] }));
        };
      },

      createDraft: (init = {}) => {
        const s = get();
        const id = init.id ?? uid('d');
        const now = Date.now();
        const sig = s.settings.signatureEnabled && s.settings.signature.trim() ? signatureHtml(s.settings.signature) : '';
        const draft: Draft = {
          id,
          kind: 'new',
          mode: 'window',
          to: [],
          cc: [],
          bcc: [],
          subject: '',
          html: `<p><br></p>${sig}`,
          quoteHtml: '',
          attachments: [],
          createdAt: now,
          updatedAt: now,
          ...init,
        };
        set((st) => ({ drafts: { ...st.drafts, [id]: draft } }));
        return id;
      },
      startReply: (threadId, kind, messageId) => {
        const s = get();
        const t = s.threads[threadId];
        const existing = Object.values(s.drafts).find((d) => d.threadId === threadId && !d.sendAt && d.mode === 'inline');
        const msgs = t.messageIds.map((m) => s.messages[m]).filter((m) => m && !m.trashed) as Message[];
        msgs.sort((a, b) => a.date - b.date);
        const target = (messageId && s.messages[messageId]) || msgs[msgs.length - 1];
        let to: Person[] = [];
        let cc: Person[] = [];
        if (kind === 'reply') {
          to = isMe(target.from) ? target.to : [target.from];
        } else if (kind === 'replyAll') {
          const everyone = dedupePeople([target.from, ...target.to, ...target.cc]).filter((p) => !isMe(p));
          to = dedupePeople([target.from, ...target.to]).filter((p) => !isMe(p));
          cc = target.cc.filter((p) => !isMe(p));
          if (!to.length) to = everyone.slice(0, 1);
        }
        const prefix = kind === 'forward' ? 'Fwd' : 'Re';
        const subject = subjectWithPrefix(t.subject, prefix);
        const quoteHtml = kind === 'forward' ? forwardHeader(target, t.subject) : quoteBlock(target);
        const attachments = kind === 'forward' ? target.attachments : [];
        if (existing) {
          get().updateDraft(existing.id, { kind, to, cc, subject, quoteHtml, replyToId: target.id, attachments: kind === 'forward' ? attachments : existing.attachments });
          return existing.id;
        }
        return get().createDraft({ kind, mode: 'inline', threadId, replyToId: target.id, to, cc, subject, quoteHtml, attachments });
      },
      updateDraft: (id, patch) =>
        set((s) => {
          const d = s.drafts[id];
          return d ? { drafts: { ...s.drafts, [id]: { ...d, ...patch, updatedAt: Date.now() } } } : {};
        }),
      discardDraft: (id) => {
        const d = get().drafts[id];
        set((s) => {
          const drafts = { ...s.drafts };
          delete drafts[id];
          return { drafts };
        });
        return () => {
          if (d) set((s) => ({ drafts: { ...s.drafts, [id]: d } }));
        };
      },
      sendDraft: (id) => deliver(id),
      scheduleDraft: (id, at) => get().updateDraft(id, { sendAt: at }),
      cancelSend: (id) =>
        set((s) => {
          const d = s.drafts[id];
          if (!d) return {};
          return { drafts: { ...s.drafts, [id]: { ...d, sendAt: undefined, updatedAt: Date.now() } } };
        }),

      tick: (nowArg) => {
        const now = nowArg ?? Date.now();
        const result: TickResult = { arrived: [], sent: [], woken: [] };
        const s0 = get();

        for (const d of Object.values(s0.drafts)) {
          if (d.sendAt && d.sendAt <= now) {
            result.sent.push(d);
            deliver(d.id);
          }
        }

        const due = get().pending.filter((p) => p.dueAt <= now);
        if (due.length) {
          set((s) => {
            const threads = { ...s.threads };
            const messages = { ...s.messages };
            for (const p of due) {
              const existing = threads[p.threadId];
              const threadId = existing ? existing.id : uid('t');
              const id = uid('m');
              const msg: Message = {
                id,
                threadId,
                from: p.from,
                to: [ME],
                cc: [],
                bcc: [],
                date: p.dueAt,
                html: p.html,
                snippet: makeSnippet(p.html),
                unread: true,
                starred: false,
                attachments: [],
              };
              messages[id] = msg;
              threads[threadId] = existing
                ? { ...existing, messageIds: [...existing.messageIds, id], lastDate: p.dueAt, inbox: true, trashed: false, spam: false }
                : {
                    id: threadId,
                    subject: p.subject,
                    messageIds: [id],
                    labelIds: [],
                    inbox: true,
                    trashed: false,
                    spam: false,
                    important: false,
                    category: 'primary',
                    lastDate: p.dueAt,
                  };
              result.arrived.push(msg);
            }
            return { threads, messages, pending: s.pending.filter((p) => p.dueAt > now) };
          });
        }

        const s1 = get();
        const wake = Object.values(s1.threads).filter((t) => t.snoozeUntil && t.snoozeUntil <= now);
        if (wake.length) {
          set((s) => {
            const threads = { ...s.threads };
            const messages = { ...s.messages };
            for (const t of wake) {
              threads[t.id] = { ...t, snoozeUntil: undefined, snoozedAt: undefined, inbox: true, lastDate: now };
              const last = [...t.messageIds].map((id) => messages[id]).filter(Boolean).sort((a, b) => a.date - b.date).pop();
              if (last) messages[last.id] = { ...last, unread: true };
            }
            return { threads, messages };
          });
          result.woken.push(...wake);
        }
        return result;
      },

      addRecentSearch: (q) => {
        const t = q.trim();
        if (!t) return;
        set((s) => ({ recentSearches: [t, ...s.recentSearches.filter((x) => x !== t)].slice(0, 8) }));
      },
      removeRecentSearch: (q) => set((s) => ({ recentSearches: s.recentSearches.filter((x) => x !== q) })),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetData: () => {
        const seed = buildSeed();
        set({ ...seed, settings: { ...get().settings } });
      },
    };
  });

  if (opts.persist && typeof window !== 'undefined') {
    const flush = () => {
      try {
        localStorage.setItem(STORAGE_KEY, serialize(store.getState()));
      } catch (err) {
        console.warn('Could not persist mailbox', err);
      }
    };
    store.subscribe(() => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(flush, 350);
    });
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    if (!stored) flush();
  }

  return store;
}

export const useMail = createMailStore({ persist: true });

export function draftIsEmpty(d: Draft, signature: string): boolean {
  const body = htmlToText(d.html).replace(/^--\s*/m, '').trim();
  const sig = htmlToText(signatureHtml(signature)).replace(/^--\s*/m, '').trim();
  const stripped = sig && body.endsWith(sig) ? body.slice(0, body.length - sig.length).trim() : body;
  return !d.to.length && !d.cc.length && !d.bcc.length && !d.subject.trim() && !stripped && d.attachments.length === 0;
}
