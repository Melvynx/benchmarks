import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Category,
  ComposeState,
  Contact,
  FolderId,
  Label,
  Message,
  Route,
  Settings,
  Thread,
  Toast,
} from '../types'
import { ME, SEED_LABELS, SEED_VERSION, seedThreads } from '../data/seed'
import { hasDraft, lastNonDraft } from '../lib/mail'
import { snippetOf, uid } from '../lib/utils'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

export interface MailStore {
  threads: Thread[]
  labels: Label[]
  seedVersion: number
  settings: Settings

  route: Route
  categoryTab: Category
  searchInput: string
  selected: string[]
  cursor: number
  composers: ComposeState[]
  toastState: Toast | null
  navCollapsed: boolean
  drawerOpen: boolean
  settingsOpen: boolean
  shortcutsOpen: boolean
  lastSnapshot: { threads: Thread[]; removedIds: string[] } | null

  // navigation
  navigate: (route: Route) => void
  openThread: (id: string) => void
  closeThread: () => void
  setCategoryTab: (cat: Category) => void
  setSearchInput: (value: string) => void
  setCursor: (index: number) => void
  setNavCollapsed: (collapsed: boolean) => void
  setDrawerOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setShortcutsOpen: (open: boolean) => void

  // selection
  toggleSelect: (id: string) => void
  setSelected: (ids: string[]) => void
  clearSelection: () => void

  // thread operations
  archiveThreads: (ids: string[]) => void
  trashThreads: (ids: string[]) => void
  deleteForever: (ids: string[]) => void
  markSpam: (ids: string[]) => void
  notSpam: (ids: string[]) => void
  moveToInbox: (ids: string[]) => void
  markRead: (ids: string[], read: boolean) => void
  toggleThreadStar: (id: string) => void
  toggleMessageStar: (threadId: string, messageId: string) => void
  snoozeThreads: (ids: string[], until: number) => void
  unsnoozeThreads: (ids: string[]) => void
  applyLabel: (ids: string[], labelId: string, on: boolean) => void
  createLabel: (name: string, color: string) => Label | null
  deleteLabel: (id: string) => void
  emptyFolder: (folder: 'trash' | 'spam') => void
  wakeSnoozed: () => void
  undo: () => void

  // compose
  openCompose: (init?: Partial<ComposeState>) => void
  openDraft: (threadId: string) => void
  updateComposer: (id: string, patch: Partial<ComposeState>) => void
  closeComposer: (id: string, opts?: { discard?: boolean }) => void
  sendComposer: (id: string) => void
  saveComposerDraft: (id: string) => void

  // inline replies
  upsertReplyDraft: (
    threadId: string,
    messageId: string | null,
    patch: { to: Contact[]; cc: Contact[]; bodyHtml: string; quotedHtml?: string },
  ) => string
  discardDraftMessage: (threadId: string, messageId: string) => void
  sendReply: (threadId: string, draftMessageId: string | null, data: {
    to: Contact[]
    cc: Contact[]
    bodyHtml: string
    quotedHtml?: string
  }) => void

  // toasts & settings
  toast: (text: string, opts?: { actionLabel?: string; action?: () => void; duration?: number }) => void
  dismissToast: () => void
  setSettings: (patch: Partial<Settings>) => void
  resetData: () => void
}

function freshSeed() {
  return {
    threads: seedThreads(),
    labels: clone(SEED_LABELS),
    seedVersion: SEED_VERSION,
  }
}

function newMessage(threadId: string, data: {
  to: Contact[]
  cc?: Contact[]
  bodyHtml: string
  quotedHtml?: string
  attachments?: Message['attachments']
  draft?: boolean
}): Message {
  return {
    id: uid('m'),
    threadId,
    from: ME,
    to: data.to,
    cc: data.cc?.length ? data.cc : undefined,
    date: Date.now(),
    bodyHtml: data.bodyHtml,
    quotedHtml: data.quotedHtml,
    snippet: snippetOf(data.bodyHtml),
    attachments: data.attachments?.length ? data.attachments : undefined,
    unread: false,
    starred: false,
    draft: data.draft,
  }
}

export const useMail = create<MailStore>()(
  persist(
    (set, get) => {
      /** Snapshot threads before a mutation so the action can be undone. */
      const snapshot = (ids: string[]) => {
        const threads = get().threads.filter((t) => ids.includes(t.id))
        set({ lastSnapshot: { threads: clone(threads), removedIds: [] } })
      }

      const mutateThreads = (ids: string[], fn: (t: Thread) => Thread) => {
        set((s) => ({
          threads: s.threads.map((t) => (ids.includes(t.id) ? fn(t) : t)),
        }))
      }

      const afterBulkAction = (ids: string[]) => {
        const s = get()
        set({ selected: s.selected.filter((id) => !ids.includes(id)) })
        if (s.route.threadId && ids.includes(s.route.threadId)) {
          set({ route: { ...s.route, threadId: undefined } })
        }
      }

      const undoableToast = (text: string) => {
        get().toast(text, { actionLabel: 'Undo', action: () => get().undo() })
      }

      return {
        ...freshSeed(),
        settings: { theme: 'system', density: 'comfortable', undoSendSeconds: 5 },

        route: { folder: 'inbox' },
        categoryTab: 'primary',
        searchInput: '',
        selected: [],
        cursor: -1,
        composers: [],
        toastState: null,
        navCollapsed: false,
        drawerOpen: false,
        settingsOpen: false,
        shortcutsOpen: false,
        lastSnapshot: null,

        navigate: (route) => {
          set({
            route,
            selected: [],
            cursor: -1,
            drawerOpen: false,
            searchInput: route.folder === 'search' ? (route.query ?? '') : '',
          })
        },

        openThread: (id) => {
          const s = get()
          set({ route: { ...s.route, threadId: id } })
          mutateThreads([id], (t) => ({
            ...t,
            messages: t.messages.map((m) => ({ ...m, unread: false })),
          }))
        },

        closeThread: () => {
          const s = get()
          set({ route: { ...s.route, threadId: undefined } })
        },

        setCategoryTab: (categoryTab) => set({ categoryTab, selected: [], cursor: -1 }),
        setSearchInput: (searchInput) => set({ searchInput }),
        setCursor: (cursor) => set({ cursor }),
        setNavCollapsed: (navCollapsed) => set({ navCollapsed }),
        setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
        setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
        setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),

        toggleSelect: (id) =>
          set((s) => ({
            selected: s.selected.includes(id)
              ? s.selected.filter((x) => x !== id)
              : [...s.selected, id],
          })),
        setSelected: (selected) => set({ selected }),
        clearSelection: () => set({ selected: [] }),

        archiveThreads: (ids) => {
          if (!ids.length) return
          snapshot(ids)
          mutateThreads(ids, (t) => ({ ...t, location: 'archive', snoozedUntil: undefined }))
          afterBulkAction(ids)
          undoableToast(ids.length === 1 ? 'Conversation archived' : `${ids.length} conversations archived`)
        },

        trashThreads: (ids) => {
          if (!ids.length) return
          snapshot(ids)
          mutateThreads(ids, (t) => ({ ...t, location: 'trash', snoozedUntil: undefined }))
          afterBulkAction(ids)
          undoableToast(ids.length === 1 ? 'Conversation moved to Trash' : `${ids.length} conversations moved to Trash`)
        },

        deleteForever: (ids) => {
          if (!ids.length) return
          set((s) => ({ threads: s.threads.filter((t) => !ids.includes(t.id)), lastSnapshot: null }))
          afterBulkAction(ids)
          get().toast(ids.length === 1 ? 'Conversation deleted forever' : `${ids.length} conversations deleted forever`)
        },

        markSpam: (ids) => {
          if (!ids.length) return
          snapshot(ids)
          mutateThreads(ids, (t) => ({ ...t, location: 'spam', snoozedUntil: undefined }))
          afterBulkAction(ids)
          undoableToast(ids.length === 1 ? 'Conversation marked as spam' : `${ids.length} conversations marked as spam`)
        },

        notSpam: (ids) => {
          if (!ids.length) return
          snapshot(ids)
          mutateThreads(ids, (t) => ({ ...t, location: 'inbox' }))
          afterBulkAction(ids)
          undoableToast('Marked as not spam')
        },

        moveToInbox: (ids) => {
          if (!ids.length) return
          snapshot(ids)
          mutateThreads(ids, (t) => ({ ...t, location: 'inbox', snoozedUntil: undefined }))
          afterBulkAction(ids)
          undoableToast(ids.length === 1 ? 'Conversation moved to Inbox' : `${ids.length} conversations moved to Inbox`)
        },

        markRead: (ids, read) => {
          if (!ids.length) return
          mutateThreads(ids, (t) => ({
            ...t,
            messages: t.messages.map((m) => ({ ...m, unread: !read && !m.draft })),
          }))
          get().toast(
            `${ids.length === 1 ? 'Conversation' : `${ids.length} conversations`} marked as ${read ? 'read' : 'unread'}`,
          )
        },

        toggleThreadStar: (id) => {
          const t = get().threads.find((x) => x.id === id)
          if (!t) return
          const starred = t.messages.some((m) => m.starred)
          mutateThreads([id], (thread) => {
            if (starred) {
              return { ...thread, messages: thread.messages.map((m) => ({ ...m, starred: false })) }
            }
            const target = lastNonDraft(thread) ?? thread.messages[thread.messages.length - 1]
            return {
              ...thread,
              messages: thread.messages.map((m) => (m.id === target.id ? { ...m, starred: true } : m)),
            }
          })
        },

        toggleMessageStar: (threadId, messageId) => {
          mutateThreads([threadId], (t) => ({
            ...t,
            messages: t.messages.map((m) => (m.id === messageId ? { ...m, starred: !m.starred } : m)),
          }))
        },

        snoozeThreads: (ids, until) => {
          if (!ids.length) return
          snapshot(ids)
          mutateThreads(ids, (t) => ({ ...t, snoozedUntil: until, location: 'inbox' }))
          afterBulkAction(ids)
          undoableToast(ids.length === 1 ? 'Conversation snoozed' : `${ids.length} conversations snoozed`)
        },

        unsnoozeThreads: (ids) => {
          if (!ids.length) return
          snapshot(ids)
          mutateThreads(ids, (t) => ({ ...t, snoozedUntil: undefined }))
          undoableToast('Unsnoozed')
        },

        applyLabel: (ids, labelId, on) => {
          if (!ids.length) return
          mutateThreads(ids, (t) => ({
            ...t,
            labelIds: on
              ? Array.from(new Set([...t.labelIds, labelId]))
              : t.labelIds.filter((l) => l !== labelId),
          }))
          const label = get().labels.find((l) => l.id === labelId)
          if (label) get().toast(on ? `Label “${label.name}” added` : `Label “${label.name}” removed`)
        },

        createLabel: (name, color) => {
          const trimmed = name.trim()
          if (!trimmed) return null
          const exists = get().labels.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())
          if (exists) {
            get().toast('A label with that name already exists')
            return null
          }
          const label: Label = { id: uid('label'), name: trimmed, color }
          set((s) => ({ labels: [...s.labels, label] }))
          get().toast(`Label “${trimmed}” created`)
          return label
        },

        deleteLabel: (id) => {
          const label = get().labels.find((l) => l.id === id)
          set((s) => ({
            labels: s.labels.filter((l) => l.id !== id),
            threads: s.threads.map((t) => ({ ...t, labelIds: t.labelIds.filter((l) => l !== id) })),
            route: s.route.folder === 'label' && s.route.labelId === id ? { folder: 'inbox' } : s.route,
          }))
          if (label) get().toast(`Label “${label.name}” deleted`)
        },

        emptyFolder: (folder) => {
          set((s) => ({
            threads: s.threads.filter((t) => t.location !== folder),
            lastSnapshot: null,
          }))
          get().toast(folder === 'trash' ? 'Trash emptied' : 'Spam emptied')
        },

        wakeSnoozed: () => {
          const now = Date.now()
          const due = get().threads.filter((t) => t.snoozedUntil !== undefined && t.snoozedUntil <= now)
          if (!due.length) return
          mutateThreads(
            due.map((t) => t.id),
            (t) => {
              const last = lastNonDraft(t)
              return {
                ...t,
                snoozedUntil: undefined,
                location: 'inbox',
                messages: t.messages.map((m) => (m.id === last?.id ? { ...m, unread: true } : m)),
              }
            },
          )
        },

        undo: () => {
          const snap = get().lastSnapshot
          if (!snap) return
          set((s) => {
            const restoredIds = new Set(snap.threads.map((t) => t.id))
            const kept = s.threads.filter((t) => !restoredIds.has(t.id))
            return { threads: [...kept, ...snap.threads], lastSnapshot: null, toastState: null }
          })
        },

        openCompose: (init) => {
          const s = get()
          if (s.composers.length >= 3) {
            s.toast('Close a compose window first')
            return
          }
          const composer: ComposeState = {
            id: uid('c'),
            to: [],
            cc: [],
            bcc: [],
            subject: '',
            bodyHtml: '',
            attachments: [],
            minimized: false,
            maximized: false,
            ...init,
          }
          set({ composers: [...s.composers, composer] })
        },

        openDraft: (threadId) => {
          const s = get()
          const thread = s.threads.find((t) => t.id === threadId)
          if (!thread) return
          const draft = [...thread.messages].reverse().find((m) => m.draft)
          if (!draft) return
          const standalone = thread.messages.every((m) => m.draft)
          if (standalone) {
            const existing = s.composers.find((c) => c.draftThreadId === threadId)
            if (existing) {
              get().updateComposer(existing.id, { minimized: false })
              return
            }
            get().openCompose({
              to: draft.to.filter((r) => !r.me),
              cc: draft.cc ?? [],
              subject: thread.subject === '(no subject)' ? '' : thread.subject,
              bodyHtml: draft.bodyHtml,
              attachments: draft.attachments ?? [],
              draftThreadId: threadId,
              draftMessageId: draft.id,
            })
          } else {
            get().openThread(threadId)
          }
        },

        updateComposer: (id, patch) => {
          set((s) => ({
            composers: s.composers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          }))
        },

        saveComposerDraft: (id) => {
          const s = get()
          const c = s.composers.find((x) => x.id === id)
          if (!c) return
          const hasContent =
            c.to.length > 0 || c.cc.length > 0 || c.subject.trim() !== '' || snippetOf(c.bodyHtml) !== '' || c.attachments.length > 0
          if (!hasContent) return

          if (c.draftThreadId && c.draftMessageId) {
            mutateThreads([c.draftThreadId], (t) => ({
              ...t,
              subject: c.subject.trim() || '(no subject)',
              messages: t.messages.map((m) =>
                m.id === c.draftMessageId
                  ? {
                      ...m,
                      to: c.to,
                      cc: c.cc.length ? c.cc : undefined,
                      bodyHtml: c.bodyHtml,
                      snippet: snippetOf(c.bodyHtml),
                      attachments: c.attachments.length ? c.attachments : undefined,
                      date: Date.now(),
                    }
                  : m,
              ),
            }))
          } else {
            const threadId = uid('t')
            const draft = newMessage(threadId, {
              to: c.to,
              cc: c.cc,
              bodyHtml: c.bodyHtml,
              attachments: c.attachments,
              draft: true,
            })
            const thread: Thread = {
              id: threadId,
              subject: c.subject.trim() || '(no subject)',
              messages: [draft],
              labelIds: [],
              category: 'primary',
              location: 'archive',
            }
            set((st) => ({ threads: [...st.threads, thread] }))
            get().updateComposer(id, { draftThreadId: threadId, draftMessageId: draft.id })
          }
        },

        closeComposer: (id, opts) => {
          const s = get()
          const c = s.composers.find((x) => x.id === id)
          if (!c) return
          if (opts?.discard) {
            if (c.draftThreadId) {
              set((st) => ({ threads: st.threads.filter((t) => t.id !== c.draftThreadId) }))
            }
            set((st) => ({ composers: st.composers.filter((x) => x.id !== id) }))
            get().toast('Draft discarded')
            return
          }
          get().saveComposerDraft(id)
          const saved = get().composers.find((x) => x.id === id)
          set((st) => ({ composers: st.composers.filter((x) => x.id !== id) }))
          if (saved?.draftThreadId) get().toast('Draft saved')
        },

        sendComposer: (id) => {
          const s = get()
          const c = s.composers.find((x) => x.id === id)
          if (!c) return
          if (c.to.length === 0 && c.cc.length === 0 && c.bcc.length === 0) {
            get().toast('Please specify at least one recipient')
            return
          }

          const composerCopy = clone(c)
          let threadId: string
          let messageId: string
          let createdThread = false

          if (c.replyToThreadId && s.threads.some((t) => t.id === c.replyToThreadId)) {
            threadId = c.replyToThreadId
            const msg = newMessage(threadId, {
              to: c.to,
              cc: c.cc,
              bodyHtml: c.bodyHtml,
              quotedHtml: c.quotedHtml,
              attachments: c.attachments,
            })
            messageId = msg.id
            mutateThreads([threadId], (t) => ({
              ...t,
              messages: [...t.messages.filter((m) => m.id !== c.draftMessageId), msg],
            }))
          } else {
            createdThread = true
            threadId = uid('t')
            const msg = newMessage(threadId, {
              to: c.to,
              cc: c.cc,
              bodyHtml: c.bodyHtml,
              quotedHtml: c.quotedHtml,
              attachments: c.attachments,
            })
            messageId = msg.id
            const thread: Thread = {
              id: threadId,
              subject: c.subject.trim() || '(no subject)',
              messages: [msg],
              labelIds: [],
              category: 'primary',
              location: 'archive',
            }
            set((st) => ({ threads: [...st.threads, thread] }))
            // Remove the draft thread if this compose was an edited draft
            if (c.draftThreadId && c.draftThreadId !== threadId) {
              set((st) => ({ threads: st.threads.filter((t) => t.id !== c.draftThreadId) }))
            }
          }

          set((st) => ({ composers: st.composers.filter((x) => x.id !== id) }))

          get().toast('Message sent', {
            actionLabel: 'Undo',
            duration: get().settings.undoSendSeconds * 1000,
            action: () => {
              const st = get()
              if (createdThread) {
                set({ threads: st.threads.filter((t) => t.id !== threadId) })
                if (composerCopy.draftThreadId) {
                  // Restore nothing extra: draft thread was deleted; recreate via composer save
                }
              } else {
                set({
                  threads: st.threads.map((t) =>
                    t.id === threadId
                      ? { ...t, messages: t.messages.filter((m) => m.id !== messageId) }
                      : t,
                  ),
                })
              }
              get().openCompose({
                ...composerCopy,
                id: undefined as unknown as string,
                draftThreadId: createdThread ? undefined : composerCopy.draftThreadId,
                draftMessageId: undefined,
                minimized: false,
              })
              get().dismissToast()
            },
          })
        },

        upsertReplyDraft: (threadId, messageId, patch) => {
          const s = get()
          const thread = s.threads.find((t) => t.id === threadId)
          if (!thread) return ''
          if (messageId && thread.messages.some((m) => m.id === messageId)) {
            mutateThreads([threadId], (t) => ({
              ...t,
              messages: t.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      to: patch.to,
                      cc: patch.cc.length ? patch.cc : undefined,
                      bodyHtml: patch.bodyHtml,
                      quotedHtml: patch.quotedHtml,
                      snippet: snippetOf(patch.bodyHtml),
                      date: Date.now(),
                    }
                  : m,
              ),
            }))
            return messageId
          }
          const draft = newMessage(threadId, {
            to: patch.to,
            cc: patch.cc,
            bodyHtml: patch.bodyHtml,
            quotedHtml: patch.quotedHtml,
            draft: true,
          })
          mutateThreads([threadId], (t) => ({ ...t, messages: [...t.messages, draft] }))
          return draft.id
        },

        discardDraftMessage: (threadId, messageId) => {
          const s = get()
          const thread = s.threads.find((t) => t.id === threadId)
          if (!thread) return
          const remaining = thread.messages.filter((m) => m.id !== messageId)
          if (remaining.length === 0) {
            set((st) => ({ threads: st.threads.filter((t) => t.id !== threadId) }))
          } else {
            mutateThreads([threadId], (t) => ({ ...t, messages: remaining }))
          }
        },

        sendReply: (threadId, draftMessageId, data) => {
          const s = get()
          if (!s.threads.some((t) => t.id === threadId)) return
          if (data.to.length === 0 && data.cc.length === 0) {
            get().toast('Please specify at least one recipient')
            return
          }
          const msg = newMessage(threadId, {
            to: data.to,
            cc: data.cc,
            bodyHtml: data.bodyHtml,
            quotedHtml: data.quotedHtml,
          })
          mutateThreads([threadId], (t) => ({
            ...t,
            messages: [...t.messages.filter((m) => m.id !== draftMessageId), msg],
          }))
          get().toast('Message sent', {
            actionLabel: 'Undo',
            duration: get().settings.undoSendSeconds * 1000,
            action: () => {
              mutateThreads([threadId], (t) => ({
                ...t,
                messages: t.messages.filter((m) => m.id !== msg.id),
              }))
              const restoredId = get().upsertReplyDraft(threadId, null, data)
              void restoredId
              get().dismissToast()
            },
          })
        },

        toast: (text, opts) => {
          set({
            toastState: {
              id: uid('toast'),
              text,
              actionLabel: opts?.actionLabel,
              action: opts?.action,
              duration: opts?.duration ?? 5000,
            },
          })
        },

        dismissToast: () => set({ toastState: null }),

        setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        resetData: () => {
          set({
            ...freshSeed(),
            route: { folder: 'inbox' },
            categoryTab: 'primary',
            selected: [],
            cursor: -1,
            composers: [],
            lastSnapshot: null,
          })
          get().toast('Demo data reset')
        },
      }
    },
    {
      name: 'fable-mail-v1',
      partialize: (s) => ({
        threads: s.threads,
        labels: s.labels,
        seedVersion: s.seedVersion,
        settings: s.settings,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (state.seedVersion !== SEED_VERSION || state.threads.length === 0) {
          useMail.setState(freshSeed())
        }
      },
    },
  ),
)

export function useThread(id: string | undefined): Thread | undefined {
  return useMail((s) => (id ? s.threads.find((t) => t.id === id) : undefined))
}

export function folderRoute(folder: FolderId): Route {
  return { folder }
}

export { hasDraft }
