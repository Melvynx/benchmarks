import { useEffect, useRef } from 'react'
import { useApp } from './app'
import { lastMessage } from './search'
import { forwardCompose, replyCompose, useDispatch, useIndex, useStore } from './store'

export function useShortcuts() {
  const app = useApp()
  const store = useStore()
  const dispatch = useDispatch()
  const index = useIndex()
  const chord = useRef('')

  useEffect(() => {
    if (!store.settings.shortcuts) return

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable
      if (e.key === 'Escape') {
        if (app.dialog.kind !== 'none') app.setDialog({ kind: 'none' })
        else if (store.compose.length) dispatch({ t: 'closeCompose', id: store.compose[store.compose.length - 1]!.id })
        else if (app.route.threadId) app.openThread(undefined)
        else dispatch({ t: 'clearSelect' })
        return
      }
      if (typing) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const key = e.key
      if (key === '?') {
        e.preventDefault()
        app.setDialog({ kind: 'shortcuts' })
        return
      }
      if (key === '/') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('input[aria-label="Search mail"]')?.focus()
        return
      }
      if (key === 'c') {
        e.preventDefault()
        app.openCompose()
        return
      }

      if (chord.current === 'g') {
        chord.current = ''
        if (key === 'i') app.navigate({ kind: 'inbox' })
        if (key === 's') app.navigate({ kind: 'starred' })
        if (key === 't') app.navigate({ kind: 'sent' })
        if (key === 'd') app.navigate({ kind: 'drafts' })
        return
      }
      if (key === 'g') {
        chord.current = 'g'
        window.setTimeout(() => {
          chord.current = ''
        }, 700)
        return
      }

      const list = app.visibleThreads
      const currentId = app.route.threadId ?? store.lastSelectedId ?? list[0]?.id
      const idx = list.findIndex((t) => t.id === currentId)
      const ids = store.selectedIds.length ? store.selectedIds : currentId ? [currentId] : []
      const thread = store.threads.find((t) => t.id === (app.route.threadId ?? currentId))
      const last = thread ? lastMessage(index, thread) : undefined

      if (key === 'j') {
        const n = list[Math.min(list.length - 1, idx + 1)]
        if (n) {
          if (app.route.threadId) app.openThread(n.id)
          else dispatch({ t: 'select', ids: [n.id] })
        }
      }
      if (key === 'k') {
        const n = list[Math.max(0, idx - 1)]
        if (n) {
          if (app.route.threadId) app.openThread(n.id)
          else dispatch({ t: 'select', ids: [n.id] })
        }
      }
      if (key === 'o' || key === 'Enter') {
        if (currentId) app.openThread(currentId)
      }
      if (key === 'u') app.openThread(undefined)
      if (key === 'e' && ids.length) dispatch({ t: 'archive', ids })
      if (key === '#' && ids.length) dispatch({ t: 'trash', ids })
      if (key === 's' && ids.length) {
        const starred = thread?.labels.includes('STARRED')
        dispatch({ t: 'star', ids, starred: !starred })
      }
      if (key === 'x' && currentId) dispatch({ t: 'toggleSelect', id: currentId })
      if (key === 'r' && thread && last) dispatch({ t: 'openCompose', compose: replyCompose(thread, last, false) })
      if (key === 'a' && thread && last) dispatch({ t: 'openCompose', compose: replyCompose(thread, last, true) })
      if (key === 'f' && thread && last) dispatch({ t: 'openCompose', compose: forwardCompose(thread, last) })
      if (key === 'I' && ids.length) dispatch({ t: 'markRead', ids, unread: false })
      if (key === 'U' && ids.length) dispatch({ t: 'markRead', ids, unread: true })
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [app, dispatch, index, store])
}
