import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Inbox, Pencil } from 'lucide-react'
import { ComposeDeck } from '@/components/compose-deck'
import { ListPane, mergeRows } from '@/components/list-pane'
import { SettingsView } from '@/components/settings-view'
import { ShortcutsDialog } from '@/components/shortcuts-dialog'
import { Sidebar } from '@/components/sidebar'
import type { RowHandlers } from '@/components/thread-row'
import { ThreadView } from '@/components/thread-view'
import { Toaster } from '@/components/toaster'
import { TopBar } from '@/components/top-bar'
import { useMailActions } from '@/hooks/use-mail-actions'
import { useNow } from '@/hooks/use-now'
import { highlightTerms } from '@/lib/search'
import { buildList, computeCounts, summarize } from '@/lib/selectors'
import type { ViewId } from '@/lib/types'
import { formatFuture } from '@/lib/utils'
import { useCompose } from '@/store/compose'
import { useMail } from '@/store/mail-store'
import { useRouter } from '@/store/router'
import { useSettings } from '@/store/settings'
import { useToast } from '@/store/toast'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

const GO_TO: Record<string, ViewId> = {
  i: 'inbox',
  s: 'starred',
  t: 'sent',
  d: 'drafts',
  a: 'all',
  b: 'snoozed',
  k: 'trash',
}

export function MailApp() {
  const { route, navigate } = useRouter()
  const { data, undo, undoEntry } = useMail()
  const { settings } = useSettings()
  const actions = useMailActions()
  const compose = useCompose()
  const { show } = useToast()
  const now = useNow(30_000)

  const wide = useMediaQuery('(min-width: 1024px)')
  const desktop = useMediaQuery('(min-width: 768px)')

  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1280)
  const [mobileNav, setMobileNav] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [selection, setSelection] = useState<string[]>([])
  const [cursor, setCursor] = useState(0)
  const [page, setPage] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const gPending = useRef(false)

  const counts = useMemo(() => computeCounts(data, now), [data, now])

  const list = useMemo(
    () =>
      buildList(data, {
        view: route.view,
        labelId: route.labelId,
        searchText: route.search,
        category: route.category,
        now,
      }),
    [data, route.view, route.labelId, route.search, route.category, now],
  )

  const allRows = useMemo(() => mergeRows(list), [list])
  const terms = useMemo(() => (list.query ? highlightTerms(list.query) : []), [list.query])
  const start = page * settings.pageSize
  const rows = useMemo(
    () => allRows.slice(start, start + settings.pageSize),
    [allRows, start, settings.pageSize],
  )

  /* A new view resets everything that was scoped to the old one. */
  const routeKey = `${route.view}|${route.labelId ?? ''}|${route.search ?? ''}|${route.category ?? ''}`
  useEffect(() => {
    setSelection([])
    setPage(0)
    setCursor(0)
    listRef.current?.scrollTo({ top: 0 })
  }, [routeKey])

  const openSummary = useMemo(() => {
    if (!route.threadId) return null
    const found = list.threads.find((t) => t.id === route.threadId)
    if (found) return found
    // Deep links can point at a thread outside the current view.
    const thread = data.threads[route.threadId]
    if (!thread) return null
    const labelById = new Map(data.labels.map((l) => [l.id, l]))
    const draftByThread = new Map<string, string>()
    for (const d of Object.values(data.drafts)) if (d.threadId) draftByThread.set(d.threadId, d.id)
    return summarize(thread, data, labelById, draftByThread)
  }, [route.threadId, list.threads, data])

  const threadIndex = openSummary ? list.threads.findIndex((t) => t.id === openSummary.id) : -1

  const openThread = useCallback(
    (id: string) => navigate({ ...route, threadId: id }),
    [navigate, route],
  )
  const backToList = useCallback(
    () => navigate({ ...route, threadId: undefined }),
    [navigate, route],
  )

  const goRelative = (delta: number) => {
    if (threadIndex < 0) return
    const next = list.threads[threadIndex + delta]
    if (next) openThread(next.id)
  }

  const refresh = useCallback(() => {
    setRefreshing(true)
    window.setTimeout(() => setRefreshing(false), 700)
  }, [])

  const handlers: RowHandlers = useMemo(
    () => ({
      onOpen: openThread,
      onSelect: () => {},
      onStar: (id, next) => actions.setStarred([id], next),
      onImportant: (id, next) => actions.setImportant([id], next),
      onArchive: (id) => actions.archive([id]),
      onTrash: (id) => actions.trash([id]),
      onUntrash: (id) => actions.untrash([id]),
      onRead: (id, read) => actions.setRead([id], read),
      onSnooze: (id, iso, human) => actions.snooze([id], iso, human),
    }),
    [actions, openThread],
  )

  /* ------------------------------------------------------------------ */
  /*  Keyboard shortcuts                                                 */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!settings.keyboardShortcuts) return

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const key = e.key

      if (gPending.current) {
        gPending.current = false
        const view = GO_TO[key.toLowerCase()]
        if (view) {
          e.preventDefault()
          navigate({ view })
          return
        }
      }
      if (key === 'g') {
        gPending.current = true
        window.setTimeout(() => {
          gPending.current = false
        }, 1500)
        return
      }

      const cursorRow = rows[cursor]
      const cursorThreadId =
        cursorRow?.kind === 'thread' ? cursorRow.item.id : undefined
      const focusId = openSummary?.id ?? cursorThreadId
      const targets = selection.length ? selection : focusId ? [focusId] : []
      const summary = openSummary ?? (cursorRow?.kind === 'thread' ? cursorRow.item : null)

      const afterDestructive = () => {
        setSelection([])
        if (openSummary) backToList()
      }

      switch (key) {
        case 'c':
          e.preventDefault()
          compose.openNew()
          return
        case '?':
          e.preventDefault()
          setShortcutsOpen(true)
          return
        case 'z':
          if (undoEntry) {
            e.preventDefault()
            undo()
            show(`Undo: ${undoEntry.label}`)
          }
          return
        case 'Escape':
          if (selection.length) setSelection([])
          return
        case 'u':
          if (openSummary) {
            e.preventDefault()
            backToList()
          }
          return
        case 'j':
          if (!openSummary && rows.length) {
            e.preventDefault()
            setCursor((c) => Math.min(rows.length - 1, c + 1))
          }
          return
        case 'k':
          if (!openSummary && rows.length) {
            e.preventDefault()
            setCursor((c) => Math.max(0, c - 1))
          }
          return
        case 'Enter':
        case 'o':
          if (!openSummary && cursorRow) {
            e.preventDefault()
            if (cursorRow.kind === 'thread') openThread(cursorRow.item.id)
            else compose.openDraft(cursorRow.item.id)
          }
          return
        case 'x':
          if (!openSummary && cursorThreadId) {
            e.preventDefault()
            setSelection((sel) =>
              sel.includes(cursorThreadId)
                ? sel.filter((id) => id !== cursorThreadId)
                : [...sel, cursorThreadId],
            )
          }
          return
        case '[':
          e.preventDefault()
          goRelative(-1)
          return
        case ']':
          e.preventDefault()
          goRelative(1)
          return
        default:
          break
      }

      if (!targets.length) return

      switch (key) {
        case 's':
          e.preventDefault()
          actions.setStarred(targets, !(summary?.starred ?? false))
          return
        case 'e':
          e.preventDefault()
          actions.archive(targets)
          afterDestructive()
          return
        case '#':
          e.preventDefault()
          actions.trash(targets)
          afterDestructive()
          return
        case '!':
          e.preventDefault()
          actions.markSpam(targets)
          afterDestructive()
          return
        case 'b': {
          e.preventDefault()
          const until = new Date()
          until.setDate(until.getDate() + 1)
          until.setHours(8, 0, 0, 0)
          actions.snooze(targets, until.toISOString(), formatFuture(until.toISOString()))
          afterDestructive()
          return
        }
        case 'I':
          e.preventDefault()
          actions.setRead(targets, true)
          setSelection([])
          return
        case 'U':
          e.preventDefault()
          actions.setRead(targets, false)
          afterDestructive()
          return
        case 'r':
        case 'a':
        case 'f': {
          if (!openSummary) return
          const thread = data.threads[openSummary.id]
          const last = openSummary.messages[openSummary.messages.length - 1]
          if (!thread || !last) return
          e.preventDefault()
          compose.openReply(thread, last, key === 'r' ? 'reply' : key === 'a' ? 'replyAll' : 'forward')
          return
        }
        default:
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ------------------------------------------------------------------ */

  const splitPane = settings.readingPane === 'right' && wide && !route.settingsTab

  const listPane = (
    <ListPane
      route={route}
      navigate={navigate}
      list={list}
      rows={rows}
      total={allRows.length}
      start={start}
      terms={terms}
      now={now}
      selection={selection}
      onSelectionChange={setSelection}
      cursor={cursor}
      onCursorChange={setCursor}
      page={page}
      onPageChange={setPage}
      handlers={handlers}
      onOpenDraft={(id) => compose.openDraft(id)}
      onRefresh={refresh}
      refreshing={refreshing}
      listRef={listRef}
      narrow={splitPane}
    />
  )

  const threadPane = openSummary ? (
    <ThreadView
      key={openSummary.id}
      summary={openSummary}
      route={route}
      navigate={navigate}
      now={now}
      onBack={backToList}
      onPrev={threadIndex > 0 ? () => goRelative(-1) : undefined}
      onNext={
        threadIndex >= 0 && threadIndex < list.threads.length - 1 ? () => goRelative(1) : undefined
      }
      position={threadIndex >= 0 ? { index: threadIndex + 1, total: list.threads.length } : undefined}
    />
  ) : null

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <TopBar
        route={route}
        navigate={navigate}
        onToggleSidebar={() => (desktop ? setCollapsed((v) => !v) : setMobileNav(true))}
        onRefresh={refresh}
        refreshing={refreshing}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          route={route}
          navigate={navigate}
          counts={counts}
          collapsed={collapsed && desktop}
          mobileOpen={mobileNav}
          onCloseMobile={() => setMobileNav(false)}
        />

        <main className="flex min-h-0 min-w-0 flex-1 gap-3 pb-0 pr-0 sm:pb-4 sm:pr-4">
          {route.settingsTab ? (
            <SettingsView route={route} navigate={navigate} />
          ) : splitPane ? (
            <>
              <div className="flex min-h-0 w-[24rem] shrink-0 xl:w-[28rem]">{listPane}</div>
              {threadPane ?? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-surface text-center">
                  <Inbox className="h-10 w-10 text-ink-4" />
                  <p className="text-[15px] text-ink-2">No conversation selected</p>
                  <p className="max-w-xs text-[13px] text-ink-3">
                    Pick a conversation from the list to read it here.
                  </p>
                </div>
              )}
            </>
          ) : (
            (threadPane ?? listPane)
          )}
        </main>
      </div>

      {/* The sidebar (and its Compose button) is a drawer on phones. */}
      {!desktop && !mobileNav && !route.settingsTab && !route.threadId && (
        <button
          type="button"
          onClick={() => compose.openNew()}
          className="fixed bottom-5 right-4 z-30 flex h-14 items-center gap-3 rounded-2xl bg-accent-soft pl-4 pr-5 text-[14px] font-medium text-accent-ink shadow-compose"
        >
          <Pencil className="h-5 w-5" />
          Compose
        </button>
      )}

      <ComposeDeck navigate={navigate} />
      <Toaster />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
