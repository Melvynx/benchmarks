import { useEffect, useRef } from 'react'
import { useApp } from './app'
import { threadMessages, useStore } from './store'
import { SYS, type ViewKind } from './types'

export interface ShortcutDoc {
  keys: string
  label: string
  group: string
}

export const SHORTCUTS: ShortcutDoc[] = [
  { group: 'Navigation', keys: 'j', label: 'Move to older conversation' },
  { group: 'Navigation', keys: 'k', label: 'Move to newer conversation' },
  { group: 'Navigation', keys: 'Enter', label: 'Open conversation' },
  { group: 'Navigation', keys: 'u', label: 'Back to conversation list' },
  { group: 'Navigation', keys: 'Esc', label: 'Clear selection / close' },
  { group: 'Navigation', keys: '/', label: 'Focus search' },
  { group: 'Navigation', keys: '?', label: 'Show this dialog' },

  { group: 'Jump to', keys: 'g i', label: 'Inbox' },
  { group: 'Jump to', keys: 'g s', label: 'Starred' },
  { group: 'Jump to', keys: 'g b', label: 'Snoozed' },
  { group: 'Jump to', keys: 'g t', label: 'Sent' },
  { group: 'Jump to', keys: 'g d', label: 'Drafts' },
  { group: 'Jump to', keys: 'g a', label: 'All Mail' },

  { group: 'Actions', keys: 'x', label: 'Select conversation' },
  { group: 'Actions', keys: '*', label: 'Select all in view' },
  { group: 'Actions', keys: 's', label: 'Star or unstar' },
  { group: 'Actions', keys: 'e', label: 'Archive' },
  { group: 'Actions', keys: '#', label: 'Move to Trash' },
  { group: 'Actions', keys: '!', label: 'Report spam' },
  { group: 'Actions', keys: 'b', label: 'Snooze until tomorrow' },
  { group: 'Actions', keys: 'l', label: 'Label conversation' },
  { group: 'Actions', keys: 'z', label: 'Undo last action' },

  { group: 'Compose & read', keys: 'c', label: 'Compose new message' },
  { group: 'Compose & read', keys: 'r', label: 'Reply' },
  { group: 'Compose & read', keys: 'a', label: 'Reply all' },
  { group: 'Compose & read', keys: 'f', label: 'Forward' },
  { group: 'Compose & read', keys: 'I', label: 'Mark as read' },
  { group: 'Compose & read', keys: 'U', label: 'Mark as unread' },
  { group: 'Compose & read', keys: '⌘ Enter', label: 'Send (while composing)' },
]

const JUMPS: Record<string, ViewKind> = {
  i: 'inbox',
  s: 'starred',
  b: 'snoozed',
  t: 'sent',
  d: 'drafts',
  a: 'all',
  k: 'trash',
}

function typing(el: EventTarget | null) {
  const n = el as HTMLElement | null
  if (!n || !n.tagName) return false
  return (
    n.tagName === 'INPUT' ||
    n.tagName === 'TEXTAREA' ||
    n.tagName === 'SELECT' ||
    n.isContentEditable === true
  )
}

function tomorrowMorning() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(8, 0, 0, 0)
  return d.getTime()
}

/**
 * Global keyboard layer. Anything acting on "the current conversation" targets
 * the selection when there is one, otherwise the open thread, otherwise the
 * cursor row — the same precedence Gmail uses.
 */
export function useShortcuts() {
  const app = useApp()
  const state = useStore()
  const pending = useRef<{ key: string; at: number } | null>(null)

  // Keep the cursor pointing at something real as the list changes.
  const ids = app.threads.map((t) => t.id).join(',')
  const cursorRef = useRef(app.cursor)
  cursorRef.current = app.cursor
  const setCursor = app.setCursor
  useEffect(() => {
    const list = ids ? ids.split(',') : []
    if (cursorRef.current && list.includes(cursorRef.current)) return
    setCursor(list[0])
  }, [ids, setCursor])

  useEffect(() => {
    if (!state.settings.shortcuts) return

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (typing(e.target)) return
      if (app.dialog && e.key !== '?') return
      // An open composer owns the keyboard, exactly like Gmail.
      if (app.compose.some((c) => c.mode !== 'minimized')) return

      const list = app.threads
      const cursor = app.cursor
      const openId = app.route.threadId
      const targets = app.selection.length
        ? app.selection
        : openId
          ? [openId]
          : cursor
            ? [cursor]
            : []
      const thread = state.threads.find((t) => t.id === (openId ?? cursor))

      const step = (delta: number) => {
        if (!list.length) return
        const i = cursor ? list.findIndex((t) => t.id === cursor) : -1
        const next = list[Math.max(0, Math.min(list.length - 1, i + delta))]
        if (!next) return
        app.setCursor(next.id)
        if (openId) app.openThread(next.id)
        document
          .querySelector(`[data-thread="${next.id}"]`)
          ?.scrollIntoView({ block: 'nearest' })
      }

      /* two-key `g` sequences */
      const seq = pending.current
      if (seq && Date.now() - seq.at < 1500) {
        pending.current = null
        const kind = JUMPS[e.key.toLowerCase()]
        if (seq.key === 'g' && kind) {
          e.preventDefault()
          app.navigate({ kind })
          return
        }
      }
      pending.current = null

      switch (e.key) {
        case 'g':
          pending.current = { key: 'g', at: Date.now() }
          return
        case 'j':
          e.preventDefault()
          step(1)
          return
        case 'k':
          e.preventDefault()
          step(-1)
          return
        case 'Enter':
        case 'o': {
          if (!cursor) return
          e.preventDefault()
          const t = state.threads.find((x) => x.id === cursor)
          const draft = t && threadMessages(state, t).find((m) => m.draft)
          if (t && draft && t.messageIds.length === 1) app.editDraft(t, draft)
          else app.openThread(cursor)
          return
        }
        case 'u':
          if (!openId) return
          e.preventDefault()
          app.openThread(undefined)
          return
        case 'Escape':
          if (app.selection.length) app.clearSelection()
          else if (openId) app.openThread(undefined)
          return
        case 'x':
          if (!cursor) return
          e.preventDefault()
          app.toggleSelect(cursor)
          return
        case '*':
          e.preventDefault()
          app.setSelection(
            app.selection.length === list.length ? [] : list.map((t) => t.id),
          )
          return
        case 's': {
          if (!thread && !targets.length) return
          e.preventDefault()
          if (app.selection.length) {
            const anyOff = state.threads.some(
              (t) => app.selection.includes(t.id) && !t.labels.includes(SYS.STARRED),
            )
            app.setStar(app.selection, anyOff)
          } else if (thread) {
            app.toggleStar(thread.id)
          }
          return
        }
        case 'e':
          if (!targets.length) return
          e.preventDefault()
          app.archive(targets)
          return
        case '#':
          if (!targets.length) return
          e.preventDefault()
          if (app.route.kind === 'trash') app.deleteForever(targets)
          else app.trash(targets)
          return
        case '!':
          if (!targets.length) return
          e.preventDefault()
          app.markSpam(targets, app.route.kind !== 'spam')
          return
        case 'b':
          if (!targets.length) return
          e.preventDefault()
          app.snooze(targets, tomorrowMorning())
          return
        case 'l':
          if (!targets.length) return
          e.preventDefault()
          app.setDialog({ kind: 'newLabel', applyTo: targets })
          return
        case 'I':
          if (!targets.length) return
          e.preventDefault()
          app.setRead(targets, true)
          return
        case 'U':
          if (!targets.length) return
          e.preventDefault()
          app.setRead(targets, false)
          return
        case 'z': {
          e.preventDefault()
          const last = app.snacks.filter((s) => s.undo).pop()
          if (last) app.runUndo(last)
          return
        }
        case 'c':
          e.preventDefault()
          app.openCompose()
          return
        case 'r':
        case 'a':
        case 'f': {
          if (!thread) return
          const msgs = threadMessages(state, thread).filter((m) => !m.draft)
          const last = msgs[msgs.length - 1]
          if (!last) return
          e.preventDefault()
          if (!openId) app.openThread(thread.id)
          app.replyTo(thread, last, e.key === 'r' ? 'reply' : e.key === 'a' ? 'replyAll' : 'forward')
          return
        }
        case '?':
          e.preventDefault()
          app.setDialog(app.dialog?.kind === 'shortcuts' ? null : { kind: 'shortcuts' })
          return
        default:
          return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [app, state])
}
