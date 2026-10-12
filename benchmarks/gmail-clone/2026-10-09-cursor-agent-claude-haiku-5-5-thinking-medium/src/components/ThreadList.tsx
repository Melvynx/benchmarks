import { useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, CheckSquare, Info, Inbox, MinusSquare, Paperclip, RefreshCw, Square, Star, Tag, Trash2, Users, Search, CalendarClock, FileText, Clock } from 'lucide-react'
import { useStore } from '../lib/store'
import { useMailActions } from '../lib/actions'
import { computeView, groupMessageIds } from '../lib/view'
import { PAGE_SIZE, formatListDate, formatScheduled, folderTitle, snippetOf, type ThreadGroup } from '../lib/mail'
import { ArchiveButton, LabelMenu, MoreMenu, ReadButton, SnoozeMenu, SpamButton, TrashButton } from './Actions'
import { Checkbox, Dropdown, IconButton, MenuItem, cx } from './ui'
import type { Category, FolderId } from '../types'

const CATEGORIES: { id: Category; label: string; icon: ReactNode }[] = [
  { id: 'primary', label: 'Primary', icon: <Inbox size={16} /> },
  { id: 'promotions', label: 'Promotions', icon: <Tag size={16} /> },
  { id: 'social', label: 'Social', icon: <Users size={16} /> },
  { id: 'updates', label: 'Updates', icon: <Info size={16} /> },
]

export function ThreadList({ onRefresh }: { onRefresh: () => void }) {
  const { state, dispatch } = useStore()
  const { data, ui } = state
  const actions = useMailActions()
  const lastIndex = useRef<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const labelName = data.labels.find((l) => ui.folder === `label:${l.id}`)?.name
  const view = useMemo(() => computeView(data, ui, labelName), [data, ui.folder, ui.query, ui.category, ui.now, labelName])

  const pageCount = Math.max(1, Math.ceil(view.groups.length / PAGE_SIZE))
  const page = Math.min(ui.page, pageCount - 1)
  const visible = view.groups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const visibleKeys = visible.map((g) => g.key)
  const selection = ui.selection.filter((k) => visibleKeys.includes(k))
  const selIds = groupMessageIds(view.groups, selection)
  const allChecked = visible.length > 0 && selection.length === visible.length
  const someChecked = selection.length > 0 && !allChecked

  const setSelection = (keys: string[]) => dispatch({ type: 'setSelection', keys })

  const toggleOne = (index: number, shift: boolean) => {
    const key = visible[index].key
    if (shift && lastIndex.current !== null) {
      const [a, b] = [Math.min(lastIndex.current, index), Math.max(lastIndex.current, index)]
      const range = visible.slice(a, b + 1).map((g) => g.key)
      setSelection([...new Set([...selection, ...range])])
    } else {
      setSelection(selection.includes(key) ? selection.filter((k) => k !== key) : [...selection, key])
    }
    lastIndex.current = index
  }

  const openGroup = (g: ThreadGroup) => {
    if (ui.folder === 'drafts' || ui.folder === 'scheduled') {
      dispatch({ type: 'openCompose', id: g.latest.id })
      return
    }
    actions.openThread(g.threadId)
  }

  const handleRowClick = (e: MouseEvent, g: ThreadGroup, index: number) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      toggleOne(index, e.shiftKey)
      return
    }
    dispatch({ type: 'setCursor', cursor: g.key })
    lastIndex.current = index
    openGroup(g)
  }

  const selectBy = (pred: (g: ThreadGroup) => boolean) => setSelection(visible.filter(pred).map((g) => g.key))

  const isDraftsLike = ui.folder === 'drafts' || ui.folder === 'scheduled'
  const inboxLike = ui.folder === 'inbox' && !view.isSearch

  const refresh = () => {
    setRefreshing(true)
    onRefresh()
    window.setTimeout(() => setRefreshing(false), 650)
  }

  const counts = useMemo(() => {
    if (!inboxLike) return null
    const map: Record<string, number> = {}
    for (const c of CATEGORIES) map[c.id] = 0
    for (const g of computeView(data, { ...ui, category: 'all' }).groups) {
      if (g.unread && g.latest.category) map[g.latest.category] = (map[g.latest.category] ?? 0) + 1
    }
    return map
  }, [data, ui, inboxLike])

  const start = view.groups.length ? page * PAGE_SIZE + 1 : 0
  const end = Math.min(view.groups.length, (page + 1) * PAGE_SIZE)
  const title = view.isSearch ? view.title : folderTitle(ui.folder, labelName)
  const density = data.settings.density === 'compact'

  return (
    <section className="@container flex min-h-0 min-w-0 flex-1 flex-col" aria-label={title}>
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-line px-2 md:px-3">
        <Dropdown
          trigger={(toggle, open) => (
            <span className="inline-flex items-center rounded-full pr-1 hover:bg-hover" style={{ background: open ? 'var(--hover)' : undefined }}>
              <span className="flex items-center px-2">
                <Checkbox
                  label="Select all on this page"
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={() => setSelection(allChecked ? [] : visibleKeys)}
                />
              </span>
              <button type="button" aria-label="Selection options" onClick={toggle} className="rounded-full p-1 text-ink-2">
                <ChevronDown size={16} />
              </button>
            </span>
          )}
          width="w-44"
        >
          {(close) => (
            <div>
              <MenuItem icon={<CheckSquare size={15} />} onClick={() => { close(); selectBy(() => true) }}>All</MenuItem>
              <MenuItem icon={<Square size={15} />} onClick={() => { close(); setSelection([]) }}>None</MenuItem>
              <MenuItem icon={<Clock size={15} />} onClick={() => { close(); selectBy((g) => g.unread) }}>Unread</MenuItem>
              <MenuItem icon={<Star size={15} />} onClick={() => { close(); selectBy((g) => !g.unread) }}>Read</MenuItem>
              <MenuItem icon={<Star size={15} />} onClick={() => { close(); selectBy((g) => g.starred) }}>Starred</MenuItem>
              <MenuItem icon={<MinusSquare size={15} />} onClick={() => { close(); selectBy((g) => !g.starred) }}>Unstarred</MenuItem>
            </div>
          )}
        </Dropdown>
        <IconButton title="Refresh" size="sm" onClick={refresh} className="ml-1">
          <RefreshCw size={18} className={cx(refreshing && 'spin-once')} />
        </IconButton>

        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <div className="flex min-w-0 items-center gap-0.5 overflow-hidden">
          {selection.length > 0 ? (
            <>
              <span className="mr-2 whitespace-nowrap text-[13px] text-ink-2">{selection.length} selected</span>
              <ArchiveButton ids={selIds} size="sm" />
              <SpamButton ids={selIds} size="sm" />
              <TrashButton ids={selIds} folder={ui.folder} size="sm" />
              <ReadButton ids={selIds} size="sm" />
              <SnoozeMenu ids={selIds} size="sm" />
              <LabelMenu ids={selIds} size="sm" />
              <MoreMenu ids={selIds} folder={ui.folder} size="sm" />
            </>
          ) : (
            <span className="truncate px-1 text-[15px] font-medium text-ink-2">{title}</span>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 text-[12px] text-ink-2">
          <span className="whitespace-nowrap">{view.groups.length ? `${start}–${end} of ${view.groups.length}` : '0 results'}</span>
          <IconButton title="Older" size="sm" disabled={page <= 0} onClick={() => dispatch({ type: 'setPage', page: page - 1 })}>
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton title="Newer" size="sm" disabled={page >= pageCount - 1} onClick={() => dispatch({ type: 'setPage', page: page + 1 })}>
            <ChevronRight size={18} />
          </IconButton>
        </div>
      </div>

      {inboxLike && (
        <div className="flex shrink-0 overflow-x-auto border-b border-line" role="tablist">
          {CATEGORIES.map((c) => {
            const active = ui.category === c.id
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => dispatch({ type: 'setCategory', category: c.id })}
                className={cx(
                  'relative flex min-w-[120px] flex-1 items-center justify-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors hover:bg-hover',
                  active ? 'text-accent' : 'text-ink-3',
                )}
              >
                {c.icon}
                <span>{c.label}</span>
                {!!counts?.[c.id] && <span className="ml-1 rounded-full bg-accent-soft px-1.5 text-[11px] text-ink">{counts[c.id]}</span>}
                {active && <span className="absolute inset-x-6 bottom-0 h-[3px] rounded-t-full bg-accent" />}
              </button>
            )
          })}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto" role="grid" aria-rowcount={view.groups.length}>
        {visible.length === 0 && <EmptyState folder={ui.folder} isSearch={view.isSearch} />}
        {visible.map((g, i) => (
          <ThreadRow
            key={g.key}
            group={g}
            folder={ui.folder}
            index={i}
            selected={selection.includes(g.key)}
            cursor={ui.cursor === g.key}
            compact={density}
            onRowClick={(e) => handleRowClick(e, g, i)}
            onToggle={(e) => toggleOne(i, e.shiftKey)}
            isDraftsLike={isDraftsLike}
          />
        ))}
      </div>
    </section>
  )
}

function EmptyState({ folder, isSearch }: { folder: FolderId; isSearch: boolean }) {
  const copy = isSearch
    ? { icon: <Search size={40} />, title: 'No messages matched your search', body: 'Try fewer words or open search options to filter by sender, date or attachments.' }
    : folder === 'inbox'
      ? { icon: <Inbox size={40} />, title: "You're all caught up", body: 'Nothing else needs your attention right now.' }
      : folder === 'drafts'
        ? { icon: <FileText size={40} />, title: 'No drafts', body: 'Anything you start writing and don’t send will show up here.' }
        : folder === 'scheduled'
          ? { icon: <CalendarClock size={40} />, title: 'Nothing scheduled', body: 'Use the send menu in compose to pick a later time.' }
          : folder === 'trash'
            ? { icon: <Trash2 size={40} />, title: 'Trash is empty', body: 'Deleted conversations stay here until you delete them forever.' }
            : { icon: <Inbox size={40} />, title: 'Nothing here', body: 'Messages you move to this folder will appear here.' }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center text-ink-3">
      <div className="text-ink-3/60">{copy.icon}</div>
      <div className="text-[16px] font-medium text-ink-2">{copy.title}</div>
      <p className="max-w-xs text-[13px]">{copy.body}</p>
    </div>
  )
}

function ThreadRow({
  group,
  folder,
  index,
  selected,
  cursor,
  compact,
  onRowClick,
  onToggle,
  isDraftsLike,
}: {
  group: ThreadGroup
  folder: FolderId
  index: number
  selected: boolean
  cursor: boolean
  compact: boolean
  onRowClick: (e: MouseEvent) => void
  onToggle: (e: MouseEvent) => void
  isDraftsLike: boolean
}) {
  const { state } = useStore()
  const { data, ui } = state
  const { toggleStar } = useMailActions()
  const latest = group.latest
  const ids = group.messages.map((m) => m.id)
  const me = data.me

  const people = folder === 'sent'
    ? latest.to.map((c) => c.name).join(', ') || '(no recipients)'
    : [...new Set(group.messages.map((m) => (m.from.email === me.email ? 'me' : m.from.name)))].slice(0, 2).join(', ')

  const labels = latest.labels.map((id) => data.labels.find((l) => l.id === id)).filter(Boolean)
  const senderClass = isDraftsLike ? 'text-danger' : ''
  const date = folder === 'scheduled' && latest.scheduledAt
    ? formatScheduled(latest.scheduledAt)
    : folder === 'snoozed' && latest.snoozedUntil
      ? `Until ${formatListDate(latest.snoozedUntil, ui.now)}`
      : formatListDate(latest.date, ui.now)

  return (
    <div
      role="row"
      aria-selected={selected}
      tabIndex={-1}
      onClick={onRowClick}
      className={cx(
        'group relative flex cursor-pointer items-center gap-1 border-b border-line pl-1 pr-2 transition-colors md:pl-2 md:pr-4',
        compact ? 'min-h-[36px] py-1' : 'min-h-[52px] py-2',
        selected ? 'bg-selected' : 'bg-surface hover:shadow-[inset_0_-1px_0_var(--line),0_1px_2px_rgba(0,0,0,0.12)] hover:z-[1]',
        cursor && !selected && 'bg-hover',
        group.unread && !selected ? 'text-ink' : 'text-ink-2',
      )}
      data-index={index}
    >
      <span
        className="flex w-7 shrink-0 items-center justify-center"
        onClick={(e) => {
          e.stopPropagation()
          onToggle(e)
        }}
      >
        <Checkbox label="Select conversation" checked={selected} onChange={() => {}} />
      </span>
      <button
        type="button"
        aria-label={group.starred ? 'Unstar' : 'Star'}
        onClick={(e) => {
          e.stopPropagation()
          toggleStar(ids)
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-hover"
      >
        <Star size={17} className={cx(group.starred ? 'fill-[#f9ab00] text-[#f9ab00]' : 'text-ink-3')} />
      </button>

      <span className={cx('w-[108px] shrink-0 truncate pr-3 @[520px]:w-[150px] @[760px]:w-[190px]', group.unread && 'font-semibold text-ink', senderClass)}>
        {isDraftsLike ? (folder === 'scheduled' ? 'Scheduled to ' + (latest.to[0]?.name ?? '(no recipients)') : 'Draft') : people}
        {group.messages.length > 1 && <span className="ml-1 font-normal text-ink-3">{group.messages.length}</span>}
      </span>

      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className={cx('shrink-0 truncate', group.unread ? 'font-semibold text-ink' : 'font-normal text-ink')} style={{ maxWidth: '45%' }}>
          {latest.subject || '(no subject)'}
        </span>
        {labels.length > 0 && (
          <span className="hidden shrink-0 items-center gap-1 self-center @[700px]:flex">
            {labels.map((l) => (
              <span key={l!.id} className="rounded px-1.5 text-[11px] font-medium leading-4" style={{ background: `color-mix(in srgb, ${l!.color} 16%, transparent)`, color: l!.color }}>
                {l!.name}
              </span>
            ))}
          </span>
        )}
        <span className="hidden min-w-0 flex-1 truncate font-normal text-ink-3 @[480px]:block">
          <span className="mr-1">-</span>
          {snippetOf(latest)}
        </span>
      </span>

      {group.hasAttachments && <Paperclip size={15} className="shrink-0 text-ink-3" aria-label="Has attachments" />}

      <span className={cx('w-[56px] shrink-0 whitespace-nowrap text-right text-[12px] @[520px]:w-[96px]', group.unread ? 'font-semibold text-ink' : 'text-ink-3', 'group-hover:hidden')}>
        {date}
      </span>

      <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex" onClick={(e) => e.stopPropagation()}>
        <ArchiveButton ids={ids} size="sm" />
        <TrashButton ids={ids} folder={folder} size="sm" />
        <ReadButton ids={ids} size="sm" />
      </div>
    </div>
  )
}
