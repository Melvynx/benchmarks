import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Ban,
  ChevronLeft,
  ChevronRight,
  Clock,
  EllipsisVertical,
  FolderInput,
  Inbox,
  Mail,
  Printer,
  ShieldOff,
  Star,
  Tag,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useMailActions } from '@/hooks/use-mail-actions'
import type { ThreadSummary } from '@/lib/selectors'
import type { ComposeMode } from '@/lib/types'
import { cn, formatFuture, pluralize } from '@/lib/utils'
import { useCompose } from '@/store/compose'
import { useMail } from '@/store/mail-store'
import type { Route } from '@/store/router'
import { useSettings } from '@/store/settings'
import { Button, IconButton } from './ui/bits'
import { Menu } from './ui/popover'
import { LabelMenu } from './label-menu'
import { MessageItem } from './message-item'
import { SnoozeMenu } from './snooze-menu'
import { LabelChip } from './thread-row'

interface ThreadViewProps {
  summary: ThreadSummary
  route: Route
  navigate: (r: Route) => void
  now: number
  onBack: () => void
  onPrev?: () => void
  onNext?: () => void
  position?: { index: number; total: number }
}

export function ThreadView({
  summary,
  route,
  navigate,
  now,
  onBack,
  onPrev,
  onNext,
  position,
}: ThreadViewProps) {
  const { data } = useMail()
  const { settings } = useSettings()
  const actions = useMailActions()
  const compose = useCompose()
  const thread = data.threads[summary.id]

  const moreRef = useRef<HTMLButtonElement>(null)
  const moveRef = useRef<HTMLButtonElement>(null)
  const labelRef = useRef<HTMLButtonElement>(null)
  const snoozeRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState<'more' | 'move' | 'label' | 'snooze' | null>(null)
  const close = () => setOpen(null)

  const inTrash = route.view === 'trash'
  const inSpam = route.view === 'spam'

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  // Opening a thread expands the tail (and anything unread), and marks it read.
  useEffect(() => {
    const msgs = summary.messages
    const next = new Set<string>()
    for (const m of msgs) if (!m.read || m.scheduledFor) next.add(m.id)
    if (msgs.length) next.add(msgs[msgs.length - 1].id)
    setExpanded(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.id])

  const unreadIds = useMemo(
    () => summary.messages.filter((m) => !m.read).map((m) => m.id),
    [summary.messages],
  )

  useEffect(() => {
    if (!unreadIds.length) return
    const t = window.setTimeout(() => {
      unreadIds.forEach((id) => actions.markMessageRead(id, true))
    }, settings.markAsReadDelayMs)
    return () => window.clearTimeout(t)
  }, [unreadIds, actions, settings.markAsReadDelayMs])

  const allExpanded = !settings.conversationView
  const isExpanded = (id: string) => allExpanded || expanded.has(id)

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const reply = (mode: ComposeMode, messageId?: string) => {
    if (!thread) return
    const m = messageId
      ? summary.messages.find((x) => x.id === messageId)
      : summary.messages[summary.messages.length - 1]
    if (m) compose.openReply(thread, m, mode)
  }

  const afterMutation = () => onBack()

  const scheduled = summary.messages.find((m) => m.scheduledFor)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface sm:rounded-2xl">
      <div className="flex h-12 shrink-0 items-center gap-0.5 px-1 sm:px-2">
        <IconButton label="Back to list" shortcut="U" onClick={onBack}>
          <ArrowLeft />
        </IconButton>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        {inTrash ? (
          <IconButton
            label="Move to inbox"
            onClick={() => {
              actions.untrash([summary.id])
              afterMutation()
            }}
          >
            <ArchiveRestore />
          </IconButton>
        ) : (
          <IconButton
            label="Archive"
            shortcut="E"
            onClick={() => {
              actions.archive([summary.id])
              afterMutation()
            }}
          >
            <Archive />
          </IconButton>
        )}
        {inSpam ? (
          <IconButton
            label="Not spam"
            onClick={() => {
              actions.notSpam([summary.id])
              afterMutation()
            }}
          >
            <ShieldOff />
          </IconButton>
        ) : (
          <IconButton
            label="Report spam"
            onClick={() => {
              actions.markSpam([summary.id])
              afterMutation()
            }}
          >
            <Ban />
          </IconButton>
        )}
        <IconButton
          label={inTrash ? 'Delete forever' : 'Delete'}
          shortcut="#"
          onClick={() => {
            if (inTrash) actions.deleteForever([summary.id])
            else actions.trash([summary.id])
            afterMutation()
          }}
        >
          <Trash2 />
        </IconButton>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <IconButton
          label="Mark as unread"
          className="hidden sm:inline-flex"
          onClick={() => {
            actions.setRead([summary.id], false)
            afterMutation()
          }}
        >
          <Mail />
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
        <IconButton
          ref={moreRef}
          label="More"
          active={open === 'more'}
          onClick={() => setOpen(open === 'more' ? null : 'more')}
        >
          <EllipsisVertical />
        </IconButton>

        <div className="ml-auto flex items-center gap-0.5">
          {position && (
            <span className="hidden px-2 text-[12px] tabular-nums text-ink-3 lg:block">
              {position.index} of {position.total}
            </span>
          )}
          <IconButton label="Newer" size="sm" disabled={!onPrev} onClick={() => onPrev?.()}>
            <ChevronLeft />
          </IconButton>
          <IconButton label="Older" size="sm" disabled={!onNext} onClick={() => onNext?.()}>
            <ChevronRight />
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <header className="flex items-start gap-3 px-3 pb-4 pt-3 sm:px-6">
          <h2 className="min-w-0 flex-1 text-[20px] font-normal leading-8 text-ink sm:text-[22px]">
            {summary.subject || '(no subject)'}
            {summary.count > 1 && (
              <span className="ml-2 text-[14px] text-ink-4">{summary.count}</span>
            )}
          </h2>
          <div className="flex shrink-0 items-center gap-0.5 pt-1">
            {summary.userLabels.map((l) => (
              <span key={l.id} className="hidden sm:block">
                <LabelChip name={l.name} bg={l.color.bg} fg={l.color.fg} />
              </span>
            ))}
            <IconButton
              label={summary.starred ? 'Remove star' : 'Add star'}
              shortcut="S"
              size="sm"
              onClick={() => actions.setStarred([summary.id], !summary.starred)}
            >
              <Star className={cn(summary.starred && 'fill-star text-star')} />
            </IconButton>
            <IconButton label="Print" size="sm" className="hidden sm:inline-flex" onClick={() => window.print()}>
              <Printer />
            </IconButton>
          </div>
        </header>

        {scheduled && (
          <Banner tone="warn">
            <span>
              This message is scheduled to be sent {formatFuture(scheduled.scheduledFor!, new Date(now))}.
            </span>
            <Button
              variant="text"
              onClick={() => {
                const draftId = actions.cancelScheduled(scheduled.id)
                if (draftId) compose.openDraft(draftId)
              }}
            >
              Cancel send
            </Button>
          </Banner>
        )}

        {summary.snoozedUntil && Date.parse(summary.snoozedUntil) > now && (
          <Banner tone="info">
            <span>Snoozed until {formatFuture(summary.snoozedUntil, new Date(now))}.</span>
            <Button variant="text" onClick={() => actions.unsnooze([summary.id])}>
              Unsnooze
            </Button>
          </Banner>
        )}

        {thread?.muted && (
          <Banner tone="info">
            <span>This conversation is muted — new replies skip the inbox.</span>
            <Button variant="text" onClick={() => actions.setMuted([summary.id], false)}>
              Unmute
            </Button>
          </Banner>
        )}

        {inSpam && (
          <Banner tone="danger">
            <span>
              Why is this message in Spam? It looks similar to other messages that were identified as
              spam.
            </span>
            <Button
              variant="text"
              onClick={() => {
                actions.notSpam([summary.id])
                afterMutation()
              }}
            >
              Not spam
            </Button>
          </Banner>
        )}

        {summary.count > 3 && settings.conversationView && (
          <div className="px-3 pb-1 sm:px-6">
            <button
              type="button"
              onClick={() =>
                setExpanded((prev) =>
                  prev.size >= summary.count
                    ? new Set([summary.messages[summary.count - 1].id])
                    : new Set(summary.messages.map((m) => m.id)),
                )
              }
              className="text-[12px] text-accent-ink hover:underline"
            >
              {expanded.size >= summary.count
                ? 'Collapse all'
                : `Expand all ${pluralize(summary.count, 'message')}`}
            </button>
          </div>
        )}

        <div className="border-t border-line-soft">
          {summary.messages.map((m, i) => (
            <MessageItem
              key={m.id}
              message={m}
              expanded={isExpanded(m.id)}
              onToggle={() => toggle(m.id)}
              onReply={(mode) => reply(mode, m.id)}
              now={now}
              isLast={i === summary.messages.length - 1}
            />
          ))}
        </div>

        <footer className="px-3 py-8 text-center text-[12px] text-ink-4 sm:px-6">
          {pluralize(summary.count, 'message')} in this conversation
        </footer>
      </div>

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
            onSelect: () => {
              actions.moveToInbox([summary.id])
              afterMutation()
            },
          },
          {
            id: 'spam',
            label: 'Spam',
            icon: <Ban />,
            onSelect: () => {
              actions.markSpam([summary.id])
              afterMutation()
            },
          },
          {
            id: 'trash',
            label: 'Trash',
            icon: <Trash2 />,
            onSelect: () => {
              actions.trash([summary.id])
              afterMutation()
            },
          },
        ]}
      />
      <LabelMenu
        anchorRef={labelRef}
        open={open === 'label'}
        onClose={close}
        threadIds={[summary.id]}
      />
      <SnoozeMenu
        anchorRef={snoozeRef}
        open={open === 'snooze'}
        onClose={close}
        onPick={(iso, human) => {
          actions.snooze([summary.id], iso, human)
          afterMutation()
        }}
      />
      <Menu
        anchorRef={moreRef}
        open={open === 'more'}
        onClose={close}
        align="end"
        ariaLabel="More actions"
        entries={[
          {
            id: 'unread',
            label: 'Mark as unread',
            icon: <Mail />,
            onSelect: () => {
              actions.setRead([summary.id], false)
              afterMutation()
            },
          },
          {
            id: 'important',
            label: summary.important ? 'Mark as not important' : 'Mark as important',
            onSelect: () => actions.setImportant([summary.id], !summary.important),
          },
          {
            id: 'mute',
            label: thread?.muted ? 'Unmute' : 'Mute',
            icon: thread?.muted ? <Volume2 /> : <VolumeX />,
            onSelect: () => actions.setMuted([summary.id], !thread?.muted),
          },
          { type: 'separator', id: 's1' },
          {
            id: 'labelmobile',
            label: 'Label as…',
            icon: <Tag />,
            onSelect: () => setOpen('label'),
          },
          {
            id: 'snoozemobile',
            label: 'Snooze…',
            icon: <Clock />,
            onSelect: () => setOpen('snooze'),
          },
          { type: 'separator', id: 's2' },
          {
            id: 'find',
            label: 'Find emails from this sender',
            onSelect: () => {
              const from = summary.messages.find((m) => !m.outgoing)?.from.email
              if (from) navigate({ view: 'all', search: `from:${from}` })
            },
          },
          { id: 'print', label: 'Print all', icon: <Printer />, onSelect: () => window.print() },
        ]}
      />
    </div>
  )
}

function Banner({
  tone,
  children,
}: {
  tone: 'info' | 'warn' | 'danger'
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'mx-3 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-[13px] sm:mx-6',
        tone === 'info' && 'bg-accent-soft text-accent-ink',
        tone === 'warn' && 'bg-important/12 text-important',
        tone === 'danger' && 'bg-danger/10 text-danger',
      )}
    >
      {children}
    </div>
  )
}
