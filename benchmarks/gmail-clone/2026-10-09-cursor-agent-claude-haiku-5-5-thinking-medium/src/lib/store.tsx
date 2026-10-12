import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import { buildSeed, DATA_VERSION } from '../data/seed'
import type { Category, Data, FolderId, Label, Message, Settings, SystemFolder } from '../types'

const STORAGE_KEY = 'inbox.local.v1'

export interface Toast {
  id: number
  text: string
  undo?: Action
}

export interface UI {
  folder: FolderId
  query: string
  threadId: string | null
  selection: string[]
  page: number
  category: Category | 'all'
  cursor: string | null
  composeId: string | null
  composeFull: boolean
  toast: Toast | null
  settingsOpen: boolean
  shortcutsOpen: boolean
  navOpen: boolean
  now: number
}

export interface State {
  data: Data
  ui: UI
}

export type Action =
  | { type: 'setFolder'; folder: FolderId }
  | { type: 'setQuery'; query: string }
  | { type: 'saveSearch'; query: string }
  | { type: 'clearRecent' }
  | { type: 'openThread'; threadId: string | null }
  | { type: 'setSelection'; keys: string[] }
  | { type: 'setPage'; page: number }
  | { type: 'setCategory'; category: Category | 'all' }
  | { type: 'setCursor'; cursor: string | null }
  | { type: 'mark'; ids: string[]; read: boolean }
  | { type: 'star'; ids: string[]; starred: boolean }
  | { type: 'archive'; ids: string[] }
  | { type: 'trash'; ids: string[] }
  | { type: 'move'; ids: string[]; folder: SystemFolder }
  | { type: 'purge'; ids: string[] }
  | { type: 'label'; ids: string[]; labelId: string; on: boolean }
  | { type: 'createLabel'; label: Label }
  | { type: 'snooze'; ids: string[]; until: number | null }
  | { type: 'upsert'; message: Message }
  | { type: 'patch'; id: string; patch: Partial<Message> }
  | { type: 'send'; id: string; now: number }
  | { type: 'schedule'; id: string; at: number }
  | { type: 'unschedule'; id: string }
  | { type: 'discard'; id: string }
  | { type: 'restore'; messages: Message[] }
  | { type: 'tick'; now: number }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'reset'; now: number }
  | { type: 'openCompose'; id: string | null; full?: boolean }
  | { type: 'composeFull'; full: boolean }
  | { type: 'toast'; toast: Toast | null }
  | { type: 'ui'; patch: Partial<Pick<UI, 'settingsOpen' | 'shortcutsOpen' | 'navOpen'>> }

function loadData(): Data {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Data
      if (parsed.version === DATA_VERSION) return parsed
    }
  } catch {
    /* corrupt storage: fall back to seed */
  }
  return buildSeed()
}

export function createInitialState(): State {
  return {
    data: loadData(),
    ui: {
      folder: 'inbox',
      query: '',
      threadId: null,
      selection: [],
      page: 0,
      category: 'primary',
      cursor: null,
      composeId: null,
      composeFull: false,
      toast: null,
      settingsOpen: false,
      shortcutsOpen: false,
      navOpen: false,
      now: Date.now(),
    },
  }
}

/** Apply a transform to a set of messages, returning a new data object only if something changed. */
function mapMessages(data: Data, ids: string[], fn: (m: Message) => Message | null): Data {
  let changed = false
  const next = { ...data.messages }
  for (const id of ids) {
    const m = next[id]
    if (!m) continue
    const res = fn(m)
    if (res === m) continue
    changed = true
    if (res === null) delete next[id]
    else next[id] = res
  }
  return changed ? { ...data, messages: next } : data
}

function withData(state: State, data: Data): State {
  return data === state.data ? state : { ...state, data }
}

function withUi(state: State, patch: Partial<UI>): State {
  return { ...state, ui: { ...state.ui, ...patch } }
}

export function reducer(state: State, action: Action): State {
  const { data } = state
  switch (action.type) {
    case 'setFolder':
      return withUi(state, { folder: action.folder, query: '', threadId: null, selection: [], page: 0, cursor: null, navOpen: false })
    case 'setQuery':
      return withUi(state, { query: action.query, page: 0, selection: [] })
    case 'saveSearch': {
      const q = action.query.trim()
      if (!q) return state
      const recent = [q, ...data.recentSearches.filter((x) => x !== q)].slice(0, 8)
      return withData(state, { ...data, recentSearches: recent })
    }
    case 'clearRecent':
      return withData(state, { ...data, recentSearches: [] })
    case 'openThread':
      return withUi(state, { threadId: action.threadId })
    case 'setSelection':
      return withUi(state, { selection: action.keys })
    case 'setPage':
      return withUi(state, { page: action.page, selection: [] })
    case 'setCategory':
      return withUi(state, { category: action.category, page: 0, selection: [] })
    case 'setCursor':
      return withUi(state, { cursor: action.cursor })
    case 'mark':
      return withData(state, mapMessages(data, action.ids, (m) => (m.read === action.read ? m : { ...m, read: action.read })))
    case 'star':
      return withData(state, mapMessages(data, action.ids, (m) => (m.starred === action.starred ? m : { ...m, starred: action.starred })))
    case 'archive':
      return withData(state, mapMessages(data, action.ids, (m) => (m.folder === 'inbox' ? { ...m, folder: 'archive', snoozedUntil: undefined } : m)))
    case 'trash':
      return withData(state, mapMessages(data, action.ids, (m) => {
        if (m.folder === 'trash') return m
        return { ...m, folder: 'trash', restoreFolder: m.folder, snoozedUntil: undefined }
      }))
    case 'move':
      return withData(state, mapMessages(data, action.ids, (m) => (m.folder === action.folder ? m : { ...m, folder: action.folder, restoreFolder: undefined, snoozedUntil: undefined })))
    case 'purge':
      return withData(state, mapMessages(data, action.ids, () => null))
    case 'label':
      return withData(state, mapMessages(data, action.ids, (m) => {
        const has = m.labels.includes(action.labelId)
        if (has === action.on) return m
        return { ...m, labels: action.on ? [...m.labels, action.labelId] : m.labels.filter((l) => l !== action.labelId) }
      }))
    case 'createLabel':
      if (data.labels.some((l) => l.id === action.label.id)) return state
      return withData(state, { ...data, labels: [...data.labels, action.label] })
    case 'snooze':
      return withData(state, mapMessages(data, action.ids, (m) => {
        if (m.folder !== 'inbox') return m
        return { ...m, snoozedUntil: action.until ?? undefined, read: action.until ? true : m.read }
      }))
    case 'upsert':
      return withData(state, { ...data, messages: { ...data.messages, [action.message.id]: action.message } })
    case 'patch': {
      const m = data.messages[action.id]
      if (!m) return state
      return withData(state, { ...data, messages: { ...data.messages, [action.id]: { ...m, ...action.patch } } })
    }
    case 'send': {
      const m = data.messages[action.id]
      if (!m) return state
      const sent: Message = {
        ...m,
        folder: 'sent',
        read: true,
        scheduledAt: undefined,
        date: action.now,
        subject: m.subject.trim() || '(no subject)',
      }
      return withData(state, { ...data, messages: { ...data.messages, [action.id]: sent } })
    }
    case 'schedule':
      return withData(state, mapMessages(data, [action.id], (m) => ({ ...m, folder: 'scheduled', scheduledAt: action.at })))
    case 'unschedule':
      return withData(state, mapMessages(data, [action.id], (m) => ({ ...m, folder: 'drafts', scheduledAt: undefined })))
    case 'discard':
      return withData(state, mapMessages(data, [action.id], () => null))
    case 'restore':
      return withData(state, { ...data, messages: { ...data.messages, ...Object.fromEntries(action.messages.map((m) => [m.id, m])) } })
    case 'tick': {
      let next = mapMessages(data, Object.keys(data.messages), (m) => {
        if (m.folder === 'inbox' && m.snoozedUntil !== undefined && m.snoozedUntil <= action.now) {
          return { ...m, snoozedUntil: undefined, read: false, date: action.now }
        }
        if (m.folder === 'scheduled' && m.scheduledAt !== undefined && m.scheduledAt <= action.now) {
          return { ...m, folder: 'sent', scheduledAt: undefined, read: true, date: action.now }
        }
        return m
      })
      return { ...state, data: next, ui: { ...state.ui, now: action.now } }
    }
    case 'settings':
      return withData(state, { ...data, settings: { ...data.settings, ...action.patch } })
    case 'reset':
      return { data: buildSeed(action.now), ui: { ...state.ui, threadId: null, selection: [], cursor: null, composeId: null, toast: null, query: '', folder: 'inbox', now: action.now } }
    case 'openCompose':
      return withUi(state, { composeId: action.id, composeFull: action.full ?? false })
    case 'composeFull':
      return withUi(state, { composeFull: action.full })
    case 'toast':
      return withUi(state, { toast: action.toast })
    case 'ui':
      return withUi(state, action.patch)
  }
}

/* ---------- Context ---------- */

interface StoreValue {
  state: State
  dispatch: Dispatch<Action>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data))
      } catch {
        /* quota exceeded: keep working in memory */
      }
    }, 250)
    return () => window.clearTimeout(id)
  }, [state.data])

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: 'tick', now: Date.now() }), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
