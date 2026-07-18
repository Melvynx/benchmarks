import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Attachment, Category, ComposeState, Label, MailboxId, Message, Settings, Thread, Toast, View,
} from '../types';
import { seedThreads, seedArrivals, LABELS_SEED, displayName } from '../data/seed';
import { CONTACTS, ME } from '../data/contacts';
import { uid, snippetOf } from '../lib/utils';
import { isSnoozed, parseQuery, searchThreads } from '../lib/search';

export const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// module-level registries (never persisted)
const undoRegistry = new Map<string, () => void>();
const replyTimers = new Map<string, number>();

const AUTO_REPLIES = [
  (name: string) => `<p>Thanks Alex — got it, I'll take a proper look this afternoon and get back to you.</p><p>— ${name}</p>`,
  (name: string) => `<p>Perfect, works for me. Talk soon!</p><p>${name}</p>`,
  (name: string) => `<p>On it. Give me until end of day and I'll circle back with details.</p><p>— ${name.split(' ')[0]}</p>`,
  (name: string) => `<p>Great, thanks for the heads-up. No notes from my side.</p><p>${name}</p>`,
];

export interface SendPayload {
  threadId?: string;
  draftId?: string | null;
  mode: ComposeState['mode'];
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  attachments: Attachment[];
}

interface MailState {
  threads: Thread[];
  labels: Label[];
  arrivals: Thread[];
  settings: Settings;
  recentSearches: string[];

  view: View;
  page: number;
  selection: string[];
  openThreadId: string | null;
  compose: ComposeState | null;
  toasts: Toast[];
  refreshing: boolean;
  cursorIndex: number | null;

  // navigation
  setView: (v: View) => void;
  openMailbox: (m: MailboxId) => void;
  openLabel: (labelId: string) => void;
  setCategory: (c: Category) => void;
  runSearch: (q: string) => void;
  setPage: (p: number) => void;

  // thread actions
  openThread: (id: string) => void;
  closeThread: () => void;
  toggleSelect: (id: string) => void;
  setSelection: (ids: string[]) => void;
  selectWhere: (ids: string[], pred: (t: Thread) => boolean) => void;
  clearSelection: () => void;
  star: (ids: string[], value?: boolean) => void;
  markRead: (ids: string[], read: boolean) => void;
  archive: (ids: string[]) => void;
  moveToTrash: (ids: string[]) => void;
  deleteForever: (ids: string[]) => void;
  emptyTrash: () => void;
  reportSpam: (ids: string[], spam: boolean) => void;
  moveToInbox: (ids: string[]) => void;
  applyLabel: (ids: string[], labelId: string, on?: boolean) => void;
  createLabel: (name: string, color: string) => string;
  deleteLabel: (labelId: string) => void;
  snooze: (ids: string[], until: number) => void;
  unsnooze: (ids: string[]) => void;
  checkSnoozes: () => void;
  refresh: () => void;
  markAllRead: () => void;

  // compose & send
  openCompose: (partial?: Partial<ComposeState>) => void;
  openDraft: (thread: Thread) => void;
  openForward: (thread: Thread) => void;
  setCompose: (patch: Partial<ComposeState>) => void;
  closeCompose: (save: boolean) => void;
  saveDraft: (c: ComposeState, silent?: boolean) => void;
  discardDraft: (draftId: string) => void;
  sendMessage: (p: SendPayload) => void;

  // misc
  undo: (key: string) => void;
  dismissToast: (id: string) => void;
  pushToast: (t: Omit<Toast, 'id'>, undoFn?: () => void) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addRecentSearch: (q: string) => void;
  setCursor: (i: number | null) => void;
  resetAll: () => void;
}

function cloneThreads(threads: Thread[]): Thread[] {
  return threads.map((t) => ({ ...t, labels: [...t.labels], messages: t.messages.map((m) => ({ ...m })) }));
}

function withSignature(body: string, signature: string): string {
  const sig = signature.trim();
  if (!sig) return body;
  const html = sig
    .split('\n')
    .map((l) => `<p style="margin:0">${l.replace(/</g, '&lt;') || '<br>'}</p>`)
    .join('');
  return `${body}<p style="margin:0"><br></p><p style="margin:0;color:#5f6368">— </p>${html}`;
}

function lastActivity(t: Thread): number {
  const msgDate = t.messages.length ? t.messages[t.messages.length - 1].date : 0;
  return Math.max(msgDate, t.updatedAt ?? 0);
}

export const useMail = create<MailState>()(
  persist(
    (set, get) => ({
      threads: seedThreads(),
      labels: LABELS_SEED.map((l) => ({ ...l })),
      arrivals: seedArrivals(),
      settings: { theme: 'light', density: 'default', signature: 'Alex Carter\nNorthwind · Search & Infrastructure' },
      recentSearches: [],

      view: { kind: 'mailbox', mailbox: 'inbox', category: 'primary' },
      page: 0,
      selection: [],
      openThreadId: null,
      compose: null,
      toasts: [],
      refreshing: false,
      cursorIndex: null,

      // ------------------------------------------------ navigation
      setView: (v) => set({ view: v, page: 0, selection: [], cursorIndex: null }),
      openMailbox: (m) => {
        const v = get().view;
        const prevCat = v.kind === 'mailbox' && v.category ? v.category : 'primary';
        set({
          view: { kind: 'mailbox', mailbox: m, ...(m === 'inbox' ? { category: prevCat } : {}) },
          page: 0, selection: [], cursorIndex: null,
        });
      },
      openLabel: (labelId) => set({ view: { kind: 'label', labelId }, page: 0, selection: [], cursorIndex: null }),
      setCategory: (c) => {
        const v = get().view;
        if (v.kind === 'mailbox' && v.mailbox === 'inbox') set({ view: { ...v, category: c }, page: 0, selection: [], cursorIndex: null });
      },
      runSearch: (q) => {
        const query = q.trim();
        if (!query) return;
        get().addRecentSearch(query);
        set({ view: { kind: 'search', query }, page: 0, selection: [], cursorIndex: null });
      },
      setPage: (p) => set({ page: Math.max(0, p), selection: [], cursorIndex: null }),

      // ------------------------------------------------ thread actions
      openThread: (id) => {
        const t = get().threads.find((th) => th.id === id);
        if (!t) return;
        if (t.labels.includes('DRAFT')) {
          get().openDraft(t);
          return;
        }
        set((s) => ({
          openThreadId: id,
          threads: s.threads.map((th) => (th.id === id ? { ...th, read: true } : th)),
        }));
      },
      closeThread: () => set({ openThreadId: null }),

      toggleSelect: (id) =>
        set((s) => ({
          selection: s.selection.includes(id) ? s.selection.filter((x) => x !== id) : [...s.selection, id],
        })),
      setSelection: (ids) => set({ selection: ids }),
      selectWhere: (ids, pred) => {
        const ths = get().threads;
        set({ selection: ids.filter((id) => { const t = ths.find((x) => x.id === id); return t ? pred(t) : false; }) });
      },
      clearSelection: () => set({ selection: [] }),

      star: (ids, value) =>
        set((s) => ({
          threads: s.threads.map((t) => (ids.includes(t.id) ? { ...t, starred: value ?? !t.starred } : t)),
        })),

      markRead: (ids, read) =>
        set((s) => ({ threads: s.threads.map((t) => (ids.includes(t.id) ? { ...t, read } : t)) })),

      archive: (ids) => {
        const prev = cloneThreads(get().threads);
        set((s) => ({
          threads: s.threads.map((t) =>
            ids.includes(t.id) ? { ...t, labels: t.labels.filter((l) => l !== 'INBOX'), snoozeUntil: undefined } : t,
          ),
          selection: [],
          openThreadId: ids.includes(get().openThreadId ?? '') ? null : get().openThreadId,
        }));
        get().pushToast(
          { message: ids.length > 1 ? `${ids.length} conversations archived` : 'Conversation archived', actionLabel: 'Undo' },
          () => set({ threads: prev }),
        );
      },

      moveToTrash: (ids) => {
        const prev = cloneThreads(get().threads);
        set((s) => ({
          threads: s.threads.map((t) =>
            ids.includes(t.id)
              ? { ...t, labels: ['TRASH', ...t.labels.filter((l) => !['INBOX', 'SPAM', 'SENT', 'TRASH', 'DRAFT'].includes(l))], snoozeUntil: undefined }
              : t,
          ),
          selection: [],
          openThreadId: ids.includes(get().openThreadId ?? '') ? null : get().openThreadId,
        }));
        get().pushToast(
          { message: ids.length > 1 ? `${ids.length} conversations moved to Trash` : 'Conversation moved to Trash', actionLabel: 'Undo' },
          () => set({ threads: prev }),
        );
      },

      deleteForever: (ids) => {
        set((s) => ({
          threads: s.threads.filter((t) => !ids.includes(t.id)),
          selection: [],
          openThreadId: ids.includes(get().openThreadId ?? '') ? null : get().openThreadId,
        }));
        get().pushToast({ message: ids.length > 1 ? `${ids.length} conversations deleted forever` : 'Conversation deleted forever' });
      },

      emptyTrash: () => {
        const n = get().threads.filter((t) => t.labels.includes('TRASH')).length;
        if (!n) return;
        set((s) => ({ threads: s.threads.filter((t) => !t.labels.includes('TRASH')), selection: [], openThreadId: null }));
        get().pushToast({ message: `Trash emptied — ${n} conversations deleted forever` });
      },

      reportSpam: (ids, spam) => {
        const prev = cloneThreads(get().threads);
        set((s) => ({
          threads: s.threads.map((t) => {
            if (!ids.includes(t.id)) return t;
            const base = t.labels.filter((l) => !['SPAM', 'INBOX'].includes(l));
            return { ...t, labels: spam ? [...base, 'SPAM'] : [...base, 'INBOX'], snoozeUntil: undefined };
          }),
          selection: [],
          openThreadId: ids.includes(get().openThreadId ?? '') ? null : get().openThreadId,
        }));
        get().pushToast(
          { message: spam ? 'Conversation reported as spam' : 'Conversation unmarked as spam', actionLabel: 'Undo' },
          () => set({ threads: prev }),
        );
      },

      moveToInbox: (ids) => {
        const prev = cloneThreads(get().threads);
        set((s) => ({
          threads: s.threads.map((t) =>
            ids.includes(t.id)
              ? { ...t, labels: [...t.labels.filter((l) => !['TRASH', 'SPAM'].includes(l)), 'INBOX'] }
              : t,
          ),
          selection: [],
          openThreadId: ids.includes(get().openThreadId ?? '') ? null : get().openThreadId,
        }));
        get().pushToast(
          { message: ids.length > 1 ? `${ids.length} conversations moved to Inbox` : 'Conversation moved to Inbox', actionLabel: 'Undo' },
          () => set({ threads: prev }),
        );
      },

      applyLabel: (ids, labelId, on) => {
        const label = get().labels.find((l) => l.id === labelId);
        set((s) => ({
          threads: s.threads.map((t) => {
            if (!ids.includes(t.id)) return t;
            const has = t.labels.includes(labelId);
            const want = on ?? !has;
            if (want === has) return t;
            return { ...t, labels: want ? [...t.labels, labelId] : t.labels.filter((l) => l !== labelId) };
          }),
        }));
        if (label) get().pushToast({ message: `Label "${label.name}" updated` });
      },

      createLabel: (name, color) => {
        const id = uid('lbl');
        set((s) => ({ labels: [...s.labels, { id, name: name.trim(), color }] }));
        return id;
      },

      deleteLabel: (labelId) =>
        set((s) => ({
          labels: s.labels.filter((l) => l.id !== labelId),
          threads: s.threads.map((t) => ({ ...t, labels: t.labels.filter((l) => l !== labelId) })),
          view: s.view.kind === 'label' && s.view.labelId === labelId ? { kind: 'mailbox', mailbox: 'inbox', category: 'primary' } : s.view,
        })),

      snooze: (ids, until) => {
        const prev = cloneThreads(get().threads);
        set((s) => ({
          threads: s.threads.map((t) => (ids.includes(t.id) ? { ...t, snoozeUntil: until } : t)),
          selection: [],
          openThreadId: ids.includes(get().openThreadId ?? '') ? null : get().openThreadId,
        }));
        get().pushToast(
          { message: `Snoozed until ${new Date(until).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`, actionLabel: 'Undo' },
          () => set({ threads: prev }),
        );
      },

      unsnooze: (ids) =>
        set((s) => ({ threads: s.threads.map((t) => (ids.includes(t.id) ? { ...t, snoozeUntil: undefined } : t)) })),

      checkSnoozes: () => {
        const now = Date.now();
        const due = get().threads.filter((t) => t.snoozeUntil && t.snoozeUntil <= now).map((t) => t.id);
        if (!due.length) return;
        set((s) => ({
          threads: s.threads.map((t) =>
            due.includes(t.id) ? { ...t, snoozeUntil: undefined, read: false, labels: t.labels.includes('INBOX') ? t.labels : [...t.labels, 'INBOX'] } : t,
          ),
        }));
      },

      refresh: () => {
        if (get().refreshing) return;
        set({ refreshing: true });
        get().checkSnoozes();
        const next = get().arrivals[0];
        window.setTimeout(() => {
          set({ refreshing: false });
          if (next) {
            set((s) => ({ threads: [...s.threads, { ...next, messages: next.messages.map((m) => ({ ...m, date: Date.now() })) }], arrivals: s.arrivals.slice(1) }));
            get().pushToast({ message: `New mail from ${displayName(next.messages[0].from)}` });
          } else {
            get().pushToast({ message: 'No new mail' });
          }
        }, 800);
      },

      markAllRead: () => {
        set((s) => ({
          threads: s.threads.map((t) => (t.labels.includes('INBOX') ? { ...t, read: true } : t)),
        }));
        get().pushToast({ message: 'All messages in Inbox marked as read' });
      },

      // ------------------------------------------------ compose & send
      openCompose: (partial) =>
        set({
          compose: {
            draftId: null, mode: 'new', to: [], cc: [], bcc: [], subject: '', body: '',
            attachments: [], showCcBcc: false, minimized: false, showFormatting: true,
            ...partial,
          },
        }),

      openDraft: (thread) =>
        set({
          compose: {
            draftId: thread.id,
            mode: 'new',
            to: thread.draftTo ?? [],
            cc: thread.draftCc ?? [],
            bcc: thread.draftBcc ?? [],
            subject: thread.subject,
            body: thread.draftBody ?? '',
            attachments: thread.draftAttachments ?? [],
            showCcBcc: (thread.draftCc ?? []).length > 0 || (thread.draftBcc ?? []).length > 0,
            minimized: false,
            showFormatting: true,
          },
        }),

      openForward: (thread) => {
        const last = thread.messages[thread.messages.length - 1];
        set({
          compose: {
            draftId: null, mode: 'forward', threadId: thread.id,
            to: [], cc: [], bcc: [],
            subject: thread.subject.startsWith('Fwd:') ? thread.subject : `Fwd: ${thread.subject}`,
            body: `<p><br></p><p>---------- Forwarded message ----------</p><p>From: ${displayName(last.from)} &lt;${last.from}&gt;<br>Date: ${new Date(last.date).toLocaleString('en-US')}<br>Subject: ${thread.subject}</p><p><br></p>${last.body}`,
            attachments: last.attachments ?? [],
            showCcBcc: false, minimized: false, showFormatting: true,
          },
        });
      },

      setCompose: (patch) => {
        const c = get().compose;
        if (c) set({ compose: { ...c, ...patch } });
      },

      closeCompose: (save) => {
        const c = get().compose;
        if (!c) return;
        set({ compose: null });
        if (save) get().saveDraft(c);
      },

      saveDraft: (c, silent) => {
        const isEmpty =
          !c.to.length && !c.cc.length && !c.bcc.length && !c.subject.trim() && !c.body.replace(/<[^>]*>/g, '').trim() && !c.attachments.length;
        if (isEmpty && !c.draftId) return;
        if (isEmpty && c.draftId) {
          get().discardDraft(c.draftId);
          return;
        }
        set((s) => {
          const existing = c.draftId ? s.threads.find((t) => t.id === c.draftId) : undefined;
          const draft: Thread = {
            id: c.draftId ?? uid('thr'),
            subject: c.subject,
            messages: existing?.messages ?? [],
            labels: existing ? [...new Set([...existing.labels.filter((l) => l !== 'INBOX'), 'DRAFT'])] : ['DRAFT'],
            starred: existing?.starred ?? false,
            read: true,
            draftTo: c.to, draftCc: c.cc, draftBcc: c.bcc, draftBody: c.body, draftAttachments: c.attachments,
            updatedAt: Date.now(),
          };
          return {
            threads: existing ? s.threads.map((t) => (t.id === draft.id ? draft : t)) : [draft, ...s.threads],
          };
        });
        if (!silent) get().pushToast({ message: 'Draft saved' });
      },

      discardDraft: (draftId) => {
        set((s) => ({ threads: s.threads.filter((t) => t.id !== draftId) }));
        get().pushToast({ message: 'Draft discarded' });
      },

      sendMessage: (p) => {
        const state = get();
        const body = withSignature(p.body, state.settings.signature);
        const msg: Message = {
          id: uid('msg'),
          from: ME.email,
          to: p.to,
          cc: p.cc.length ? p.cc : undefined,
          date: Date.now(),
          body,
          attachments: p.attachments.length ? p.attachments : undefined,
        };
        const prevDraft = p.draftId ? state.threads.find((t) => t.id === p.draftId) : undefined;
        const prevDraftClone = prevDraft ? { ...prevDraft, labels: [...prevDraft.labels] } : null;
        const replyTarget = p.threadId ? state.threads.find((t) => t.id === p.threadId) : undefined;
        const replyTargetClone = replyTarget
          ? { ...replyTarget, labels: [...replyTarget.labels], messages: replyTarget.messages.map((m) => ({ ...m })) }
          : null;

        let newThreadId: string | null = null;
        set((s) => {
          let threads = s.threads;
          if (p.draftId) threads = threads.filter((t) => t.id !== p.draftId);
          if (replyTarget && (p.mode === 'reply' || p.mode === 'replyAll' || p.mode === 'forward')) {
            threads = threads.map((t) =>
              t.id === replyTarget.id
                ? {
                    ...t,
                    read: true,
                    snoozeUntil: undefined,
                    labels: [...new Set([...t.labels.filter((l) => l !== 'DRAFT'), 'SENT'])],
                    messages: [...t.messages, msg],
                  }
                : t,
            );
          } else {
            newThreadId = uid('thr');
            const selfAddressed = [...p.to, ...p.cc, ...p.bcc].includes(ME.email);
            threads = [
              {
                id: newThreadId,
                subject: p.subject || '(no subject)',
                messages: [msg],
                labels: selfAddressed ? ['SENT', 'INBOX'] : ['SENT'],
                category: selfAddressed ? ('primary' as const) : undefined,
                starred: false,
                read: true,
              },
              ...threads,
            ];
          }
          return { threads, compose: null };
        });

        const threadId = replyTarget?.id ?? newThreadId;
        const timerKeys = [...replyTimers.keys()];
        get().pushToast({ message: 'Message sent', actionLabel: 'Undo' }, () => {
          for (const k of timerKeys) {
            const timer = replyTimers.get(k);
            if (timer) window.clearTimeout(timer);
            replyTimers.delete(k);
          }
          set((s) => {
            let threads = s.threads;
            if (replyTargetClone) {
              threads = threads.map((t) => (t.id === replyTargetClone.id ? replyTargetClone : t));
            } else if (threadId) {
              threads = threads.filter((t) => t.id !== threadId);
            }
            if (prevDraftClone) threads = [prevDraftClone, ...threads];
            return { threads };
          });
        });

        // simulated correspondent replies
        const recipients = [...p.to, ...p.cc];
        const responder = recipients
          .map((r) => CONTACTS.find((c) => c.email === r))
          .find((c) => c?.autoReply);
        if (responder && threadId) {
          const tid = threadId;
          const key = uid('reply');
          const delay = 5000 + Math.random() * 4000;
          const timer = window.setTimeout(() => {
            replyTimers.delete(key);
            const current = get().threads.find((t) => t.id === tid);
            if (!current || current.labels.includes('TRASH')) return;
            const tpl = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
            const reply: Message = {
              id: uid('msg'),
              from: responder.email,
              to: [ME.email],
              date: Date.now(),
              body: tpl(responder.name),
            };
            set((s) => ({
              threads: s.threads.map((t) =>
                t.id === tid
                  ? {
                      ...t,
                      read: get().openThreadId === tid,
                      labels: t.labels.includes('INBOX') ? t.labels : [...t.labels, 'INBOX'],
                      category: t.category ?? 'primary',
                      messages: [...t.messages, reply],
                    }
                  : t,
              ),
            }));
            get().pushToast({ message: `New message from ${responder.name}` });
          }, delay);
          replyTimers.set(key, timer);
        }
      },

      // ------------------------------------------------ misc
      undo: (key) => {
        const fn = undoRegistry.get(key);
        if (fn) {
          undoRegistry.delete(key);
          fn();
        }
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== key) }));
      },

      dismissToast: (id) => {
        undoRegistry.delete(id);
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      },

      pushToast: (t, undoFn) => {
        const id = uid('toast');
        if (undoFn) undoRegistry.set(id, undoFn);
        set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
        window.setTimeout(() => get().dismissToast(id), 6000);
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      addRecentSearch: (q) =>
        set((s) => ({ recentSearches: [q, ...s.recentSearches.filter((x) => x !== q)].slice(0, 8) })),

      setCursor: (i) => set({ cursorIndex: i }),

      resetAll: () => {
        for (const [, timer] of replyTimers) window.clearTimeout(timer);
        replyTimers.clear();
        undoRegistry.clear();
        set({
          threads: seedThreads(),
          labels: LABELS_SEED.map((l) => ({ ...l })),
          arrivals: seedArrivals(),
          recentSearches: [],
          view: { kind: 'mailbox', mailbox: 'inbox', category: 'primary' },
          page: 0, selection: [], openThreadId: null, compose: null, toasts: [], cursorIndex: null,
        });
        get().pushToast({ message: 'Demo data reset to the original mailbox' });
      },
    }),
    {
      name: 'k3mail:v1',
      partialize: (s) => ({
        threads: s.threads,
        labels: s.labels,
        arrivals: s.arrivals,
        settings: s.settings,
        recentSearches: s.recentSearches,
      }),
      onRehydrateStorage: () => (state) => {
        state?.checkSnoozes();
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// selectors (pure helpers over state)

export function threadsForView(threads: Thread[], view: View, labels: Label[]): Thread[] {
  let list: Thread[];
  switch (view.kind) {
    case 'mailbox': {
      const m = view.mailbox;
      if (m === 'inbox') {
        const cat = view.category ?? 'primary';
        list = threads.filter(
          (t) =>
            t.labels.includes('INBOX') &&
            !isSnoozed(t) &&
            !t.labels.includes('DRAFT') &&
            (t.category ?? 'primary') === cat,
        );
      } else if (m === 'starred') {
        list = threads.filter((t) => t.starred && !t.labels.includes('TRASH') && !t.labels.includes('SPAM'));
      } else if (m === 'snoozed') {
        list = threads.filter((t) => isSnoozed(t));
      } else if (m === 'sent') {
        list = threads.filter((t) => t.labels.includes('SENT') && !t.labels.includes('TRASH'));
      } else if (m === 'drafts') {
        list = threads.filter((t) => t.labels.includes('DRAFT'));
      } else if (m === 'spam') {
        list = threads.filter((t) => t.labels.includes('SPAM'));
      } else if (m === 'trash') {
        list = threads.filter((t) => t.labels.includes('TRASH'));
      } else {
        // all mail
        list = threads.filter((t) => !t.labels.includes('TRASH') && !t.labels.includes('SPAM') && !t.labels.includes('DRAFT'));
      }
      break;
    }
    case 'label':
      list = threads.filter((t) => t.labels.includes(view.labelId) && !t.labels.includes('TRASH') && !t.labels.includes('DRAFT'));
      break;
    case 'search':
      list = searchThreads(threads, parseQuery(view.query), labels).filter((t) => !t.labels.includes('DRAFT'));
      break;
  }
  return [...list].sort((a, b) => lastActivity(b) - lastActivity(a));
}

export function categoryCounts(threads: Thread[]): Record<Category, number> {
  const counts: Record<Category, number> = { primary: 0, social: 0, promotions: 0, updates: 0 };
  for (const t of threads) {
    if (!t.labels.includes('INBOX') || isSnoozed(t) || t.labels.includes('DRAFT') || t.read) continue;
    counts[t.category ?? 'primary'] += 1;
  }
  return counts;
}

export function unreadIn(threads: Thread[], mailbox: MailboxId): number {
  switch (mailbox) {
    case 'inbox':
      return threads.filter((t) => t.labels.includes('INBOX') && !isSnoozed(t) && !t.read).length;
    case 'drafts':
      return threads.filter((t) => t.labels.includes('DRAFT')).length;
    case 'spam':
      return threads.filter((t) => t.labels.includes('SPAM') && !t.read).length;
    case 'snoozed':
      return threads.filter((t) => isSnoozed(t)).length;
    default:
      return 0;
  }
}

export function viewTitle(view: View, labels: Label[]): string {
  switch (view.kind) {
    case 'mailbox':
      return {
        inbox: 'Inbox', starred: 'Starred', snoozed: 'Snoozed', sent: 'Sent',
        drafts: 'Drafts', all: 'All Mail', spam: 'Spam', trash: 'Trash',
      }[view.mailbox];
    case 'label':
      return labels.find((l) => l.id === view.labelId)?.name ?? 'Label';
    case 'search':
      return `Search results`;
  }
}

export function threadSnippet(t: Thread): string {
  if (t.labels.includes('DRAFT')) return snippetOf(t.draftBody ?? '', 120) || '(empty draft)';
  const last = t.messages[t.messages.length - 1];
  return last ? snippetOf(last.body, 160) : '';
}

export { isSnoozed };
