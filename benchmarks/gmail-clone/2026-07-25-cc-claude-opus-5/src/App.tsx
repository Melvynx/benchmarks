import { useEffect } from 'react'
import { AppProvider, useApp } from './lib/app'
import { useMedia } from './lib/media'
import { VIEW_TITLES } from './lib/router'
import { useShortcuts } from './lib/shortcuts'
import { StoreProvider, useResolvedTheme, useStore } from './lib/store'
import { ComposeStack } from './components/Compose'
import { Dialogs } from './components/Dialogs'
import { Icon } from './components/Icon'
import { CategoryTabs } from './components/Menus'
import { Sidebar } from './components/Sidebar'
import { Snackbar } from './components/Snackbar'
import { ThreadList } from './components/ThreadList'
import { ThreadView } from './components/ThreadView'
import { Toolbar } from './components/Toolbar'
import { TopBar } from './components/TopBar'
import { cx } from './components/ui'

export default function App() {
  return (
    <StoreProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </StoreProvider>
  )
}

function Shell() {
  const app = useApp()
  const state = useStore()
  useResolvedTheme(state.settings.theme)
  useShortcuts()

  const wide = useMedia('(min-width: 1100px)')
  const desktop = useMedia('(min-width: 768px)')
  const split = state.settings.readingPane === 'right' && wide
  const thread = state.threads.find((t) => t.id === app.route.threadId)

  // A thread id that vanished (deleted forever, reset) shouldn't wedge the route.
  useEffect(() => {
    if (app.route.threadId && !thread) app.openThread(undefined)
  }, [app, thread])

  useEffect(() => {
    if (desktop) app.setSidebarOpen(false)
  }, [desktop, app])

  const listPane = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none bg-panel sm:rounded-2xl">
      <Toolbar />
      {app.route.kind === 'inbox' && state.settings.categoryTabs && <CategoryTabs />}
      {app.route.kind === 'search' && <SearchHeader />}
      <ThreadList compact={split} />
    </div>
  )

  const threadPane = thread ? (
    <div
      className={cx(
        'flex min-h-0 min-w-0 flex-col overflow-hidden bg-panel sm:rounded-2xl',
        split ? 'flex-[1.35]' : 'flex-1',
      )}
    >
      <ThreadView thread={thread} onBack={() => app.openThread(undefined)} />
    </div>
  ) : null

  return (
    <div className="print-root flex h-full flex-col overflow-hidden bg-canvas">
      <TopBar />

      <div className="flex min-h-0 flex-1 gap-0 sm:gap-2">
        <div className="hidden flex-none md:block">
          <Sidebar />
        </div>

        {app.sidebarOpen && (
          <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-label="Mailboxes">
            <div
              className="anim-fade absolute inset-0 bg-scrim"
              onClick={() => app.setSidebarOpen(false)}
            />
            <div className="anim-drawer absolute inset-y-0 left-0 w-[280px] overflow-hidden bg-panel pt-3 shadow-e3">
              <Sidebar />
            </div>
          </div>
        )}

        <main className="flex min-h-0 min-w-0 flex-1 gap-2 pr-0 pb-0 sm:pr-4 sm:pb-4">
          {split ? (
            <>
              {listPane}
              {threadPane ?? <NoSelection />}
            </>
          ) : (
            (threadPane ?? listPane)
          )}
        </main>
      </div>

      {/* The sidebar's Compose button lives in the drawer on phones, so the
          list keeps its own floating action button. */}
      {!thread && (
        <button
          type="button"
          aria-label="Compose"
          onClick={() => app.openCompose()}
          className="no-print fixed right-4 bottom-4 z-[90] flex items-center gap-2 rounded-2xl bg-panel px-4 py-3.5 text-[14px] font-medium text-ink shadow-e3 transition-shadow active:shadow-e1 md:hidden"
        >
          <Icon name="edit" size={20} className="text-accent" />
          Compose
        </button>
      )}

      <ComposeStack />
      <Snackbar />
      <Dialogs />
    </div>
  )
}

function SearchHeader() {
  const app = useApp()
  const q = app.route.query ?? ''
  return (
    <div className="flex flex-none items-center gap-2 border-b border-line px-4 py-2 text-[13px] text-ink-2 sm:px-6">
      <Icon name="search" size={16} className="text-ink-3" />
      <span className="min-w-0 flex-1 truncate">
        {app.total} result{app.total === 1 ? '' : 's'} for{' '}
        <span className="font-medium text-ink">{q}</span>
      </span>
      <button
        type="button"
        onClick={() => app.navigate({ kind: 'inbox' })}
        className="flex-none rounded px-2 py-0.5 text-accent hover:bg-selected-soft/40"
      >
        Back to Inbox
      </button>
    </div>
  )
}

function NoSelection() {
  const app = useApp()
  const title = app.route.kind === 'label' ? 'this label' : VIEW_TITLES[app.route.kind]
  return (
    <div className="hidden min-h-0 flex-[1.35] flex-col items-center justify-center gap-3 rounded-2xl bg-panel text-center lg:flex">
      <span className="grid size-16 place-items-center rounded-full bg-panel-alt text-ink-4">
        <Icon name="mailOpen" size={30} />
      </span>
      <div>
        <p className="text-[15px] text-ink-2">Select a conversation to read</p>
        <p className="mt-0.5 text-[13px] text-ink-3">
          Reading pane is on — conversations from {title} open here.
        </p>
      </div>
      <p className="mt-2 text-[12px] text-ink-4">
        Press <kbd className="font-sans font-medium">j</kbd> /{' '}
        <kbd className="font-sans font-medium">k</kbd> to move,{' '}
        <kbd className="font-sans font-medium">Enter</kbd> to open
      </p>
    </div>
  )
}
