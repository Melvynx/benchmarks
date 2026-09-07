import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { draftCount, matchesView, searchThreads, threadUnread, unreadCount } from './search'
import { draftCompose, newCompose, useDispatch, useIndex, useStore } from './store'
import {
  PAGE_SIZE,
  type Category,
  type Route,
  type ViewKind,
} from './types'

export type DialogKind =
  | { kind: 'none' }
  | { kind: 'settings' }
  | { kind: 'shortcuts' }
  | { kind: 'labels' }
  | { kind: 'snooze'; ids: string[] }
  | { kind: 'schedule'; composeId: string }
  | { kind: 'newLabel'; ids: string[] }

interface AppApi {
  route: Route
  navigate: (r: Partial<Route> & { kind: ViewKind }) => void
  openThread: (id: string | undefined) => void
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  railCollapsed: boolean
  toggleRail: () => void
  dialog: DialogKind
  setDialog: (d: DialogKind) => void
  searchOpen: boolean
  setSearchOpen: (v: boolean) => void
  visibleThreads: ReturnType<typeof useVisible>['threads']
  total: number
  pageCount: number
  unreadInbox: number
  drafts: number
  openCompose: () => void
  openDraft: (threadId: string) => void
}

const AppCtx = createContext<AppApi | null>(null)

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [path, qs] = h.split('?')
  const params = new URLSearchParams(qs ?? '')
  const parts = (path ?? '').split('/').filter(Boolean)
  const page = Math.max(0, Number(params.get('p') ?? 0) || 0)
  const threadIdx = parts.indexOf('t')
  const threadId = threadIdx >= 0 ? parts[threadIdx + 1] : params.get('t') ?? undefined
  const kindPart = parts[0] || 'inbox'
  const category = parts[1] && ['primary', 'social', 'promotions', 'updates', 'forums'].includes(parts[1])
    ? (parts[1] as Category)
    : undefined

  if (kindPart === 'search') {
    return { kind: 'search', query: params.get('q') ?? '', threadId, page }
  }
  if (kindPart === 'label') {
    return { kind: 'label', labelId: parts[1], threadId, page }
  }
  const kinds: ViewKind[] = [
    'inbox', 'starred', 'snoozed', 'important', 'sent', 'scheduled', 'drafts', 'all', 'spam', 'trash',
  ]
  const kind = kinds.includes(kindPart as ViewKind) ? (kindPart as ViewKind) : 'inbox'
  return { kind, category: kind === 'inbox' ? category : undefined, threadId, page }
}

function toHash(r: Route): string {
  const params = new URLSearchParams()
  if (r.kind === 'search') params.set('q', r.query ?? '')
  if (r.page) params.set('p', String(r.page))
  let path = r.kind
  if (r.kind === 'inbox' && r.category && r.category !== 'primary') path += `/${r.category}`
  if (r.kind === 'label' && r.labelId) path += `/${r.labelId}`
  if (r.threadId) path += `/t/${r.threadId}`
  const q = params.toString()
  return `#/${path}${q ? `?${q}` : ''}`
}

function useVisible(route: Route) {
  const index = useIndex()
  const settings = useStore().settings
  return useMemo(() => {
    let threads =
      route.kind === 'search'
        ? searchThreads(index, route.query ?? '')
        : index.threads.filter((t) => matchesView(t, route.kind, route.labelId))
    if (route.kind === 'inbox' && settings.categoryTabs) {
      const cat = route.category ?? 'primary'
      threads = threads.filter((t) => t.category === cat)
    }
    threads = [...threads].sort((a, b) => b.lastActivity - a.lastActivity)
    if (settings.starredFirst) {
      threads.sort((a, b) => Number(a.labels.includes('STARRED') === false) - Number(b.labels.includes('STARRED') === false) || b.lastActivity - a.lastActivity)
    }
    const total = threads.length
    const start = route.page * PAGE_SIZE
    return { threads: threads.slice(start, start + PAGE_SIZE), total, all: threads }
  }, [index, route, settings.starredFirst, settings.categoryTabs])
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => (typeof window === 'undefined' ? { kind: 'inbox', page: 0 } : parseHash()))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [dialog, setDialog] = useState<DialogKind>({ kind: 'none' })
  const [searchOpen, setSearchOpen] = useState(false)
  const store = useStore()
  const dispatch = useDispatch()
  const visible = useVisible(route)
  const index = useIndex()

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    if (!window.location.hash) window.location.hash = '/inbox'
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = useCallback((r: Partial<Route> & { kind: ViewKind }) => {
    const next: Route = { page: 0, ...r }
    window.location.hash = toHash(next)
    setSidebarOpen(false)
  }, [])

  const openThread = useCallback(
    (id: string | undefined) => {
      const next = { ...route, threadId: id }
      window.location.hash = toHash(next)
    },
    [route],
  )

  const openCompose = useCallback(() => {
    dispatch({ t: 'openCompose', compose: newCompose() })
  }, [dispatch])

  const openDraft = useCallback(
    (threadId: string) => {
      const thread = store.threads.find((t) => t.id === threadId)
      if (!thread) return
      dispatch({ t: 'openCompose', compose: draftCompose(thread, store.messages) })
    },
    [dispatch, store.messages, store.threads],
  )

  const api = useMemo<AppApi>(
    () => ({
      route,
      navigate,
      openThread,
      sidebarOpen,
      setSidebarOpen,
      railCollapsed,
      toggleRail: () => setRailCollapsed((v) => !v),
      dialog,
      setDialog,
      searchOpen,
      setSearchOpen,
      visibleThreads: visible.threads,
      total: visible.total,
      pageCount: Math.max(1, Math.ceil(visible.total / PAGE_SIZE)),
      unreadInbox: unreadCount(index, 'inbox'),
      drafts: draftCount(index),
      openCompose,
      openDraft,
    }),
    [
      route,
      navigate,
      openThread,
      sidebarOpen,
      railCollapsed,
      dialog,
      searchOpen,
      visible.threads,
      visible.total,
      index,
      openCompose,
      openDraft,
    ],
  )

  return <AppCtx.Provider value={api}>{children}</AppCtx.Provider>
}

export function useApp(): AppApi {
  const v = useContext(AppCtx)
  if (!v) throw new Error('app')
  return v
}

export function useThreadUnreadMap() {
  const index = useIndex()
  return useMemo(() => {
    const m = new Map<string, boolean>()
    for (const t of index.threads) m.set(t.id, threadUnread(index, t))
    return m
  }, [index])
}
