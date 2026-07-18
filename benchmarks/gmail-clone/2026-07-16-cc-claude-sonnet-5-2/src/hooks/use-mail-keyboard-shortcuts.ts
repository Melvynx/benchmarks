import { useEffect, useRef } from 'react'
import { useMailStore } from '@/store/mail-store'

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

export function useMailKeyboardShortcuts() {
  const pendingG = useRef(false)
  const pendingTimer = useRef<number | null>(null)

  const openCompose = useMailStore((s) => s.openCompose)
  const selectedThreadId = useMailStore((s) => s.selectedThreadId)
  const selectedIds = useMailStore((s) => s.selectedIds)
  const closeThread = useMailStore((s) => s.closeThread)
  const archiveThreads = useMailStore((s) => s.archiveThreads)
  const trashThreads = useMailStore((s) => s.trashThreads)
  const toggleStar = useMailStore((s) => s.toggleStar)
  const markRead = useMailStore((s) => s.markRead)
  const setView = useMailStore((s) => s.setView)
  const clearSearch = useMailStore((s) => s.clearSearch)
  const searchQuery = useMailStore((s) => s.searchQuery)
  const setShortcutsDialogOpen = useMailStore((s) => s.setShortcutsDialogOpen)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur()
        return
      }

      if (pendingG.current) {
        pendingG.current = false
        if (pendingTimer.current) window.clearTimeout(pendingTimer.current)
        const map: Record<string, { kind: 'folder'; id: 'inbox' | 'starred' | 'sent' | 'draft' | 'trash' }> = {
          i: { kind: 'folder', id: 'inbox' },
          s: { kind: 'folder', id: 'starred' },
          t: { kind: 'folder', id: 'sent' },
          d: { kind: 'folder', id: 'draft' },
        }
        const target = map[e.key.toLowerCase()]
        if (target) {
          e.preventDefault()
          setView(target)
        }
        return
      }

      const targetIds = selectedThreadId ? [selectedThreadId] : selectedIds

      switch (e.key.toLowerCase()) {
        case 'g':
          pendingG.current = true
          pendingTimer.current = window.setTimeout(() => {
            pendingG.current = false
          }, 900)
          break
        case 'c':
          e.preventDefault()
          openCompose('new')
          break
        case 'e':
          if (targetIds.length) {
            e.preventDefault()
            archiveThreads(targetIds)
          }
          break
        case '#':
          if (targetIds.length) {
            e.preventDefault()
            trashThreads(targetIds)
          }
          break
        case 's':
          if (selectedThreadId) {
            e.preventDefault()
            toggleStar(selectedThreadId)
          }
          break
        case 'u':
          if (selectedThreadId) {
            e.preventDefault()
            markRead([selectedThreadId], false)
            closeThread()
          }
          break
        case 'r':
          if (selectedThreadId) {
            e.preventDefault()
            openCompose('reply', { threadId: selectedThreadId })
          }
          break
        case 'a':
          if (selectedThreadId) {
            e.preventDefault()
            openCompose('reply-all', { threadId: selectedThreadId })
          }
          break
        case 'f':
          if (selectedThreadId) {
            e.preventDefault()
            openCompose('forward', { threadId: selectedThreadId })
          }
          break
        case 'escape':
          if (searchQuery) clearSearch()
          else if (selectedThreadId) closeThread()
          break
        case '?':
          e.preventDefault()
          setShortcutsDialogOpen(true)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (pendingTimer.current) window.clearTimeout(pendingTimer.current)
    }
  }, [
    selectedThreadId,
    selectedIds,
    searchQuery,
    openCompose,
    archiveThreads,
    trashThreads,
    toggleStar,
    markRead,
    closeThread,
    setView,
    clearSearch,
    setShortcutsDialogOpen,
  ])
}
