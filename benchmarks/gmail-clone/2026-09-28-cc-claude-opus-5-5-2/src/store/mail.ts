import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  CONTACTS, DEFAULT_LABELS, LABEL_PALETTE, ME, buildDrafts, buildEvents, buildIncoming, buildTasks, buildThreads,
} from '../data/seed';
import type { CalendarEvent, Contact, Draft, Incoming, Label, Message, Task, Thread } from '../data/types';
import { firstName, hash, htmlToText, textToHtml, uid } from '../lib/format';
import { sanitizeHtml } from '../lib/sanitize';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeTint = 'default' | 'sky' | 'sage' | 'rose' | 'sand' | 'slate';
export type Density = 'default' | 'comfortable' | 'compact';

export interface Settings {
  theme: ThemeMode;
  tint: ThemeTint;
  density: Density;
  readingPane: 'none' | 'right';
  categories: boolean;
  inboxSort: 'default' | 'unreadFirst' | 'starredFirst';
  undoSeconds: number;
  signature: string;
  displayName: string;
  smartReply: boolean;
  shortcuts: boolean;
  importanceMarkers: boolean;
  pageSize: number;
  sidebarCollapsed: boolean;
  sidePanel: null | 'calendar' | 'tasks' | 'contacts';
  hoverActions: boolean;
  autoAdvance: 'list' | 'newer' | 'older';
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  tint: 'default',
  density: 'default',
  readingPane: 'none',
  categories: true,
  inboxSort: 'default',
  undoSeconds: 5,
  signature: 'Robin Hale\nDesign Lead · Fernbrook\nfernbrook.co',
  displayName: ME.name,
  smartReply: true,
  shortcuts: true,
  importanceMarkers: true,
  pageSize: 50,
  sidebarCollapsed: false,
  sidePanel: null,
  hoverActions: true,
  autoAdvance: 'list',
};

export type TickEvent =
  | { type: 'incoming'; threadId: string; from: Contact; subject: string; snippet: string }
  | { type: 'sent'; threadId: string; scheduled: boolean }
  | { type: 'unsnoozed'; threadId: string; subject: string };

interface MailData {
  seededAt: number;
  threads: Record<string, Thread>;
  drafts: Record<string, Draft>;
  labels: Label[];
  tasks: Task[];
  events: CalendarEvent[];
  incoming: Incoming[];
  recentSearches: string[];
  settings: Settings;
}

type ThreadPatch = Partial<Thread> | ((t: Thread) => Partial<Thread>);

interface MailActions {
  me: () => Contact;
  updateThreads: (ids: string[], patch: ThreadPatch) => void;
  snapshot: (ids: string[]) => Record<string, Thread>;
  restore: (snap: Record<string, Thread>) => void;
  setUnread: (ids: string[], unread: boolean) => void;
  setStarred: (ids: string[], starred: boolean) => void;
  setImportant: (ids: string[], important: boolean) => void;
  archive: (ids: string[]) => void;
  moveToInbox: (ids: string[]) => void;
  trash: (ids: string[]) => void;
  deleteForever: (ids: string[]) => void;
  reportSpam: (ids: string[]) => void;
  notSpam: (ids: string[]) => void;
  snooze: (ids: string[], until: number) => void;
  unsnooze: (ids: string[]) => void;
  setMuted: (ids: string[], muted: boolean) => void;
  setLabel: (ids: string[], labelId: string, on: boolean) => void;
  moveToLabel: (ids: string[], labelId: string) => void;
  setCategory: (ids: string[], category: Thread['category']) => void;
  createLabel: (name: string, colorIndex?: number) => Label;
  updateLabel: (id: string, patch: Partial<Label>) => void;
  deleteLabel: (id: string) => void;
  createDraft: (init: Partial<Draft>) => Draft;
  updateDraft: (id: string, patch: Partial<Draft>) => void;
  deleteDraft: (id: string) => void;
  restoreDraft: (d: Draft) => void;
  queueSend: (id: string, sendAt: number) => void;
  scheduleDraft: (id: string, at: number) => void;
  unscheduleDraft: (id: string) => void;
  sendDraft: (id: string, now?: number) => string | null;
  tick: (now: number) => TickEvent[];
  updateSettings: (patch: Partial<Settings>) => void;
  addTask: (title: string, threadId?: string | null, notes?: string) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  resetMailbox: () => void;
}

export type MailState = MailData & MailActions;

function freshData(now = Date.now(), settings: Settings = DEFAULT_SETTINGS): MailData {
  const threads = buildThreads(now);
  return {
    seededAt: now,
    threads,
    drafts: buildDrafts(now, threads),
    labels: DEFAULT_LABELS.map((l) => ({ ...l })),
    tasks: buildTasks(now),
    events: buildEvents(now),
    incoming: buildIncoming(now),
    recentSearches: ['from:maya', 'has:attachment roadmap', 'invoice'],
    settings,
  };
}

const AUTO_REPLIES = [
  (me: string, s: string) => `Thanks ${me} — got it. I'll go through "${s}" this afternoon and circle back if anything's unclear.`,
  (me: string) => `Perfect, this is exactly what I needed. Appreciate the quick turnaround, ${me}!`,
  (_me: string) => `Sounds good to me. Let's lock it in — I'll add it to the calendar so it doesn't slip.`,
  (me: string) => `Got it, thanks ${me}! Quick question: does this include the updated numbers from last week, or should I wait for the next version?`,
  (_me: string, s: string) => `Thanks for sending this over. I shared "${s}" with the rest of the team and will collect everyone's notes by end of day tomorrow.`,
];

function replySubject(subject: string) {
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

export const useMail = create<MailState>()(
  persist(
    (set, get) => {
      const mapThreads = (ids: string[], patch: ThreadPatch) => {
        const threads = { ...get().threads };
        for (const id of ids) {
          const t = threads[id];
          if (!t) continue;
          threads[id] = { ...t, ...(typeof patch === 'function' ? patch(t) : patch) };
        }
        set({ threads });
      };

      const me = (): Contact => {
        const name = get().settings.displayName.trim() || ME.name;
        return { ...ME, name };
      };

      const deliver = (threads: Record<string, Thread>, inc: Incoming, now: number): string => {
        const existing = inc.threadId ? threads[inc.threadId] : undefined;
        const threadId = existing ? existing.id : uid('t');
        const message: Message = {
          id: uid('m'),
          threadId,
          from: inc.from,
          to: inc.to,
          cc: [],
          bcc: [],
          date: now,
          html: textToHtml(inc.text),
          text: inc.text,
          attachments: [],
        };
        if (existing) {
          threads[threadId] = {
            ...existing,
            messages: [...existing.messages, message],
            unread: true,
            inInbox: existing.muted ? existing.inInbox : true,
            trashed: false,
            spam: false,
            snoozedUntil: null,
          };
        } else {
          threads[threadId] = {
            id: threadId,
            subject: inc.subject,
            messages: [message],
            category: inc.category,
            labels: inc.labels ?? [],
            unread: true,
            starred: false,
            important: inc.important ?? false,
            inInbox: true,
            trashed: false,
            spam: false,
            snoozedUntil: null,
          };
        }
        return threadId;
      };

      return {
        ...freshData(),
        me,

        updateThreads: mapThreads,
        snapshot: (ids) => {
          const { threads } = get();
          const snap: Record<string, Thread> = {};
          for (const id of ids) if (threads[id]) snap[id] = threads[id];
          return snap;
        },
        restore: (snap) => set({ threads: { ...get().threads, ...snap } }),

        setUnread: (ids, unread) => mapThreads(ids, { unread }),
        setStarred: (ids, starred) => mapThreads(ids, { starred }),
        setImportant: (ids, important) => mapThreads(ids, { important }),
        archive: (ids) => mapThreads(ids, { inInbox: false, snoozedUntil: null }),
        moveToInbox: (ids) => mapThreads(ids, { inInbox: true, trashed: false, spam: false, snoozedUntil: null, trashedAt: null }),
        trash: (ids) => mapThreads(ids, { trashed: true, trashedAt: Date.now(), snoozedUntil: null }),
        deleteForever: (ids) => {
          const threads = { ...get().threads };
          const drafts = { ...get().drafts };
          for (const id of ids) {
            delete threads[id];
            for (const d of Object.values(drafts)) if (d.threadId === id) delete drafts[d.id];
          }
          set({ threads, drafts });
        },
        reportSpam: (ids) => mapThreads(ids, { spam: true, inInbox: false, snoozedUntil: null }),
        notSpam: (ids) => mapThreads(ids, { spam: false, inInbox: true }),
        snooze: (ids, until) => mapThreads(ids, { snoozedUntil: until, inInbox: true, trashed: false, spam: false, unsnoozedAt: null }),
        unsnooze: (ids) => mapThreads(ids, { snoozedUntil: null, inInbox: true }),
        setMuted: (ids, muted) => mapThreads(ids, muted ? { muted, inInbox: false } : { muted }),
        setLabel: (ids, labelId, on) =>
          mapThreads(ids, (t) => ({
            labels: on ? Array.from(new Set([...t.labels, labelId])) : t.labels.filter((l) => l !== labelId),
          })),
        moveToLabel: (ids, labelId) =>
          mapThreads(ids, (t) => ({
            labels: Array.from(new Set([...t.labels, labelId])),
            inInbox: false,
            trashed: false,
            spam: false,
          })),
        setCategory: (ids, category) => mapThreads(ids, { category }),

        createLabel: (name, colorIndex) => {
          const labels = get().labels;
          const clean = name.trim();
          const existing = labels.find((l) => l.name.toLowerCase() === clean.toLowerCase());
          if (existing) return existing;
          const palette = LABEL_PALETTE[(colorIndex ?? labels.length) % LABEL_PALETTE.length];
          let id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'label';
          while (labels.some((l) => l.id === id)) id += '-1';
          const label: Label = { id, name: clean, ...palette };
          set({ labels: [...labels, label] });
          return label;
        },
        updateLabel: (id, patch) => set({ labels: get().labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) }),
        deleteLabel: (id) => {
          const threads = { ...get().threads };
          for (const t of Object.values(threads)) {
            if (t.labels.includes(id)) threads[t.id] = { ...t, labels: t.labels.filter((l) => l !== id) };
          }
          set({ labels: get().labels.filter((l) => l.id !== id), threads });
        },

        createDraft: (init) => {
          const draft: Draft = {
            id: uid('d'),
            threadId: null,
            mode: 'new',
            to: [],
            cc: [],
            bcc: [],
            subject: '',
            html: '',
            attachments: [],
            updatedAt: Date.now(),
            scheduledAt: null,
            ...init,
          };
          set({ drafts: { ...get().drafts, [draft.id]: draft } });
          return draft;
        },
        updateDraft: (id, patch) => {
          const d = get().drafts[id];
          if (!d) return;
          set({ drafts: { ...get().drafts, [id]: { ...d, ...patch, updatedAt: Date.now() } } });
        },
        deleteDraft: (id) => {
          const drafts = { ...get().drafts };
          delete drafts[id];
          set({ drafts });
        },
        restoreDraft: (d) => set({ drafts: { ...get().drafts, [d.id]: d } }),
        queueSend: (id, sendAt) => {
          const d = get().drafts[id];
          if (!d) return;
          set({ drafts: { ...get().drafts, [id]: { ...d, outgoing: true, scheduledAt: sendAt } } });
        },
        scheduleDraft: (id, at) => {
          const d = get().drafts[id];
          if (!d) return;
          set({ drafts: { ...get().drafts, [id]: { ...d, outgoing: false, scheduledAt: at, updatedAt: Date.now() } } });
        },
        unscheduleDraft: (id) => {
          const d = get().drafts[id];
          if (!d) return;
          set({ drafts: { ...get().drafts, [id]: { ...d, outgoing: false, scheduledAt: null } } });
        },

        sendDraft: (id, now = Date.now()) => {
          const state = get();
          const d = state.drafts[id];
          if (!d) return null;
          const sender = me();
          const threads = { ...state.threads };
          const existing = d.threadId ? threads[d.threadId] : undefined;
          const threadId = existing ? existing.id : uid('t');
          const html = sanitizeHtml(d.html);
          const message: Message = {
            id: uid('m'),
            threadId,
            from: sender,
            to: d.to,
            cc: d.cc,
            bcc: d.bcc,
            date: now,
            html,
            text: htmlToText(html),
            attachments: d.attachments,
            quoted: d.quoted,
          };
          const toMe = [...d.to, ...d.cc, ...d.bcc].some((c) => c.email.toLowerCase() === ME.email);
          if (existing) {
            threads[threadId] = {
              ...existing,
              messages: [...existing.messages, message],
              unread: toMe,
              inInbox: existing.inInbox || toMe,
              trashed: false,
              spam: false,
            };
          } else {
            threads[threadId] = {
              id: threadId,
              subject: d.subject.trim() || '(no subject)',
              messages: [message],
              category: 'primary',
              labels: [],
              unread: toMe,
              starred: false,
              important: false,
              inInbox: toMe,
              trashed: false,
              spam: false,
              snoozedUntil: null,
            };
          }
          const drafts = { ...state.drafts };
          delete drafts[id];

          // Known people answer after a short while so sending feels real.
          const incoming = [...state.incoming];
          const responder = d.to.find((c) => {
            const known = Object.values(CONTACTS).find((k) => k.email.toLowerCase() === c.email.toLowerCase());
            return known && known.kind !== 'brand' && c.email.toLowerCase() !== ME.email;
          });
          if (responder) {
            const known = Object.values(CONTACTS).find((k) => k.email.toLowerCase() === responder.email.toLowerCase())!;
            const subject = threads[threadId].subject;
            const pick = AUTO_REPLIES[hash(message.id) % AUTO_REPLIES.length];
            incoming.push({
              id: uid('in'),
              threadId,
              from: known,
              to: [sender],
              subject: replySubject(subject),
              text: `${pick(firstName(sender), subject.replace(/^(re|fwd):\s*/i, ''))}\n\n${firstName(known)}`,
              category: 'primary',
              deliverAt: now + (14 + (hash(message.id) % 16)) * 1000,
            });
          }
          set({ threads, drafts, incoming });
          return threadId;
        },

        tick: (now) => {
          const state = get();
          const events: TickEvent[] = [];
          // 1. Outgoing and scheduled drafts whose time has come.
          for (const d of Object.values(state.drafts)) {
            if (d.scheduledAt && d.scheduledAt <= now) {
              const scheduled = !d.outgoing;
              const threadId = get().sendDraft(d.id, d.outgoing ? now : d.scheduledAt);
              if (threadId) events.push({ type: 'sent', threadId, scheduled });
            }
          }
          // 2. Snoozed conversations waking up.
          const woke = Object.values(get().threads).filter((t) => t.snoozedUntil && t.snoozedUntil <= now);
          if (woke.length) {
            mapThreads(
              woke.map((t) => t.id),
              { snoozedUntil: null, unsnoozedAt: now, inInbox: true, unread: true },
            );
            for (const t of woke) events.push({ type: 'unsnoozed', threadId: t.id, subject: t.subject });
          }
          // 3. Simulated incoming mail.
          const due = get().incoming.filter((i) => i.deliverAt <= now);
          if (due.length) {
            const threads = { ...get().threads };
            for (const inc of due) {
              const threadId = deliver(threads, inc, now);
              events.push({
                type: 'incoming',
                threadId,
                from: inc.from,
                subject: threads[threadId].subject,
                snippet: inc.text.replace(/\s+/g, ' ').slice(0, 90),
              });
            }
            set({ threads, incoming: get().incoming.filter((i) => i.deliverAt > now) });
          }
          return events;
        },

        updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

        addTask: (title, threadId = null, notes) => {
          const task: Task = { id: uid('k'), title, notes, done: false, due: null, threadId, createdAt: Date.now() };
          set({ tasks: [task, ...get().tasks] });
          return task;
        },
        updateTask: (id, patch) => set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
        deleteTask: (id) => set({ tasks: get().tasks.filter((t) => t.id !== id) }),

        addRecentSearch: (q) => {
          const clean = q.trim();
          if (!clean) return;
          set({ recentSearches: [clean, ...get().recentSearches.filter((s) => s !== clean)].slice(0, 8) });
        },
        clearRecentSearches: () => set({ recentSearches: [] }),

        resetMailbox: () => set(freshData(Date.now(), { ...DEFAULT_SETTINGS, theme: get().settings.theme })),
      };
    },
    {
      name: 'opus-mail',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        seededAt: s.seededAt,
        threads: s.threads,
        drafts: s.drafts,
        labels: s.labels,
        tasks: s.tasks,
        events: s.events,
        incoming: s.incoming,
        recentSearches: s.recentSearches,
        settings: s.settings,
      }),
      migrate: () => freshData() as unknown as MailState,
      merge: (persisted, current) => {
        const p = persisted as Partial<MailData> | undefined;
        if (!p || !p.threads) return current;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      },
    },
  ),
);

