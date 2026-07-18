import { useEffect, useRef } from 'react'
import { useMail } from '../store/store'
import type { Thread } from '../types'

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function focusSearch() {
  const input = document.getElementById('search-input') as HTMLInputElement | null
  input?.focus()
  input?.select()
}

/** Global Gmail-style shortcuts. `visible` is the thread list for the current view. */
export function useKeyboardShortcuts(visible: Thread[]) {
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  const pendingG = useRef(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return

      const s = useMail.getState()
      const list = visibleRef.current
      const openThreadId = s.route.threadId
      const cursorThread = s.cursor >= 0 ? list[Math.min(s.cursor, list.length - 1)] : undefined

      /** Threads a list action applies to: selection first, then cursor row, then open thread. */
      const targets = (): string[] => {
        if (openThreadId) return [openThreadId]
        if (s.selected.length) return s.selected
        if (cursorThread) return [cursorThread.id]
        return []
      }

      // g-prefixed navigation sequences
      if (pendingG.current && Date.now() - pendingG.current < 900) {
        pendingG.current = 0
        const map: Record<string, () => void> = {
          i: () => s.navigate({ folder: 'inbox' }),
          s: () => s.navigate({ folder: 'starred' }),
          t: () => s.navigate({ folder: 'sent' }),
          d: () => s.navigate({ folder: 'drafts' }),
          a: () => s.navigate({ folder: 'all' }),
          b: () => s.navigate({ folder: 'snoozed' }),
        }
        if (map[e.key]) {
          e.preventDefault()
          map[e.key]()
          return
        }
      }

      switch (e.key) {
        case 'g':
          pendingG.current = Date.now()
          return
        case 'c':
          e.preventDefault()
          s.openCompose()
          return
        case '/':
          e.preventDefault()
          focusSearch()
          return
        case '?':
          e.preventDefault()
          s.setShortcutsOpen(!s.shortcutsOpen)
          return
        case 'j':
        case 'k': {
          e.preventDefault()
          const delta = e.key === 'j' ? 1 : -1
          if (openThreadId) {
            const idx = list.findIndex((t) => t.id === openThreadId)
            const next = list[idx + delta]
            if (next) {
              s.openThread(next.id)
              s.setCursor(idx + delta)
            }
          } else {
            const next = Math.min(Math.max(s.cursor + delta, 0), Math.max(list.length - 1, 0))
            if (list.length) s.setCursor(next)
          }
          return
        }
        case 'Enter':
        case 'o':
          if (!openThreadId && cursorThread) {
            e.preventDefault()
            s.openThread(cursorThread.id)
          }
          return
        case 'x':
          if (!openThreadId && cursorThread) {
            e.preventDefault()
            s.toggleSelect(cursorThread.id)
          }
          return
        case 's': {
          const id = openThreadId ?? cursorThread?.id
          if (id) {
            e.preventDefault()
            s.toggleThreadStar(id)
          }
          return
        }
        case 'e': {
          const ids = targets()
          if (ids.length) {
            e.preventDefault()
            s.archiveThreads(ids)
          }
          return
        }
        case '#': {
          const ids = targets()
          if (ids.length) {
            e.preventDefault()
            s.trashThreads(ids)
          }
          return
        }
        case '!': {
          const ids = targets()
          if (ids.length) {
            e.preventDefault()
            s.markSpam(ids)
          }
          return
        }
        case 'u':
          if (openThreadId) {
            e.preventDefault()
            s.closeThread()
          } else if (s.selected.length) {
            e.preventDefault()
            s.clearSelection()
          }
          return
        case 'I':
          if (targets().length) {
            e.preventDefault()
            s.markRead(targets(), true)
          }
          return
        case 'U':
          if (targets().length) {
            e.preventDefault()
            s.markRead(targets(), false)
            if (openThreadId) s.closeThread()
          }
          return
        case 'z':
          e.preventDefault()
          s.undo()
          return
        case 'r':
        case 'a':
        case 'f':
          if (openThreadId) {
            e.preventDefault()
            const mode = e.key === 'r' ? 'reply' : e.key === 'a' ? 'replyAll' : 'forward'
            window.dispatchEvent(new CustomEvent('fable:reply', { detail: { mode } }))
          }
          return
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}
