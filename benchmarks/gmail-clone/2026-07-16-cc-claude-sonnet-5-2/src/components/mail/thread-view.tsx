import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  BellOff,
  Clock,
  MailOpen,
  Mail as MailUnread,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Star,
  Tag,
  Trash2,
} from 'lucide-react'
import { useMailStore } from '@/store/mail-store'
import { threadIsUnread } from '@/lib/mail-queries'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCard } from './message-card'
import { LabelChip, threadCustomLabelIds } from './label-chip'
import { LabelPickerMenu } from './label-picker-menu'
import { SnoozeMenu } from './snooze-menu'
import { cn } from '@/lib/utils'

export function ThreadView({ threadId }: { threadId: string }) {
  const thread = useMailStore((s) => s.threads.find((t) => t.id === threadId))
  const view = useMailStore((s) => s.view)
  const closeThread = useMailStore((s) => s.closeThread)
  const toggleStar = useMailStore((s) => s.toggleStar)
  const archiveThreads = useMailStore((s) => s.archiveThreads)
  const trashThreads = useMailStore((s) => s.trashThreads)
  const restoreFromTrash = useMailStore((s) => s.restoreFromTrash)
  const deleteForever = useMailStore((s) => s.deleteForever)
  const markSpam = useMailStore((s) => s.markSpam)
  const markNotSpam = useMailStore((s) => s.markNotSpam)
  const markRead = useMailStore((s) => s.markRead)
  const toggleImportant = useMailStore((s) => s.toggleImportant)
  const snoozeThreads = useMailStore((s) => s.snoozeThreads)
  const unsnooze = useMailStore((s) => s.unsnooze)

  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!thread) return
    const initial = new Set<string>()
    thread.messages.forEach((m, i) => {
      if (!m.isRead || i === thread.messages.length - 1) initial.add(m.id)
    })
    setExpanded(initial)
  }, [thread?.id])

  const customLabels = useMemo(() => (thread ? threadCustomLabelIds(thread.labelIds) : []), [thread])

  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        This conversation is no longer available.
      </div>
    )
  }

  const isTrash = view.kind === 'folder' && view.id === 'trash'
  const isSpam = view.kind === 'folder' && view.id === 'spam'
  const isSnoozed = thread.labelIds.includes('snoozed')
  const starred = thread.labelIds.includes('starred')
  const unread = threadIsUnread(thread)

  function toggleMessage(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-2 sm:px-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={closeThread} aria-label="Back to list">
              <ArrowLeft className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to inbox</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-6 w-px bg-border" />

        {isTrash ? (
          <>
            <HeaderIcon label="Move to Inbox" icon={Archive} onClick={() => restoreFromTrash([thread.id])} />
            <HeaderIcon label="Delete forever" icon={Trash2} onClick={() => deleteForever([thread.id])} />
          </>
        ) : isSpam ? (
          <>
            <HeaderIcon label="Not spam" icon={ShieldCheck} onClick={() => markNotSpam([thread.id])} />
            <HeaderIcon label="Delete forever" icon={Trash2} onClick={() => deleteForever([thread.id])} />
          </>
        ) : (
          <>
            <HeaderIcon label="Archive" icon={Archive} onClick={() => archiveThreads([thread.id])} />
            <HeaderIcon label="Delete" icon={Trash2} onClick={() => trashThreads([thread.id])} />
            <HeaderIcon
              label={unread ? 'Mark as read' : 'Mark as unread'}
              icon={unread ? MailOpen : MailUnread}
              onClick={() => markRead([thread.id], unread)}
            />
            {isSnoozed ? (
              <HeaderIcon label="Unsnooze" icon={BellOff} onClick={() => unsnooze([thread.id])} />
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <span>
                    <HeaderIcon label="Snooze" icon={Clock} onClick={() => {}} />
                  </span>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-2">
                  <SnoozeMenu onSnooze={(until) => snoozeThreads([thread.id], until)} />
                </PopoverContent>
              </Popover>
            )}
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreVertical className="size-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => toggleImportant(thread.id)}>
              <Tag />
              {thread.isImportant ? 'Mark as not important' : 'Mark as important'}
            </DropdownMenuItem>
            {!isSpam && !isTrash && (
              <DropdownMenuItem onClick={() => markSpam([thread.id])}>
                <ShieldAlert />
                Report spam
              </DropdownMenuItem>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-hover [&_svg]:size-4 [&_svg]:text-muted-foreground">
                  <Tag />
                  Label as
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" className="w-auto p-2">
                <LabelPickerMenu threadIds={[thread.id]} currentLabelIds={thread.labelIds} />
              </PopoverContent>
            </Popover>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => toggleStar(thread.id)}
          className="ml-auto rounded-full p-2 text-muted-foreground hover:bg-surface-hover"
          aria-label={starred ? 'Unstar' : 'Star'}
        >
          <Star className={cn('size-[18px]', starred && 'fill-star text-star')} />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-[820px] px-1 py-3 sm:px-4">
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
            <h1 className="text-[22px] font-normal text-foreground">{thread.subject || '(no subject)'}</h1>
            {thread.isImportant && <LabelChip labelId="important" />}
            {customLabels.map((id) => (
              <LabelChip key={id} labelId={id} />
            ))}
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {thread.messages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                threadId={thread.id}
                expanded={expanded.has(message.id)}
                onToggle={() => toggleMessage(message.id)}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function HeaderIcon({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: typeof Archive
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onClick} aria-label={label}>
          <Icon className="size-[18px]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
