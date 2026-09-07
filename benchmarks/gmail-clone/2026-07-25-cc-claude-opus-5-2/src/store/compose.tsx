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
import * as M from '@/lib/mutations'
import type { Address, ComposeMode, Draft, MailData, Message, Thread } from '@/lib/types'
import { formatFullDate, htmlToText, uid } from '@/lib/utils'
import { useMail } from './mail-store'
import { useSettings } from './settings'

export type WindowState = 'normal' | 'minimized' | 'full'

export interface ComposeWindow {
  draft: Draft
  state: WindowState
  /** Bumped to pull focus to this window. */
  focusToken: number
}

interface ComposeContextValue {
  windows: ComposeWindow[]
  openNew: (seed?: Partial<Draft>) => void
  openDraft: (draftId: string) => void
  openReply: (thread: Thread, message: Message, mode: ComposeMode) => void
  update: (id: string, patch: Partial<Draft>) => void
  setState: (id: string, state: WindowState) => void
  focus: (id: string) => void
  close: (id: string) => void
  discard: (id: string) => void
  /** Returns the draft that was sent so callers can build a toast. */
  send: (id: string, scheduledFor?: string) => { threadId: string; draft: Draft } | null
  isEmpty: (d: Draft) => boolean
}

const ComposeContext = createContext<ComposeContextValue | null>(null)

const MAX_OPEN = 3

function emptyDraft(seed?: Partial<Draft>): Draft {
  return {
    id: uid('d'),
    mode: 'new',
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    bodyHtml: '',
    attachments: [],
    updatedAt: new Date().toISOString(),
    ...seed,
  }
}

function signatureBlock(sig: string) {
  return sig.trim()
    ? `<p><br></p><p class="sig" style="color:#80868b">--<br>${sig
        .split('\n')
        .map((l) => l.trim())
        .join('<br>')}</p>`
    : '<p><br></p>'
}

function quotedBlock(m: Message) {
  const who = m.from.name ? `${m.from.name} &lt;${m.from.email}&gt;` : m.from.email
  return `<p><br></p><div class="quoted"><p>On ${formatFullDate(m.date)}, ${who} wrote:</p>${m.bodyHtml}</div>`
}

function replyRecipients(m: Message, mode: ComposeMode, me: string) {
  const dedupe = (list: Address[]) => {
    const seen = new Set<string>()
    return list.filter((a) => {
      const k = a.email.toLowerCase()
      if (k === me.toLowerCase() || seen.has(k)) return false
      seen.add(k)
      return true
    })
  }
  if (mode === 'forward') return { to: [] as Address[], cc: [] as Address[] }
  const primary = m.outgoing ? m.to : [m.from]
  if (mode === 'reply') return { to: dedupe(primary), cc: [] as Address[] }
  return { to: dedupe(primary), cc: dedupe([...m.to, ...m.cc]) }
}

function replySubject(subject: string, mode: ComposeMode) {
  const stripped = subject.replace(/^((re|fwd):\s*)+/i, '')
  return mode === 'forward' ? `Fwd: ${stripped}` : `Re: ${stripped}`
}

export function ComposeProvider({ children }: { children: ReactNode }) {
  const { data, mutate } = useMail()
  const { settings } = useSettings()
  const [windows, setWindows] = useState<ComposeWindow[]>([])
  const focusCounter = useRef(1)
  const syncTimers = useRef(new Map<string, number>())
  const dataRef = useRef(data)
  dataRef.current = data

  /** Write the live draft back to the persisted store, debounced. */
  const scheduleSync = useCallback(
    (draft: Draft) => {
      const timers = syncTimers.current
      window.clearTimeout(timers.get(draft.id))
      timers.set(
        draft.id,
        window.setTimeout(() => {
          timers.delete(draft.id)
          mutate((d) => M.upsertDraft(d, draft))
        }, 500),
      )
    },
    [mutate],
  )

  const flushSync = useCallback(
    (draft: Draft) => {
      window.clearTimeout(syncTimers.current.get(draft.id))
      syncTimers.current.delete(draft.id)
      mutate((d) => M.upsertDraft(d, draft))
    },
    [mutate],
  )

  const push = useCallback((draft: Draft, state: WindowState = 'normal') => {
    focusCounter.current += 1
    setWindows((list) => {
      const existing = list.find((w) => w.draft.id === draft.id)
      if (existing) {
        return list.map((w) =>
          w.draft.id === draft.id
            ? { ...w, state: w.state === 'minimized' ? 'normal' : w.state, focusToken: focusCounter.current }
            : w,
        )
      }
      const next = [...list, { draft, state, focusToken: focusCounter.current }]
      // Older windows collapse rather than disappear once the deck is full.
      if (next.length > MAX_OPEN) {
        const overflow = next.length - MAX_OPEN
        return next.map((w, i) => (i < overflow ? { ...w, state: 'minimized' as WindowState } : w))
      }
      return next
    })
  }, [])

  const openNew = useCallback(
    (seed?: Partial<Draft>) => {
      const draft = emptyDraft({
        bodyHtml: settings.signatureEnabled ? signatureBlock(settings.signature) : '',
        ...seed,
      })
      push(draft)
      scheduleSync(draft)
    },
    [push, scheduleSync, settings.signature, settings.signatureEnabled],
  )

  const openDraft = useCallback(
    (draftId: string) => {
      const draft = dataRef.current.drafts[draftId]
      if (draft) push({ ...draft })
    },
    [push],
  )

  const openReply = useCallback(
    (thread: Thread, message: Message, mode: ComposeMode) => {
      const me = dataRef.current.account.email
      const { to, cc } = replyRecipients(message, mode, me)
      const sig = settings.signatureEnabled ? signatureBlock(settings.signature) : '<p><br></p>'
      const draft = emptyDraft({
        threadId: mode === 'forward' ? undefined : thread.id,
        inReplyTo: message.id,
        mode,
        to,
        cc,
        subject: replySubject(thread.subject, mode),
        bodyHtml: `${sig}${quotedBlock(message)}`,
        attachments: mode === 'forward' ? message.attachments.map((a) => ({ ...a })) : [],
      })
      push(draft)
      scheduleSync(draft)
    },
    [push, scheduleSync, settings.signature, settings.signatureEnabled],
  )

  const update = useCallback(
    (id: string, patch: Partial<Draft>) => {
      setWindows((list) => {
        const next = list.map((w) =>
          w.draft.id === id ? { ...w, draft: { ...w.draft, ...patch } } : w,
        )
        const changed = next.find((w) => w.draft.id === id)
        if (changed) scheduleSync(changed.draft)
        return next
      })
    },
    [scheduleSync],
  )

  const setState = useCallback((id: string, state: WindowState) => {
    focusCounter.current += 1
    setWindows((list) =>
      list.map((w) => (w.draft.id === id ? { ...w, state, focusToken: focusCounter.current } : w)),
    )
  }, [])

  const focus = useCallback((id: string) => {
    focusCounter.current += 1
    setWindows((list) =>
      list.map((w) => (w.draft.id === id ? { ...w, focusToken: focusCounter.current } : w)),
    )
  }, [])

  const isEmpty = useCallback((d: Draft) => {
    const text = htmlToText(d.bodyHtml).replace(/^--[\s\S]*$/, '').trim()
    return (
      !d.to.length && !d.cc.length && !d.bcc.length && !d.subject.trim() && !text && !d.attachments.length
    )
  }, [])

  const close = useCallback(
    (id: string) => {
      const win = windows.find((w) => w.draft.id === id)
      setWindows((list) => list.filter((w) => w.draft.id !== id))
      if (!win) return
      window.clearTimeout(syncTimers.current.get(id))
      syncTimers.current.delete(id)
      if (isEmpty(win.draft)) mutate((d) => M.discardDraft(d, id))
      else mutate((d) => M.upsertDraft(d, win.draft))
    },
    [windows, mutate, isEmpty],
  )

  const discard = useCallback(
    (id: string) => {
      window.clearTimeout(syncTimers.current.get(id))
      syncTimers.current.delete(id)
      setWindows((list) => list.filter((w) => w.draft.id !== id))
      mutate((d) => M.discardDraft(d, id), 'Draft discarded')
    },
    [mutate],
  )

  const send = useCallback(
    (id: string, scheduledFor?: string) => {
      const win = windows.find((w) => w.draft.id === id)
      if (!win) return null
      const draft = win.draft
      window.clearTimeout(syncTimers.current.get(id))
      syncTimers.current.delete(id)
      setWindows((list) => list.filter((w) => w.draft.id !== id))

      let threadId = ''
      mutate((d: MailData) => {
        const result = M.sendDraft(d, draft, { scheduledFor })
        threadId = result.threadId
      }, scheduledFor ? 'Message scheduled' : 'Message sent')
      return { threadId, draft }
    },
    [windows, mutate],
  )

  useEffect(() => {
    const timers = syncTimers.current
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [])

  // Warn only when there is unsaved work in flight.
  useEffect(() => {
    if (!windows.length) return
    const handler = () => {
      windows.forEach((w) => flushSync(w.draft))
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [windows, flushSync])

  const value = useMemo(
    () => ({
      windows,
      openNew,
      openDraft,
      openReply,
      update,
      setState,
      focus,
      close,
      discard,
      send,
      isEmpty,
    }),
    [windows, openNew, openDraft, openReply, update, setState, focus, close, discard, send, isEmpty],
  )

  return <ComposeContext.Provider value={value}>{children}</ComposeContext.Provider>
}

export function useCompose() {
  const ctx = useContext(ComposeContext)
  if (!ctx) throw new Error('useCompose must be used inside <ComposeProvider>')
  return ctx
}
