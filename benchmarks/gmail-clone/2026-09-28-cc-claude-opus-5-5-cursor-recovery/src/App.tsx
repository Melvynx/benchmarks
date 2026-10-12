import { useEffect, useRef } from 'react'
import { Pencil } from 'lucide-react'
import type { ReplyMode, View } from './types'
import { useMail } from './store/mail'
import { useUI } from './store/ui'
import { useRoute, goView } from './lib/router'
import { useViewThreads } from './hooks'
import { actions } from './actions'
import { cx, useIsMobile, useMediaQuery } from './components/ui'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { MailList } from './components/MailList'
import { ThreadView } from './components/ThreadView'
import { DraftList } from './components/DraftList'
import { ComposeDock } from './components/Compose'
import { AttachmentPreview } from './components/Attachments'
import { LabelModal, SettingsModal, ShortcutsModal, ToastHost } from './components/Overlays'

function useTheme() {
  const theme = useMail((s) => s.settings.theme)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111214' : '#f6f8fc')
  }, [dark])
}

function useMailClock() {
  useEffect(() => {
    const run = () => {
      const { arrived, unsnoozed } = useMail.getState().tick(Date.now())
      const ui = useUI.getState()
      if (arrived.length === 1) {
        const t = arrived[0]
        const from = t.messages[t.messages.length - 1].from.name
        ui.showToast(`New message from ${from}: “${t.subject}”`, {
          secondary: { label: 'Open', run: () => goView({ kind: 'folder', folder: 'inbox' }, t.id) },
        })
      } else if (arrived.length > 1) {
        ui.showToast(`${arrived.length} new messages.`)
      } else if (unsnoozed) {
        ui.showToast(`${unsnoozed === 1 ? 'A snoozed conversation is' : `${unsnoozed} snoozed conversations are`} back in your Inbox.`)
      }
    }
    run()
    const id = setInterval(run, 1000)
    return () => clearInterval(id)
  }, [])
}

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
}

function listRowIds(): string[] {
  return [...document.querySelectorAll<HTMLElement>('[data-index] [data-thread]')].map((el) => el.dataset.thread!)
}

function useShortcuts(view: View, threadId: string | undefined, order: string[]) {
  const ref = useRef({ view, threadId, order })
  ref.current = { view, threadId, order }
  useEffect(() => {
    let prefix: string | null = null
    let prefixTimer: ReturnType<typeof setTimeout> | undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return
      const ui = useUI.getState()
      const mail = useMail.getState()
      if (ui.overlay || ui.preview || document.querySelector('[role="dialog"]')) return
      const { view, threadId, order } = ref.current
      const k = e.key

      if (prefix) {
        const p = prefix
        prefix = null
        clearTimeout(prefixTimer)
        if (p === 'g') {
          const map: Record<string, View> = {
            i: { kind: 'folder', folder: 'inbox' },
            s: { kind: 'folder', folder: 'starred' },
            t: { kind: 'folder', folder: 'sent' },
            d: { kind: 'folder', folder: 'drafts' },
            a: { kind: 'folder', folder: 'all' },
          }
          if (map[k]) {
            e.preventDefault()
            ui.clearSelection()
            ui.setFocusIndex(0)
            goView(map[k])
          }
          return
        }
        if (p === '*') {
          e.preventDefault()
          if (k === 'a') ui.setSelected(listRowIds())
          else if (k === 'n') ui.clearSelection()
          else if (k === 'u') ui.setSelected(listRowIds().filter((id) => mail.threads[id]?.unread))
          else if (k === 'r') ui.setSelected(listRowIds().filter((id) => !mail.threads[id]?.unread))
          else if (k === 's') ui.setSelected(listRowIds().filter((id) => mail.threads[id]?.starred))
          return
        }
      }

      const rows = threadId ? [] : listRowIds()
      const focusedId = threadId ?? rows[ui.focusIndex]
      const targets = threadId ? [threadId] : ui.selected.length ? ui.selected : focusedId ? [focusedId] : []

      const leaveThread = () => {
        if (!threadId) return
        const i = order.indexOf(threadId)
        const next = order[i + 1] ?? order[i - 1]
        if (mail.settings.autoAdvance === 'next' && next) goView(view, next, true)
        else goView(view, undefined, true)
      }
      const bulk = (fn: () => void, leaves = true) => {
        if (!targets.length) return
        e.preventDefault()
        fn()
        if (!threadId) ui.clearSelection()
        else if (leaves) leaveThread()
      }

      switch (k) {
        case 'g':
        case '*':
          prefix = k
          prefixTimer = setTimeout(() => (prefix = null), 1500)
          return
        case 'c':
          e.preventDefault()
          ui.openCompose()
          return
        case '/':
          e.preventDefault()
          window.dispatchEvent(new Event('focus-search'))
          return
        case '?':
          e.preventDefault()
          ui.setOverlay('shortcuts')
          return
        case 'j':
        case 'k': {
          e.preventDefault()
          const dir = k === 'j' ? 1 : -1
          if (threadId) {
            const next = order[order.indexOf(threadId) + dir]
            if (next) goView(view, next)
          } else if (rows.length) {
            ui.setFocusIndex(Math.max(0, Math.min(rows.length - 1, ui.focusIndex + dir)))
          }
          return
        }
        case 'o':
        case 'Enter':
          if (!threadId && focusedId && !(e.target instanceof HTMLButtonElement)) {
            e.preventDefault()
            goView(view, focusedId)
          }
          return
        case 'u':
          if (threadId) {
            e.preventDefault()
            goView(view)
          }
          return
        case 'x':
          if (!threadId && focusedId) {
            e.preventDefault()
            ui.toggleSelected(focusedId)
          }
          return
        case 'Escape':
          if (ui.selected.length) ui.clearSelection()
          return
        case 's':
          if (!targets.length) return
          e.preventDefault()
          if (targets.length === 1) mail.toggleStar(targets[0])
          else actions.star(targets, !targets.every((id) => mail.threads[id]?.starred))
          return
        case 'e':
          if (view.kind === 'folder' && view.folder === 'trash') return
          bulk(() => {
            const inInbox = targets.every((id) => mail.threads[id]?.inbox)
            if (inInbox) actions.archive(targets)
            else actions.moveToInbox(targets)
          })
          return
        case '#':
          bulk(() => (view.kind === 'folder' && view.folder === 'trash' ? actions.deleteForever(targets) : actions.trash(targets)))
          return
        case '!':
          bulk(() => (view.kind === 'folder' && view.folder === 'spam' ? actions.notSpam(targets) : actions.spam(targets)))
          return
        case 'I':
          bulk(() => actions.read(targets, false), false)
          return
        case 'U':
          bulk(() => {
            actions.read(targets, true)
            if (threadId) goView(view)
          }, false)
          return
        case '+':
        case '=':
          bulk(() => actions.important(targets, true), false)
          return
        case '-':
          bulk(() => actions.important(targets, false), false)
          return
        case 'z':
          e.preventDefault()
          if (mail.undo()) ui.showToast('Action undone.', { duration: 3000 })
          return
        case 'r':
        case 'a':
        case 'f':
          if (threadId) {
            e.preventDefault()
            const mode: ReplyMode = k === 'r' ? 'reply' : k === 'a' ? 'replyAll' : 'forward'
            window.dispatchEvent(new CustomEvent<ReplyMode>('thread-reply', { detail: mode }))
          }
          return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(prefixTimer)
    }
  }, [])
}

function EmptyPane() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
      <svg width="72" height="60" viewBox="0 0 96 80" aria-hidden className="opacity-50">
        <rect x="8" y="14" width="80" height="56" rx="8" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M10 20 48 46 86 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <p className="text-[14px]">No conversation selected</p>
    </div>
  )
}

export default function App() {
  const { view, threadId } = useRoute()
  const mobile = useIsMobile()
  const wide = useMediaQuery('(min-width: 1180px)')
  const settings = useMail((s) => s.settings)
  const updateSettings = useMail((s) => s.updateSettings)
  const labels = useMail((s) => s.labels)
  const overlay = useUI((s) => s.overlay)
  const setOverlay = useUI((s) => s.setOverlay)
  const drawerOpen = useUI((s) => s.drawerOpen)
  const setDrawer = useUI((s) => s.setDrawer)
  const composeCount = useUI((s) => s.composes.length)
  const order = useViewThreads(view).map((t) => t.id)

  useTheme()
  useMailClock()
  useShortcuts(view, threadId, order)

  // a deleted label route falls back to the inbox
  useEffect(() => {
    if (view.kind === 'label' && !labels.some((l) => l.id === view.labelId)) goView({ kind: 'folder', folder: 'inbox' }, undefined, true)
  }, [view, labels])

  useEffect(() => {
    useUI.getState().clearSelection()
  }, [view.kind, view.kind === 'folder' ? view.folder : view.kind === 'label' ? view.labelId : view.query])

  const isDraftFolder = view.kind === 'folder' && (view.folder === 'drafts' || view.folder === 'scheduled')
  const split = !mobile && wide && settings.readingPane === 'right' && !isDraftFolder
  const collapsed = settings.sidebarCollapsed

  const main = isDraftFolder ? (
    <DraftList scheduled={view.kind === 'folder' && view.folder === 'scheduled'} />
  ) : split ? (
    <div className="flex h-full min-h-0">
      <div className="@container h-full min-w-0 flex-[1_1_46%] border-r border-line">
        <MailList view={view} openThreadId={threadId} />
      </div>
      <div className="h-full min-w-0 flex-[1_1_54%]">{threadId ? <ThreadView key={threadId} view={view} threadId={threadId} embedded /> : <EmptyPane />}</div>
    </div>
  ) : threadId ? (
    <ThreadView view={view} threadId={threadId} />
  ) : (
    <MailList view={view} />
  )

  const overlays = (
    <>
      <ComposeDock />
      <AttachmentPreview />
      <ToastHost />
      <SettingsModal open={overlay === 'settings'} onClose={() => setOverlay(null)} />
      <ShortcutsModal open={overlay === 'shortcuts'} onClose={() => setOverlay(null)} />
      <LabelModal open={overlay === 'newLabel'} onClose={() => setOverlay(null)} />
    </>
  )

  if (mobile) {
    return (
      <div className="flex h-full flex-col bg-bg">
        {(!threadId || isDraftFolder) && <TopBar view={view} mobile onToggleSidebar={() => setDrawer(true)} />}
        <main className="min-h-0 flex-1">{main}</main>
        {!threadId && composeCount === 0 && (
          <button
            type="button"
            onClick={() => useUI.getState().openCompose()}
            className="no-print animate-pop fixed bottom-5 right-4 z-30 flex h-14 items-center gap-3 rounded-2xl bg-compose pl-4 pr-5 font-medium text-on-compose shadow-pop"
            aria-label="Compose"
          >
            <Pencil size={22} />
            <span className="text-[15px]">Compose</span>
          </button>
        )}
        {drawerOpen && (
          <div className="fixed inset-0 z-50">
            <div className="animate-fade absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
            <div className="animate-slide-in absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col bg-bg pt-3 shadow-pop">
              <div className="px-5 pb-3 text-[20px] text-muted">Claude Opus 5.5</div>
              <div className="min-h-0 flex-1">
                <Sidebar view={view} collapsed={false} mobile />
              </div>
            </div>
          </div>
        )}
        {overlays}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <TopBar view={view} mobile={false} onToggleSidebar={() => updateSettings({ sidebarCollapsed: !collapsed })} />
      <div className="flex min-h-0 flex-1">
        <aside className={cx('no-print shrink-0 transition-[width]', collapsed ? 'w-[72px]' : 'w-[256px]')}>
          <Sidebar view={view} collapsed={collapsed} mobile={false} />
        </aside>
        <main className="mb-4 mr-4 min-w-0 flex-1 overflow-hidden rounded-2xl bg-surface max-md:mr-2">{main}</main>
      </div>
      {overlays}
    </div>
  )
}
