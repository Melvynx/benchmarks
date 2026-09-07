import { produce } from 'immer'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import * as M from '@/lib/mutations'
import { buildSeedData, DATA_VERSION } from '@/lib/seed'
import type { MailData } from '@/lib/types'

const STORAGE_KEY = 'opus5mail.data.v1'

interface UndoEntry {
  label: string
  snapshot: MailData
  at: number
}

interface State {
  data: MailData
  undo: UndoEntry | null
}

type Action =
  | { kind: 'mutate'; undoLabel?: string; fn: (d: MailData) => void }
  | { kind: 'undo' }
  | { kind: 'clearUndo' }
  | { kind: 'replace'; data: MailData }

function reducer(state: State, action: Action): State {
  switch (action.kind) {
    case 'mutate': {
      const next = produce(state.data, action.fn)
      if (next === state.data) return state
      return {
        data: next,
        undo: action.undoLabel
          ? { label: action.undoLabel, snapshot: state.data, at: Date.now() }
          : state.undo,
      }
    }
    case 'undo':
      if (!state.undo) return state
      return { data: state.undo.snapshot, undo: null }
    case 'clearUndo':
      return state.undo ? { ...state, undo: null } : state
    case 'replace':
      return { data: action.data, undo: null }
  }
}

function loadInitial(): State {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as MailData
        if (parsed?.version === DATA_VERSION && parsed.threads && parsed.messages) {
          return { data: parsed, undo: null }
        }
      }
    } catch {
      /* fall through to a fresh mailbox */
    }
  }
  return { data: buildSeedData(), undo: null }
}

export interface MailActions {
  mutate: (fn: (d: MailData) => void, undoLabel?: string) => void
  undo: () => void
  clearUndo: () => void
  resetMailbox: () => void
}

interface MailContextValue extends MailActions {
  data: MailData
  undoEntry: UndoEntry | null
}

const MailContext = createContext<MailContextValue | null>(null)

export function MailProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial)
  const saveTimer = useRef<number | undefined>(undefined)
  const stateRef = useRef(state)
  stateRef.current = state

  const mutate = useCallback((fn: (d: MailData) => void, undoLabel?: string) => {
    dispatch({ kind: 'mutate', fn, undoLabel })
  }, [])
  const undo = useCallback(() => dispatch({ kind: 'undo' }), [])
  const clearUndo = useCallback(() => dispatch({ kind: 'clearUndo' }), [])
  const resetMailbox = useCallback(() => {
    dispatch({ kind: 'replace', data: buildSeedData() })
  }, [])

  /* Persist, debounced, so a burst of keystrokes in the composer is one write. */
  useEffect(() => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data))
      } catch {
        /* quota exceeded — the app keeps working in memory */
      }
    }, 350)
    return () => window.clearTimeout(saveTimer.current)
  }, [state.data])

  /* Snoozed mail returns and scheduled mail goes out on a slow tick. */
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const data = stateRef.current.data
      const dueSnooze = Object.values(data.threads).some(
        (t) => t.snoozedUntil && Date.parse(t.snoozedUntil) <= now,
      )
      const dueSend = Object.values(data.messages).some(
        (m) => m.scheduledFor && Date.parse(m.scheduledFor) <= now,
      )
      if (!dueSnooze && !dueSend) return
      dispatch({
        kind: 'mutate',
        fn: (d) => {
          M.wakeSnoozed(d, now)
          M.deliverScheduled(d, now)
        },
      })
    }
    const id = window.setInterval(tick, 15_000)
    tick()
    return () => window.clearInterval(id)
  }, [])

  const value = useMemo<MailContextValue>(
    () => ({ data: state.data, undoEntry: state.undo, mutate, undo, clearUndo, resetMailbox }),
    [state.data, state.undo, mutate, undo, clearUndo, resetMailbox],
  )

  return <MailContext.Provider value={value}>{children}</MailContext.Provider>
}

export function useMail() {
  const ctx = useContext(MailContext)
  if (!ctx) throw new Error('useMail must be used inside <MailProvider>')
  return ctx
}
