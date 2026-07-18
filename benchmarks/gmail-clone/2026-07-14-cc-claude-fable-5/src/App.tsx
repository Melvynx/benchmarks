import { useEffect } from 'react'
import { useMail, useThread } from './store/store'
import { useHashRouter, useIsMobile, useNow, useVisibleThreads } from './hooks/hooks'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { MailList } from './components/MailList'
import { ThreadView } from './components/ThreadView'
import { ComposeLayer } from './components/Compose'
import { SettingsPanel, ShortcutsDialog, ToastHost } from './components/overlays'

function useTheme() {
  const theme = useMail((s) => s.settings.theme)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mql.matches)
      document.documentElement.classList.toggle('dark', dark)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#0e1014' : '#f6f8fc')
    }
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [theme])
}

export default function App() {
  useTheme()
  useHashRouter()
  const visible = useVisibleThreads()
  useKeyboardShortcuts(visible)
  const isMobile = useIsMobile()

  const route = useMail((s) => s.route)
  const wakeSnoozed = useMail((s) => s.wakeSnoozed)
  const openThreadId = useMail((s) => s.route.threadId)
  const openedThread = useThread(openThreadId)
  const now = useNow(30_000)

  useEffect(() => {
    wakeSnoozed()
  }, [now])

  // If the open thread disappears (deleted forever / reset), fall back to the list
  useEffect(() => {
    if (openThreadId && !openedThread) {
      useMail.getState().closeThread()
    }
  }, [openThreadId, openedThread])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        {!isMobile && <Sidebar />}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface md:mb-4 md:mr-4 md:rounded-2xl">
          {openedThread ? (
            <ThreadView key={openedThread.id} thread={openedThread} />
          ) : (
            <MailList key={`${route.folder}-${route.labelId ?? ''}-${route.query ?? ''}`} />
          )}
        </main>
        <SettingsPanel />
      </div>
      {isMobile && <Sidebar />}
      <ComposeLayer />
      <ToastHost />
      <ShortcutsDialog />
    </div>
  )
}
