import { useEffect, useMemo } from 'react'
import { Pencil } from 'lucide-react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { ThreadList } from './components/ThreadList'
import { ThreadView } from './components/ThreadView'
import { Compose } from './components/Compose'
import { Toast } from './components/Toast'
import { SettingsModal, ShortcutsModal } from './components/Settings'
import { useStore } from './lib/store'
import { useMailActions } from './lib/actions'
import { computeView, groupMessageIds } from './lib/view'
import { PAGE_SIZE, type ThreadGroup } from './lib/mail'
import type { FolderId } from './types'
import { cx } from './components/ui'

export default function App() {
  const { state, dispatch } = useStore()
  const { data, ui } = state
  const actions = useMailActions()

  // Theme: apply class on <html>, follow OS when set to system
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = data.settings.theme === 'dark' || (data.settings.theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [data.settings.theme])

  // Clock: keeps snoozes and scheduled mail in sync while the tab is open
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) dispatch({ type: 'tick', now: Date.now() })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [dispatch])

  const labelName = data.labels.find((l) => ui.folder === `label:${l.id}`)?.name
  const view = useMemo(() => computeView(data, ui, labelName), [data, ui, labelName])
  const page = Math.min(ui.page, Math.max(0, Math.ceil(view.groups.length / PAGE_SIZE) - 1))
  const visible = view.groups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Keyboard shortcuts (Gmail-style)
  useEffect(() => {
    let gPending = false
    let gTimer = 0

    const cursorIndex = () => visible.findIndex((g) => g.key === ui.cursor)
    const target = (): string[] => {
      if (ui.threadId) return actions.scopeFor(ui.threadId)
      if (ui.selection.length) return groupMessageIds(visible, ui.selection)
      const g = visible.find((x) => x.key === ui.cursor)
      return g ? g.messages.map((m) => m.id) : []
    }
    const moveCursor = (delta: number) => {
      if (!visible.length) return
      const i = cursorIndex()
      const next = visible[Math.min(visible.length - 1, Math.max(0, (i < 0 ? -1 : i) + delta))]
      dispatch({ type: 'setCursor', cursor: next.key })
      if (ui.threadId && next.threadId) actions.openThread(next.threadId)
    }
    const currentGroup = (): ThreadGroup | undefined => visible.find((g) => g.key === ui.cursor) ?? visible[0]
    const openCursor = () => {
      const g = currentGroup()
      if (!g) return
      if (ui.folder === 'drafts' || ui.folder === 'scheduled') dispatch({ type: 'openCompose', id: g.latest.id })
      else actions.openThread(g.threadId)
    }
    const afterMove = () => {
      if (ui.threadId) dispatch({ type: 'openThread', threadId: null })
    }
    const goFolder = (folder: FolderId) => dispatch({ type: 'setFolder', folder })

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (el.closest('input, textarea, select, [contenteditable="true"]') || el.isContentEditable) return
      if (ui.settingsOpen || ui.shortcutsOpen || ui.composeId) return

      if (gPending) {
        gPending = false
        window.clearTimeout(gTimer)
        const map: Record<string, FolderId> = { i: 'inbox', s: 'starred', d: 'drafts', t: 'trash', a: 'all', n: 'snoozed' }
        if (map[e.key]) {
          e.preventDefault()
          goFolder(map[e.key])
        }
        return
      }

      const ids = target()
      switch (e.key) {
        case 'c':
          e.preventDefault()
          actions.openCompose('new')
          break
        case 'j':
          e.preventDefault()
          moveCursor(1)
          break
        case 'k':
          e.preventDefault()
          moveCursor(-1)
          break
        case 'o':
        case 'Enter':
          if (!ui.threadId) {
            e.preventDefault()
            openCursor()
          }
          break
        case 'x': {
          const g = currentGroup()
          if (!g) return
          const sel = ui.selection.includes(g.key) ? ui.selection.filter((k) => k !== g.key) : [...ui.selection, g.key]
          dispatch({ type: 'setSelection', keys: sel })
          break
        }
        case 'e':
          if (ids.length) {
            actions.archive(ids)
            afterMove()
          }
          break
        case '#':
        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          if (ids.length) {
            actions.trash(ids)
            afterMove()
          }
          break
        case '!':
          if (ids.length) {
            actions.move(ids, 'spam', 'Moved to Spam')
            afterMove()
          }
          break
        case 's':
          actions.toggleStar(ids)
          break
        case 'u':
          actions.markRead(ids)
          break
        case 'U':
          actions.markRead(ids, false)
          break
        case 'I':
          actions.markRead(ids, true)
          break
        case 'r':
        case 'a':
        case 'f': {
          if (!ui.threadId) return
          const last = Object.values(data.messages)
            .filter((m) => m.threadId === ui.threadId && m.folder !== 'drafts' && m.folder !== 'scheduled')
            .sort((x, y) => y.date - x.date)[0]
          if (last) actions.openCompose(e.key === 'r' ? 'reply' : e.key === 'a' ? 'replyAll' : 'forward', last)
          break
        }
        case 'g':
          gPending = true
          gTimer = window.setTimeout(() => (gPending = false), 1200)
          break
        case '?':
          dispatch({ type: 'ui', patch: { shortcutsOpen: true } })
          break
        case 'Escape':
          if (ui.threadId) dispatch({ type: 'openThread', threadId: null })
          else if (ui.selection.length) dispatch({ type: 'setSelection', keys: [] })
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ui, data, visible, dispatch, actions])

  const pane = data.settings.readingPane
  const reading = Boolean(ui.threadId)
  const listClass = reading
    ? pane === 'right'
      ? 'hidden md:flex md:w-[380px] md:shrink-0 md:border-r md:border-line lg:w-[440px]'
      : 'hidden'
    : 'flex'

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header onToggleNav={() => dispatch({ type: 'ui', patch: { navOpen: !ui.navOpen } })} />

      <div className="flex min-h-0 flex-1">
        {ui.navOpen && <div className="fixed inset-0 z-40 bg-scrim lg:hidden" onClick={() => dispatch({ type: 'ui', patch: { navOpen: false } })} />}
        <aside
          className={cx(
            'w-[256px] shrink-0 bg-app py-1',
            ui.navOpen ? 'fixed inset-y-0 left-0 z-50 flex flex-col bg-surface shadow-2xl' : 'hidden lg:block',
          )}
          aria-label="Navigation"
        >
          <Sidebar />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-surface md:my-2 md:mr-2 md:rounded-2xl md:shadow-sm">
          <div className={cx('min-h-0 min-w-0 flex-col', listClass, reading ? '' : 'flex-1')}>
            <ThreadList onRefresh={() => actions.toast('Your mailbox is up to date')} />
          </div>
          {reading && <ThreadView key={ui.threadId} />}
        </main>
      </div>

      {!ui.composeId && (
        <button
          type="button"
          onClick={() => actions.openCompose('new')}
          aria-label="Compose"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-lg md:hidden"
        >
          <Pencil size={22} />
        </button>
      )}
      <Compose />
      <Toast />
      {ui.settingsOpen && <SettingsModal onClose={() => dispatch({ type: 'ui', patch: { settingsOpen: false } })} />}
      {ui.shortcutsOpen && <ShortcutsModal onClose={() => dispatch({ type: 'ui', patch: { shortcutsOpen: false } })} />}
    </div>
  )
}
