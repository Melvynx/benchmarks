import { useRef, useState } from 'react'
import {
  ChevronDown,
  CornerUpLeft,
  CornerUpRight,
  EllipsisVertical,
  Printer,
  Star,
  Trash2,
} from 'lucide-react'
import { useMailActions } from '@/hooks/use-mail-actions'
import type { Message } from '@/lib/types'
import {
  cn,
  displayName,
  formatFullDate,
  formatMessageDate,
  formatRelative,
  htmlToText,
  truncate,
} from '@/lib/utils'
import { useMail } from '@/store/mail-store'
import { Avatar, IconButton } from './ui/bits'
import { Menu, Popover } from './ui/popover'
import { AttachmentCard } from './attachments'

interface MessageItemProps {
  message: Message
  expanded: boolean
  onToggle: () => void
  onReply: (mode: 'reply' | 'replyAll' | 'forward') => void
  now: number
  /** Last message in the thread gets the reply buttons below it. */
  isLast: boolean
}

export function MessageItem({
  message: m,
  expanded,
  onToggle,
  onReply,
  now,
  isLast,
}: MessageItemProps) {
  const { data } = useMail()
  const actions = useMailActions()
  const me = data.account.email
  const detailsRef = useRef<HTMLButtonElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const [details, setDetails] = useState(false)
  const [more, setMore] = useState(false)
  const [showQuoted, setShowQuoted] = useState(false)

  const recipients = [...m.to, ...m.cc]
  const toLine = recipients.length
    ? `to ${recipients.map((a) => displayName(a, me)).join(', ')}`
    : 'to (no recipients)'

  if (!expanded) {
    return (
      <article
        className={cn(
          'group flex cursor-pointer items-center gap-3 border-b border-line-soft px-3 py-3 transition-colors hover:bg-surface-2 sm:px-6',
          !m.read && 'font-medium',
        )}
        onClick={onToggle}
      >
        <Avatar name={m.from.name} email={m.from.email} size={32} className="hidden sm:inline-flex" />
        <span className="w-[8rem] shrink-0 truncate text-[14px] text-ink sm:w-[10rem]">
          {displayName(m.from, me)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-normal text-ink-3">
          {truncate(htmlToText(m.bodyHtml), 160)}
        </span>
        {m.attachments.length > 0 && (
          <span className="hidden shrink-0 text-[12px] text-ink-4 sm:block">
            {m.attachments.length} file{m.attachments.length > 1 ? 's' : ''}
          </span>
        )}
        <span className="shrink-0 text-[12px] font-normal text-ink-3">
          {formatMessageDate(m.date, new Date(now))}
        </span>
      </article>
    )
  }

  return (
    <article className="border-b border-line-soft px-3 pb-5 pt-4 last:border-b-0 sm:px-6">
      <header className="flex items-start gap-3">
        <Avatar name={m.from.name} email={m.from.email} size={40} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <button
              type="button"
              onClick={onToggle}
              className="truncate text-[14px] font-semibold text-ink"
            >
              {m.outgoing ? 'me' : m.from.name || m.from.email}
            </button>
            <span className="truncate text-[12px] text-ink-3">
              &lt;{m.from.email}&gt;
            </span>
          </div>
          <button
            ref={detailsRef}
            type="button"
            onClick={() => setDetails((v) => !v)}
            className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
          >
            <span className="max-w-[60vw] truncate">{toLine}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <span
            className="hidden text-[12px] text-ink-3 sm:block"
            title={formatFullDate(m.date)}
          >
            {formatMessageDate(m.date, new Date(now))}{' '}
            <span className="text-ink-4">({formatRelative(m.date, new Date(now))})</span>
          </span>
          <IconButton
            label={m.starred ? 'Remove star' : 'Add star'}
            size="sm"
            onClick={() => actions.toggleMessageStar(m.id)}
          >
            <Star className={cn(m.starred && 'fill-star text-star')} />
          </IconButton>
          <IconButton label="Reply" size="sm" onClick={() => onReply('reply')}>
            <CornerUpLeft />
          </IconButton>
          <IconButton
            ref={moreRef}
            label="More"
            size="sm"
            active={more}
            onClick={() => setMore((v) => !v)}
          >
            <EllipsisVertical />
          </IconButton>
        </div>
      </header>

      <div className="mt-3 sm:pl-[52px]">
        <MessageBody html={m.bodyHtml} showQuoted={showQuoted} onShowQuoted={() => setShowQuoted(true)} />

        {m.attachments.length > 0 && (
          <div className="mt-5 border-t border-line-soft pt-4">
            <p className="mb-2 text-[12px] text-ink-3">
              {m.attachments.length} attachment{m.attachments.length > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-3">
              {m.attachments.map((a) => (
                <AttachmentCard key={a.id} attachment={a} />
              ))}
            </div>
          </div>
        )}

        {isLast && (
          <div className="mt-5 flex flex-wrap gap-2">
            <ReplyButton icon={<CornerUpLeft />} label="Reply" onClick={() => onReply('reply')} />
            {recipients.length > 1 && (
              <ReplyButton
                icon={<CornerUpLeft />}
                label="Reply all"
                onClick={() => onReply('replyAll')}
              />
            )}
            <ReplyButton
              icon={<CornerUpRight />}
              label="Forward"
              onClick={() => onReply('forward')}
            />
          </div>
        )}
      </div>

      <Popover
        anchorRef={detailsRef}
        open={details}
        onClose={() => setDetails(false)}
        role="dialog"
        ariaLabel="Message details"
        className="max-w-[min(28rem,92vw)] px-4 py-3"
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-right text-ink-3">from:</dt>
          <dd className="text-ink">
            {m.from.name} &lt;{m.from.email}&gt;
          </dd>
          <dt className="text-right text-ink-3">to:</dt>
          <dd className="text-ink">{m.to.map((a) => a.email).join(', ') || '—'}</dd>
          {m.cc.length > 0 && (
            <>
              <dt className="text-right text-ink-3">cc:</dt>
              <dd className="text-ink">{m.cc.map((a) => a.email).join(', ')}</dd>
            </>
          )}
          {m.bcc.length > 0 && (
            <>
              <dt className="text-right text-ink-3">bcc:</dt>
              <dd className="text-ink">{m.bcc.map((a) => a.email).join(', ')}</dd>
            </>
          )}
          <dt className="text-right text-ink-3">date:</dt>
          <dd className="text-ink">{formatFullDate(m.date)}</dd>
          <dt className="text-right text-ink-3">mailed-by:</dt>
          <dd className="text-ink">{m.from.email.split('@')[1]}</dd>
        </dl>
      </Popover>

      <Menu
        anchorRef={moreRef}
        open={more}
        onClose={() => setMore(false)}
        align="end"
        ariaLabel="Message actions"
        entries={[
          { id: 'reply', label: 'Reply', icon: <CornerUpLeft />, onSelect: () => onReply('reply') },
          {
            id: 'replyall',
            label: 'Reply all',
            icon: <CornerUpLeft />,
            onSelect: () => onReply('replyAll'),
          },
          {
            id: 'forward',
            label: 'Forward',
            icon: <CornerUpRight />,
            onSelect: () => onReply('forward'),
          },
          { type: 'separator', id: 's1' },
          {
            id: 'unread',
            label: 'Mark unread from here',
            onSelect: () => actions.markMessageRead(m.id, false),
          },
          {
            id: 'star',
            label: m.starred ? 'Remove star' : 'Add star',
            onSelect: () => actions.toggleMessageStar(m.id),
          },
          { type: 'separator', id: 's2' },
          { id: 'print', label: 'Print', icon: <Printer />, onSelect: () => window.print() },
          {
            id: 'delete',
            label: 'Delete this message',
            icon: <Trash2 />,
            danger: true,
            onSelect: () => actions.trash([m.threadId]),
          },
        ]}
      />
    </article>
  )
}

function ReplyButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink [&_svg]:h-[18px] [&_svg]:w-[18px]"
    >
      {icon}
      {label}
    </button>
  )
}

function MessageBody({
  html,
  showQuoted,
  onShowQuoted,
}: {
  html: string
  showQuoted: boolean
  onShowQuoted: () => void
}) {
  const hasQuote = html.includes('class="quoted"')
  const visible = hasQuote && !showQuoted ? html.replace(/<div class="quoted">[\s\S]*$/, '') : html

  return (
    <div>
      <div className="mail-body text-[14px] leading-[1.6] text-ink" dangerouslySetInnerHTML={{ __html: visible }} />
      {hasQuote && !showQuoted && (
        <button
          type="button"
          onClick={onShowQuoted}
          aria-label="Show trimmed content"
          className="mt-2 inline-flex h-5 items-center rounded bg-surface-3 px-2 text-[13px] font-bold leading-none text-ink-3 hover:bg-line"
        >
          ···
        </button>
      )}
    </div>
  )
}
