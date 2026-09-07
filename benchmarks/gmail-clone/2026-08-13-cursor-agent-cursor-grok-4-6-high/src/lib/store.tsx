import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
} from 'react'
import { ME } from './contacts'
import { uid } from './format'
import { lastMessage, messagesOf } from './search'
import { buildSeed, DEFAULT_SETTINGS } from './seed'
import { SYS, type ComposeWindow, type Label, type Message, type Settings, type Snack, type Thread, type UndoEntry } from './types'

const STORAGE_KEY = 'cursor-grok-46-mail-v1'

export interface MailState {
  threads: Thread[]
  messages: Message[]
  labels: Label[]
  settings: Settings
  compose: ComposeWindow[]
  snack: Snack | null
  selectedIds: string[]
  lastSelectedId: string | null
}

type Action =
  | { t: 'hydrate'; state: MailState }
  | { t: 'select'; ids: string[] }
  | { t: 'toggleSelect'; id: string; rangeIds?: string[] }
  | { t: 'clearSelect' }
  | { t: 'star'; ids: string[]; starred: boolean }
  | { t: 'important'; ids: string[]; important: boolean }
  | { t: 'archive'; ids: string[] }
  | { t: 'unarchive'; ids: string[] }
  | { t: 'trash'; ids: string[] }
  | { t: 'restore'; ids: string[] }
  | { t: 'deleteForever'; ids: string[] }
  | { t: 'spam'; ids: string[] }
  | { t: 'notSpam'; ids: string[] }
  | { t: 'markRead'; ids: string[]; unread: boolean }
  | { t: 'label'; ids: string[]; labelId: string; add: boolean }
  | { t: 'moveInbox'; ids: string[] }
  | { t: 'snooze'; ids: string[]; until: number }
  | { t: 'unsnooze'; ids: string[] }
  | { t: 'tick'; now: number }
  | { t: 'openCompose'; compose: ComposeWindow }
  | { t: 'patchCompose'; id: string; patch: Partial<ComposeWindow> }
  | { t: 'closeCompose'; id: string; discard?: boolean }
  | { t: 'send'; id: string }
  | { t: 'settings'; patch: Partial<Settings> }
  | { t: 'createLabel'; name: string; color: string; applyTo?: string[] }
  | { t: 'renameLabel'; id: string; name: string }
  | { t: 'deleteLabel'; id: string }
  | { t: 'dismissSnack' }
  | { t: 'undo' }
  | { t: 'reset' }

function load(): MailState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<MailState>
    if (!parsed.threads || !parsed.messages) return null
    return {
      threads: parsed.threads,
      messages: parsed.messages,
      labels: parsed.labels ?? [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      compose: [],
      snack: null,
      selectedIds: [],
      lastSelectedId: null,
    }
  } catch {
    return null
  }
}

function seedState(): MailState {
  const s = buildSeed()
  return { ...s, compose: [], snack: null, selectedIds: [], lastSelectedId: null }
}

function snack(text: string, undo?: UndoEntry, actionLabel = 'Undo', duration = 8000): Snack {
  return { id: uid('snack'), text, undo, actionLabel, duration }
}

function snapshotLabels(state: MailState, ids: string[]): UndoEntry {
  return {
    type: 'labels',
    snapshot: state.threads
      .filter((t) => ids.includes(t.id))
      .map((t) => ({ threadId: t.id, labels: [...t.labels], snoozeUntil: t.snoozeUntil })),
  }
}

function patchThreads(state: MailState, ids: string[], fn: (t: Thread) => Thread): MailState {
  const set = new Set(ids)
  return { ...state, threads: state.threads.map((t) => (set.has(t.id) ? fn(t) : t)) }
}

function addLabel(labels: string[], id: string): string[] {
  return labels.includes(id) ? labels : [...labels, id]
}
function remLabel(labels: string[], id: string): string[] {
  return labels.filter((x) => x !== id)
}

function applyLabels(t: Thread, add: string[], rem: string[]): Thread {
  let labels = t.labels
  for (const r of rem) labels = remLabel(labels, r)
  for (const a of add) labels = addLabel(labels, a)
  return { ...t, labels }
}

function markMessages(state: MailState, threadIds: string[], unread: boolean): MailState {
  const set = new Set(threadIds)
  return {
    ...state,
    messages: state.messages.map((m) => (set.has(m.threadId) ? { ...m, unread } : m)),
  }
}

function persistDraft(state: MailState, c: ComposeWindow): MailState {
  const now = Date.now()
  if ((c.kind === 'reply' || c.kind === 'replyAll' || c.kind === 'forward') && c.threadId) {
    const thread = state.threads.find((t) => t.id === c.threadId)
    if (!thread) return state
    const existingDraft = state.messages.find((m) => m.threadId === c.threadId && m.draft)
    const msgId = existingDraft?.id ?? uid('msg')
    const msg: Message = {
      id: msgId,
      threadId: c.threadId,
      from: ME.email,
      to: c.to,
      cc: c.cc.length ? c.cc : undefined,
      bcc: c.bcc.length ? c.bcc : undefined,
      date: now,
      body: c.body,
      attachments: c.attachments,
      draft: true,
      inReplyTo: c.inReplyTo,
    }
    const messages = existingDraft
      ? state.messages.map((m) => (m.id === msgId ? msg : m))
      : [...state.messages, msg]
    const threads = state.threads.map((t) =>
      t.id === c.threadId
        ? {
            ...t,
            messageIds: t.messageIds.includes(msgId) ? t.messageIds : [...t.messageIds, msgId],
            labels: addLabel(t.labels, SYS.DRAFT),
            lastActivity: now,
          }
        : t,
    )
    return { ...state, threads, messages }
  }
  if (c.kind === 'draft' && c.threadId) {
    return {
      ...state,
      messages: state.messages.map((m) =>
        m.threadId === c.threadId && m.draft
          ? { ...m, to: c.to, cc: c.cc, bcc: c.bcc, body: c.body, attachments: c.attachments, sendAt: c.sendAt, date: now }
          : m,
      ),
      threads: state.threads.map((t) =>
        t.id === c.threadId
          ? {
              ...t,
              subject: c.subject || '(no subject)',
              lastActivity: now,
              labels: c.sendAt ? addLabel(addLabel(t.labels, SYS.SCHEDULED), SYS.DRAFT) : remLabel(addLabel(t.labels, SYS.DRAFT), SYS.SCHEDULED),
            }
          : t,
      ),
    }
  }

  const threadId = c.threadId ?? uid('th')
  const existing = state.threads.find((t) => t.id === threadId && t.labels.includes(SYS.DRAFT))
  if (existing) {
    return {
      ...state,
      messages: state.messages.map((m) =>
        m.threadId === threadId && m.draft
          ? { ...m, to: c.to, cc: c.cc, body: c.body, attachments: c.attachments, sendAt: c.sendAt, date: now }
          : m,
      ),
      threads: state.threads.map((t) =>
        t.id === threadId ? { ...t, subject: c.subject || '(no subject)', lastActivity: now } : t,
      ),
    }
  }

  if (c.kind !== 'new' && c.kind !== 'draft') return state

  const msgId = uid('msg')
  const thread: Thread = {
    id: threadId,
    subject: c.subject || '(no subject)',
    messageIds: [msgId],
    labels: c.sendAt ? [SYS.DRAFT, SYS.SCHEDULED] : [SYS.DRAFT],
    category: 'primary',
    lastActivity: now,
  }
  const msg: Message = {
    id: msgId,
    threadId,
    from: ME.email,
    to: c.to,
    cc: c.cc.length ? c.cc : undefined,
    bcc: c.bcc.length ? c.bcc : undefined,
    date: now,
    body: c.body,
    attachments: c.attachments,
    draft: true,
    sendAt: c.sendAt,
  }
  return {
    ...state,
    threads: [thread, ...state.threads.filter((t) => t.id !== threadId)],
    messages: [...state.messages.filter((m) => !(m.threadId === threadId && m.draft)), msg],
    compose: state.compose.map((x) => (x.id === c.id ? { ...x, threadId, kind: 'draft' } : x)),
  }
}

function sendCompose(state: MailState, id: string): MailState {
  const c = state.compose.find((x) => x.id === id)
  if (!c) return state
  const now = Date.now()
  const scheduled = Boolean(c.sendAt && c.sendAt > now)

  if (scheduled) {
    const next = persistDraft(state, { ...c, sendAt: c.sendAt })
    return {
      ...next,
      compose: next.compose.filter((x) => x.id !== id),
      snack: snack(`Send scheduled for ${new Date(c.sendAt!).toLocaleString()}`),
      selectedIds: [],
    }
  }

  const threadId = c.threadId && c.kind !== 'new' ? c.threadId : uid('th')
  const msgId = uid('msg')
  const msg: Message = {
    id: msgId,
    threadId,
    from: ME.email,
    to: c.to.length ? c.to : [ME.email],
    cc: c.cc.length ? c.cc : undefined,
    bcc: c.bcc.length ? c.bcc : undefined,
    date: now,
    body: c.body,
    attachments: c.attachments.length ? c.attachments : undefined,
    inReplyTo: c.inReplyTo,
  }

  let threads = state.threads
  let messages = state.messages.filter((m) => !(m.draft && m.threadId === c.threadId))

  const existing = threads.find((t) => t.id === threadId)
  if (existing) {
    threads = threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            subject: t.subject || c.subject || '(no subject)',
            messageIds: t.messageIds.filter((mid) => {
              const m = state.messages.find((x) => x.id === mid)
              return !(m?.draft)
            }).concat(msgId),
            labels: addLabel(remLabel(remLabel(t.labels, SYS.DRAFT), SYS.SCHEDULED), SYS.SENT),
            lastActivity: now,
          }
        : t,
    )
  } else {
    threads = [
      {
        id: threadId,
        subject: c.subject || '(no subject)',
        messageIds: [msgId],
        labels: [SYS.SENT],
        category: 'primary',
        lastActivity: now,
      },
      ...threads,
    ]
  }
  messages = [...messages, msg]

  return {
    ...state,
    threads,
    messages,
    compose: state.compose.filter((x) => x.id !== id),
    snack: snack(
      c.to.length ? `Message sent.` : 'Message sent to yourself.',
      { type: 'unsend', messageId: msgId, threadId },
      'Undo',
      (state.settings.undoSendSeconds || 5) * 1000,
    ),
    selectedIds: [],
  }
}

function reducer(state: MailState, action: Action): MailState {
  switch (action.t) {
    case 'hydrate':
      return action.state
    case 'select':
      return { ...state, selectedIds: action.ids, lastSelectedId: action.ids[action.ids.length - 1] ?? null }
    case 'toggleSelect': {
      const has = state.selectedIds.includes(action.id)
      if (action.rangeIds && action.rangeIds.length) {
        return { ...state, selectedIds: action.rangeIds, lastSelectedId: action.id }
      }
      const selectedIds = has ? state.selectedIds.filter((x) => x !== action.id) : [...state.selectedIds, action.id]
      return { ...state, selectedIds, lastSelectedId: action.id }
    }
    case 'clearSelect':
      return { ...state, selectedIds: [], lastSelectedId: null }
    case 'star':
      return {
        ...patchThreads(state, action.ids, (t) =>
          applyLabels(t, action.starred ? [SYS.STARRED] : [], action.starred ? [] : [SYS.STARRED]),
        ),
        snack: snack(action.starred ? 'Starred' : 'Removed star'),
      }
    case 'important':
      return patchThreads(state, action.ids, (t) =>
        applyLabels(t, action.important ? [SYS.IMPORTANT] : [], action.important ? [] : [SYS.IMPORTANT]),
      )
    case 'archive':
      return {
        ...patchThreads(state, action.ids, (t) => applyLabels(t, [], [SYS.INBOX, SYS.SNOOZED])),
        snack: snack(
          action.ids.length === 1 ? 'Conversation archived.' : `${action.ids.length} conversations archived.`,
          snapshotLabels(state, action.ids),
        ),
        selectedIds: [],
      }
    case 'unarchive':
      return patchThreads(state, action.ids, (t) => applyLabels(t, [SYS.INBOX], []))
    case 'trash':
      return {
        ...patchThreads(state, action.ids, (t) => applyLabels(t, [SYS.TRASH], [SYS.INBOX, SYS.SPAM, SYS.SNOOZED])),
        snack: snack(
          action.ids.length === 1 ? 'Conversation moved to Trash.' : `${action.ids.length} conversations moved to Trash.`,
          snapshotLabels(state, action.ids),
        ),
        selectedIds: [],
      }
    case 'restore':
      return {
        ...patchThreads(state, action.ids, (t) => applyLabels(t, [SYS.INBOX], [SYS.TRASH, SYS.SPAM])),
        snack: snack('Conversation moved to Inbox.'),
        selectedIds: [],
      }
    case 'deleteForever': {
      const set = new Set(action.ids)
      const threads = state.threads.filter((t) => set.has(t.id))
      const messages = state.messages.filter((m) => set.has(m.threadId))
      return {
        ...state,
        threads: state.threads.filter((t) => !set.has(t.id)),
        messages: state.messages.filter((m) => !set.has(m.threadId)),
        snack: snack('Conversation deleted forever.', { type: 'restore', threads, messages }),
        selectedIds: [],
      }
    }
    case 'spam':
      return {
        ...patchThreads(state, action.ids, (t) => applyLabels(t, [SYS.SPAM], [SYS.INBOX])),
        snack: snack('Conversation marked as spam.', snapshotLabels(state, action.ids)),
        selectedIds: [],
      }
    case 'notSpam':
      return {
        ...patchThreads(state, action.ids, (t) => applyLabels(t, [SYS.INBOX], [SYS.SPAM])),
        snack: snack('Conversation marked as not spam.'),
        selectedIds: [],
      }
    case 'markRead':
      return {
        ...markMessages(state, action.ids, action.unread),
        snack: snack(action.unread ? 'Marked as unread.' : 'Marked as read.', {
          type: 'unread',
          ids: action.ids,
          unread: !action.unread,
        }),
      }
    case 'label':
      return patchThreads(state, action.ids, (t) =>
        applyLabels(t, action.add ? [action.labelId] : [], action.add ? [] : [action.labelId]),
      )
    case 'moveInbox':
      return patchThreads(state, action.ids, (t) => applyLabels(t, [SYS.INBOX], [SYS.TRASH, SYS.SPAM, SYS.SNOOZED]))
    case 'snooze':
      return {
        ...patchThreads(state, action.ids, (t) => ({
          ...applyLabels(t, [SYS.SNOOZED], [SYS.INBOX]),
          snoozeUntil: action.until,
        })),
        snack: snack(`Snoozed until ${new Date(action.until).toLocaleString()}`, snapshotLabels(state, action.ids)),
        selectedIds: [],
      }
    case 'unsnooze':
      return patchThreads(state, action.ids, (t) => ({
        ...applyLabels(t, [SYS.INBOX], [SYS.SNOOZED]),
        snoozeUntil: undefined,
      }))
    case 'tick': {
      let threads = state.threads
      let messages = state.messages
      let changed = false
      threads = threads.map((t) => {
        if (t.labels.includes(SYS.SNOOZED) && t.snoozeUntil && t.snoozeUntil <= action.now) {
          changed = true
          return { ...applyLabels(t, [SYS.INBOX], [SYS.SNOOZED]), snoozeUntil: undefined }
        }
        return t
      })
      const due = messages.filter((m) => m.draft && m.sendAt && m.sendAt <= action.now)
      if (due.length) {
        changed = true
        for (const m of due) {
          messages = messages.map((x) => (x.id === m.id ? { ...x, draft: false, sendAt: undefined, date: action.now } : x))
          threads = threads.map((t) =>
            t.id === m.threadId
              ? { ...applyLabels(t, [SYS.SENT], [SYS.DRAFT, SYS.SCHEDULED]), lastActivity: action.now }
              : t,
          )
        }
      }
      return changed ? { ...state, threads, messages } : state
    }
    case 'openCompose': {
      const compose = [...state.compose.filter((c) => c.id !== action.compose.id), action.compose].slice(-3)
      return { ...state, compose }
    }
    case 'patchCompose': {
      const compose = state.compose.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c))
      const c = compose.find((x) => x.id === action.id)
      let next = { ...state, compose }
      if (c && (c.kind === 'new' || c.kind === 'draft') && (c.to.length || c.subject || c.body.replace(/<[^>]+>/g, '').trim())) {
        next = persistDraft(next, c)
      }
      return next
    }
    case 'closeCompose': {
      const c = state.compose.find((x) => x.id === action.id)
      let next: MailState = { ...state, compose: state.compose.filter((x) => x.id !== action.id) }
      if (c && action.discard) {
        if (c.threadId && c.kind === 'draft') {
          const t = next.threads.find((x) => x.id === c.threadId)
          const onlyDraft = t && messagesOf(next, t).every((m) => m.draft)
          if (onlyDraft) {
            next = {
              ...next,
              threads: next.threads.filter((x) => x.id !== c.threadId),
              messages: next.messages.filter((m) => m.threadId !== c.threadId),
            }
          }
        }
        next = { ...next, snack: snack('Draft discarded.') }
      } else if (c && (c.to.length || c.subject || c.body.replace(/<[^>]+>/g, '').trim())) {
        next = persistDraft(next, c)
        next = { ...next, snack: snack('Draft saved.') }
      }
      return next
    }
    case 'send':
      return sendCompose(state, action.id)
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'createLabel': {
      const id = uid('lbl')
      let next: MailState = {
        ...state,
        labels: [...state.labels, { id, name: action.name, color: action.color, visible: true }],
      }
      if (action.applyTo?.length) {
        next = patchThreads(next, action.applyTo, (t) => applyLabels(t, [id], []))
      }
      return next
    }
    case 'renameLabel':
      return { ...state, labels: state.labels.map((l) => (l.id === action.id ? { ...l, name: action.name } : l)) }
    case 'deleteLabel':
      return {
        ...state,
        labels: state.labels.filter((l) => l.id !== action.id),
        threads: state.threads.map((t) => ({ ...t, labels: t.labels.filter((x) => x !== action.id) })),
      }
    case 'dismissSnack':
      return { ...state, snack: null }
    case 'undo': {
      const u = state.snack?.undo
      if (!u) return { ...state, snack: null }
      if (u.type === 'labels') {
        const map = new Map(u.snapshot.map((s) => [s.threadId, s]))
        return {
          ...state,
          snack: null,
          threads: state.threads.map((t) => {
            const s = map.get(t.id)
            return s ? { ...t, labels: s.labels, snoozeUntil: s.snoozeUntil } : t
          }),
        }
      }
      if (u.type === 'unread') return { ...markMessages(state, u.ids, u.unread), snack: null }
      if (u.type === 'unsend') {
        return {
          ...state,
          snack: null,
          messages: state.messages.filter((m) => m.id !== u.messageId),
          threads: state.threads
            .map((t) =>
              t.id === u.threadId
                ? { ...t, messageIds: t.messageIds.filter((id) => id !== u.messageId), labels: addLabel(remLabel(t.labels, SYS.SENT), SYS.DRAFT) }
                : t,
            )
            .filter((t) => t.messageIds.length > 0),
        }
      }
      if (u.type === 'restore') {
        return {
          ...state,
          snack: null,
          threads: [...u.threads, ...state.threads],
          messages: [...u.messages, ...state.messages],
        }
      }
      return { ...state, snack: null }
    }
    case 'reset':
      return seedState()
    default:
      return state
  }
}

const StateCtx = createContext<MailState | null>(null)
const DispatchCtx = createContext<Dispatch<Action> | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => load() ?? seedState())

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        threads: state.threads,
        messages: state.messages,
        labels: state.labels,
        settings: state.settings,
      }),
    )
  }, [state.threads, state.messages, state.labels, state.settings])

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ t: 'tick', now: Date.now() }), 8000)
    dispatch({ t: 'tick', now: Date.now() })
    return () => window.clearInterval(id)
  }, [])

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useStore(): MailState {
  const s = useContext(StateCtx)
  if (!s) throw new Error('store')
  return s
}

export function useDispatch(): Dispatch<Action> {
  const d = useContext(DispatchCtx)
  if (!d) throw new Error('dispatch')
  return d
}

export function useResolvedTheme(theme: Settings['theme']) {
  useEffect(() => {
    const apply = () => {
      const dark =
        theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

export function useMedia(query: string): boolean {
  const get = useCallback(() => window.matchMedia(query).matches, [query])
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, get, () => false)
}

export function newCompose(partial: Partial<ComposeWindow> = {}): ComposeWindow {
  return {
    id: uid('cmp'),
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    body: '',
    attachments: [],
    showCc: false,
    showBcc: false,
    mode: 'normal',
    kind: 'new',
    ...partial,
  }
}

export function replyCompose(thread: Thread, last: Message, all: boolean): ComposeWindow {
  const to = all
    ? [last.from, ...last.to, ...(last.cc ?? [])].filter((e) => e.toLowerCase() !== ME.email.toLowerCase())
    : last.from.toLowerCase() === ME.email.toLowerCase()
      ? last.to
      : [last.from]
  const unique = [...new Set(to)]
  return newCompose({
    kind: all ? 'replyAll' : 'reply',
    to: unique,
    subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
    threadId: thread.id,
    inReplyTo: last.id,
    inline: true,
    body: '',
  })
}

export function forwardCompose(thread: Thread, last: Message): ComposeWindow {
  return newCompose({
    kind: 'forward',
    subject: thread.subject.startsWith('Fwd:') ? thread.subject : `Fwd: ${thread.subject}`,
    threadId: thread.id,
    body: `<p>---------- Forwarded message ----------</p>${last.body}`,
    attachments: last.attachments ? [...last.attachments] : [],
    mode: 'normal',
    inline: false,
  })
}

export function draftCompose(thread: Thread, messages: Message[]): ComposeWindow {
  const d = messages.find((m) => m.draft) ?? lastMessage({ threads: [thread], messages }, thread)
  return newCompose({
    kind: 'draft',
    id: `draft-${thread.id}`,
    to: d?.to ?? [],
    cc: d?.cc ?? [],
    bcc: d?.bcc ?? [],
    subject: thread.subject === '(no subject)' ? '' : thread.subject,
    body: d?.body ?? '',
    attachments: d?.attachments ?? [],
    threadId: thread.id,
    sendAt: d?.sendAt,
    showCc: Boolean(d?.cc?.length),
    showBcc: Boolean(d?.bcc?.length),
  })
}

export function useIndex() {
  const s = useStore()
  return useMemo(() => ({ threads: s.threads, messages: s.messages }), [s.threads, s.messages])
}
