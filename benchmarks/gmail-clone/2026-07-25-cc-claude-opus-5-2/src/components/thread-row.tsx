import { memo, useEffect, useRef, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  Clock,
  Mail,
  MailOpen,
  Paperclip,
  Star,
  Trash2,
} from 'lucide-react'
import type { ThreadSummary } from '@/lib/selectors'
import type { Density, ViewId } from '@/lib/types'
import { cn, formatFuture, formatListDate } from '@/lib/utils'
import { DENSITY_ROW } from '@/store/settings'
import { Avatar, Checkbox, IconButton } from './ui/bits'
import { Highlight } from './highlight'
import { SnoozeMenu } from './snooze-menu'

export interface RowHandlers {
  onOpen: (id: string) => void
  onSelect: (id: string, next: boolean, shift: boolean) => void
  onStar: (id: string, next: boolean) => void
  onImportant: (id: string, next: boolean) => void
  onArchive: (id: string) => void
  onTrash: (id: string) => void
  onUntrash: (id: string) => void
  onRead: (id: string, read: boolean) => void
  onSnooze: (id: string, iso: string, human: string) => void
}

interface ThreadRowProps {
  summary: ThreadSummary
  selected: boolean
  cursor: boolean
  view: ViewId
  density: Density
  terms: string[]
  now: number
  showPreview: boolean
  hoverActions: boolean
  /** Force the stacked layout at any width (used by the reading-pane list). */
  stacked?: boolean
  handlers: RowHandlers
}

function ThreadRowImpl({
  summary: s,
  selected,
  cursor,
  view,
  density,
  terms,
  now,
  showPreview,
  hoverActions,
  stacked = false,
  handlers,
}: ThreadRowProps) {
  const snoozeRef = useRef<HTMLButtonElement>(null)
  const rowRef = useRef<HTMLLIElement>(null)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const nowDate = new Date(now)

  useEffect(() => {
    if (cursor) rowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const inTrash = view === 'trash'
  const people = view === 'sent' || view === 'scheduled' ? s.recipients : s.senders
  const primary = s.messages[s.messages.length - 1]

  const stamp =
    view === 'scheduled' && s.scheduledFor
      ? formatFuture(s.scheduledFor, nowDate)
      : view === 'snoozed' && s.snoozedUntil
        ? formatFuture(s.snoozedUntil, nowDate)
        : formatListDate(s.date, nowDate)

  return (
    <li
      ref={rowRef}
      className={cn(
        'group relative border-b border-line-soft/70 transition-colors',
        selected
          ? 'bg-select'
          : s.unread
            ? 'bg-unread hover:z-[1] hover:shadow-row'
            : 'bg-read hover:z-[1] hover:shadow-row',
        cursor && 'ring-1 ring-inset ring-accent/45',
      )}
    >
      <div
        role="button"
        tabIndex={-1}
        aria-label={s.subject || '(no subject)'}
        onClick={() => handlers.onOpen(s.id)}
        className={cn(
          'flex cursor-pointer items-start gap-1 pl-1 pr-2 sm:items-center sm:pl-2 sm:pr-3',
          DENSITY_ROW[density],
        )}
      >
        <button
          type="button"
          aria-label={selected ? 'Deselect' : 'Select'}
          onClick={(e) => {
            e.stopPropagation()
            handlers.onSelect(s.id, !selected, e.shiftKey)
          }}
          className={cn('mt-0.5 shrink-0 rounded-full p-0.5', !stacked && 'sm:hidden')}
        >
          {selected ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-on-accent">
              ✓
            </span>
          ) : (
            <Avatar
              name={primary?.from.name ?? ''}
              email={primary?.from.email ?? ''}
              size={36}
            />
          )}
        </button>

        {!stacked && (
          <>
            <Checkbox
              checked={selected}
              label={selected ? 'Deselect conversation' : 'Select conversation'}
              onChange={(next, e) => handlers.onSelect(s.id, next, e.shiftKey)}
              className="hidden shrink-0 sm:inline-flex"
            />
            <button
              type="button"
              aria-label={s.starred ? 'Remove star' : 'Add star'}
              onClick={(e) => {
                e.stopPropagation()
                handlers.onStar(s.id, !s.starred)
              }}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-4 hover:bg-surface-3 sm:inline-flex"
            >
              <Star
                className={cn('h-[18px] w-[18px]', s.starred && 'fill-star text-star')}
              />
            </button>
            <button
              type="button"
              aria-label={s.important ? 'Mark not important' : 'Mark important'}
              onClick={(e) => {
                e.stopPropagation()
                handlers.onImportant(s.id, !s.important)
              }}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-4 hover:bg-surface-3 lg:inline-flex"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                <path
                  d="M6.5 5h11.2l-3.6 7 3.6 7H6.5V5z"
                  className={cn(s.important ? 'fill-important stroke-important' : 'fill-none stroke-current')}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}

        <div
          className={cn(
            'min-w-0 flex-1 py-0.5',
            !stacked && 'sm:flex sm:items-center sm:gap-2 sm:py-0',
          )}
        >
          {/* Narrow widths: stacked two-line layout */}
          <div className={cn(!stacked && 'sm:hidden')}>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[14px]',
                  s.unread ? 'font-bold text-ink' : 'text-ink-2',
                )}
              >
                {people}
                {s.count > 1 && <span className="ml-1 text-ink-4">{s.count}</span>}
              </span>
              <span
                className={cn(
                  'shrink-0 text-[11px]',
                  s.unread ? 'font-bold text-ink' : 'text-ink-3',
                )}
              >
                {stamp}
              </span>
            </div>
            <div
              className={cn(
                'mt-0.5 truncate text-[13px]',
                s.unread ? 'font-semibold text-ink' : 'text-ink-2',
              )}
            >
              <Highlight text={s.subject || '(no subject)'} terms={terms} />
            </div>
            {showPreview && (
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-ink-3">
                {s.hasAttachment && <Paperclip className="h-3 w-3 shrink-0" />}
                <span className="truncate">
                  <Highlight text={s.snippet} terms={terms} />
                </span>
              </div>
            )}
            {s.userLabels.length > 0 && (
              <div className="mt-1 flex gap-1 overflow-hidden">
                {s.userLabels.slice(0, 3).map((l) => (
                  <LabelChip key={l.id} name={l.name} bg={l.color.bg} fg={l.color.fg} />
                ))}
              </div>
            )}
          </div>

          {/* Wide widths: single-line layout */}
          {!stacked && (
            <>
              <span
                className={cn(
                  'hidden w-[10rem] shrink-0 truncate text-[14px] xl:w-[13rem] sm:block',
                  s.unread ? 'font-bold text-ink' : 'text-ink-2',
                )}
              >
                {people}
                {s.count > 1 && <span className="ml-1 font-normal text-ink-4">{s.count}</span>}
              </span>
              <span className="hidden min-w-0 flex-1 items-center gap-1.5 sm:flex">
                {s.userLabels.slice(0, 3).map((l) => (
                  <LabelChip key={l.id} name={l.name} bg={l.color.bg} fg={l.color.fg} />
                ))}
                <span className="min-w-0 truncate text-[14px]">
                  <span className={cn(s.unread ? 'font-bold text-ink' : 'text-ink')}>
                    <Highlight text={s.subject || '(no subject)'} terms={terms} />
                  </span>
                  {showPreview && s.snippet && (
                    <span className={cn('text-ink-3', s.unread ? 'font-normal' : '')}>
                      {' — '}
                      <Highlight text={s.snippet} terms={terms} />
                    </span>
                  )}
                </span>
              </span>
            </>
          )}
        </div>

        {!stacked && (
        <div className="relative hidden w-[8.5rem] shrink-0 items-center justify-end gap-0.5 self-stretch sm:flex">
          <span className="flex items-center gap-1.5 pr-1">
            {s.hasAttachment && (
              <Paperclip className={cn('h-4 w-4 shrink-0 text-ink-3', hoverActions && 'group-hover:hidden')} />
            )}
            <span
              className={cn(
                'text-[12px] tabular-nums',
                s.unread ? 'font-bold text-ink' : 'text-ink-3',
                hoverActions && 'group-hover:invisible',
              )}
            >
              {stamp}
            </span>
          </span>
          {hoverActions && (
            <div
              className="absolute inset-y-0 right-0 hidden items-center gap-0.5 pl-2 group-hover:flex group-focus-within:flex"
              onClick={(e) => e.stopPropagation()}
            >
              {inTrash ? (
                <IconButton
                  label="Move to inbox"
                  size="sm"
                  onClick={() => handlers.onUntrash(s.id)}
                >
                  <ArchiveRestore />
                </IconButton>
              ) : (
                <IconButton label="Archive" shortcut="E" size="sm" onClick={() => handlers.onArchive(s.id)}>
                  <Archive />
                </IconButton>
              )}
              <IconButton label="Delete" shortcut="#" size="sm" onClick={() => handlers.onTrash(s.id)}>
                <Trash2 />
              </IconButton>
              <IconButton
                label={s.unread ? 'Mark as read' : 'Mark as unread'}
                size="sm"
                onClick={() => handlers.onRead(s.id, s.unread)}
              >
                {s.unread ? <MailOpen /> : <Mail />}
              </IconButton>
              <IconButton
                ref={snoozeRef}
                label="Snooze"
                size="sm"
                onClick={() => setSnoozeOpen(true)}
                active={snoozeOpen}
              >
                <Clock />
              </IconButton>
            </div>
          )}
        </div>
        )}

        <ChevronRight
          className={cn('mt-2 h-4 w-4 shrink-0 text-ink-4', stacked ? 'hidden' : 'sm:hidden')}
        />
      </div>

      {(s.snoozedUntil || s.scheduledFor) &&
        view !== 'snoozed' &&
        view !== 'scheduled' &&
        !stacked && (
        <div className="pointer-events-none absolute bottom-0.5 left-[7.5rem] hidden text-[11px] text-important sm:block">
          {s.scheduledFor
            ? `Scheduled for ${formatFuture(s.scheduledFor, nowDate)}`
            : `Snoozed until ${formatFuture(s.snoozedUntil!, nowDate)}`}
        </div>
      )}

      <SnoozeMenu
        anchorRef={snoozeRef}
        open={snoozeOpen}
        onClose={() => setSnoozeOpen(false)}
        align="end"
        onPick={(iso, human) => handlers.onSnooze(s.id, iso, human)}
      />
    </li>
  )
}

export function LabelChip({ name, bg, fg }: { name: string; bg: string; fg: string }) {
  return (
    <span
      style={{ backgroundColor: bg, color: fg }}
      className="inline-block max-w-[8rem] shrink-0 truncate rounded px-1.5 py-px text-[11px] font-medium leading-4"
    >
      {name}
    </span>
  )
}

export const ThreadRow = memo(ThreadRowImpl)
