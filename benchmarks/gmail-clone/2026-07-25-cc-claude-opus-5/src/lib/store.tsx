import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react'
import { ME, SEED_LABELS } from './contacts'
import { buildSeed } from './seed'
import { invalidateBlob } from './search'
import {
  SYS,
  type Category,
  type DraftState,
  type Label,
  type Message,
  type Settings,
  type Thread,
  type UndoEntry,
  type ViewKind,
} from './types'

const STORAGE_KEY = 'opus5.mail'
const SCHEMA = 4

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  density: 'default',
  readingPane: 'none',
  senderImages: true,
  categoryTabs: true,
  conversationView: true,
  shortcuts: true,
  undoSendSeconds: 8,
  markAsReadDelay: false,
  signature: 'Maya Okonkwo · Director of Product, Orbit Labs',
  snippets: true,
  starredFirst: false,
}

export interface State {
  threads: Thread[]
  messages: Record<string, Message>
  labels: Label[]
  settings: Settings
}

function freshState(): State {
  const { threads, messages } = buildSeed()
  return { threads, messages, labels: SEED_LABELS, settings: DEFAULT_SETTINGS }
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw) as { schema?: number; state?: State }
    if (parsed.schema !== SCHEMA || !parsed.state?.threads?.length) return freshState()
    return {
      ...parsed.state,
      settings: { ...DEFAULT_SETTINGS, ...parsed.state.settings },
    }
  } catch {
    return freshState()
  }
}

/* ------------------------------------------------------------------ actions */

export type Action =
  | {
      t: 'patchLabels'
      ids: string[]
      add?: string[]
      remove?: string[]
      snoozeUntil?: number | null
      touch?: boolean
    }
  | { t: 'restoreLabels'; snapshot: { threadId: string; labels: string[]; snoozeUntil?: number }[] }
  | { t: 'setUnread'; ids: string[]; unread: boolean }
  | { t: 'setMessageUnread'; id: string; unread: boolean }
  | { t: 'deleteForever'; ids: string[] }
  | { t: 'restoreThreads'; threads: Thread[]; messages: Message[] }
  | { t: 'label:create'; label: Label }
  | { t: 'label:update'; id: string; patch: Partial<Label> }
  | { t: 'label:delete'; id: string }
  | { t: 'draft:save'; draft: DraftState; subject: string }
  | { t: 'draft:discard'; messageId: string }
  | { t: 'send'; draft: DraftState; subject: string; at?: number }
  | { t: 'unsend'; messageId: string }
  | { t: 'setCategory'; ids: string[]; category: Category }
  | { t: 'tick'; now: number }
  | { t: 'settings'; patch: Partial<Settings> }
  | { t: 'reset' }

const uniq = (xs: string[]) => [...new Set(xs)]

function withLabels(t: Thread, add: string[] = [], remove: string[] = []) {
  const next = uniq([...t.labels.filter((l) => !remove.includes(l)), ...add])
  return next
}

function lastActivityOf(t: Thread, messages: Record<string, Message>) {
  return t.messageIds.reduce((max, id) => {
    const m = messages[id]
    if (!m) return max
    return Math.max(max, m.sendAt ?? m.date)
  }, 0)
}

function reducer(state: State, a: Action): State {
  switch (a.t) {
    case 'patchLabels': {
      const set = new Set(a.ids)
      return {
        ...state,
        threads: state.threads.map((t) => {
          if (!set.has(t.id)) return t
          const next: Thread = { ...t, labels: withLabels(t, a.add, a.remove) }
          if (a.snoozeUntil === null) next.snoozeUntil = undefined
          else if (a.snoozeUntil !== undefined) next.snoozeUntil = a.snoozeUntil
          if (a.touch) next.lastActivity = Date.now()
          return next
        }),
      }
    }

    case 'restoreLabels': {
      const byId = new Map(a.snapshot.map((s) => [s.threadId, s]))
      return {
        ...state,
        threads: state.threads.map((t) => {
          const snap = byId.get(t.id)
          if (!snap) return t
          return { ...t, labels: [...snap.labels], snoozeUntil: snap.snoozeUntil }
        }),
      }
    }

    case 'setUnread': {
      const set = new Set(a.ids)
      const messages = { ...state.messages }
      for (const t of state.threads) {
        if (!set.has(t.id)) continue
        for (const id of t.messageIds) {
          const m = messages[id]
          if (!m || m.draft) continue
          if (!!m.unread !== a.unread) messages[id] = { ...m, unread: a.unread || undefined }
        }
      }
      return { ...state, messages }
    }

    case 'setMessageUnread': {
      const m = state.messages[a.id]
      if (!m) return state
      return {
        ...state,
        messages: { ...state.messages, [a.id]: { ...m, unread: a.unread || undefined } },
      }
    }

    case 'deleteForever': {
      const set = new Set(a.ids)
      const messages = { ...state.messages }
      for (const t of state.threads) {
        if (!set.has(t.id)) continue
        for (const id of t.messageIds) delete messages[id]
      }
      return { ...state, messages, threads: state.threads.filter((t) => !set.has(t.id)) }
    }

    case 'restoreThreads': {
      const messages = { ...state.messages }
      for (const m of a.messages) messages[m.id] = m
      const existing = new Set(state.threads.map((t) => t.id))
      const added = a.threads.filter((t) => !existing.has(t.id))
      return { ...state, messages, threads: [...state.threads, ...added] }
    }

    case 'label:create':
      return { ...state, labels: [...state.labels, a.label] }

    case 'label:update':
      return {
        ...state,
        labels: state.labels.map((l) => (l.id === a.id ? { ...l, ...a.patch } : l)),
      }

    case 'label:delete':
      return {
        ...state,
        labels: state.labels.filter((l) => l.id !== a.id),
        threads: state.threads.map((t) =>
          t.labels.includes(a.id) ? { ...t, labels: t.labels.filter((l) => l !== a.id) } : t,
        ),
      }

    case 'setCategory': {
      const set = new Set(a.ids)
      return {
        ...state,
        threads: state.threads.map((t) => (set.has(t.id) ? { ...t, category: a.category } : t)),
      }
    }

    case 'draft:save': {
      const { draft } = a
      const now = Date.now()
      const msg: Message = {
        id: draft.id,
        threadId: draft.threadId ?? `dt_${draft.id}`,
        from: ME.email,
        to: draft.to,
        cc: draft.cc.length ? draft.cc : undefined,
        bcc: draft.bcc.length ? draft.bcc : undefined,
        date: now,
        body: draft.body,
        attachments: draft.attachments.length ? draft.attachments : undefined,
        draft: true,
        inReplyTo: draft.inReplyTo,
      }
      invalidateBlob(msg.id)
      const messages = { ...state.messages, [msg.id]: msg }
      const existing = state.threads.find((t) => t.id === msg.threadId)

      if (existing) {
        const messageIds = existing.messageIds.includes(msg.id)
          ? existing.messageIds
          : [...existing.messageIds, msg.id]
        const nextThread: Thread = {
          ...existing,
          subject: existing.messageIds.length > 1 ? existing.subject : a.subject,
          messageIds,
          labels: withLabels(existing, [SYS.DRAFT]),
        }
        nextThread.lastActivity = lastActivityOf(nextThread, messages)
        return {
          ...state,
          messages,
          threads: state.threads.map((t) => (t.id === nextThread.id ? nextThread : t)),
        }
      }

      const thread: Thread = {
        id: msg.threadId,
        subject: a.subject,
        messageIds: [msg.id],
        labels: [SYS.DRAFT],
        category: 'primary',
        lastActivity: now,
      }
      return { ...state, messages, threads: [thread, ...state.threads] }
    }

    case 'draft:discard': {
      const msg = state.messages[a.messageId]
      if (!msg) return state
      const messages = { ...state.messages }
      delete messages[a.messageId]
      const threads: Thread[] = []
      for (const t of state.threads) {
        if (t.id !== msg.threadId) {
          threads.push(t)
          continue
        }
        const messageIds = t.messageIds.filter((id) => id !== a.messageId)
        if (!messageIds.length) continue
        const stillDraft = messageIds.some((id) => messages[id]?.draft)
        const next: Thread = {
          ...t,
          messageIds,
          labels: stillDraft ? t.labels : t.labels.filter((l) => l !== SYS.DRAFT),
        }
        next.lastActivity = lastActivityOf(next, messages)
        threads.push(next)
      }
      return { ...state, messages, threads }
    }

    case 'send': {
      const { draft, at } = a
      const now = Date.now()
      const threadId = draft.threadId ?? `dt_${draft.id}`
      const msg: Message = {
        id: draft.id,
        threadId,
        from: ME.email,
        to: draft.to,
        cc: draft.cc.length ? draft.cc : undefined,
        bcc: draft.bcc.length ? draft.bcc : undefined,
        date: at ?? now,
        body: draft.body,
        attachments: draft.attachments.length ? draft.attachments : undefined,
        sendAt: at,
        inReplyTo: draft.inReplyTo,
      }
      invalidateBlob(msg.id)
      const messages = { ...state.messages, [msg.id]: msg }
      const existing = state.threads.find((t) => t.id === threadId)

      if (existing) {
        const messageIds = existing.messageIds.includes(msg.id)
          ? existing.messageIds
          : [...existing.messageIds, msg.id]
        const stillDraft = messageIds.some((id) => messages[id]?.draft)
        const next: Thread = {
          ...existing,
          subject: existing.messageIds.length > 1 ? existing.subject : a.subject,
          messageIds,
          labels: withLabels(
            existing,
            at ? [SYS.SENT, SYS.SCHEDULED] : [SYS.SENT],
            stillDraft ? [] : [SYS.DRAFT],
          ),
        }
        next.lastActivity = lastActivityOf(next, messages)
        return {
          ...state,
          messages,
          threads: state.threads.map((t) => (t.id === next.id ? next : t)),
        }
      }

      const thread: Thread = {
        id: threadId,
        subject: a.subject,
        messageIds: [msg.id],
        labels: at ? [SYS.SENT, SYS.SCHEDULED] : [SYS.SENT],
        category: 'primary',
        lastActivity: at ?? now,
      }
      return { ...state, messages, threads: [thread, ...state.threads] }
    }

    case 'unsend': {
      const msg = state.messages[a.messageId]
      if (!msg) return state
      const messages = {
        ...state.messages,
        [a.messageId]: { ...msg, draft: true, sendAt: undefined, date: Date.now() },
      }
      const threads = state.threads.map((t) => {
        if (t.id !== msg.threadId) return t
        const anySent = t.messageIds.some((id) => id !== a.messageId && !messages[id]?.draft)
        const next: Thread = {
          ...t,
          labels: withLabels(t, [SYS.DRAFT], anySent ? [SYS.SCHEDULED] : [SYS.SENT, SYS.SCHEDULED]),
        }
        next.lastActivity = lastActivityOf(next, messages)
        return next
      })
      return { ...state, messages, threads }
    }

    case 'tick': {
      const { now } = a
      let changed = false
      const messages = { ...state.messages }

      for (const m of Object.values(state.messages)) {
        if (m.sendAt && m.sendAt <= now) {
          messages[m.id] = { ...m, sendAt: undefined, date: m.sendAt }
          changed = true
        }
      }

      const threads = state.threads.map((t) => {
        let next = t
        if (t.snoozeUntil && t.snoozeUntil <= now) {
          next = {
            ...next,
            labels: withLabels(next, [SYS.INBOX], [SYS.SNOOZED]),
            snoozeUntil: undefined,
            lastActivity: t.snoozeUntil,
          }
          const lastId = t.messageIds[t.messageIds.length - 1]
          const last = messages[lastId]
          if (last && !last.draft) messages[lastId] = { ...last, unread: true }
          changed = true
        }
        if (t.labels.includes(SYS.SCHEDULED)) {
          const pending = next.messageIds.some((id) => messages[id]?.sendAt)
          if (!pending) {
            next = { ...next, labels: next.labels.filter((l) => l !== SYS.SCHEDULED) }
            next.lastActivity = lastActivityOf(next, messages)
            changed = true
          }
        }
        return next
      })

      return changed ? { ...state, messages, threads } : state
    }

    case 'settings':
      return { ...state, settings: { ...state.settings, ...a.patch } }

    case 'reset':
      return freshState()
  }
}

/* ------------------------------------------------------------------ context */

const StateCtx = createContext<State>(null as unknown as State)
const DispatchCtx = createContext<Dispatch<Action>>(() => {})

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: SCHEMA, state }))
      } catch {
        /* quota — keep running in-memory */
      }
    }, 350)
    return () => window.clearTimeout(timer.current)
  }, [state])

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ t: 'tick', now: Date.now() }), 10_000)
    dispatch({ t: 'tick', now: Date.now() })
    return () => window.clearInterval(id)
  }, [])

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}

export const useStore = () => useContext(StateCtx)
export const useDispatch = () => useContext(DispatchCtx)

/* ---------------------------------------------------------------- selectors */

export function threadMessages(state: State, t: Thread): Message[] {
  return t.messageIds
    .map((id) => state.messages[id])
    .filter((m): m is Message => !!m)
    .sort((a, b) => a.date - b.date)
}

export function isUnread(state: State, t: Thread) {
  return t.messageIds.some((id) => {
    const m = state.messages[id]
    return m && !m.draft && m.unread
  })
}

export function hasAttachments(state: State, t: Thread) {
  return t.messageIds.some((id) => state.messages[id]?.attachments?.length)
}

export interface View {
  kind: ViewKind
  labelId?: string
  query?: string
  category?: Category
}

const has = (t: Thread, l: string) => t.labels.includes(l)

export function viewPredicate(view: View): (t: Thread) => boolean {
  switch (view.kind) {
    case 'inbox':
      return (t) => has(t, SYS.INBOX) && !has(t, SYS.TRASH) && !has(t, SYS.SPAM) && !has(t, SYS.SNOOZED)
    case 'starred':
      return (t) => has(t, SYS.STARRED) && !has(t, SYS.TRASH) && !has(t, SYS.SPAM)
    case 'snoozed':
      return (t) => has(t, SYS.SNOOZED) && !has(t, SYS.TRASH)
    case 'important':
      return (t) => has(t, SYS.IMPORTANT) && !has(t, SYS.TRASH) && !has(t, SYS.SPAM)
    case 'sent':
      return (t) => has(t, SYS.SENT) && !has(t, SYS.TRASH) && !has(t, SYS.SPAM)
    case 'scheduled':
      return (t) => has(t, SYS.SCHEDULED) && !has(t, SYS.TRASH)
    case 'drafts':
      return (t) => has(t, SYS.DRAFT) && !has(t, SYS.TRASH)
    case 'spam':
      return (t) => has(t, SYS.SPAM)
    case 'trash':
      return (t) => has(t, SYS.TRASH)
    case 'label':
      return (t) => !!view.labelId && has(t, view.labelId) && !has(t, SYS.TRASH) && !has(t, SYS.SPAM)
    case 'all':
    case 'search':
      return (t) => !has(t, SYS.TRASH) && !has(t, SYS.SPAM)
  }
}

/** Threads for a mailbox view, already ordered the way the list renders them. */
export function selectThreads(state: State, view: View): Thread[] {
  const pred = viewPredicate(view)
  let out = state.threads.filter(pred)

  if (view.kind === 'inbox' && view.category && state.settings.categoryTabs) {
    out = out.filter((t) => t.category === view.category)
  }

  out.sort((a, b) => b.lastActivity - a.lastActivity)

  if (state.settings.starredFirst && (view.kind === 'inbox' || view.kind === 'all')) {
    const star = (t: Thread) => (has(t, SYS.STARRED) ? 0 : 1)
    out.sort((a, b) => star(a) - star(b) || b.lastActivity - a.lastActivity)
  }
  return out
}

export interface Counts {
  inbox: number
  inboxTotal: number
  starred: number
  snoozed: number
  important: number
  drafts: number
  scheduled: number
  spam: number
  trash: number
  sent: number
  all: number
  byLabel: Record<string, number>
  byCategory: Record<Category, number>
}

export function selectCounts(state: State): Counts {
  const counts: Counts = {
    inbox: 0,
    inboxTotal: 0,
    starred: 0,
    snoozed: 0,
    important: 0,
    drafts: 0,
    scheduled: 0,
    spam: 0,
    trash: 0,
    sent: 0,
    all: 0,
    byLabel: {},
    byCategory: { primary: 0, social: 0, promotions: 0, updates: 0, forums: 0 },
  }

  for (const t of state.threads) {
    const trash = has(t, SYS.TRASH)
    const spam = has(t, SYS.SPAM)
    const unread = isUnread(state, t)

    if (trash) counts.trash++
    if (spam) counts.spam++
    if (trash || spam) continue

    counts.all++
    if (has(t, SYS.DRAFT)) counts.drafts++
    if (has(t, SYS.SCHEDULED)) counts.scheduled++
    if (has(t, SYS.SENT)) counts.sent++
    if (has(t, SYS.SNOOZED)) counts.snoozed++
    if (has(t, SYS.STARRED) && unread) counts.starred++
    if (has(t, SYS.IMPORTANT) && unread) counts.important++

    if (has(t, SYS.INBOX) && !has(t, SYS.SNOOZED)) {
      counts.inboxTotal++
      if (unread) {
        counts.inbox++
        counts.byCategory[t.category]++
      }
    }

    if (unread) {
      for (const l of t.labels) {
        if (l.startsWith('lbl_')) counts.byLabel[l] = (counts.byLabel[l] ?? 0) + 1
      }
    }
  }

  return counts
}

/** Contacts ranked by how often the user actually corresponds with them. */
export function selectFrequentContacts(state: State): string[] {
  const score = new Map<string, number>()
  for (const m of Object.values(state.messages)) {
    const bump = (e: string, n: number) => {
      if (e === ME.email) return
      score.set(e, (score.get(e) ?? 0) + n)
    }
    if (m.from === ME.email) m.to.forEach((e) => bump(e, 3))
    else bump(m.from, 2)
    ;(m.cc ?? []).forEach((e) => bump(e, 1))
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([e]) => e)
}

export function undoAction(entry: UndoEntry): Action {
  switch (entry.type) {
    case 'labels':
      return { t: 'restoreLabels', snapshot: entry.snapshot }
    case 'unread':
      return { t: 'setUnread', ids: entry.ids, unread: entry.unread }
    case 'unsend':
      return { t: 'unsend', messageId: entry.messageId }
    case 'restore':
      return { t: 'restoreThreads', threads: entry.threads, messages: entry.messages }
  }
}

export function snapshotLabels(state: State, ids: string[]): UndoEntry {
  const set = new Set(ids)
  return {
    type: 'labels',
    snapshot: state.threads
      .filter((t) => set.has(t.id))
      .map((t) => ({ threadId: t.id, labels: [...t.labels], snoozeUntil: t.snoozeUntil })),
  }
}

export function snapshotThreads(state: State, ids: string[]): UndoEntry {
  const set = new Set(ids)
  const threads = state.threads.filter((t) => set.has(t.id))
  return {
    type: 'restore',
    threads: threads.map((t) => ({ ...t })),
    messages: threads.flatMap((t) => threadMessages(state, t)),
  }
}

/** Resolves the effective colour scheme from the pref + OS setting. */
export function useResolvedTheme(pref: Settings['theme']) {
  const [systemDark, force] = useReducer(
    (_: boolean, v: boolean) => v,
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => force(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const dark = pref === 'dark' || (pref === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  return dark
}

export function useLabelMap(labels: Label[]) {
  return useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels])
}
