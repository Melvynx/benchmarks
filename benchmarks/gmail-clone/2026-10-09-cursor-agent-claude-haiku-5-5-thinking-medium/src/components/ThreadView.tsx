import { useMemo, useState } from 'react'
import { Archive, ArrowLeft, ChevronDown, ChevronUp, Download, File, FileImage, FileSpreadsheet, FileText, Forward, Inbox, OctagonAlert, Paperclip, Printer, Reply, ReplyAll, Star, Trash2, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { useMailActions } from '../lib/actions'
import { computeView } from '../lib/view'
import { formatBytes, formatFull, formatListDate, threadMessages, snippetOf } from '../lib/mail'
import { LabelMenu, MoreMenu, ReadButton, SnoozeMenu } from './Actions'
import { Avatar, IconButton, cx } from './ui'
import type { Attachment, Message } from '../types'

export function ThreadView() {
  const { state, dispatch } = useStore()
  const { data, ui } = state
  const actions = useMailActions()
  const threadId = ui.threadId!
  const messages = threadMessages(data, threadId)

  const labelName = data.labels.find((l) => ui.folder === `label:${l.id}`)?.name
  const groups = useMemo(() => computeView(data, ui, labelName).groups.filter((g) => !g.messages.some((m) => m.folder === 'drafts')), [data, ui, labelName])

  // Start with the newest message open, plus any unread ones
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(messages.filter((m, i) => i === messages.length - 1 || !m.read).map((m) => m.id)))

  const close = () => dispatch({ type: 'openThread', threadId: null })

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-ink-3">
        <div className="text-center">
          <Inbox className="mx-auto mb-3" size={40} />
          <p>This conversation is no longer available.</p>
          <button type="button" onClick={close} className="mt-3 text-accent">Back to list</button>
        </div>
      </div>
    )
  }

  const inView = actions.scopeFor(threadId)
  const subject = messages[0].subject
  const last = messages[messages.length - 1]
  const labels = [...new Set(messages.flatMap((m) => m.labels))].map((id) => data.labels.find((l) => l.id === id)).filter(Boolean)
  const folder = ui.folder
  const gIndex = groups.findIndex((g) => g.threadId === threadId)
  const prev = gIndex > 0 ? groups[gIndex - 1] : null
  const next = gIndex >= 0 && gIndex < groups.length - 1 ? groups[gIndex + 1] : null
  const pane = data.settings.readingPane

  const after = (fn: () => void) => () => {
    fn()
    close()
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Conversation">
      <div className="flex h-12 shrink-0 items-center gap-0.5 border-b border-line px-2 md:px-3">
        <IconButton title="Back to list" size="sm" onClick={close} className={pane === 'right' ? 'md:hidden' : ''}>
          <ArrowLeft size={18} />
        </IconButton>
        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <IconButton title="Archive (e)" size="sm" disabled={!inView.length} onClick={after(() => actions.archive(inView))}>
          <Archive size={18} />
        </IconButton>
        <IconButton title="Report spam (!)" size="sm" disabled={!inView.length} onClick={after(() => actions.move(inView, 'spam', 'Moved to Spam'))}>
          <OctagonAlert size={18} />
        </IconButton>
        <IconButton title={folder === 'trash' ? 'Delete forever (#)' : 'Delete (#)'} size="sm" disabled={!inView.length} onClick={after(() => actions.trash(inView))}>
          <Trash2 size={18} />
        </IconButton>
        <ReadButton ids={inView} size="sm" />
        <SnoozeMenu ids={inView} size="sm" />
        <LabelMenu ids={inView} size="sm" />
        <MoreMenu ids={inView} folder={folder} size="sm" />
        <IconButton title="Print conversation" size="sm" className="hidden md:inline-flex" onClick={() => window.print()}>
          <Printer size={18} />
        </IconButton>
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton title="Newer conversation (k)" size="sm" disabled={!prev} onClick={() => prev && actions.openThread(prev.threadId)}>
            <ChevronUp size={18} />
          </IconButton>
          <IconButton title="Older conversation (j)" size="sm" disabled={!next} onClick={() => next && actions.openThread(next.threadId)}>
            <ChevronDown size={18} />
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[860px] px-4 pb-8 pt-5 md:px-8">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-normal leading-tight text-ink md:text-[24px]">{subject}</h1>
            <span className="rounded bg-hover px-2 py-0.5 text-[12px] text-ink-2">{folderLabel(folder)}</span>
            {labels.map((l) => (
              <span
                key={l!.id}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[12px] font-medium"
                style={{ background: `color-mix(in srgb, ${l!.color} 16%, transparent)`, color: l!.color }}
              >
                {l!.name}
                <button type="button" aria-label={`Remove ${l!.name}`} onClick={() => actions.label(inView, l!.id, false)} className="rounded-full hover:bg-black/10">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <div className="space-y-3">
            {messages.map((m, i) => (
              <MessageCard
                key={m.id}
                message={m}
                isOpen={expanded.has(m.id)}
                onToggle={() => toggle(m.id)}
                isLast={i === messages.length - 1}
                meEmail={data.me.email}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => actions.openCompose('reply', last)}
              className="flex h-9 items-center gap-2 rounded-full border border-line px-5 text-[13px] font-medium text-ink hover:bg-hover"
            >
              <Reply size={16} /> Reply
            </button>
            <button
              type="button"
              onClick={() => actions.openCompose('replyAll', last)}
              className="flex h-9 items-center gap-2 rounded-full border border-line px-5 text-[13px] font-medium text-ink hover:bg-hover"
            >
              <ReplyAll size={16} /> Reply all
            </button>
            <button
              type="button"
              onClick={() => actions.openCompose('forward', last)}
              className="flex h-9 items-center gap-2 rounded-full border border-line px-5 text-[13px] font-medium text-ink hover:bg-hover"
            >
              <Forward size={16} /> Forward
            </button>
          </div>
          <button
            type="button"
            onClick={() => actions.openCompose('reply', last)}
            className="mt-3 block w-full rounded-2xl border border-line px-4 py-3 text-left text-[14px] text-ink-3 hover:shadow-md"
          >
            Click here to reply
          </button>
        </div>
      </div>
    </div>
  )
}

function folderLabel(folder: string) {
  const map: Record<string, string> = { inbox: 'Inbox', sent: 'Sent', archive: 'All Mail', spam: 'Spam', trash: 'Trash', all: 'All Mail', starred: 'Starred', snoozed: 'Snoozed', drafts: 'Drafts', scheduled: 'Scheduled' }
  return map[folder] ?? folder
}

function MessageCard({
  message: m,
  isOpen,
  onToggle,
  isLast,
  meEmail,
}: {
  message: Message
  isOpen: boolean
  onToggle: () => void
  isLast: boolean
  meEmail: string
}) {
  const { state } = useStore()
  const { toggleStar, openCompose } = useMailActions()
  const [details, setDetails] = useState(false)
  const fromMe = m.from.email === meEmail
  const toText = m.to.map((c) => (c.email === meEmail ? 'me' : c.name)).join(', ')

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cx('flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left transition hover:shadow-md', isLast && 'opacity-100')}
      >
        <Avatar name={m.from.name} email={m.from.email} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cx('truncate text-[14px]', !m.read ? 'font-semibold text-ink' : 'text-ink')}>{fromMe ? 'me' : m.from.name}</span>
            <span className="truncate text-[12px] text-ink-3">{snippetOf(m)}</span>
          </div>
        </div>
        {m.attachments.length > 0 && <Paperclip size={15} className="text-ink-3" />}
        <span className="shrink-0 text-[12px] text-ink-3">{formatListDate(m.date, state.ui.now)}</span>
      </button>
    )
  }

  return (
    <article className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <header className="flex items-start gap-3 px-4 pb-2 pt-4 md:px-5">
        <Avatar name={m.from.name} email={m.from.email} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <button type="button" onClick={onToggle} className="font-semibold text-ink hover:underline">
              {fromMe ? 'Me' : m.from.name}
            </button>
            <span className="truncate text-[12px] text-ink-3">&lt;{m.from.email}&gt;</span>
          </div>
          <button type="button" onClick={() => setDetails((d) => !d)} className="text-left text-[12px] text-ink-3 hover:text-ink-2">
            to {toText || '(no recipients)'}
            {m.cc.length > 0 && <span> · cc {m.cc.map((c) => c.name).join(', ')}</span>}
            <ChevronDown size={12} className={cx('ml-1 inline transition', details && 'rotate-180')} />
          </button>
          {details && (
            <div className="mt-2 grid grid-cols-[52px_1fr] gap-x-3 gap-y-1 text-[12px] text-ink-2">
              <span className="text-ink-3">From</span>
              <span>{m.from.name} &lt;{m.from.email}&gt;</span>
              <span className="text-ink-3">To</span>
              <span>{m.to.map((c) => `${c.name} <${c.email}>`).join(', ') || '—'}</span>
              {m.cc.length > 0 && (
                <>
                  <span className="text-ink-3">Cc</span>
                  <span>{m.cc.map((c) => `${c.name} <${c.email}>`).join(', ')}</span>
                </>
              )}
              <span className="text-ink-3">Date</span>
              <span>{formatFull(m.date)}</span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="mr-2 hidden whitespace-nowrap pt-2 text-[12px] text-ink-3 sm:inline">{formatListDate(m.date, state.ui.now)}</span>
          <IconButton title={m.starred ? 'Unstar' : 'Star'} size="sm" onClick={() => toggleStar([m.id])}>
            <Star size={18} className={cx(m.starred && 'fill-[#f9ab00] text-[#f9ab00]')} />
          </IconButton>
          <IconButton title="Reply" size="sm" onClick={() => openCompose('reply', m)}>
            <Reply size={18} />
          </IconButton>
          <IconButton title="Forward" size="sm" onClick={() => openCompose('forward', m)}>
            <Forward size={18} />
          </IconButton>
        </div>
      </header>
      <div className="px-4 pb-4 pt-2 text-[14px] md:px-5 md:pl-[68px]">
        <div className="msg-body text-ink" dangerouslySetInnerHTML={{ __html: m.body }} />
        {m.attachments.length > 0 && <Attachments items={m.attachments} messageId={m.id} />}
        {!isLast && (
          <button type="button" onClick={onToggle} className="mt-3 text-[12px] text-ink-3 hover:text-ink-2">
            Collapse
          </button>
        )}
      </div>
    </article>
  )
}

function Attachments({ items, messageId }: { items: Attachment[]; messageId: string }) {
  const { toast } = useMailActions()
  const download = (a: Attachment) => {
    const blob = new Blob([`Local demo copy of ${a.name} (${formatBytes(a.size)})\nFrom message ${messageId}\n`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = a.name.replace(/\.(\w+)$/, '.txt')
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast(`Downloaded ${a.name}`)
  }
  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="mb-2 text-[12px] text-ink-3">{items.length} attachment{items.length > 1 ? 's' : ''}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((a) => {
          const Icon = a.kind === 'image' ? FileImage : a.kind === 'sheet' ? FileSpreadsheet : a.kind === 'pdf' || a.kind === 'doc' ? FileText : File
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => download(a)}
              className="group flex w-56 items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-left hover:bg-hover"
            >
              <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', a.kind === 'pdf' ? 'bg-[#fce8e6] text-[#c5221f]' : a.kind === 'sheet' ? 'bg-[#e6f4ea] text-[#188038]' : a.kind === 'image' ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'bg-[#e8f0fe] text-[#1a73e8]')}>
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{a.name}</span>
                <span className="text-[11px] text-ink-3">{formatBytes(a.size)}</span>
              </span>
              <Download size={16} className="shrink-0 text-ink-3 opacity-0 transition group-hover:opacity-100" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
