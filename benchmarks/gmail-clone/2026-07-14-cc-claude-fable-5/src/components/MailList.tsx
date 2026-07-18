import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Clock,
  Inbox,
  Info,
  MailOpen,
  Mail as MailIcon,
  MoreVertical,
  OctagonAlert,
  RefreshCw,
  Search,
  Send,
  File as FileIcon,
  Star,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useMail } from '../store/store'
import { useIsMobile, useVisibleThreads } from '../hooks/hooks'
import {
  folderOf,
  hasDraft,
  isStarred,
  isUnread,
  lastNonDraft,
  participantsSummary,
  threadDate,
} from '../lib/mail'
import { listDate, snoozeLabel } from '../lib/time'
import { ATTACHMENT_META, cx, pluralize } from '../lib/utils'
import type { Category, Thread } from '../types'
import { Avatar, Checkbox, IconButton, Menu, MenuItem } from './ui'
import { LabelMenu, SnoozeMenu } from './menus'

const CATEGORY_TABS: Array<{ id: Category; name: string; icon: typeof Inbox }> = [
  { id: 'primary', name: 'Primary', icon: Inbox },
  { id: 'promotions', name: 'Promotions', icon: Tag },
  { id: 'social', name: 'Social', icon: Users },
  { id: 'updates', name: 'Updates', icon: Info },
]

function CategoryTabs() {
  const threads = useMail((s) => s.threads)
  const tab = useMail((s) => s.categoryTab)
  const setTab = useMail((s) => s.setCategoryTab)
  const now = Date.now()

  const unreadByCat = useMemo(() => {
    const counts: Record<Category, number> = { primary: 0, social: 0, promotions: 0, updates: 0 }
    for (const t of threads) {
      if (folderOf(t, 'inbox', now) && isUnread(t)) counts[t.category] += 1
    }
    return counts
  }, [threads, now])

  return (
    <div className="flex overflow-x-auto border-b border-line">
      {CATEGORY_TABS.map(({ id, name, icon: Icon }) => {
        const active = tab === id
        const count = unreadByCat[id]
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cx(
              'relative flex h-12 min-w-32 flex-1 items-center gap-3 px-4 text-sm md:min-w-40 md:max-w-64',
              active ? 'font-medium text-accent' : 'text-ink-2 hover:bg-surface-hover',
            )}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            <span className="truncate">{name}</span>
            {count > 0 && !active && (
              <span className="ml-auto rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                {count}
              </span>
            )}
            {active && <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-t-full bg-accent" />}
          </button>
        )
      })}
    </div>
  )
}

function AttachmentChips({ thread }: { thread: Thread }) {
  const attachments = thread.messages.filter((m) => !m.draft).flatMap((m) => m.attachments ?? [])
  if (!attachments.length) return null
  return (
    <span className="ml-2 hidden shrink-0 items-center gap-1.5 lg:inline-flex">
      {attachments.slice(0, 2).map((a) => (
        <span
          key={a.id}
          className="inline-flex max-w-40 items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink-2"
        >
          <span className="font-semibold" style={{ color: ATTACHMENT_META[a.kind].color }}>
            {ATTACHMENT_META[a.kind].label}
          </span>
          <span className="truncate">{a.name}</span>
        </span>
      ))}
      {attachments.length > 2 && <span className="text-[11px] text-ink-3">+{attachments.length - 2}</span>}
    </span>
  )
}

function RowLabels({ thread }: { thread: Thread }) {
  const labels = useMail((s) => s.labels)
  const navigate = useMail((s) => s.navigate)
  const chips = thread.labelIds
    .map((id) => labels.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l))
  if (!chips.length) return null
  return (
    <>
      {chips.map((label) => (
        <span
          key={label.id}
          role="link"
          tabIndex={-1}
          title={`View label “${label.name}”`}
          onClick={(e) => {
            e.stopPropagation()
            navigate({ folder: 'label', labelId: label.id })
          }}
          className="mr-1.5 inline-flex shrink-0 cursor-pointer items-center rounded px-1.5 py-px text-[11px] font-medium"
          style={{ backgroundColor: label.color + '33', color: label.color }}
        >
          {label.name}
        </span>
      ))}
    </>
  )
}

function MailRow(props: { thread: Thread; index: number }) {
  const { thread, index } = props
  const isMobile = useIsMobile()
  const route = useMail((s) => s.route)
  const selected = useMail((s) => s.selected.includes(thread.id))
  const cursor = useMail((s) => s.cursor)
  const density = useMail((s) => s.settings.density)
  const toggleSelect = useMail((s) => s.toggleSelect)
  const toggleThreadStar = useMail((s) => s.toggleThreadStar)
  const openThread = useMail((s) => s.openThread)
  const openDraft = useMail((s) => s.openDraft)
  const setCursor = useMail((s) => s.setCursor)
  const archiveThreads = useMail((s) => s.archiveThreads)
  const trashThreads = useMail((s) => s.trashThreads)
  const deleteForever = useMail((s) => s.deleteForever)
  const markRead = useMail((s) => s.markRead)
  const moveToInbox = useMail((s) => s.moveToInbox)
  const notSpam = useMail((s) => s.notSpam)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = isUnread(thread)
  const starred = isStarred(thread)
  const draft = hasDraft(thread)
  const last = lastNonDraft(thread) ?? thread.messages[thread.messages.length - 1]
  const participants = participantsSummary(thread)
  const nonDraftCount = thread.messages.filter((m) => !m.draft).length
  const inTrash = route.folder === 'trash'
  const inSpam = route.folder === 'spam'
  const snoozed = route.folder === 'snoozed' && thread.snoozedUntil
  const atCursor = cursor === index

  useEffect(() => {
    if (atCursor) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [atCursor])

  const open = () => {
    setCursor(index)
    if (draft && thread.messages.every((m) => m.draft)) openDraft(thread.id)
    else openThread(thread.id)
  }

  const senderText = (
    <>
      {draft && <span className="mr-1 text-danger">Draft</span>}
      {(!draft || nonDraftCount > 0) && participants.text}
      {nonDraftCount > 1 && <span className="ml-1 font-normal text-ink-3">{nonDraftCount}</span>}
    </>
  )

  if (isMobile) {
    return (
      <div
        ref={ref}
        onClick={open}
        className={cx(
          'flex cursor-pointer items-start gap-3 px-4 py-2.5',
          selected ? 'bg-surface-sel' : unread ? 'bg-surface' : 'bg-surface-read',
        )}
      >
        <button
          type="button"
          title={selected ? 'Deselect' : 'Select'}
          onClick={(e) => {
            e.stopPropagation()
            toggleSelect(thread.id)
          }}
          className="relative mt-0.5 shrink-0"
        >
          {selected ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white dark:text-[#0e1014]">
              ✓
            </span>
          ) : (
            <Avatar contact={last.from} size={40} />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={cx('truncate text-[15px]', unread ? 'font-semibold text-ink-1' : 'text-ink-2')}>
              {senderText}
            </span>
            <span className={cx('shrink-0 text-xs', unread ? 'font-semibold text-accent' : 'text-ink-3')}>
              {snoozed ? snoozeLabel(thread.snoozedUntil!) : listDate(threadDate(thread))}
            </span>
          </div>
          <div className={cx('truncate text-sm', unread ? 'font-medium text-ink-1' : 'text-ink-2')}>
            {thread.subject}
          </div>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm text-ink-3">
              <RowLabels thread={thread} />
              {last.snippet}
            </span>
            <button
              type="button"
              title={starred ? 'Unstar' : 'Star'}
              onClick={(e) => {
                e.stopPropagation()
                toggleThreadStar(thread.id)
              }}
              className="shrink-0 p-1"
            >
              <Star className={cx('h-4.5 w-4.5', starred ? 'fill-star text-star' : 'text-ink-3')} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      onClick={open}
      className={cx(
        'group/row relative flex cursor-pointer items-center pr-4',
        density === 'compact' ? 'h-8' : 'h-10',
        selected ? 'bg-surface-sel' : unread ? 'bg-surface hover:shadow-[inset_0_-1px_0_var(--line),0_1px_3px_rgba(60,64,67,0.24)]' : 'bg-surface-read hover:shadow-[inset_0_-1px_0_var(--line),0_1px_3px_rgba(60,64,67,0.24)]',
        'shadow-[inset_0_-1px_0_var(--line)] hover:z-10',
      )}
    >
      {atCursor && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
      <div className="flex items-center pl-1">
        <Checkbox checked={selected} onChange={() => toggleSelect(thread.id)} />
        <IconButton
          title={starred ? 'Starred' : 'Not starred'}
          onClick={() => toggleThreadStar(thread.id)}
        >
          <Star className={cx(starred ? 'fill-star text-star' : 'text-ink-3')} />
        </IconButton>
      </div>

      <div
        className={cx(
          'w-44 shrink-0 truncate pl-1 pr-3 text-sm',
          unread ? 'font-semibold text-ink-1' : 'text-ink-2',
        )}
      >
        {senderText}
      </div>

      <div className="flex min-w-0 flex-1 items-center text-sm">
        <span className="min-w-0 truncate">
          <RowLabels thread={thread} />
          <span className={cx(unread ? 'font-semibold text-ink-1' : 'text-ink-2')}>{thread.subject}</span>
          <span className="text-ink-3"> &nbsp;–&nbsp; {last.snippet}</span>
        </span>
        <AttachmentChips thread={thread} />
      </div>

      <div className="ml-3 flex shrink-0 items-center justify-end">
        <span
          className={cx(
            'row-meta text-xs',
            snoozed ? 'font-medium text-[#c26401] dark:text-[#f5b263]' : unread ? 'font-semibold text-ink-1' : 'text-ink-3',
          )}
        >
          {snoozed ? snoozeLabel(thread.snoozedUntil!) : listDate(threadDate(thread))}
        </span>

        <div className="row-actions relative items-center">
          {inTrash || inSpam ? (
            <>
              <IconButton
                size="sm"
                title={inSpam ? 'Not spam' : 'Move to Inbox'}
                onClick={() => (inSpam ? notSpam([thread.id]) : moveToInbox([thread.id]))}
              >
                <ArchiveRestore />
              </IconButton>
              <IconButton size="sm" title="Delete forever" onClick={() => deleteForever([thread.id])}>
                <Trash2 />
              </IconButton>
            </>
          ) : (
            <>
              <IconButton size="sm" title="Archive (e)" onClick={() => archiveThreads([thread.id])}>
                <Archive />
              </IconButton>
              <IconButton size="sm" title="Delete (#)" onClick={() => trashThreads([thread.id])}>
                <Trash2 />
              </IconButton>
              <IconButton
                size="sm"
                title={unread ? 'Mark as read' : 'Mark as unread'}
                onClick={() => markRead([thread.id], unread)}
              >
                {unread ? <MailOpen /> : <MailIcon />}
              </IconButton>
              <IconButton size="sm" title="Snooze" onClick={() => setSnoozeOpen(true)}>
                <Clock />
              </IconButton>
            </>
          )}
        </div>
        {/* Anchored at row level so it survives the hover-actions container hiding */}
        <SnoozeMenu open={snoozeOpen} onClose={() => setSnoozeOpen(false)} threadIds={[thread.id]} align="right" />
      </div>
    </div>
  )
}

function ListToolbar(props: { threads: Thread[] }) {
  const { threads } = props
  const isMobile = useIsMobile()
  const route = useMail((s) => s.route)
  const selected = useMail((s) => s.selected)
  const setSelected = useMail((s) => s.setSelected)
  const clearSelection = useMail((s) => s.clearSelection)
  const archiveThreads = useMail((s) => s.archiveThreads)
  const trashThreads = useMail((s) => s.trashThreads)
  const deleteForever = useMail((s) => s.deleteForever)
  const markSpam = useMail((s) => s.markSpam)
  const notSpam = useMail((s) => s.notSpam)
  const moveToInbox = useMail((s) => s.moveToInbox)
  const markRead = useMail((s) => s.markRead)
  const allThreads = useMail((s) => s.threads)
  const wakeSnoozed = useMail((s) => s.wakeSnoozed)
  const toast = useMail((s) => s.toast)
  const [selectMenuOpen, setSelectMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [labelOpen, setLabelOpen] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [spinning, setSpinning] = useState(false)

  const ids = threads.map((t) => t.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id))
  const someSelected = selected.length > 0
  const inTrash = route.folder === 'trash'
  const inSpam = route.folder === 'spam'
  const anyUnreadSelected = allThreads.some((t) => selected.includes(t.id) && isUnread(t))

  const refresh = () => {
    setSpinning(true)
    wakeSnoozed()
    setTimeout(() => {
      setSpinning(false)
      toast('Your mailbox is up to date')
    }, 650)
  }

  const selectBy = (mode: 'all' | 'none' | 'read' | 'unread' | 'starred' | 'unstarred') => {
    setSelectMenuOpen(false)
    switch (mode) {
      case 'all':
        return setSelected(ids)
      case 'none':
        return setSelected([])
      case 'read':
        return setSelected(threads.filter((t) => !isUnread(t)).map((t) => t.id))
      case 'unread':
        return setSelected(threads.filter((t) => isUnread(t)).map((t) => t.id))
      case 'starred':
        return setSelected(threads.filter((t) => isStarred(t)).map((t) => t.id))
      case 'unstarred':
        return setSelected(threads.filter((t) => !isStarred(t)).map((t) => t.id))
    }
  }

  if (isMobile && !someSelected) {
    return null
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-line px-2 md:px-4">
      {isMobile ? (
        <>
          <IconButton title="Clear selection" onClick={clearSelection}>
            <X />
          </IconButton>
          <span className="text-sm font-medium text-ink-2">{selected.length}</span>
        </>
      ) : (
        <div className="relative flex items-center">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={(checked) => setSelected(checked ? ids : [])}
            title="Select"
          />
          <IconButton size="sm" title="Select options" onClick={() => setSelectMenuOpen(true)} aria-expanded={selectMenuOpen}>
            <ChevronDown />
          </IconButton>
          <Menu open={selectMenuOpen} onClose={() => setSelectMenuOpen(false)}>
            <MenuItem onClick={() => selectBy('all')}>All</MenuItem>
            <MenuItem onClick={() => selectBy('none')}>None</MenuItem>
            <MenuItem onClick={() => selectBy('read')}>Read</MenuItem>
            <MenuItem onClick={() => selectBy('unread')}>Unread</MenuItem>
            <MenuItem onClick={() => selectBy('starred')}>Starred</MenuItem>
            <MenuItem onClick={() => selectBy('unstarred')}>Unstarred</MenuItem>
          </Menu>
        </div>
      )}

      {someSelected ? (
        <div className="flex items-center gap-0.5">
          {inTrash || inSpam ? (
            <>
              <IconButton title={inSpam ? 'Not spam' : 'Move to Inbox'} onClick={() => (inSpam ? notSpam(selected) : moveToInbox(selected))}>
                <ArchiveRestore />
              </IconButton>
              <IconButton title="Delete forever" onClick={() => deleteForever(selected)}>
                <Trash2 />
              </IconButton>
            </>
          ) : (
            <>
              <IconButton title="Archive (e)" onClick={() => archiveThreads(selected)}>
                <Archive />
              </IconButton>
              <IconButton title="Report spam (!)" onClick={() => markSpam(selected)}>
                <OctagonAlert />
              </IconButton>
              <IconButton title="Delete (#)" onClick={() => trashThreads(selected)}>
                <Trash2 />
              </IconButton>
              <span className="mx-1 h-5 w-px bg-line-strong" />
              <IconButton
                title={anyUnreadSelected ? 'Mark as read' : 'Mark as unread'}
                onClick={() => markRead(selected, anyUnreadSelected)}
              >
                {anyUnreadSelected ? <MailOpen /> : <MailIcon />}
              </IconButton>
              <span className="relative">
                <IconButton title="Snooze" onClick={() => setSnoozeOpen(true)}>
                  <Clock />
                </IconButton>
                <SnoozeMenu open={snoozeOpen} onClose={() => setSnoozeOpen(false)} threadIds={selected} />
              </span>
              <span className="relative">
                <IconButton title="Labels" onClick={() => setLabelOpen(true)}>
                  <Tag />
                </IconButton>
                <LabelMenu open={labelOpen} onClose={() => setLabelOpen(false)} threadIds={selected} />
              </span>
            </>
          )}
        </div>
      ) : (
        <>
          <IconButton title="Refresh" onClick={refresh}>
            <RefreshCw className={spinning ? 'anim-spin' : undefined} />
          </IconButton>
          <span className="relative">
            <IconButton title="More" onClick={() => setMoreOpen(true)}>
              <MoreVertical />
            </IconButton>
            <Menu open={moreOpen} onClose={() => setMoreOpen(false)}>
              <MenuItem
                onClick={() => {
                  markRead(ids, true)
                  setMoreOpen(false)
                }}
                disabled={!threads.some((t) => isUnread(t))}
              >
                Mark all as read
              </MenuItem>
              <MenuItem onClick={() => selectBy('unread')}>Select unread</MenuItem>
            </Menu>
          </span>
        </>
      )}

      <div className="ml-auto flex items-center gap-2 text-xs text-ink-3">
        {someSelected && !isMobile && <span className="mr-2 text-sm text-ink-2">{selected.length} selected</span>}
        {threads.length > 0 && !isMobile && (
          <span>
            1–{threads.length} of {threads.length}
          </span>
        )}
      </div>
    </div>
  )
}

const EMPTY_STATES: Record<string, { icon: typeof Inbox; title: string; hint?: string }> = {
  inbox: { icon: Inbox, title: 'Your inbox is empty', hint: 'Nothing new here — enjoy the quiet.' },
  starred: { icon: Star, title: 'No starred messages', hint: 'Star important mail with s or the star icon.' },
  snoozed: { icon: Clock, title: 'No snoozed messages', hint: 'Snoozed conversations return to your inbox on schedule.' },
  sent: { icon: Send, title: 'No sent mail yet', hint: 'Messages you send will appear here.' },
  drafts: { icon: FileIcon, title: 'No drafts', hint: 'Drafts save automatically while you write.' },
  all: { icon: Archive, title: 'No mail', hint: 'All Mail shows everything except Spam and Trash.' },
  spam: { icon: OctagonAlert, title: 'No spam here', hint: 'Hooray — the filter is doing its job.' },
  trash: { icon: Trash2, title: 'Trash is empty', hint: 'Deleted conversations live here for 30 days.' },
  label: { icon: Tag, title: 'No mail with this label' },
  search: { icon: Search, title: 'No results found', hint: 'Try different keywords or operators like from:, is:unread, has:attachment.' },
}

export function MailList() {
  const threads = useVisibleThreads()
  const route = useMail((s) => s.route)
  const labels = useMail((s) => s.labels)
  const emptyFolder = useMail((s) => s.emptyFolder)
  const isMobile = useIsMobile()

  const emptyKey = route.folder in EMPTY_STATES ? route.folder : 'inbox'
  const empty = EMPTY_STATES[emptyKey]
  const EmptyIcon = empty.icon
  const currentLabel = route.folder === 'label' ? labels.find((l) => l.id === route.labelId) : undefined

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ListToolbar threads={threads} />
      {route.folder === 'inbox' && !isMobile && <CategoryTabs />}

      {route.folder === 'search' && (
        <div className="border-b border-line px-4 py-2 text-sm text-ink-2">
          Search results for <span className="font-medium text-ink-1">“{route.query}”</span>
          <span className="ml-2 text-xs text-ink-3">({pluralize(threads.length, 'conversation')})</span>
        </div>
      )}
      {currentLabel && (
        <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-sm text-ink-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: currentLabel.color }} />
          <span className="font-medium text-ink-1">{currentLabel.name}</span>
          <span className="text-xs text-ink-3">({pluralize(threads.length, 'conversation')})</span>
        </div>
      )}

      {(route.folder === 'trash' || route.folder === 'spam') && threads.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-line bg-chip/60 px-4 py-2 text-center text-xs text-ink-2">
          {route.folder === 'trash'
            ? 'Conversations in Trash for more than 30 days are deleted automatically.'
            : 'Conversations in Spam for more than 30 days are deleted automatically.'}
          <button
            type="button"
            className="font-medium text-accent hover:underline"
            onClick={() => emptyFolder(route.folder as 'trash' | 'spam')}
          >
            {route.folder === 'trash' ? 'Empty Trash now' : 'Delete all spam messages now'}
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {route.folder === 'inbox' && isMobile && <CategoryTabs />}
        {threads.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
            <EmptyIcon className="h-14 w-14 text-ink-3/50" strokeWidth={1.25} />
            <div className="text-lg text-ink-2">{empty.title}</div>
            {empty.hint && <div className="max-w-sm text-sm text-ink-3">{empty.hint}</div>}
          </div>
        ) : (
          threads.map((t, i) => <MailRow key={t.id} thread={t} index={i} />)
        )}
        {threads.length > 0 && (
          <div className="px-6 py-4 text-center text-xs text-ink-3">
            {pluralize(threads.length, 'conversation')} · Fable Mail stores everything locally in your browser
          </div>
        )}
      </div>
    </div>
  )
}
