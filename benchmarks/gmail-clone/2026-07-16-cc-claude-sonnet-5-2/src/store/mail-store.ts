import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildSeedThreads, LABELS, ME } from '@/lib/seed-data'
import type { ComposeDraft, ComposeMode, Contact, Label, Thread } from '@/lib/types'
import type { MailView } from '@/lib/mail-queries'
import { threadLastMessage } from '@/lib/mail-queries'

interface Toast {
  id: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

const LABEL_COLORS = [
  '#0b57d0',
  '#1e8e3e',
  '#e37400',
  '#8430ce',
  '#d81b60',
  '#00838f',
  '#5f6368',
  '#c62828',
]

interface MailState {
  threads: Thread[]
  labels: Label[]
  view: MailView
  category: string | null
  searchQuery: string
  selectedThreadId: string | null
  selectedIds: string[]
  composeWindows: ComposeDraft[]
  toast: Toast | null
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  shortcutsDialogOpen: boolean
  density: 'comfortable' | 'compact'
  theme: 'light' | 'dark' | 'system'

  setView: (view: MailView) => void
  setCategory: (category: string | null) => void
  setSearchQuery: (query: string) => void
  clearSearch: () => void

  openThread: (id: string) => void
  closeThread: () => void

  toggleSelected: (id: string) => void
  selectMany: (ids: string[]) => void
  clearSelection: () => void

  toggleStar: (id: string) => void
  archiveThreads: (ids: string[]) => void
  moveToInbox: (ids: string[]) => void
  trashThreads: (ids: string[]) => void
  restoreFromTrash: (ids: string[]) => void
  deleteForever: (ids: string[]) => void
  emptyTrash: () => void
  markSpam: (ids: string[]) => void
  markNotSpam: (ids: string[]) => void
  markRead: (ids: string[], read: boolean) => void
  toggleImportant: (id: string) => void
  applyLabel: (ids: string[], labelId: string) => void
  removeLabel: (ids: string[], labelId: string) => void
  snoozeThreads: (ids: string[], until: string) => void
  unsnooze: (ids: string[]) => void
  createLabel: (name: string) => string
  deleteLabel: (labelId: string) => void

  showToast: (message: string, actionLabel?: string, onAction?: () => void) => void
  dismissToast: () => void

  openCompose: (mode: ComposeMode, opts?: OpenComposeOpts) => string
  updateCompose: (id: string, patch: Partial<ComposeDraft>) => void
  minimizeCompose: (id: string, minimized: boolean) => void
  closeCompose: (id: string) => void
  discardCompose: (id: string) => void
  sendCompose: (id: string) => void

  toggleSidebar: () => void
  setMobileNavOpen: (open: boolean) => void
  toggleDensity: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  resetDemoData: () => void
  setShortcutsDialogOpen: (open: boolean) => void
}

interface OpenComposeOpts {
  threadId?: string
  to?: Contact[]
  cc?: Contact[]
  subject?: string
  bodyText?: string
  inReplyToMessageId?: string
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function updateThreads(threads: Thread[], ids: string[], updater: (t: Thread) => Thread): Thread[] {
  const idSet = new Set(ids)
  return threads.map((t) => (idSet.has(t.id) ? updater(t) : t))
}

function withLabels(thread: Thread, add: string[], remove: string[]): Thread {
  const removeSet = new Set(remove)
  const labelSet = new Set(thread.labelIds.filter((l) => !removeSet.has(l)))
  for (const label of add) labelSet.add(label)
  return { ...thread, labelIds: Array.from(labelSet) }
}

function quoteBody(original: Thread): string {
  const last = threadLastMessage(original)
  const header = `On ${new Date(last.date).toLocaleString()}, ${last.from.name} <${last.from.email}> wrote:`
  const quoted = last.bodyText
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
  return `\n\n\n${header}\n${quoted}`
}

function replySubject(subject: string, prefix: string): string {
  const trimmed = subject.trim()
  if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) return trimmed
  return `${prefix} ${trimmed}`
}

const emptyComposeBase: Omit<ComposeDraft, 'id' | 'mode' | 'threadId'> = {
  to: [],
  cc: [],
  bcc: [],
  showCc: false,
  showBcc: false,
  subject: '',
  bodyText: '',
  attachments: [],
  minimized: false,
  savedAt: null,
  scheduledFor: null,
}

export const useMailStore = create<MailState>()(
  persist(
    (set, get) => ({
      threads: buildSeedThreads(),
      labels: LABELS,
      view: { kind: 'folder', id: 'inbox' },
      category: 'category_primary',
      searchQuery: '',
      selectedThreadId: null,
      selectedIds: [],
      composeWindows: [],
      toast: null,
      sidebarCollapsed: false,
      mobileNavOpen: false,
      shortcutsDialogOpen: false,
      density: 'comfortable',
      theme: 'light',

      setView: (view) =>
        set({
          view,
          category: view.kind === 'folder' && view.id === 'inbox' ? get().category ?? 'category_primary' : null,
          selectedThreadId: null,
          selectedIds: [],
          searchQuery: '',
          mobileNavOpen: false,
        }),

      setCategory: (category) => set({ category, selectedThreadId: null }),

      setSearchQuery: (query) => set({ searchQuery: query, selectedThreadId: null }),

      clearSearch: () => set({ searchQuery: '' }),

      openThread: (id) => {
        set((state) => ({
          selectedThreadId: id,
          threads: state.threads.map((t) =>
            t.id === id ? { ...t, messages: t.messages.map((m) => ({ ...m, isRead: true })) } : t,
          ),
        }))
      },

      closeThread: () => set({ selectedThreadId: null }),

      toggleSelected: (id) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((x) => x !== id)
            : [...state.selectedIds, id],
        })),

      selectMany: (ids) => set({ selectedIds: ids }),
      clearSelection: () => set({ selectedIds: [] }),

      toggleStar: (id) =>
        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === id
              ? t.labelIds.includes('starred')
                ? withLabels(t, [], ['starred'])
                : withLabels(t, ['starred'], [])
              : t,
          ),
        })),

      archiveThreads: (ids) => {
        const prev = get().threads
        const prevLabels = new Map(ids.map((id) => [id, prev.find((t) => t.id === id)?.labelIds ?? []]))
        set((state) => ({
          threads: updateThreads(state.threads, ids, (t) => withLabels(t, [], ['inbox', 'snoozed'])),
          selectedThreadId: ids.includes(state.selectedThreadId ?? '') ? null : state.selectedThreadId,
          selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
        }))
        get().showToast(ids.length > 1 ? `${ids.length} conversations archived` : 'Conversation archived', 'Undo', () => {
          set((state) => ({
            threads: updateThreads(state.threads, ids, (t) => ({
              ...t,
              labelIds: prevLabels.get(t.id) ?? t.labelIds,
            })),
          }))
        })
      },

      moveToInbox: (ids) =>
        set((state) => ({
          threads: updateThreads(state.threads, ids, (t) => withLabels(t, ['inbox'], ['snoozed'])),
        })),

      trashThreads: (ids) => {
        const prev = get().threads
        const prevLabels = new Map(ids.map((id) => [id, prev.find((t) => t.id === id)?.labelIds ?? []]))
        set((state) => ({
          threads: updateThreads(state.threads, ids, (t) =>
            withLabels(t, ['trash'], ['inbox', 'spam', 'snoozed']),
          ),
          selectedThreadId: ids.includes(state.selectedThreadId ?? '') ? null : state.selectedThreadId,
          selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
        }))
        get().showToast(ids.length > 1 ? `${ids.length} conversations moved to Trash` : 'Conversation moved to Trash', 'Undo', () => {
          set((state) => ({
            threads: updateThreads(state.threads, ids, (t) => ({
              ...t,
              labelIds: prevLabels.get(t.id) ?? t.labelIds,
            })),
          }))
        })
      },

      restoreFromTrash: (ids) =>
        set((state) => ({
          threads: updateThreads(state.threads, ids, (t) => withLabels(t, ['inbox'], ['trash'])),
          selectedThreadId: ids.includes(state.selectedThreadId ?? '') ? null : state.selectedThreadId,
          selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
        })),

      deleteForever: (ids) => {
        const idSet = new Set(ids)
        set((state) => ({
          threads: state.threads.filter((t) => !idSet.has(t.id)),
          selectedThreadId: ids.includes(state.selectedThreadId ?? '') ? null : state.selectedThreadId,
          selectedIds: state.selectedIds.filter((id) => !idSet.has(id)),
        }))
        get().showToast(ids.length > 1 ? `${ids.length} conversations deleted forever` : 'Conversation deleted forever')
      },

      emptyTrash: () => {
        set((state) => ({
          threads: state.threads.filter((t) => !t.labelIds.includes('trash')),
          selectedThreadId: null,
          selectedIds: [],
        }))
        get().showToast('Trash emptied')
      },

      markSpam: (ids) =>
        set((state) => ({
          threads: updateThreads(state.threads, ids, (t) => withLabels(t, ['spam'], ['inbox', 'snoozed'])),
          selectedThreadId: ids.includes(state.selectedThreadId ?? '') ? null : state.selectedThreadId,
          selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
        })),

      markNotSpam: (ids) =>
        set((state) => ({
          threads: updateThreads(state.threads, ids, (t) => withLabels(t, ['inbox'], ['spam'])),
        })),

      markRead: (ids, read) =>
        set((state) => ({
          threads: updateThreads(state.threads, ids, (t) => ({
            ...t,
            messages: t.messages.map((m) => ({ ...m, isRead: read })),
          })),
        })),

      toggleImportant: (id) =>
        set((state) => ({
          threads: state.threads.map((t) => (t.id === id ? { ...t, isImportant: !t.isImportant } : t)),
        })),

      applyLabel: (ids, labelId) =>
        set((state) => ({
          threads: updateThreads(state.threads, ids, (t) => withLabels(t, [labelId], [])),
        })),

      removeLabel: (ids, labelId) =>
        set((state) => ({
          threads: updateThreads(state.threads, ids, (t) => withLabels(t, [], [labelId])),
        })),

      snoozeThreads: (ids, until) => {
        set((state) => ({
          threads: updateThreads(state.threads, ids, (t) => ({
            ...withLabels(t, ['snoozed'], []),
            snoozedUntil: until,
          })),
          selectedThreadId: ids.includes(state.selectedThreadId ?? '') ? null : state.selectedThreadId,
          selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
        }))
        get().showToast(ids.length > 1 ? `${ids.length} conversations snoozed` : 'Conversation snoozed')
      },

      unsnooze: (ids) =>
        set((state) => ({
          threads: updateThreads(state.threads, ids, (t) => ({
            ...withLabels(t, [], ['snoozed']),
            snoozedUntil: null,
          })),
        })),

      createLabel: (name) => {
        const id = uid('label')
        const color = LABEL_COLORS[get().labels.length % LABEL_COLORS.length]
        set((state) => ({
          labels: [...state.labels, { id, name, color, textColor: '#ffffff' }],
        }))
        return id
      },

      deleteLabel: (labelId) =>
        set((state) => ({
          labels: state.labels.filter((l) => l.id !== labelId),
          threads: state.threads.map((t) => withLabels(t, [], [labelId])),
        })),

      showToast: (message, actionLabel, onAction) => {
        set({ toast: { id: uid('toast'), message, actionLabel, onAction } })
      },
      dismissToast: () => set({ toast: null }),

      openCompose: (mode, opts) => {
        const id = uid('compose')
        let bodyText = opts?.bodyText ?? ''
        let subject = opts?.subject ?? ''
        let to = opts?.to ?? []
        let cc = opts?.cc ?? []

        if (opts?.threadId && (mode === 'reply' || mode === 'reply-all' || mode === 'forward')) {
          const original = get().threads.find((t) => t.id === opts.threadId)
          if (original) {
            const source =
              original.messages.find((m) => m.id === opts.inReplyToMessageId) ?? threadLastMessage(original)
            bodyText = quoteBody(original)

            if (mode === 'forward') {
              subject = replySubject(original.subject, 'Fwd:')
            } else {
              subject = replySubject(original.subject, 'Re:')
              const replyingToSelf = source.from.id === ME.id
              to = replyingToSelf ? source.to : [source.from]
              if (mode === 'reply-all') {
                const extras = [...(replyingToSelf ? [] : source.to), ...(source.cc ?? [])].filter(
                  (c) => c.id !== ME.id && c.id !== to[0]?.id,
                )
                cc = extras
              }
            }
          }
        }

        const draft: ComposeDraft = {
          ...emptyComposeBase,
          id,
          threadId: opts?.threadId ?? null,
          mode,
          to,
          cc,
          subject,
          bodyText,
          inReplyToMessageId: opts?.inReplyToMessageId,
        }

        set((state) => ({
          composeWindows: [...state.composeWindows.map((w) => ({ ...w, minimized: true })), draft],
        }))
        return id
      },

      updateCompose: (id, patch) =>
        set((state) => ({
          composeWindows: state.composeWindows.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),

      minimizeCompose: (id, minimized) =>
        set((state) => ({
          composeWindows: state.composeWindows.map((w) => (w.id === id ? { ...w, minimized } : w)),
        })),

      closeCompose: (id) => {
        const win = get().composeWindows.find((w) => w.id === id)
        if (win && (win.to.length > 0 || win.subject.trim() || win.bodyText.trim())) {
          saveAsDraftThread(set, win)
          get().showToast('Draft saved')
        }
        set((state) => ({ composeWindows: state.composeWindows.filter((w) => w.id !== id) }))
      },

      discardCompose: (id) => {
        const win = get().composeWindows.find((w) => w.id === id)
        set((state) => ({
          composeWindows: state.composeWindows.filter((w) => w.id !== id),
          threads: win?.threadId
            ? state.threads.filter((t) => !(t.id === win.threadId && t.labelIds.includes('draft')))
            : state.threads,
        }))
      },

      sendCompose: (id) => {
        const win = get().composeWindows.find((w) => w.id === id)
        if (!win || win.to.length === 0) return

        const message = {
          id: uid('msg'),
          threadId: win.threadId ?? uid('thread'),
          from: ME,
          to: win.to,
          cc: win.cc.length ? win.cc : undefined,
          bcc: win.bcc.length ? win.bcc : undefined,
          date: new Date().toISOString(),
          bodyText: win.bodyText,
          snippet: win.bodyText.replace(/\n/g, ' ').slice(0, 120),
          attachments: win.attachments,
          isRead: true,
        }

        set((state) => {
          let threads = state.threads

          if (win.threadId && threads.some((t) => t.id === win.threadId)) {
            threads = threads.map((t) =>
              t.id === win.threadId
                ? withLabels(
                    { ...t, messages: [...t.messages.filter((m) => !m.isDraft), message] },
                    ['sent'],
                    ['draft'],
                  )
                : t,
            )
          } else {
            threads = [
              ...threads,
              {
                id: message.threadId,
                subject: win.subject || '(no subject)',
                messages: [{ ...message, threadId: message.threadId }],
                labelIds: ['sent'],
                isImportant: false,
                snoozedUntil: null,
                scheduledFor: null,
              },
            ]
          }

          return {
            threads,
            composeWindows: state.composeWindows.filter((w) => w.id !== id),
          }
        })

        get().showToast('Message sent')
      },

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      setShortcutsDialogOpen: (open) => set({ shortcutsDialogOpen: open }),
      toggleDensity: () =>
        set((state) => ({ density: state.density === 'comfortable' ? 'compact' : 'comfortable' })),
      setTheme: (theme) => set({ theme }),
      resetDemoData: () => {
        set({
          threads: buildSeedThreads(),
          labels: LABELS,
          selectedThreadId: null,
          selectedIds: [],
          composeWindows: [],
          view: { kind: 'folder', id: 'inbox' },
          category: 'category_primary',
          searchQuery: '',
        })
        get().showToast('Demo data has been reset')
      },
    }),
    {
      name: 'gmail-clone-storage',
      partialize: (state) => ({
        threads: state.threads,
        labels: state.labels,
        density: state.density,
        theme: state.theme,
      }),
    },
  ),
)

function saveAsDraftThread(
  set: (partial: Partial<MailState> | ((state: MailState) => Partial<MailState>)) => void,
  win: ComposeDraft,
) {
  const draftMessage = {
    id: uid('msg'),
    threadId: win.threadId ?? uid('thread'),
    from: ME,
    to: win.to,
    cc: win.cc.length ? win.cc : undefined,
    date: new Date().toISOString(),
    bodyText: win.bodyText,
    snippet: win.bodyText.replace(/\n/g, ' ').slice(0, 120),
    attachments: win.attachments,
    isRead: true,
    isDraft: true,
  }

  set((state) => {
    const existingIndex = win.threadId ? state.threads.findIndex((t) => t.id === win.threadId) : -1
    if (existingIndex >= 0) {
      const threads = [...state.threads]
      const existing = threads[existingIndex]
      threads[existingIndex] = {
        ...existing,
        subject: win.subject || '(no subject)',
        messages: existing.labelIds.includes('draft')
          ? [draftMessage]
          : [...existing.messages, draftMessage],
      }
      return { threads }
    }
    return {
      threads: [
        ...state.threads,
        {
          id: draftMessage.threadId,
          subject: win.subject || '(no subject)',
          messages: [draftMessage],
          labelIds: ['draft'],
          isImportant: false,
          snoozedUntil: null,
          scheduledFor: null,
        },
      ],
    }
  })
}
