import { useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  EllipsisVertical,
  FolderInput,
  Inbox,
  Mail,
  MailOpen,
  RefreshCw,
  ShieldOff,
  Tag,
  Trash2,
  VolumeX,
} from 'lucide-react'
import { useMailActions } from '@/hooks/use-mail-actions'
import type { ListResult, ThreadSummary } from '@/lib/selectors'
import { SYSTEM, type Draft } from '@/lib/types'
import { cn, formatListDate, htmlToText, pluralize, truncate } from '@/lib/utils'
import { CATEGORIES, VIEWS } from '@/lib/views'
import { useMail } from '@/store/mail-store'
import type { Route } from '@/store/router'
import { DENSITY_ROW, useSettings } from '@/store/settings'
import { Checkbox, IconButton } from './ui/bits'
import { Menu, type MenuEntry } from './ui/popover'
import { Highlight } from './highlight'
import { LabelMenu } from './label-menu'
import { SnoozeMenu } from './snooze-menu'
import { ThreadRow, type RowHandlers } from './thread-row'

export type Row =
  | { kind: 'thread'; item: ThreadSummary }
  | { kind: 'draft'; item: Draft }

/** Threads and drafts interleaved by date — drafts only appear where they belong. */
export function mergeRows(list: ListResult): Row[] {
  const rows: Row[] = [
    ...list.threads.map((t) => ({ kind: 'thread' as const, item: t })),
    ...list.drafts.map((d) => ({ kind: 'draft' as const, item: d })),
  ]
  if (list.drafts.length && list.threads.length) {
    rows.sort((a, b) => {
      const ad = a.kind === 'thread' ? a.item.date : a.item.updatedAt
      const bd = b.kind === 'thread' ? b.item.date : b.item.updatedAt
      return Date.parse(bd) - Date.parse(ad)
    })
  }
  return rows
}

interface ListPaneProps {
  route: Route
  navigate: (r: Route) => void
  list: ListResult
  rows: Row[]
  total: number
  start: number
  terms: string[]
  now: number
  selection: string[]
  onSelectionChange: (ids: string[]) => void
  cursor: number
  onCursorChange: (i: number) => void
  page: number
  onPageChange: (p: number) => void
  handlers: RowHandlers
  onOpenDraft: (id: string) => void
  onRefresh: () => void
  refreshing: boolean
  listRef: React.RefObject<HTMLDivElement | null>
  /** Narrow layout used beside the reading pane. */
  narrow?: boolean
}

export function ListPane({
  route,
  navigate,
  list,
  rows,
  total,
  start,
  terms,
  now,
  selection,
  onSelectionChange,
  cursor,
  onCursorChange,
  page,
  onPageChange,
  handlers,
  onOpenDraft,
  onRefresh,
  refreshing,
  listRef,
  narrow,
}: ListPaneProps) {
  const { data } = useMail()
  const { settings } = useSettings()
  const actions = useMailActions()

  const pageSize = settings.pageSize
  const pageThreadIds = useMemo(
    () => rows.flatMap((r) => (r.kind === 'thread' ? [r.item.id] : [])),
    [rows],
  )
  const selected = new Set(selection)
  const allSelected = pageThreadIds.length > 0 && pageThreadIds.every((id) => selected.has(id))
  const someSelected = selection.length > 0

  const lastClicked = useRef<string | null>(null)

  const onSelect = (id: string, next: boolean, shift: boolean) => {
    if (shift && lastClicked.current) {
      const a = pageThreadIds.indexOf(lastClicked.current)
      const b = pageThreadIds.indexOf(id)
      if (a !== -1 && b !== -1) {
        const range = pageThreadIds.slice(Math.min(a, b), Math.max(a, b) + 1)
        const set = new Set(selection)
        range.forEach((r) => (next ? set.add(r) : set.delete(r)))
        onSelectionChange([...set])
        lastClicked.current = id
        return
      }
    }
    const set = new Set(selection)
    if (next) set.add(id)
    else set.delete(id)
    lastClicked.current = id
    onSelectionChange([...set])
  }

  /* Clicking a row moves the keyboard cursor there, so j/k resumes from it. */
  const focusRow = (id: string) => {
    const i = rows.findIndex((r) => r.item.id === id)
    if (i !== -1) onCursorChange(i)
  }

  const rowHandlers: RowHandlers = {
    ...handlers,
    onSelect: (id, next, shift) => {
      focusRow(id)
      onSelect(id, next, shift)
    },
    onOpen: (id) => {
      focusRow(id)
      handlers.onOpen(id)
    },
  }

  const emptyView = VIEWS[route.view]
  const showTabs =
    settings.showCategoryTabs &&
    route.view === 'inbox' &&
    !route.search &&
    !route.labelId &&
    !narrow

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none bg-surface sm:rounded-2xl">
      <ListToolbar
        route={route}
        selection={selection}
        onSelectionChange={onSelectionChange}
        pageThreadIds={pageThreadIds}
        allSelected={allSelected}
        someSelected={someSelected}
        onRefresh={onRefresh}
        refreshing={refreshing}
        total={total}
        start={start}
        pageSize={pageSize}
        page={page}
        onPageChange={onPageChange}
        narrow={narrow}
        listThreadIds={list.threads.map((t) => t.id)}
      />

      {showTabs && <CategoryTabs route={route} navigate={navigate} />}

      {selection.length > 0 && selection.length === pageThreadIds.length && total > pageSize && (
        <div className="bg-accent-soft px-4 py-2 text-center text-[13px] text-accent-ink">
          All {pluralize(selection.length, 'conversation')} on this page are selected.{' '}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => onSelectionChange(list.threads.map((t) => t.id))}
          >
            Select all {total} conversations
          </button>
        </div>
      )}

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {rows.length === 0 ? (
          <EmptyState
            title={
              route.search
                ? 'No messages matched your search'
                : route.labelId
                  ? 'No conversations with this label'
                  : emptyView.emptyTitle
            }
            subtitle={
              route.search
                ? 'Try different keywords, or remove some search operators.'
                : route.labelId
                  ? 'Apply this label to a conversation and it will show up here.'
                  : emptyView.emptySubtitle
            }
          />
        ) : (
          <ul>
            {rows.map((row, i) =>
              row.kind === 'thread' ? (
                <ThreadRow
                  key={row.item.id}
                  summary={row.item}
                  selected={selected.has(row.item.id)}
                  cursor={cursor === i}
                  view={route.view}
                  density={settings.density}
                  terms={terms}
                  now={now}
                  showPreview={settings.previewText}
                  hoverActions={settings.hoverActions && !narrow}
                  stacked={narrow}
                  handlers={rowHandlers}
                />
              ) : (
                <DraftRow
                  key={row.item.id}
                  draft={row.item}
                  cursor={cursor === i}
                  terms={terms}
                  now={now}
                  onOpen={() => {
                    onCursorChange(i)
                    onOpenDraft(row.item.id)
                  }}
                  onDiscard={() => actions.discardDraft(row.item.id)}
                  stacked={narrow}
                />
              ),
            )}
          </ul>
        )}

        {rows.length > 0 && (
          <footer className="px-4 py-6 text-center text-[12px] text-ink-4">
            {route.view === 'trash'
              ? 'Messages that have been in Trash more than 30 days will be automatically deleted.'
              : route.view === 'spam'
                ? 'Messages that have been in Spam more than 30 days will be automatically deleted.'
                : `${data.account.name} · ${data.account.email}`}
          </footer>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Toolbar                                                                    */
/* -------------------------------------------------------------------------- */

interface ToolbarProps {
  route: Route
  selection: string[]
  onSelectionChange: (ids: string[]) => void
  pageThreadIds: string[]
  listThreadIds: string[]
  allSelected: boolean
  someSelected: boolean
  onRefresh: () => void
  refreshing: boolean
  total: number
  start: number
  pageSize: number
  page: number
  onPageChange: (p: number) => void
  narrow?: boolean
}

function ListToolbar({
  route,
  selection,
  onSelectionChange,
  pageThreadIds,
  listThreadIds,
  allSelected,
  someSelected,
  onRefresh,
  refreshing,
  total,
  start,
  pageSize,
  page,
  onPageChange,
  narrow,
}: ToolbarProps) {
  const { data } = useMail()
  const actions = useMailActions()
  const selectRef = useRef<HTMLButtonElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const moveRef = useRef<HTMLButtonElement>(null)
  const labelRef = useRef<HTMLButtonElement>(null)
  const snoozeRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState<'select' | 'more' | 'move' | 'label' | 'snooze' | null>(null)
  const close = () => setOpen(null)

  const inTrash = route.view === 'trash'
  const inSpam = route.view === 'spam'
  const anyUnread = selection.some((id) =>
    data.threads[id]?.messageIds.some((m) => data.messages[m] && !data.messages[m].read),
  )

  const clear = () => onSelectionChange([])
  const run = (fn: () => void) => {
    fn()
    clear()
  }

  const pickBy = (test: (id: string) => boolean) =>
    onSelectionChange(pageThreadIds.filter(test))

  const isUnread = (id: string) =>
    Boolean(data.threads[id]?.messageIds.some((m) => data.messages[m] && !data.messages[m].read))
  const isStarred = (id: string) =>
    Boolean(data.threads[id]?.messageIds.some((m) => data.messages[m]?.starred))

  const moreEntries: MenuEntry[] = someSelected
    ? [
        {
          id: 'unread',
          label: 'Mark as unread',
          icon: <Mail />,
          onSelect: () => run(() => actions.setRead(selection, false)),
        },
        {
          id: 'read',
          label: 'Mark as read',
          icon: <MailOpen />,
          onSelect: () => run(() => actions.setRead(selection, true)),
        },
        { type: 'separator', id: 's1' },
        {
          id: 'important',
          label: 'Mark as important',
          onSelect: () => run(() => actions.setImportant(selection, true)),
        },
        {
          id: 'notimportant',
          label: 'Mark as not important',
          onSelect: () => run(() => actions.setImportant(selection, false)),
        },
        {
          id: 'star',
          label: 'Add star',
          onSelect: () => run(() => actions.setStarred(selection, true)),
        },
        {
          id: 'unstar',
          label: 'Remove star',
          onSelect: () => run(() => actions.setStarred(selection, false)),
        },
        { type: 'separator', id: 's2' },
        {
          id: 'mute',
          label: 'Mute',
          icon: <VolumeX />,
          onSelect: () => run(() => actions.setMuted(selection, true)),
        },
        ...(inSpam
          ? [
              {
                id: 'notspam',
                label: 'Not spam',
                icon: <ShieldOff />,
                onSelect: () => run(() => actions.notSpam(selection)),
              } as MenuEntry,
            ]
          : []),
        ...(inTrash
          ? [
              {
                id: 'forever',
                label: 'Delete forever',
                icon: <Trash2 />,
                danger: true,
                onSelect: () => run(() => actions.deleteForever(selection)),
              } as MenuEntry,
            ]
          : []),
      ]
    : [
        {
          id: 'markall',
          label: 'Mark all as read',
          icon: <MailOpen />,
          disabled: !listThreadIds.length,
          onSelect: () => actions.setRead(listThreadIds, true),
        },
        {
          id: 'selectall',
          label: 'Select all conversations',
          disabled: !listThreadIds.length,
          onSelect: () => onSelectionChange(listThreadIds),
        },
        ...(inTrash || inSpam
          ? [
              { type: 'separator', id: 's3' } as MenuEntry,
              {
                id: 'empty',
                label: inTrash ? 'Empty Trash now' : 'Delete all spam now',
                icon: <Trash2 />,
                danger: true,
                disabled: !listThreadIds.length,
                onSelect: () =>
                  actions.emptyFolder(inTrash ? SYSTEM.trash : SYSTEM.spam, inTrash ? 'Trash' : 'Spam'),
              } as MenuEntry,
            ]
          : []),
      ]

  return (
    <div className="flex h-12 shrink-0 items-center gap-0.5 px-1 sm:px-2">
      <div className="flex items-center">
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          label="Select all conversations on this page"
          stopPropagation={false}
          onChange={(next) => onSelectionChange(next ? pageThreadIds : [])}
        />
        <button
          ref={selectRef}
          type="button"
          aria-label="Selection options"
          onClick={() => setOpen(open === 'select' ? null : 'select')}
          className="-ml-1.5 flex h-8 w-5 items-center justify-center rounded text-ink-3 hover:text-ink"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {someSelected ? (
        <div className="flex min-w-0 items-center gap-0.5">
          {inTrash ? (
            <IconButton label="Move to inbox" onClick={() => run(() => actions.untrash(selection))}>
              <ArchiveRestore />
            </IconButton>
          ) : (
            <IconButton
              label="Archive"
              shortcut="E"
              onClick={() => run(() => actions.archive(selection))}
            >
              <Archive />
            </IconButton>
          )}
          {!inSpam && (
            <IconButton label="Report spam" onClick={() => run(() => actions.markSpam(selection))}>
              <Ban />
            </IconButton>
          )}
          <IconButton
            label={inTrash ? 'Delete forever' : 'Delete'}
            shortcut="#"
            onClick={() => run(() => (inTrash ? actions.deleteForever(selection) : actions.trash(selection)))}
          >
            <Trash2 />
          </IconButton>
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <IconButton
            label={anyUnread ? 'Mark as read' : 'Mark as unread'}
            className="hidden sm:inline-flex"
            onClick={() => run(() => actions.setRead(selection, anyUnread))}
          >
            {anyUnread ? <MailOpen /> : <Mail />}
          </IconButton>
          <IconButton
            ref={snoozeRef}
            label="Snooze"
            className="hidden sm:inline-flex"
            active={open === 'snooze'}
            onClick={() => setOpen(open === 'snooze' ? null : 'snooze')}
          >
            <Clock />
          </IconButton>
          <span className="mx-1 hidden h-5 w-px bg-line md:block" />
          <IconButton
            ref={moveRef}
            label="Move to"
            className="hidden md:inline-flex"
            active={open === 'move'}
            onClick={() => setOpen(open === 'move' ? null : 'move')}
          >
            <FolderInput />
          </IconButton>
          <IconButton
            ref={labelRef}
            label="Labels"
            className="hidden md:inline-flex"
            active={open === 'label'}
            onClick={() => setOpen(open === 'label' ? null : 'label')}
          >
            <Tag />
          </IconButton>
        </div>
      ) : (
        <IconButton label="Refresh" shortcut="R" onClick={onRefresh}>
          <RefreshCw className={refreshing ? 'animate-spin' : undefined} />
        </IconButton>
      )}

      <IconButton
        ref={moreRef}
        label="More"
        active={open === 'more'}
        onClick={() => setOpen(open === 'more' ? null : 'more')}
      >
        <EllipsisVertical />
      </IconButton>

      <div className="ml-auto flex items-center gap-0.5">
        {someSelected ? (
          <span className="px-2 text-[13px] text-ink-2">
            {pluralize(selection.length, 'selected')}
          </span>
        ) : (
          !narrow && (
            <span className="hidden px-2 text-[12px] tabular-nums text-ink-3 sm:block">
              {total === 0 ? '0' : `${start + 1}–${Math.min(total, start + pageSize)}`} of {total}
            </span>
          )
        )}
        <IconButton
          label="Newer"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          size="sm"
        >
          <ChevronLeft />
        </IconButton>
        <IconButton
          label="Older"
          disabled={start + pageSize >= total}
          onClick={() => onPageChange(page + 1)}
          size="sm"
        >
          <ChevronRight />
        </IconButton>
      </div>

      <Menu
        anchorRef={selectRef}
        open={open === 'select'}
        onClose={close}
        ariaLabel="Select"
        entries={[
          { id: 'all', label: 'All', onSelect: () => onSelectionChange(pageThreadIds) },
          { id: 'none', label: 'None', onSelect: () => onSelectionChange([]) },
          { id: 'read', label: 'Read', onSelect: () => pickBy((id) => !isUnread(id)) },
          { id: 'unread', label: 'Unread', onSelect: () => pickBy(isUnread) },
          { id: 'starred', label: 'Starred', onSelect: () => pickBy(isStarred) },
          { id: 'unstarred', label: 'Unstarred', onSelect: () => pickBy((id) => !isStarred(id)) },
        ]}
      />
      <Menu
        anchorRef={moreRef}
        open={open === 'more'}
        onClose={close}
        ariaLabel="More actions"
        entries={moreEntries}
      />
      <Menu
        anchorRef={moveRef}
        open={open === 'move'}
        onClose={close}
        ariaLabel="Move to"
        entries={[
          { type: 'header', id: 'h', label: 'Move to' },
          {
            id: 'inbox',
            label: 'Inbox',
            icon: <Inbox />,
            onSelect: () => run(() => actions.moveToInbox(selection)),
          },
          {
            id: 'spam',
            label: 'Spam',
            icon: <Ban />,
            onSelect: () => run(() => actions.markSpam(selection)),
          },
          {
            id: 'trash',
            label: 'Trash',
            icon: <Trash2 />,
            onSelect: () => run(() => actions.trash(selection)),
          },
          { type: 'separator', id: 's' },
          {
            id: 'archive',
            label: 'Archive (remove from Inbox)',
            icon: <Archive />,
            onSelect: () => run(() => actions.archive(selection)),
          },
        ]}
      />
      <LabelMenu
        anchorRef={labelRef}
        open={open === 'label'}
        onClose={close}
        threadIds={selection}
      />
      <SnoozeMenu
        anchorRef={snoozeRef}
        open={open === 'snooze'}
        onClose={close}
        onPick={(iso, human) => run(() => actions.snooze(selection, iso, human))}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Category tabs                                                              */
/* -------------------------------------------------------------------------- */

function CategoryTabs({ route, navigate }: { route: Route; navigate: (r: Route) => void }) {
  const active = route.category ?? 'primary'
  return (
    <div className="flex shrink-0 overflow-x-auto no-scrollbar border-b border-line-soft">
      {CATEGORIES.map((c) => {
        const on = active === c.id
        const Icon = c.icon
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => navigate({ view: 'inbox', category: c.id === 'primary' ? undefined : c.id })}
            className={cn(
              /* Phones scroll the strip horizontally rather than squeezing labels. */
              'relative flex w-[8.5rem] shrink-0 items-center gap-3 px-4 py-3 text-[13px] font-medium transition-colors sm:w-auto sm:min-w-[9rem] sm:flex-1',
              on ? 'text-ink' : 'text-ink-3 hover:bg-surface-2 hover:text-ink-2',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" style={{ color: on ? c.accent : undefined }} />
            <span className="truncate">{c.title}</span>
            {on && (
              <span
                className="absolute inset-x-0 bottom-0 h-[3px] rounded-t"
                style={{ backgroundColor: c.accent }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Draft row & empty state                                                    */
/* -------------------------------------------------------------------------- */

function DraftRow({
  draft,
  cursor,
  terms,
  now,
  onOpen,
  onDiscard,
  stacked,
}: {
  draft: Draft
  cursor: boolean
  terms: string[]
  now: number
  onOpen: () => void
  onDiscard: () => void
  stacked?: boolean
}) {
  const { settings } = useSettings()
  const recipients = draft.to.map((a) => a.name || a.email).join(', ')
  const snippet = truncate(htmlToText(draft.bodyHtml), 200)

  return (
    <li
      className={cn(
        'group relative border-b border-line-soft/70 bg-read transition-colors hover:z-[1] hover:shadow-row',
        cursor && 'ring-1 ring-inset ring-accent/45',
      )}
    >
      <div
        role="button"
        tabIndex={-1}
        onClick={onOpen}
        className={cn(
          'flex cursor-pointer items-center gap-1 pl-2 pr-3',
          !stacked && 'sm:pl-[6.25rem]',
          DENSITY_ROW[settings.density],
        )}
      >
        <span className="min-w-0 flex-1 truncate text-[14px]">
          <span className="mr-2 text-danger">Draft</span>
          <span className="text-ink">
            <Highlight text={draft.subject || '(no subject)'} terms={terms} />
          </span>
          <span className="text-ink-3">
            {recipients && ` — to ${recipients}`}
            {snippet && ` — ${snippet}`}
          </span>
        </span>
        <div className="relative flex w-[7rem] shrink-0 items-center justify-end self-stretch">
          <span className="text-[12px] text-ink-3 group-hover:invisible">
            {formatListDate(draft.updatedAt, new Date(now))}
          </span>
          <div
            className="absolute inset-y-0 right-0 hidden items-center group-hover:flex"
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton label="Discard draft" size="sm" onClick={onDiscard}>
              <Trash2 />
            </IconButton>
          </div>
        </div>
      </div>
    </li>
  )
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-8 py-24 text-center">
      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-ink-3">
        <Inbox className="h-7 w-7" />
      </div>
      <p className="text-[15px] font-medium text-ink">{title}</p>
      <p className="max-w-sm text-[13px] text-ink-3">{subtitle}</p>
    </div>
  )
}
