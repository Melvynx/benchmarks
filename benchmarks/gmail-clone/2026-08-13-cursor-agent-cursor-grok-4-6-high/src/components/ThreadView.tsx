import { useMemo, useState } from 'react'
import { contactByEmail } from '../lib/contacts'
import { formatBytes, formatFullDate, quoteHtml } from '../lib/format'
import { messagesOf } from '../lib/search'
import { forwardCompose, replyCompose, useDispatch, useIndex, useStore } from '../lib/store'
import { SYS, type Attachment, type Message, type Thread } from '../lib/types'
import { Icon, type IconName } from './Icon'
import { Avatar, IconButton, MenuButton, MenuItem } from './ui'

const ATT_ICON: Record<Attachment['kind'], IconName> = {
  pdf: 'pdf',
  image: 'image',
  doc: 'doc',
  sheet: 'sheet',
  slide: 'doc',
  zip: 'zip',
  code: 'code',
  video: 'video',
}

export function ThreadView({ thread, onBack }: { thread: Thread; onBack: () => void }) {
  const store = useStore()
  const dispatch = useDispatch()
  const index = useIndex()
  const msgs = messagesOf(index, thread)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([msgs[msgs.length - 1]?.id ?? '']))
  const conversation = store.settings.conversationView

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const printThread = () => window.print()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="no-print flex h-12 flex-none items-center gap-0.5 px-1 sm:px-2">
        <IconButton icon="chevronLeft" tip="Back to list" onClick={onBack} />
        <IconButton icon="archive" tip="Archive" onClick={() => { dispatch({ t: 'archive', ids: [thread.id] }); onBack() }} />
        <IconButton icon="spam" tip="Report spam" onClick={() => { dispatch({ t: 'spam', ids: [thread.id] }); onBack() }} />
        <IconButton
          icon="trash"
          tip="Delete"
          onClick={() => {
            dispatch({ t: 'trash', ids: [thread.id] })
            onBack()
          }}
        />
        <IconButton
          icon="markunread"
          tip="Mark as unread"
          onClick={() => dispatch({ t: 'markRead', ids: [thread.id], unread: true })}
        />
        <IconButton
          icon={thread.labels.includes(SYS.STARRED) ? 'star' : 'starOutline'}
          tip="Star"
          onClick={() => dispatch({ t: 'star', ids: [thread.id], starred: !thread.labels.includes(SYS.STARRED) })}
        />
        <IconButton icon="print" tip="Print" onClick={printThread} className="hidden sm:grid" />
        <MenuButton tip="More">
          {(close) => (
            <>
              <MenuItem icon="reply" onClick={() => { const last = msgs[msgs.length - 1]; if (last) dispatch({ t: 'openCompose', compose: replyCompose(thread, last, false) }); close() }}>
                Reply
              </MenuItem>
              <MenuItem icon="replyAll" onClick={() => { const last = msgs[msgs.length - 1]; if (last) dispatch({ t: 'openCompose', compose: replyCompose(thread, last, true) }); close() }}>
                Reply all
              </MenuItem>
              <MenuItem icon="forward" onClick={() => { const last = msgs[msgs.length - 1]; if (last) dispatch({ t: 'openCompose', compose: forwardCompose(thread, last) }); close() }}>
                Forward
              </MenuItem>
            </>
          )}
        </MenuButton>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto px-3 pb-24 sm:px-8">
        <h1 className="flex items-start gap-3 py-4 text-[22px] font-normal tracking-[-0.2px]">
          <span className="min-w-0 flex-1">{thread.subject}</span>
          <div className="flex flex-wrap gap-1 pt-1">
            {store.labels
              .filter((l) => thread.labels.includes(l.id))
              .map((l) => (
                <span key={l.id} className="rounded px-1.5 py-0.5 text-[11px] font-medium text-panel" style={{ background: l.color }}>
                  {l.name}
                </span>
              ))}
          </div>
        </h1>

        {(conversation ? msgs : msgs.slice(-1)).map((m, i, arr) => {
          const open = !conversation || expanded.has(m.id) || arr.length === 1
          const collapsedMiddle = conversation && arr.length > 3 && i > 0 && i < arr.length - 1 && !expanded.has(m.id)
          if (collapsedMiddle && i !== 1) return null
          if (collapsedMiddle && i === 1) {
            const hidden = arr.length - 2
            return (
              <button
                key="expand-middle"
                type="button"
                className="mx-auto my-2 flex h-8 items-center rounded-full border border-line px-3 text-[12px] text-ink-2 hover:bg-hov"
                onClick={() => setExpanded(new Set(msgs.map((x) => x.id)))}
              >
                {hidden} more messages
              </button>
            )
          }
          return (
            <MessageCard
              key={m.id}
              message={m}
              open={open}
              onToggle={() => toggle(m.id)}
              thread={thread}
            />
          )
        })}
      </div>
    </div>
  )
}

function MessageCard({
  message,
  open,
  onToggle,
  thread,
}: {
  message: Message
  open: boolean
  onToggle: () => void
  thread: Thread
}) {
  const dispatch = useDispatch()
  const from = contactByEmail(message.from)
  const [showQuote, setShowQuote] = useState(false)

  const { visible, quoted } = useMemo(() => {
    const parts = message.body.split(/<blockquote/i)
    if (parts.length < 2) return { visible: message.body, quoted: '' }
    return { visible: parts[0], quoted: '<blockquote' + parts.slice(1).join('<blockquote') }
  }, [message.body])

  return (
    <article className="border-b border-line py-3">
      <header className="flex cursor-pointer items-start gap-3" onClick={onToggle}>
        <Avatar name={from.name} hue={from.hue} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-bold">{from.name}</span>
            <span className="text-[12px] text-ink-3">&lt;{from.email}&gt;</span>
            <span className="ml-auto text-[12px] text-ink-3">{formatFullDate(message.date)}</span>
          </div>
          {open && (
            <div className="text-[12px] text-ink-3">
              to {message.to.map((e) => contactByEmail(e).name).join(', ')}
              {message.cc?.length ? ` · cc ${message.cc.map((e) => contactByEmail(e).name).join(', ')}` : ''}
            </div>
          )}
          {!open && (
            <div className="truncate text-[13px] text-ink-3" dangerouslySetInnerHTML={{ __html: visible.replace(/<[^>]+>/g, ' ').slice(0, 140) }} />
          )}
        </div>
        <div className="no-print flex" onClick={(e) => e.stopPropagation()}>
          <IconButton
            icon="reply"
            tip="Reply"
            onClick={() => dispatch({ t: 'openCompose', compose: replyCompose(thread, message, false) })}
          />
          <MenuButton tip="More">
            {(close) => (
              <>
                <MenuItem icon="replyAll" onClick={() => { dispatch({ t: 'openCompose', compose: replyCompose(thread, message, true) }); close() }}>
                  Reply all
                </MenuItem>
                <MenuItem icon="forward" onClick={() => { dispatch({ t: 'openCompose', compose: forwardCompose(thread, message) }); close() }}>
                  Forward
                </MenuItem>
                <MenuItem
                  icon="edit"
                  onClick={() => {
                    dispatch({
                      t: 'openCompose',
                      compose: {
                        ...replyCompose(thread, message, false),
                        body: quoteHtml(from.name, message.date, message.body),
                        inline: false,
                      },
                    })
                    close()
                  }}
                >
                  Reply with quote
                </MenuItem>
              </>
            )}
          </MenuButton>
        </div>
      </header>

      {open && (
            <div className="mt-3 pr-2 pl-[52px]">
          {message.draft && (
            <div className="mb-3 rounded-lg bg-panel-alt px-3 py-2 text-[13px] text-ink-2">This is a draft.</div>
          )}
          <div className="mail-body max-w-[72ch] text-[14px] leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: visible }} />
          {quoted && (
            <button type="button" className="mt-2 text-[13px] text-accent" onClick={() => setShowQuote((v) => !v)}>
              {showQuote ? 'Hide quoted text' : 'Show quoted text'}
            </button>
          )}
          {quoted && showQuote && (
            <div className="mail-body mt-2 max-w-[72ch] text-[13px] text-ink-3" dangerouslySetInnerHTML={{ __html: quoted }} />
          )}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {message.attachments.map((a) => (
                <AttachmentCard key={a.id} att={a} />
              ))}
            </div>
          )}
          <div className="no-print mt-4 flex gap-2">
            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-medium hover:bg-hov"
              onClick={() => dispatch({ t: 'openCompose', compose: replyCompose(thread, message, false) })}
            >
              <Icon name="reply" size={18} /> Reply
            </button>
            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-medium hover:bg-hov"
              onClick={() => dispatch({ t: 'openCompose', compose: replyCompose(thread, message, true) })}
            >
              <Icon name="replyAll" size={18} /> Reply all
            </button>
            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-medium hover:bg-hov"
              onClick={() => dispatch({ t: 'openCompose', compose: forwardCompose(thread, message) })}
            >
              <Icon name="forward" size={18} /> Forward
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function AttachmentCard({ att }: { att: Attachment }) {
  return (
    <div className="flex w-[220px] items-center gap-2 overflow-hidden rounded-xl border border-line bg-panel">
      <div
        className="grid h-[72px] w-[72px] shrink-0 place-items-center bg-panel-alt text-ink-3"
        style={att.preview ? { background: att.preview } : undefined}
      >
        {!att.preview && <Icon name={ATT_ICON[att.kind]} size={28} />}
      </div>
      <div className="min-w-0 py-2 pr-2">
        <div className="truncate text-[13px] font-medium">{att.name}</div>
        <div className="text-[12px] text-ink-3">
          {att.kind.toUpperCase()} · {formatBytes(att.size)}
        </div>
      </div>
    </div>
  )
}
