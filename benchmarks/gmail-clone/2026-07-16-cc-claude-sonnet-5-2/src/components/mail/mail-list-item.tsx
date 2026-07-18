import { memo } from 'react'
import { Archive, Clock, MailOpen, Paperclip, Star, Trash2 } from 'lucide-react'
import type { Thread } from '@/lib/types'
import { useMailStore } from '@/store/mail-store'
import {
  threadHasAttachments,
  threadIsUnread,
  threadLastMessage,
  threadParticipantsLabel,
} from '@/lib/mail-queries'
import { formatListDate, initialsFor } from '@/lib/format'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LabelChip, threadCustomLabelIds } from './label-chip'
import { cn } from '@/lib/utils'

interface MailListItemProps {
  thread: Thread
  selected: boolean
  onToggleSelect: () => void
  onOpen: () => void
}

function MailListItemImpl({ thread, selected, onToggleSelect, onOpen }: MailListItemProps) {
  const toggleStar = useMailStore((s) => s.toggleStar)
  const archiveThreads = useMailStore((s) => s.archiveThreads)
  const trashThreads = useMailStore((s) => s.trashThreads)
  const markRead = useMailStore((s) => s.markRead)
  const density = useMailStore((s) => s.density)

  const unread = threadIsUnread(thread)
  const starred = thread.labelIds.includes('starred')
  const hasAttachments = threadHasAttachments(thread)
  const last = threadLastMessage(thread)
  const isDraft = thread.labelIds.includes('draft')
  const customLabels = threadCustomLabelIds(thread.labelIds)
  const messageCount = thread.messages.filter((m) => !m.isDraft).length

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className={cn(
        'group relative flex w-full cursor-pointer items-center gap-3 border-b border-border px-3 text-left transition-colors',
        density === 'compact' ? 'py-1.5' : 'py-2.5',
        selected ? 'bg-sidebar-active/40' : unread ? 'bg-card hover:shadow-sm' : 'bg-muted/40 hover:shadow-sm',
      )}
      style={{ boxShadow: 'none' }}
    >
      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label="Select conversation" />
        <button
          onClick={() => toggleStar(thread.id)}
          aria-label={starred ? 'Unstar' : 'Star'}
          className="text-muted-foreground hover:text-foreground"
        >
          <Star className={cn('size-[18px]', starred && 'fill-star text-star')} />
        </button>
      </div>

      <Avatar className="hidden size-9 shrink-0 sm:flex">
        <AvatarFallback style={{ backgroundColor: last.from.color }}>
          {initialsFor(last.from.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'w-32 shrink-0 truncate text-[13px] sm:w-44',
              unread ? 'font-semibold text-unread' : 'text-foreground',
            )}
          >
            {isDraft ? 'Draft' : threadParticipantsLabel(thread)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px]">
            <span className={cn(unread ? 'font-semibold text-unread' : 'text-foreground')}>
              {thread.subject || '(no subject)'}
            </span>
            <span className="text-muted-foreground"> — {last.snippet}</span>
          </span>
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        {customLabels.map((id) => (
          <LabelChip key={id} labelId={id} />
        ))}
        {messageCount > 1 && (
          <span className="rounded bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
            {messageCount}
          </span>
        )}
      </div>

      {hasAttachments && <Paperclip className="hidden size-4 shrink-0 text-muted-foreground sm:block" />}

      <div className="relative w-16 shrink-0 text-right">
        <span
          className={cn(
            'text-[12px] group-hover:opacity-0',
            unread ? 'font-semibold text-unread' : 'text-muted-foreground',
          )}
        >
          {formatListDate(last.date)}
        </span>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden items-center gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 sm:flex"
          onClick={(e) => e.stopPropagation()}
        >
          <RowAction label="Archive" icon={Archive} onClick={() => archiveThreads([thread.id])} />
          <RowAction label="Delete" icon={Trash2} onClick={() => trashThreads([thread.id])} />
          <RowAction
            label={unread ? 'Mark as read' : 'Mark as unread'}
            icon={MailOpen}
            onClick={() => markRead([thread.id], unread)}
          />
        </div>
      </div>
    </div>
  )
}

function RowAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: typeof Archive | typeof Clock
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          className="rounded-full bg-card p-1.5 text-muted-foreground shadow-sm hover:bg-surface-hover hover:text-foreground"
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export const MailListItem = memo(MailListItemImpl)
