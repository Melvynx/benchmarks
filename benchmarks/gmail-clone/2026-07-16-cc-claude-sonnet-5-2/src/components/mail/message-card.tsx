import { Forward, MoreVertical, Reply, ReplyAll } from 'lucide-react'
import type { Message } from '@/lib/types'
import { useMailStore } from '@/store/mail-store'
import { formatFullDate, formatListDate, initialsFor } from '@/lib/format'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AttachmentChip } from './attachment-chip'
import { RichText } from '@/lib/rich-text'
import { cn } from '@/lib/utils'

export function MessageCard({
  message,
  threadId,
  expanded,
  onToggle,
}: {
  message: Message
  threadId: string
  expanded: boolean
  onToggle: () => void
}) {
  const openCompose = useMailStore((s) => s.openCompose)
  const canReplyAll = message.to.length + (message.cc?.length ?? 0) > 1

  if (!expanded) {
    return (
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-hover"
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="text-xs" style={{ backgroundColor: message.from.color }}>
            {initialsFor(message.from.name)}
          </AvatarFallback>
        </Avatar>
        <span className={cn('shrink-0 text-[13px]', !message.isRead ? 'font-semibold' : '')}>
          {message.from.name}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{message.snippet}</span>
        <span className="shrink-0 text-[12px] text-muted-foreground">{formatListDate(message.date)}</span>
      </button>
    )
  }

  return (
    <div className="px-5 py-5">
      <div className="mb-4 flex items-start gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback style={{ backgroundColor: message.from.color }}>
            {initialsFor(message.from.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <button onClick={onToggle} className="text-left">
              <span className="text-[13px] font-semibold text-foreground">{message.from.name}</span>{' '}
              <span className="text-[12px] text-muted-foreground">&lt;{message.from.email}&gt;</span>
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[12px] text-muted-foreground">{formatFullDate(message.date)}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full p-1 text-muted-foreground hover:bg-surface-hover" aria-label="Message actions">
                    <MoreVertical className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      openCompose('reply', { threadId, inReplyToMessageId: message.id })
                    }
                  >
                    <Reply />
                    Reply
                  </DropdownMenuItem>
                  {canReplyAll && (
                    <DropdownMenuItem
                      onClick={() =>
                        openCompose('reply-all', { threadId, inReplyToMessageId: message.id })
                      }
                    >
                      <ReplyAll />
                      Reply all
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() =>
                      openCompose('forward', { threadId, inReplyToMessageId: message.id })
                    }
                  >
                    <Forward />
                    Forward
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="truncate text-[12px] text-muted-foreground">
            to {message.to.map((c) => c.name).join(', ') || 'me'}
            {message.cc?.length ? `, cc: ${message.cc.map((c) => c.name).join(', ')}` : ''}
          </p>
        </div>
      </div>

      <div className="pl-12 text-[14px] leading-relaxed text-foreground">
        <RichText text={message.bodyText} />
      </div>

      {message.attachments.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 pl-12">
          {message.attachments.map((a) => (
            <AttachmentChip key={a.id} attachment={a} />
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2 pl-12">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => openCompose('reply', { threadId, inReplyToMessageId: message.id })}
        >
          <Reply className="size-3.5" />
          Reply
        </Button>
        {canReplyAll && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => openCompose('reply-all', { threadId, inReplyToMessageId: message.id })}
          >
            <ReplyAll className="size-3.5" />
            Reply all
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => openCompose('forward', { threadId, inReplyToMessageId: message.id })}
        >
          <Forward className="size-3.5" />
          Forward
        </Button>
      </div>
    </div>
  )
}
