import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ME } from './contacts'
import { toSnippet } from './format'
import { useRoute, type Route } from './router'
import {
  selectThreads,
  snapshotLabels,
  snapshotThreads,
  threadMessages,
  undoAction,
  useDispatch,
  useStore,
  type State,
  type View,
} from './store'
import {
  SYS,
  type ComposeWindow,
  type DraftState,
  type Message,
  type Snack,
  type Thread,
  type UndoEntry,
} from './types'

let seq = 0
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`

const PAGE_SIZE = 50

export interface AppApi {
  route: Route
  navigate: (r: Route, replace?: boolean) => void
  go: (patch: Partial<Route>) => void
  openThread: (id: string | undefined) => void

  /** Visible page of the current route's thread list. */
  threads: Thread[]
  view: View
  /** Conversations matching the route across every page. */
  total: number
  page: number
  pageCount: number
  pageSize: number
  setPage: (p: number) => void

  selection: string[]
  isSelected: (id: string) => boolean
  toggleSelect: (id: string, shift?: boolean) => void
  setSelection: (ids: string[]) => void
  clearSelection: () => void

  cursor: string | undefined
  setCursor: (id: string | undefined) => void

  compose: ComposeWindow[]
  openCompose: (init?: Partial<ComposeWindow>) => void
  replyTo: (thread: Thread, msg: Message, kind: 'reply' | 'replyAll' | 'forward') => void
  editDraft: (thread: Thread, msg: Message) => void
  updateCompose: (id: string, patch: Partial<ComposeWindow>) => void
  closeCompose: (id: string) => void

  snacks: Snack[]
  toast: (text: string, undo?: UndoEntry, actionLabel?: string) => void
  dismissSnack: (id: string) => void
  runUndo: (s: Snack) => void

  dialog: DialogKind
  setDialog: (d: DialogKind) => void

  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  railCollapsed: boolean
  toggleRail: () => void

  refreshing: boolean
  refresh: () => void

  /* mailbox operations */
  archive: (ids: string[]) => void
  trash: (ids: string[]) => void
  deleteForever: (ids: string[]) => void
  restore: (ids: string[]) => void
  markSpam: (ids: string[], spam: boolean) => void
  setRead: (ids: string[], read: boolean) => void
  toggleStar: (id: string) => void
  setStar: (ids: string[], on: boolean) => void
  toggleImportant: (ids: string[]) => void
  applyLabel: (ids: string[], labelId: string, on: boolean) => void
  moveTo: (ids: string[], labelId: string) => void
  snooze: (ids: string[], until: number) => void
  unsnooze: (ids: string[]) => void
  send: (draft: DraftState, subject: string, at?: number) => void
}

export type DialogKind =
  | { kind: 'settings' }
  | { kind: 'shortcuts' }
  | { kind: 'newLabel'; seed?: string; applyTo?: string[] }
  | { kind: 'editLabel'; labelId: string }
  | { kind: 'attachment'; messageId: string; attachmentId: string }
  | { kind: 'search' }
  | null

const Ctx = createContext<AppApi>(null as unknown as AppApi)
export const useApp = () => useContext(Ctx)

function quoteHeader(m: Message) {
  const d = new Date(m.date)
  const when = d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return `On ${when}, ${m.from} wrote:`
}

function quoteBody(m: Message) {
  return `<p><br></p><div class="quoted">${quoteHeader(m)}<br>${m.body}</div>`
}

export function AppProvider({ children }: { children: ReactNode }) {
  const state = useStore()
  const dispatch = useDispatch()
  const [route, navigate] = useRoute()

  const [selection, setSelectionRaw] = useState<string[]>([])
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [compose, setCompose] = useState<ComposeWindow[]>([])
  const [snacks, setSnacks] = useState<Snack[]>([])
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [railCollapsed, setRailCollapsed] = useState(
    () => localStorage.getItem('opus5.rail') === '1',
  )
  const [refreshing, setRefreshing] = useState(false)
  const [pageRaw, setPage] = useState(0)
  const anchorRef = useRef<string | null>(null)

  const view: View = useMemo(
    () => ({
      kind: route.kind,
      labelId: route.labelId,
      query: route.query,
      category: route.kind === 'inbox' ? (route.category ?? 'primary') : undefined,
    }),
    [route.kind, route.labelId, route.query, route.category],
  )

  const matching = useMemo(() => {
    if (route.kind === 'search') return searchThreads(state, route.query ?? '')
    return selectThreads(state, view)
  }, [state, view, route.kind, route.query])

  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE))
  const page = Math.min(pageRaw, pageCount - 1)
  const threads = useMemo(
    () => matching.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [matching, page],
  )

  const go = useCallback(
    (patch: Partial<Route>) => navigate({ ...route, ...patch }),
    [navigate, route],
  )

  const openThread = useCallback(
    (id: string | undefined) => navigate({ ...route, threadId: id }),
    [navigate, route],
  )

  /* -------------------------------------------------------- selection */

  const setSelection = useCallback((ids: string[]) => setSelectionRaw(ids), [])
  const clearSelection = useCallback(() => setSelectionRaw([]), [])
  const isSelected = useCallback((id: string) => selection.includes(id), [selection])

  const toggleSelect = useCallback(
    (id: string, shift = false) => {
      setSelectionRaw((prev) => {
        if (shift && anchorRef.current) {
          const list = threads.map((t) => t.id)
          const a = list.indexOf(anchorRef.current)
          const b = list.indexOf(id)
          if (a !== -1 && b !== -1) {
            const range = list.slice(Math.min(a, b), Math.max(a, b) + 1)
            return [...new Set([...prev, ...range])]
          }
        }
        anchorRef.current = id
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      })
    },
    [threads],
  )

  // Drop selections that scrolled out of the current mailbox.
  useEffect(() => {
    setSelectionRaw((prev) => {
      if (!prev.length) return prev
      const live = new Set(threads.map((t) => t.id))
      const next = prev.filter((id) => live.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [threads])

  useEffect(() => {
    setSelectionRaw([])
    setPage(0)
    anchorRef.current = null
  }, [route.kind, route.labelId, route.category, route.query])

  /* ---------------------------------------------------------- snacks */

  const dismissSnack = useCallback((id: string) => {
    setSnacks((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const toast = useCallback(
    (text: string, undo?: UndoEntry, actionLabel = 'Undo', duration = 6500) => {
      const snack: Snack = { id: uid('sn'), text, undo, actionLabel: undo ? actionLabel : undefined, duration }
      setSnacks((prev) => [...prev.slice(-2), snack])
      window.setTimeout(() => setSnacks((prev) => prev.filter((s) => s.id !== snack.id)), duration)
    },
    [],
  )

  const runUndo = useCallback(
    (s: Snack) => {
      if (s.undo) dispatch(undoAction(s.undo))
      dismissSnack(s.id)
    },
    [dispatch, dismissSnack],
  )

  /* ------------------------------------------------------ operations */

  const afterMutate = useCallback(
    (ids: string[]) => {
      setSelectionRaw((prev) => prev.filter((id) => !ids.includes(id)))
      if (route.threadId && ids.includes(route.threadId)) {
        navigate({ ...route, threadId: undefined })
      }
    },
    [route, navigate],
  )

  const label = useCallback(
    (
      ids: string[],
      opts: { add?: string[]; remove?: string[]; snoozeUntil?: number | null },
      message: string,
      close = true,
    ) => {
      if (!ids.length) return
      const undo = snapshotLabels(state, ids)
      dispatch({ t: 'patchLabels', ids, ...opts })
      toast(message, undo)
      if (close) afterMutate(ids)
    },
    [state, dispatch, toast, afterMutate],
  )

  const archive = useCallback(
    (ids: string[]) =>
      label(ids, { remove: [SYS.INBOX, SYS.SNOOZED], snoozeUntil: null }, msg(ids, 'archived')),
    [label],
  )

  const trash = useCallback(
    (ids: string[]) =>
      label(
        ids,
        { add: [SYS.TRASH], remove: [SYS.INBOX, SYS.SNOOZED, SYS.SPAM], snoozeUntil: null },
        msg(ids, 'moved to Trash'),
      ),
    [label],
  )

  const restore = useCallback(
    (ids: string[]) => label(ids, { add: [SYS.INBOX], remove: [SYS.TRASH, SYS.SPAM] }, msg(ids, 'restored')),
    [label],
  )

  const markSpam = useCallback(
    (ids: string[], spam: boolean) =>
      label(
        ids,
        spam
          ? { add: [SYS.SPAM], remove: [SYS.INBOX, SYS.SNOOZED] }
          : { add: [SYS.INBOX], remove: [SYS.SPAM] },
        spam ? msg(ids, 'reported as spam') : msg(ids, 'moved to Inbox'),
      ),
    [label],
  )

  const deleteForever = useCallback(
    (ids: string[]) => {
      if (!ids.length) return
      const undo = snapshotThreads(state, ids)
      dispatch({ t: 'deleteForever', ids })
      toast(msg(ids, 'deleted forever'), undo)
      afterMutate(ids)
    },
    [state, dispatch, toast, afterMutate],
  )

  const setRead = useCallback(
    (ids: string[], read: boolean) => {
      if (!ids.length) return
      dispatch({ t: 'setUnread', ids, unread: !read })
      toast(msg(ids, read ? 'marked as read' : 'marked as unread'), {
        type: 'unread',
        ids,
        unread: read,
      })
      setSelectionRaw([])
    },
    [dispatch, toast],
  )

  const setStar = useCallback(
    (ids: string[], on: boolean) => {
      if (!ids.length) return
      dispatch({ t: 'patchLabels', ids, add: on ? [SYS.STARRED] : [], remove: on ? [] : [SYS.STARRED] })
    },
    [dispatch],
  )

  const toggleStar = useCallback(
    (id: string) => {
      const t = state.threads.find((x) => x.id === id)
      if (!t) return
      setStar([id], !t.labels.includes(SYS.STARRED))
    },
    [state.threads, setStar],
  )

  const toggleImportant = useCallback(
    (ids: string[]) => {
      const anyOff = state.threads.some(
        (t) => ids.includes(t.id) && !t.labels.includes(SYS.IMPORTANT),
      )
      dispatch({
        t: 'patchLabels',
        ids,
        add: anyOff ? [SYS.IMPORTANT] : [],
        remove: anyOff ? [] : [SYS.IMPORTANT],
      })
      toast(msg(ids, anyOff ? 'marked as important' : 'marked as not important'))
    },
    [state.threads, dispatch, toast],
  )

  const applyLabel = useCallback(
    (ids: string[], labelId: string, on: boolean) => {
      const name = state.labels.find((l) => l.id === labelId)?.name ?? labelId
      const undo = snapshotLabels(state, ids)
      dispatch({ t: 'patchLabels', ids, add: on ? [labelId] : [], remove: on ? [] : [labelId] })
      toast(`${msg(ids, on ? 'added to' : 'removed from')} "${name}"`, undo)
    },
    [state, dispatch, toast],
  )

  const moveTo = useCallback(
    (ids: string[], labelId: string) => {
      const name = state.labels.find((l) => l.id === labelId)?.name ?? labelId
      label(ids, { add: [labelId], remove: [SYS.INBOX] }, `${msg(ids, 'moved to')} "${name}"`)
    },
    [state.labels, label],
  )

  const snooze = useCallback(
    (ids: string[], until: number) =>
      label(ids, { add: [SYS.SNOOZED, SYS.INBOX], snoozeUntil: until }, msg(ids, 'snoozed')),
    [label],
  )

  const unsnooze = useCallback(
    (ids: string[]) =>
      label(ids, { remove: [SYS.SNOOZED], snoozeUntil: null }, msg(ids, 'unsnoozed'), false),
    [label],
  )

  /* --------------------------------------------------------- compose */

  const openCompose = useCallback((init: Partial<ComposeWindow> = {}) => {
    setCompose((prev) => {
      if (prev.length >= 3) return prev
      const win: ComposeWindow = {
        id: uid('m'),
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
        ...init,
      }
      return [...prev.map((c) => (c.mode === 'normal' ? { ...c, mode: 'minimized' as const } : c)), win]
    })
  }, [])

  const replyTo = useCallback(
    (thread: Thread, m: Message, kind: 'reply' | 'replyAll' | 'forward') => {
      const others = (list: string[]) => list.filter((e) => e !== ME.email)
      const to =
        kind === 'forward' ? [] : m.from === ME.email ? m.to : [m.from]
      const cc =
        kind === 'replyAll' ? others([...m.to, ...(m.cc ?? [])]).filter((e) => !to.includes(e)) : []
      const subject =
        kind === 'forward'
          ? `Fwd: ${thread.subject.replace(/^(Fwd|Re):\s*/i, '')}`
          : /^re:/i.test(thread.subject)
            ? thread.subject
            : `Re: ${thread.subject}`

      openCompose({
        kind,
        to,
        cc,
        showCc: cc.length > 0,
        subject,
        body: quoteBody(m),
        threadId: kind === 'forward' ? undefined : thread.id,
        inReplyTo: m.id,
        attachments: kind === 'forward' ? (m.attachments ?? []) : [],
        inline: kind !== 'forward',
      })
    },
    [openCompose],
  )

  const editDraft = useCallback(
    (thread: Thread, m: Message) => {
      setCompose((prev) => {
        if (prev.some((c) => c.id === m.id)) {
          return prev.map((c) => (c.id === m.id ? { ...c, mode: 'normal' } : c))
        }
        const win: ComposeWindow = {
          id: m.id,
          to: m.to.filter(Boolean),
          cc: m.cc ?? [],
          bcc: m.bcc ?? [],
          subject: thread.messageIds.length > 1 ? thread.subject : thread.subject,
          body: m.body,
          attachments: m.attachments ?? [],
          threadId: thread.id.startsWith('dt_') ? thread.id : thread.id,
          inReplyTo: m.inReplyTo,
          showCc: !!m.cc?.length,
          showBcc: !!m.bcc?.length,
          mode: 'normal',
          kind: 'draft',
        }
        return [...prev.map((c) => (c.mode === 'normal' ? { ...c, mode: 'minimized' as const } : c)), win]
      })
    },
    [],
  )

  const updateCompose = useCallback((id: string, patch: Partial<ComposeWindow>) => {
    setCompose((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  const closeCompose = useCallback((id: string) => {
    setCompose((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const send = useCallback(
    (draft: DraftState, subject: string, at?: number) => {
      dispatch({ t: 'send', draft, subject, at })
      closeCompose(draft.id)
      const undo: UndoEntry = { type: 'unsend', messageId: draft.id, threadId: draft.threadId ?? '' }
      if (at) {
        toast('Send scheduled.', undo, 'Undo')
      } else {
        toast('Message sent.', undo, 'Undo')
      }
    },
    [dispatch, closeCompose, toast],
  )

  /* --------------------------------------------------------- misc */

  const toggleRail = useCallback(() => {
    setRailCollapsed((v) => {
      localStorage.setItem('opus5.rail', v ? '0' : '1')
      return !v
    })
  }, [])

  const refresh = useCallback(() => {
    setRefreshing(true)
    dispatch({ t: 'tick', now: Date.now() })
    window.setTimeout(() => setRefreshing(false), 620)
  }, [dispatch])

  const api: AppApi = {
    route,
    navigate,
    go,
    openThread,
    threads,
    view,
    total: matching.length,
    page,
    pageCount,
    pageSize: PAGE_SIZE,
    setPage,
    selection,
    isSelected,
    toggleSelect,
    setSelection,
    clearSelection,
    cursor,
    setCursor,
    compose,
    openCompose,
    replyTo,
    editDraft,
    updateCompose,
    closeCompose,
    snacks,
    toast,
    dismissSnack,
    runUndo,
    dialog,
    setDialog,
    sidebarOpen,
    setSidebarOpen,
    railCollapsed,
    toggleRail,
    refreshing,
    refresh,
    archive,
    trash,
    deleteForever,
    restore,
    markSpam,
    setRead,
    toggleStar,
    setStar,
    toggleImportant,
    applyLabel,
    moveTo,
    snooze,
    unsnooze,
    send,
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

function msg(ids: string[], verb: string) {
  return ids.length === 1 ? `Conversation ${verb}.` : `${ids.length} conversations ${verb}.`
}

/* ------------------------------------------------------------- search */

import { isEmptyQuery, matchThread, parseQuery } from './search'

export function searchThreads(state: State, raw: string): Thread[] {
  const q = parseQuery(raw)
  if (isEmptyQuery(q)) return []

  let pool = state.threads
  if (q.in === 'trash') pool = pool.filter((t) => t.labels.includes(SYS.TRASH))
  else if (q.in === 'spam') pool = pool.filter((t) => t.labels.includes(SYS.SPAM))
  else if (q.in === 'inbox') pool = pool.filter((t) => t.labels.includes(SYS.INBOX))
  else if (q.in === 'sent') pool = pool.filter((t) => t.labels.includes(SYS.SENT))
  else if (q.in === 'drafts' || q.in === 'draft')
    pool = pool.filter((t) => t.labels.includes(SYS.DRAFT))
  else if (q.in !== 'anywhere' && q.in !== 'all')
    pool = pool.filter((t) => !t.labels.includes(SYS.TRASH) && !t.labels.includes(SYS.SPAM))

  return pool
    .filter((t) => matchThread(t, threadMessages(state, t), q, state.labels))
    .sort((a, b) => b.lastActivity - a.lastActivity)
}

/** Snippet used by list rows — the newest non-draft message wins. */
export function threadPreview(state: State, t: Thread) {
  const msgs = threadMessages(state, t)
  const last = msgs[msgs.length - 1]
  return last ? toSnippet(last.body).slice(0, 220) : ''
}
