import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  MailOpen,
  Mail,
  MoreVertical,
  OctagonAlert,
  RotateCw,
  Star,
  Tag,
  Trash2,
  Users,
  Info,
  Paperclip,
  CalendarDays,
  UserRound,
  Bookmark,
  AlarmClockOff,
} from 'lucide-react'
import type { Category, Label, Thread, View } from '../types'
import { useMail } from '../store/mail'
import { useUI } from '../store/ui'
import { useCounts, useViewThreads } from '../hooks'
import { actions } from '../actions'
import { goView } from '../lib/router'
import { formatListDate, formatScheduleLabel } from '../lib/format'
import { FOLDER_NAMES, hasAttachments, isSnoozed, lastDate, lastSentDate, participants, snippet } from '../lib/mail'
import { highlightTerms } from '../lib/search'
import { Avatar, Checkbox, cx, Dropdown, IconButton, MenuDivider, MenuItem, useIsMobile } from './ui'
import { LabelMenu, MoveMenu, SnoozeMenu } from './menus'
import { AttachmentChip } from './Attachments'
import { Highlight } from './Highlight'
import { runSearch } from './TopBar'

export const PAGE_SIZE = 50

const TABS: { id: Category; label: string; icon: typeof Inbox; color: string }[] = [
  { id: 'primary', label: 'Primary', icon: Inbox, color: 'var(--accent)' },
  { id: 'promotions', label: 'Promotions', icon: Tag, color: '#188038' },
  { id: 'social', label: 'Social', icon: Users, color: '#1a73e8' },
  { id: 'updates', label: 'Updates', icon: Info, color: '#e37400' },
]

export function viewTitle(view: View, labels: Label[]) {
  if (view.kind === 'folder') return FOLDER_NAMES[view.folder]
  if (view.kind === 'label') return labels.find((l) => l.id === view.labelId)?.name ?? 'Label'
  return 'Search results'
}

function CategoryTabs({ mobile }: { mobile: boolean }) {
  const tab = useUI((s) => s.inboxTab)
  const setTab = useUI((s) => s.setInboxTab)
  const { catNew } = useCounts()
  return (
    <div role="tablist" className={cx('flex shrink-0 border-b border-line', mobile ? 'scroll-thin gap-2 overflow-x-auto border-none px-3 pb-2' : '')}>
      {TABS.map((t) => {
        const active = tab === t.id
        const Icon = t.icon
        const n = catNew[t.id]
        if (mobile) {
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cx('flex h-8 shrink-0 items-center gap-2 rounded-lg border px-3 text-[13px]', active ? 'border-transparent bg-active font-medium' : 'border-line-strong')}
            >
              <Icon size={15} style={{ color: active ? t.color : undefined }} />
              {t.label}
              {t.id !== 'primary' && n.count > 0 && <span className="rounded-full px-1.5 text-[11px] font-bold text-white" style={{ background: t.color }}>{n.count}</span>}
            </button>
          )
        }
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => setTab(t.id)}
            className={cx('group relative flex h-14 min-w-0 max-w-[252px] flex-1 items-center gap-4 pl-4 pr-3 text-left hover:bg-hover', active ? 'font-medium' : 'text-muted')}
            style={active ? { color: t.color } : undefined}
          >
            <Icon size={20} className="shrink-0" />
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2 text-[14px]">
                <span className={cx(active ? '' : 'text-ink')}>{t.label}</span>
                {t.id !== 'primary' && n.count > 0 && (
                  <span className="shrink-0 whitespace-nowrap rounded-full px-2 text-[11px] font-bold leading-4 text-white @max-2xl:px-1.5" style={{ background: t.color }}>
                    {n.count}
                    <span className="@max-2xl:hidden"> new</span>
                  </span>
                )}
              </span>
              {t.id !== 'primary' && n.count > 0 && <span className="truncate text-[12px] font-normal text-muted @max-2xl:hidden">{n.from.join(', ')}</span>}
            </span>
            {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t" style={{ background: t.color }} />}
          </button>
        )
      })}
    </div>
  )
}

function SearchChips({ query }: { query: string }) {
  const chips: { label: string; token: string; icon: typeof Paperclip }[] = [
    { label: 'From me', token: 'from:me', icon: UserRound },
    { label: 'Has attachment', token: 'has:attachment', icon: Paperclip },
    { label: 'Last 7 days', token: 'newer_than:7d', icon: CalendarDays },
    { label: 'Unread', token: 'is:unread', icon: Mail },
    { label: 'Starred', token: 'is:starred', icon: Star },
    { label: 'Important', token: 'is:important', icon: Bookmark },
  ]
  const tokens = query.split(/\s+/)
  return (
    <div className="scroll-thin flex shrink-0 gap-2 overflow-x-auto px-4 pb-2 pt-1">
      {chips.map((c) => {
        const on = tokens.includes(c.token)
        const Icon = c.icon
        return (
          <button
            key={c.token}
            type="button"
            onClick={() => runSearch(on ? tokens.filter((t) => t !== c.token).join(' ') : `${query} ${c.token}`)}
            className={cx('flex h-8 shrink-0 items-center gap-2 rounded-lg border px-3 text-[13px]', on ? 'border-transparent bg-active font-medium' : 'border-line-strong hover:bg-hover')}
          >
            <Icon size={15} />
            {c.label}
          </button>
        )
      })}
    </div>
  )
}

function ListToolbar({
  view,
  list,
  page,
  setPage,
  mobile,
}: {
  view: View
  list: Thread[]
  page: number
  setPage: (p: number) => void
  mobile: boolean
}) {
  const selected = useUI((s) => s.selected)
  const setSelected = useUI((s) => s.setSelected)
  const threads = useMail((s) => s.threads)
  const pageItems = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const sel = selected.filter((id) => threads[id])
  const all = pageItems.length > 0 && pageItems.every((t) => selected.includes(t.id))
  const some = sel.length > 0 && !all
  const [spin, setSpin] = useState(false)
  const folder = view.kind === 'folder' ? view.folder : null
  const inTrash = folder === 'trash'
  const inSpam = folder === 'spam'
  const selThreads = sel.map((id) => threads[id])
  const anyUnread = selThreads.some((t) => t?.unread)
  const allStarred = selThreads.length > 0 && selThreads.every((t) => t?.starred)
  const allImportant = selThreads.length > 0 && selThreads.every((t) => t?.important)
  const archivedView = !(folder === 'inbox' || folder === 'snoozed') && selThreads.some((t) => t && !t.inbox)
  const clear = () => setSelected([])
  const start = list.length ? page * PAGE_SIZE + 1 : 0
  const end = Math.min(list.length, (page + 1) * PAGE_SIZE)

  if (mobile && sel.length === 0) return null

  return (
    <div className={cx('flex h-12 shrink-0 items-center gap-1 pl-2 pr-2', mobile && 'sticky top-0 z-20 bg-bg')}>
      <div className="flex items-center">
        <Checkbox
          checked={all}
          indeterminate={some}
          label="Select"
          onChange={() => setSelected(all || some ? [] : pageItems.map((t) => t.id))}
        />
        <Dropdown
          width={160}
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} aria-label="Select options" className="-ml-2 flex h-8 w-5 items-center justify-center rounded text-muted hover:bg-hover">
              <ChevronDown size={14} />
            </button>
          )}
        >
          {(close) =>
            (
              [
                ['All', () => pageItems],
                ['None', () => []],
                ['Read', () => pageItems.filter((t) => !t.unread)],
                ['Unread', () => pageItems.filter((t) => t.unread)],
                ['Starred', () => pageItems.filter((t) => t.starred)],
                ['Unstarred', () => pageItems.filter((t) => !t.starred)],
              ] as const
            ).map(([label, fn]) => (
              <MenuItem
                key={label}
                onClick={() => {
                  setSelected(fn().map((t) => t.id))
                  close()
                }}
              >
                {label}
              </MenuItem>
            ))
          }
        </Dropdown>
      </div>

      {sel.length === 0 ? (
        <>
          <IconButton
            label="Refresh"
            onClick={() => {
              setSpin(true)
              useMail.getState().tick(Date.now())
              setTimeout(() => setSpin(false), 600)
            }}
          >
            <RotateCw size={18} className={cx(spin && 'animate-spin')} />
          </IconButton>
          <Dropdown
            width={220}
            trigger={({ toggle }) => (
              <IconButton label="More" onClick={toggle}>
                <MoreVertical size={18} />
              </IconButton>
            )}
          >
            {(close) => (
              <>
                <MenuItem
                  icon={<MailOpen size={16} />}
                  onClick={() => {
                    close()
                    const ids = list.filter((t) => t.unread).map((t) => t.id)
                    if (ids.length) actions.read(ids, false)
                    else useUI.getState().showToast('No unread conversations here.')
                  }}
                >
                  Mark all as read
                </MenuItem>
                <MenuItem
                  icon={<Star size={16} />}
                  onClick={() => {
                    close()
                    setSelected(pageItems.filter((t) => t.starred).map((t) => t.id))
                  }}
                >
                  Select starred
                </MenuItem>
              </>
            )}
          </Dropdown>
        </>
      ) : (
        <div className="flex min-w-0 items-center overflow-x-auto">
          {mobile && <span className="px-2 text-[15px] font-medium">{sel.length}</span>}
          {inSpam ? (
            <button type="button" onClick={() => { actions.notSpam(sel); clear() }} className="mx-1 h-8 rounded px-2 text-[14px] font-medium text-ink hover:bg-hover">
              Not spam
            </button>
          ) : !inTrash && (
            archivedView ? (
              <IconButton label="Move to Inbox" onClick={() => { actions.moveToInbox(sel); clear() }}>
                <ArchiveRestore size={18} />
              </IconButton>
            ) : (
              <IconButton label="Archive" onClick={() => { actions.archive(sel); clear() }}>
                <Archive size={18} />
              </IconButton>
            )
          )}
          {!inSpam && !inTrash && (
            <IconButton label="Report spam" onClick={() => { actions.spam(sel); clear() }}>
              <OctagonAlert size={18} />
            </IconButton>
          )}
          {inTrash || inSpam ? (
            <button type="button" onClick={() => { actions.deleteForever(sel); clear() }} className="mx-1 h-8 shrink-0 rounded px-2 text-[14px] font-medium text-ink hover:bg-hover">
              Delete forever
            </button>
          ) : (
            <IconButton label="Delete" onClick={() => { actions.trash(sel); clear() }}>
              <Trash2 size={18} />
            </IconButton>
          )}
          {inTrash && (
            <IconButton label="Move to Inbox" onClick={() => { actions.moveToInbox(sel); clear() }}>
              <Inbox size={18} />
            </IconButton>
          )}
          <span className="mx-2 h-5 w-px shrink-0 bg-line-strong/60" />
          <IconButton label={anyUnread ? 'Mark as read' : 'Mark as unread'} onClick={() => { actions.read(sel, !anyUnread); if (!mobile) return; clear() }}>
            {anyUnread ? <MailOpen size={18} /> : <Mail size={18} />}
          </IconButton>
          {folder === 'snoozed' ? (
            <IconButton label="Unsnooze" onClick={() => { actions.unsnooze(sel); clear() }}>
              <AlarmClockOff size={18} />
            </IconButton>
          ) : (
            <SnoozeMenu ids={sel} onDone={clear} />
          )}
          <span className="mx-2 h-5 w-px shrink-0 bg-line-strong/60 max-sm:hidden" />
          <span className="max-sm:hidden"><MoveMenu ids={sel} onDone={clear} /></span>
          <LabelMenu ids={sel} />
          <Dropdown
            width={240}
            align={mobile ? 'right' : 'left'}
            trigger={({ toggle }) => (
              <IconButton label="More" onClick={toggle}>
                <MoreVertical size={18} />
              </IconButton>
            )}
          >
            {(close) => (
              <>
                <MenuItem icon={anyUnread ? <MailOpen size={16} /> : <Mail size={16} />} onClick={() => { close(); actions.read(sel, !anyUnread) }}>
                  Mark as {anyUnread ? 'read' : 'unread'}
                </MenuItem>
                <MenuItem icon={<Bookmark size={16} />} onClick={() => { close(); actions.important(sel, !allImportant) }}>
                  Mark as {allImportant ? 'not important' : 'important'}
                </MenuItem>
                <MenuItem icon={<Star size={16} />} onClick={() => { close(); actions.star(sel, !allStarred) }}>
                  {allStarred ? 'Remove star' : 'Add star'}
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={<Archive size={16} />} onClick={() => { close(); actions.archive(sel); clear() }}>
                  Archive
                </MenuItem>
              </>
            )}
          </Dropdown>
        </div>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1 text-[12px] text-muted max-sm:hidden">
        <span className="px-2">{list.length ? `${start}–${end} of ${list.length}` : ''}</span>
        <IconButton label="Newer" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
          <ChevronLeft size={18} />
        </IconButton>
        <IconButton label="Older" size="sm" disabled={end >= list.length} onClick={() => setPage(page + 1)}>
          <ChevronRight size={18} />
        </IconButton>
      </div>
    </div>
  )
}

function LabelChips({ thread, labels, hide }: { thread: Thread; labels: Label[]; hide?: string }) {
  const own = thread.labels.filter((id) => id !== hide).map((id) => labels.find((l) => l.id === id)).filter(Boolean) as Label[]
  if (!own.length) return null
  return (
    <>
      {own.slice(0, 3).map((l) => (
        <span
          key={l.id}
          className="mr-1.5 inline-flex h-[18px] shrink-0 items-center rounded px-1.5 align-[1px] text-[11px] font-medium leading-none"
          style={{ background: `color-mix(in srgb, ${l.color} 22%, transparent)`, color: 'var(--ink)' }}
        >
          {l.name}
        </span>
      ))}
    </>
  )
}

export function ImportantMarker({ on, onClick, className }: { on: boolean; onClick: (e: React.MouseEvent) => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={on ? 'Mark as not important' : 'Mark as important'}
      onClick={onClick}
      className={cx('flex h-8 w-7 shrink-0 items-center justify-center rounded-full hover:bg-hover', className)}
    >
      <svg width="18" height="12" viewBox="0 0 20 12" aria-hidden>
        <path d="M1 1h12.5L19 6l-5.5 5H1l4.5-5z" fill={on ? '#f2b600' : 'none'} stroke={on ? '#e5a500' : 'var(--muted)'} strokeWidth="1.4" strokeLinejoin="round" opacity={on ? 1 : 0.55} />
      </svg>
    </button>
  )
}

export function StarButton({ on, onClick, size = 18, className }: { on: boolean; onClick: (e: React.MouseEvent) => void; size?: number; className?: string }) {
  return (
    <button
      type="button"
      aria-label={on ? 'Starred' : 'Not starred'}
      aria-pressed={on}
      onClick={onClick}
      className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-hover', className)}
    >
      <Star size={size} className={on ? 'fill-star text-star' : 'text-muted/70'} strokeWidth={on ? 1.5 : 1.8} />
    </button>
  )
}

interface RowProps {
  thread: Thread
  view: View
  selected: boolean
  focused: boolean
  active: boolean
  labels: Label[]
  terms: string[]
  density: 'default' | 'comfortable' | 'compact'
  onOpen: (t: Thread) => void
}

const Row = memo(function Row({ thread: t, view, selected, focused, active, labels, terms, density, onOpen }: RowProps) {
  const sentView = view.kind === 'folder' && view.folder === 'sent'
  const snoozedView = view.kind === 'folder' && view.folder === 'snoozed'
  const trashView = view.kind === 'folder' && view.folder === 'trash'
  const p = participants(t, sentView)
  const date = sentView ? lastSentDate(t) : lastDate(t)
  const atts = t.messages.flatMap((m) => m.attachments.map((a) => ({ a, m })))
  const h = density === 'compact' ? 'h-8' : density === 'comfortable' ? 'h-12' : 'h-10'
  const showAtt = density !== 'compact' && atts.length > 0
  const now = Date.now()
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }
  return (
    <div
      role="row"
      aria-selected={selected}
      data-thread={t.id}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) {
          useUI.getState().toggleSelected(t.id)
          return
        }
        onOpen(t)
      }}
      className={cx(
        'group relative flex cursor-pointer flex-col border-b border-line/70 hover:z-[1] hover:shadow-row',
        selected ? 'bg-select' : active ? 'bg-active/70' : t.unread ? 'bg-row-unread' : 'bg-row-read',
      )}
    >
      {focused && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
      <div className={cx('flex items-center pl-2 pr-3', h)}>
        <Checkbox checked={selected} label={`Select ${t.subject}`} onChange={() => useUI.getState().toggleSelected(t.id)} className="h-8 w-8" />
        <StarButton on={t.starred} onClick={stop(() => useMail.getState().toggleStar(t.id))} />
        <ImportantMarker on={t.important} onClick={stop(() => actions.important([t.id], !t.important))} className="max-lg:hidden" />
        <div className={cx('w-[168px] shrink-0 truncate pl-2 pr-4 text-[14px] lg:w-[200px] @max-2xl:w-[132px]!', t.unread ? 'font-bold text-ink' : 'text-ink')}>
          {p.names.map((n, i) => (
            <span key={i} className={cx(n.unread && 'font-bold')}>
              {i > 0 && n.label !== '..' && p.names[i - 1].label !== '..' ? ', ' : i > 0 ? ' ' : ''}
              {n.label}
            </span>
          ))}
          {p.count > 0 && <span className="ml-1 text-[12px] font-normal text-muted">{p.count}</span>}
        </div>
        <div className="flex min-w-0 flex-1 items-center text-[14px]">
          <span className="contents @max-2xl:hidden!">
            {view.kind !== 'folder' && t.inbox && !t.trash && <span className="mr-1.5 inline-flex h-[18px] items-center rounded bg-hover-strong px-1.5 text-[11px] font-medium">Inbox</span>}
            <LabelChips thread={t} labels={labels} hide={view.kind === 'label' ? view.labelId : undefined} />
          </span>
          <span className="min-w-0 truncate">
            <span className={cx(t.unread ? 'font-bold' : '')}>
              <Highlight text={t.subject} terms={terms} />
            </span>
            <span className="text-muted">
              {' '}
              – <Highlight text={snippet(t)} terms={terms} />
            </span>
          </span>
        </div>
        <div className="relative ml-3 flex w-[88px] shrink-0 justify-end">
          <span className={cx('text-[12px] group-hover:invisible', t.unread ? 'font-bold text-ink' : 'text-muted')}>
            {snoozedView && t.snoozeUntil ? formatScheduleLabel(t.snoozeUntil) : formatListDate(date, now)}
          </span>
          <div className="absolute right-[-8px] top-1/2 hidden -translate-y-1/2 items-center group-hover:flex">
            {trashView ? (
              <IconButton label="Delete forever" size="sm" onClick={stop(() => actions.deleteForever([t.id]))}>
                <Trash2 size={17} />
              </IconButton>
            ) : t.inbox ? (
              <IconButton label="Archive" size="sm" onClick={stop(() => actions.archive([t.id]))}>
                <Archive size={17} />
              </IconButton>
            ) : (
              <IconButton label="Move to Inbox" size="sm" onClick={stop(() => actions.moveToInbox([t.id]))}>
                <ArchiveRestore size={17} />
              </IconButton>
            )}
            {!trashView && (
              <IconButton label="Delete" size="sm" onClick={stop(() => actions.trash([t.id]))}>
                <Trash2 size={17} />
              </IconButton>
            )}
            <IconButton label={t.unread ? 'Mark as read' : 'Mark as unread'} size="sm" onClick={stop(() => actions.read([t.id], !t.unread))}>
              {t.unread ? <MailOpen size={17} /> : <Mail size={17} />}
            </IconButton>
            <span onClick={(e) => e.stopPropagation()}>
              <SnoozeMenu
                ids={[t.id]}
                trigger={(toggle) => (
                  <IconButton label="Snooze" size="sm" onClick={toggle}>
                    <Clock size={17} />
                  </IconButton>
                )}
              />
            </span>
          </div>
        </div>
      </div>
      {showAtt && (
        <div className="-mt-1 flex gap-2 overflow-hidden pb-2 pl-[calc(8px+32px+32px+28px+168px+8px)] pr-24 max-lg:pl-[248px] lg:pl-[276px] @max-2xl:pl-[232px]! @max-2xl:pr-4!">
          {atts.slice(0, 3).map(({ a, m }) => (
            <AttachmentChip
              key={a.id}
              a={a}
              onClick={(e) => {
                e.stopPropagation()
                useUI.getState().setPreview({ threadId: t.id, messageId: m.id, attachmentId: a.id })
              }}
            />
          ))}
          {atts.length > 3 && <span className="flex h-8 items-center rounded-full border border-line-strong/70 px-3 text-[13px] text-muted">+{atts.length - 3}</span>}
        </div>
      )}
    </div>
  )
})

const MobileRow = memo(function MobileRow({ thread: t, view, selected, labels, terms, onOpen }: Omit<RowProps, 'focused' | 'density' | 'active'>) {
  const sentView = view.kind === 'folder' && view.folder === 'sent'
  const p = participants(t, sentView)
  const date = sentView ? lastSentDate(t) : lastDate(t)
  const [dx, setDx] = useState(0)
  const start = useRef<{ x: number; y: number; locked: boolean | null } | null>(null)
  const archivable = !(view.kind === 'folder' && view.folder === 'trash')
  const atts = t.messages.flatMap((m) => m.attachments)
  return (
    <div className="relative overflow-hidden">
      {dx !== 0 && (
        <div className={cx('absolute inset-0 flex items-center px-6 text-white', dx > 0 ? 'justify-start' : 'justify-end', t.inbox ? 'bg-[#188038]' : 'bg-[#1a73e8]')}>
          {t.inbox ? <Archive size={22} /> : <Inbox size={22} />}
        </div>
      )}
      <div
        role="row"
        aria-selected={selected}
        onTouchStart={(e) => {
          start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, locked: null }
        }}
        onTouchMove={(e) => {
          const s = start.current
          if (!s || !archivable) return
          const mx = e.touches[0].clientX - s.x
          const my = e.touches[0].clientY - s.y
          if (s.locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.locked = Math.abs(mx) > Math.abs(my)
          if (s.locked) setDx(mx)
        }}
        onTouchEnd={() => {
          if (Math.abs(dx) > 100) {
            if (t.inbox) actions.archive([t.id])
            else actions.moveToInbox([t.id])
          }
          setDx(0)
          start.current = null
        }}
        onClick={() => (useUI.getState().selected.length ? useUI.getState().toggleSelected(t.id) : onOpen(t))}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? 'none' : 'transform .2s' }}
        className={cx('relative flex gap-3 px-4 py-3', selected ? 'bg-select' : 'bg-bg')}
      >
        <button
          type="button"
          aria-label={selected ? 'Deselect' : 'Select'}
          onClick={(e) => {
            e.stopPropagation()
            useUI.getState().toggleSelected(t.id)
          }}
          className="shrink-0"
        >
          {selected ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-on-accent">✓</span>
          ) : (
            <Avatar contact={sentView ? t.messages.find((m) => m.from.email.startsWith('sam'))?.to[0] ?? t.messages[0].from : t.messages[t.messages.length - 1].from} size={40} />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cx('min-w-0 flex-1 truncate text-[16px]', t.unread ? 'font-bold' : 'text-ink')}>
              {p.names.map((n) => n.label).join(', ')}
              {p.count > 0 && <span className="ml-1 text-[13px] font-normal text-muted">{p.count}</span>}
            </span>
            <span className={cx('shrink-0 text-[12px]', t.unread ? 'font-bold' : 'text-muted')}>{formatListDate(date)}</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className={cx('truncate text-[14px]', t.unread ? 'font-bold' : '')}>
                <Highlight text={t.subject} terms={terms} />
              </div>
              <div className="truncate text-[14px] text-muted">
                <Highlight text={snippet(t)} terms={terms} />
              </div>
              {(t.labels.length > 0 || atts.length > 0) && (
                <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
                  <LabelChips thread={t} labels={labels} />
                  {atts.slice(0, 1).map((a) => (
                    <span key={a.id} className="flex h-7 max-w-[160px] items-center gap-1.5 rounded-full border border-line-strong/70 px-2.5 text-[12px]">
                      <Paperclip size={13} className="shrink-0" />
                      <span className="truncate">{a.name}</span>
                    </span>
                  ))}
                  {atts.length > 1 && <span className="text-[12px] text-muted">+{atts.length - 1}</span>}
                </div>
              )}
            </div>
            <StarButton
              on={t.starred}
              size={20}
              className="-mr-2 -mt-1"
              onClick={(e) => {
                e.stopPropagation()
                useMail.getState().toggleStar(t.id)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

function EmptyState({ view }: { view: View }) {
  const labels = useMail((s) => s.labels)
  const msgs: Record<string, string> = {
    inbox: 'Your inbox is empty. Nice work.',
    starred: "No starred messages. Stars let you give messages a special status to make them easier to find.",
    snoozed: 'Nothing snoozed. Snooze messages to have them come back when you need them.',
    important: 'No important messages.',
    sent: 'No sent messages! Send one now?',
    all: 'No conversations.',
    spam: "Hooray, no spam here!",
    trash: 'No conversations in Trash.',
  }
  const text =
    view.kind === 'folder'
      ? msgs[view.folder]
      : view.kind === 'label'
        ? `There are no conversations with the label “${viewTitle(view, labels)}”.`
        : 'No messages matched your search. Try using search options such as sender, date, size and more.'
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-20 text-center text-muted">
      <svg width="96" height="80" viewBox="0 0 96 80" aria-hidden className="opacity-70">
        <rect x="8" y="14" width="80" height="56" rx="8" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M10 20 48 46 86 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <p className="max-w-sm text-[14px]">{text}</p>
    </div>
  )
}

export function MailList({ view, openThreadId }: { view: View; openThreadId?: string }) {
  const list = useViewThreads(view)
  const labels = useMail((s) => s.labels)
  const settings = useMail((s) => s.settings)
  const selected = useUI((s) => s.selected)
  const focusIndex = useUI((s) => s.focusIndex)
  const mobile = useIsMobile()
  const [page, setPage] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const terms = useMemo(() => (view.kind === 'search' ? highlightTerms(view.query) : []), [view])
  const viewKey = JSON.stringify(view)
  const tab = useUI((s) => s.inboxTab)

  useEffect(() => {
    setPage(0)
    scroller.current?.scrollTo({ top: 0 })
  }, [viewKey, tab])

  // keep keyboard focus visible
  useEffect(() => {
    const el = scroller.current?.querySelector(`[data-index="${focusIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [focusIndex])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(list.length / PAGE_SIZE) - 1)
    if (page > maxPage) setPage(maxPage)
  }, [list.length, page])

  const pageItems = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const selSet = useMemo(() => new Set(selected), [selected])
  const isInbox = view.kind === 'folder' && view.folder === 'inbox'
  const folder = view.kind === 'folder' ? view.folder : null

  const onOpen = (t: Thread) => {
    goView(view, t.id)
    const idx = pageItems.findIndex((x) => x.id === t.id)
    useUI.getState().setFocusIndex(idx)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ListToolbar view={view} list={list} page={page} setPage={setPage} mobile={mobile} />
      {mobile && selected.length === 0 && (
        <div className="px-4 pb-1 pt-1 text-[12px] font-medium uppercase tracking-wide text-muted">
          {view.kind === 'search' ? `${list.length} result${list.length === 1 ? '' : 's'}` : isInbox && settings.categories ? TABS.find((x) => x.id === tab)?.label : viewTitle(view, labels)}
        </div>
      )}
      {isInbox && settings.categories && <CategoryTabs mobile={mobile} />}
      {view.kind === 'search' && <SearchChips query={view.query} />}
      {(folder === 'trash' || folder === 'spam') && list.length > 0 && (
        <div className="flex shrink-0 items-center justify-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5 text-center text-[13px] text-muted max-sm:flex-col">
          {folder === 'trash' ? 'Messages that have been in Trash more than 30 days will be deleted automatically.' : 'Messages that have been in Spam more than 30 days will be deleted automatically.'}
          <button
            type="button"
            className="font-medium text-accent hover:underline"
            onClick={() => {
              if (folder === 'trash') useMail.getState().emptyTrash()
              else useMail.getState().emptySpam()
              useUI.getState().showToast(folder === 'trash' ? 'Trash emptied.' : 'Spam deleted.', {
                action: { label: 'Undo', run: () => useMail.getState().undo() },
              })
            }}
          >
            {folder === 'trash' ? 'Empty Trash now' : 'Delete all spam messages now'}
          </button>
        </div>
      )}
      <div ref={scroller} role="grid" aria-label="Conversations" className={cx('scroll-thin min-h-0 flex-1 overflow-y-auto', mobile && 'pb-24')}>
        {pageItems.length === 0 ? (
          <EmptyState view={view} />
        ) : (
          pageItems.map((t, i) =>
            mobile ? (
              <MobileRow key={t.id} thread={t} view={view} selected={selSet.has(t.id)} labels={labels} terms={terms} onOpen={onOpen} />
            ) : (
              <div key={t.id} data-index={i}>
                <Row
                  thread={t}
                  view={view}
                  selected={selSet.has(t.id)}
                  focused={i === focusIndex}
                  active={t.id === openThreadId}
                  labels={labels}
                  terms={terms}
                  density={settings.density}
                  onOpen={onOpen}
                />
              </div>
            ),
          )
        )}
        {pageItems.length > 0 && !mobile && (
          <div className="flex items-center justify-between px-6 py-5 text-[12px] text-muted">
            <span>{isSnoozed(pageItems[0], Date.now()) ? '' : `${list.filter((t) => hasAttachments(t)).length} with attachments · ${list.filter((t) => t.unread).length} unread`}</span>
            <span>Stored locally · Last activity {formatListDate(lastDate(pageItems[0]))}</span>
          </div>
        )}
      </div>
    </div>
  )
}

