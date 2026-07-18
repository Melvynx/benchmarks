import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ChevronDown,
  Clock,
  Download,
  Ellipsis,
  Forward,
  MailOpen,
  MoreVertical,
  OctagonAlert,
  Reply,
  ReplyAll,
  Star,
  Tag,
  Trash2,
} from 'lucide-react'
import { useMail } from '../store/store'
import { useIsMobile } from '../hooks/hooks'
import { isUnread, lastNonDraft } from '../lib/mail'
import { messageDate, listDate } from '../lib/time'
import { ATTACHMENT_META, cx, downloadAttachment, escapeHtml, formatSize } from '../lib/utils'
import type { Contact, Message, Thread } from '../types'
import { Avatar, IconButton, Menu, MenuItem } from './ui'
import { LabelMenu, SnoozeMenu } from './menus'
import { BodyEditor, FormatToolbar, RecipientField } from './editor'

type ReplyMode = 'reply' | 'replyAll' | 'forward'

function dedupe(contacts: Contact[]): Contact[] {
  const seen = new Set<string>()
  return contacts.filter((c) => {
    if (c.me || seen.has(c.email)) return false
    seen.add(c.email)
    return true
  })
}

function replyRecipients(base: Message, mode: ReplyMode): { to: Contact[]; cc: Contact[] } {
  if (mode === 'forward') return { to: [], cc: [] }
  if (mode === 'reply') {
    return { to: base.from.me ? dedupe(base.to) : [base.from], cc: [] }
  }
  return {
    to: dedupe([base.from, ...base.to]),
    cc: dedupe(base.cc ?? []),
  }
}

function quotedForReply(base: Message): string {
  const when = new Date(base.date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return (
    `<p>On ${when}, ${escapeHtml(base.from.name)} &lt;${escapeHtml(base.from.email)}&gt; wrote:</p>` +
    `<blockquote>${base.bodyHtml}</blockquote>`
  )
}

function forwardBody(base: Message, subject: string): string {
  return (
    `<p><br></p><p>---------- Forwarded message ----------<br>` +
    `From: ${escapeHtml(base.from.name)} &lt;${escapeHtml(base.from.email)}&gt;<br>` +
    `Date: ${new Date(base.date).toLocaleString()}<br>` +
    `Subject: ${escapeHtml(subject)}<br>` +
    `To: ${base.to.map((r) => escapeHtml(r.email)).join(', ')}</p>` +
    base.bodyHtml
  )
}

function ReplyEditor(props: {
  thread: Thread
  base: Message
  mode: ReplyMode
  existingDraft?: Message
  onClose: () => void
}) {
  const { thread, base, mode, existingDraft } = props
  const upsertReplyDraft = useMail((s) => s.upsertReplyDraft)
  const discardDraftMessage = useMail((s) => s.discardDraftMessage)
  const sendReply = useMail((s) => s.sendReply)
  const toast = useMail((s) => s.toast)

  const initial = useMemo(() => {
    if (existingDraft) {
      return {
        to: existingDraft.to,
        cc: existingDraft.cc ?? [],
        body: existingDraft.bodyHtml,
        quoted: existingDraft.quotedHtml,
      }
    }
    const { to, cc } = replyRecipients(base, mode)
    return {
      to,
      cc,
      body: mode === 'forward' ? forwardBody(base, thread.subject) : '',
      quoted: mode === 'forward' ? undefined : quotedForReply(base),
    }
  }, [])

  const [to, setTo] = useState<Contact[]>(initial.to)
  const [cc, setCc] = useState<Contact[]>(initial.cc)
  const [showCc, setShowCc] = useState(initial.cc.length > 0)
  const [bodyHtml, setBodyHtml] = useState(initial.body)
  const editorRef = useRef<HTMLDivElement>(null)
  const draftId = useRef<string | null>(existingDraft?.id ?? null)
  const finished = useRef(false)
  const latest = useRef({ to, cc, bodyHtml })
  latest.current = { to, cc, bodyHtml }

  const hasContent = () =>
    latest.current.to.length > 0 ||
    latest.current.cc.length > 0 ||
    editorRef.current?.textContent?.trim() !== ''

  const save = () => {
    if (finished.current || !hasContent()) return
    draftId.current = upsertReplyDraft(thread.id, draftId.current, {
      to: latest.current.to,
      cc: latest.current.cc,
      bodyHtml: latest.current.bodyHtml,
      quotedHtml: initial.quoted,
    })
  }

  // Debounced autosave
  useEffect(() => {
    const id = setTimeout(save, 1000)
    return () => clearTimeout(id)
  }, [to, cc, bodyHtml])

  useEffect(() => () => save(), [])

  const modeMeta =
    mode === 'forward' || (existingDraft && existingDraft.to.length === 0)
      ? { icon: <Forward className="h-4 w-4" />, label: 'Forward' }
      : { icon: <Reply className="h-4 w-4" />, label: `Reply to ${base.from.me ? 'thread' : base.from.name}` }

  return (
    <div className="mx-3 mb-4 rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_4px_rgba(60,64,67,0.2)] md:mx-14">
      <div className="mb-1 flex items-center gap-2 text-sm text-ink-2">
        {modeMeta.icon}
        <span className="font-medium">{modeMeta.label}</span>
        {existingDraft && <span className="rounded bg-chip px-1.5 py-0.5 text-[11px] text-danger">Draft</span>}
      </div>
      <RecipientField
        label="To"
        recipients={to}
        onChange={setTo}
        autoFocus={mode === 'forward'}
        trailing={
          !showCc ? (
            <button type="button" onClick={() => setShowCc(true)} className="ml-auto pr-1 text-sm text-ink-3 hover:text-ink-1">
              Cc
            </button>
          ) : undefined
        }
      />
      {showCc && <RecipientField label="Cc" recipients={cc} onChange={setCc} />}
      <BodyEditor
        initialHtml={initial.body}
        onChange={setBodyHtml}
        placeholder="Write your reply…"
        className="max-h-[40vh] min-h-28 overflow-y-auto py-3"
        editorRef={editorRef}
        autoFocus={mode !== 'forward'}
      />
      {initial.quoted && (
        <div className="mb-2 text-xs text-ink-3">
          <Ellipsis className="mr-1 inline h-4 w-4 rounded bg-chip" /> Quoted text included when sending
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            if (to.length === 0 && cc.length === 0) {
              toast('Please specify at least one recipient')
              return
            }
            finished.current = true
            sendReply(thread.id, draftId.current, {
              to,
              cc,
              bodyHtml,
              quotedHtml: initial.quoted,
            })
            props.onClose()
          }}
          className="rounded-full bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent-hover dark:text-[#0e1014]"
        >
          Send
        </button>
        <FormatToolbar editorRef={editorRef} />
        <span className="flex-1" />
        <IconButton
          title="Discard draft"
          onClick={() => {
            finished.current = true
            if (draftId.current) discardDraftMessage(thread.id, draftId.current)
            toast('Draft discarded')
            props.onClose()
          }}
        >
          <Trash2 />
        </IconButton>
      </div>
    </div>
  )
}

function AttachmentCard({ att }: { att: Message['attachments'] extends Array<infer A> | undefined ? A : never }) {
  const meta = ATTACHMENT_META[att.kind]
  return (
    <button
      type="button"
      title={`Download ${att.name}`}
      onClick={() => downloadAttachment(att)}
      className="group/att flex w-56 items-center gap-3 rounded-xl border border-line bg-surface p-2.5 text-left hover:bg-surface-hover"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
        style={{ backgroundColor: meta.color }}
      >
        {meta.label}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink-1">{att.name}</span>
        <span className="block text-xs text-ink-3">{formatSize(att.size)}</span>
      </span>
      <Download className="h-4 w-4 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover/att:opacity-100" />
    </button>
  )
}

function MessageCard(props: {
  message: Message
  thread: Thread
  expanded: boolean
  onToggle: () => void
  onReply: (mode: ReplyMode, base: Message) => void
  isLast: boolean
}) {
  const { message: m, thread, expanded } = props
  const toggleMessageStar = useMail((s) => s.toggleMessageStar)
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [showQuoted, setShowQuoted] = useState(false)

  const toSummary = useMemo(() => {
    const names = m.to.map((r) => (r.me ? 'me' : r.name.split(' ')[0]))
    const ccNames = (m.cc ?? []).map((r) => (r.me ? 'me' : r.name.split(' ')[0]))
    return [...names, ...ccNames].slice(0, 4).join(', ') + (names.length + ccNames.length > 4 ? '…' : '')
  }, [m])

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={props.onToggle}
        className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left hover:bg-surface-hover md:px-6"
      >
        <Avatar contact={m.from} size={36} />
        <span className="min-w-0 flex-1">
          <span className={cx('block truncate text-sm', m.unread ? 'font-semibold text-ink-1' : 'text-ink-1')}>
            {m.from.me ? 'me' : m.from.name}
          </span>
          <span className="block truncate text-sm text-ink-3">{m.snippet}</span>
        </span>
        {m.starred && <Star className="h-4 w-4 shrink-0 fill-star text-star" />}
        <span className="shrink-0 text-xs text-ink-3">{listDate(m.date)}</span>
      </button>
    )
  }

  return (
    <div className="border-b border-line px-4 pb-5 pt-3 last:border-b-0 md:px-6">
      <div className="flex items-start gap-3">
        <Avatar contact={m.from} size={40} className="mt-1" />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={props.isLast ? undefined : props.onToggle} className="block w-full text-left">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-semibold text-ink-1">{m.from.me ? 'me' : m.from.name}</span>
              {!isMobile && <span className="text-xs text-ink-3">&lt;{m.from.email}&gt;</span>}
              <span className="ml-auto flex shrink-0 items-center gap-0.5">
                <span className="mr-1 text-xs text-ink-3" title={new Date(m.date).toLocaleString()}>
                  {isMobile ? listDate(m.date) : messageDate(m.date)}
                </span>
              </span>
            </div>
          </button>
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="flex items-center gap-0.5 text-xs text-ink-3 hover:text-ink-1"
              title="Show details"
            >
              to {toSummary} <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {detailsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDetailsOpen(false)} />
                <div className="absolute left-0 top-5 z-50 w-max max-w-[85vw] rounded-lg border border-line/60 bg-surface p-4 text-xs shadow-[var(--shadow-menu)] anim-pop">
                  <table className="border-separate border-spacing-x-3 border-spacing-y-1">
                    <tbody>
                      <tr><td className="text-right text-ink-3">from:</td><td className="text-ink-1">{m.from.name} &lt;{m.from.email}&gt;</td></tr>
                      <tr><td className="text-right text-ink-3">to:</td><td className="text-ink-1">{m.to.map((r) => r.email).join(', ')}</td></tr>
                      {m.cc && <tr><td className="text-right text-ink-3">cc:</td><td className="text-ink-1">{m.cc.map((r) => r.email).join(', ')}</td></tr>}
                      <tr><td className="text-right text-ink-3">date:</td><td className="text-ink-1">{new Date(m.date).toLocaleString()}</td></tr>
                      <tr><td className="text-right text-ink-3">subject:</td><td className="text-ink-1">{thread.subject}</td></tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <IconButton
            size="sm"
            title={m.starred ? 'Unstar' : 'Star'}
            onClick={() => toggleMessageStar(thread.id, m.id)}
          >
            <Star className={cx(m.starred ? 'fill-star text-star' : '')} />
          </IconButton>
          <IconButton size="sm" title="Reply" onClick={() => props.onReply('reply', m)} className="max-md:hidden">
            <Reply />
          </IconButton>
          <span className="relative">
            <IconButton size="sm" title="More" onClick={() => setMenuOpen(true)}>
              <MoreVertical />
            </IconButton>
            <Menu open={menuOpen} onClose={() => setMenuOpen(false)} align="right">
              <MenuItem icon={<Reply />} onClick={() => { setMenuOpen(false); props.onReply('reply', m) }}>Reply</MenuItem>
              <MenuItem icon={<ReplyAll />} onClick={() => { setMenuOpen(false); props.onReply('replyAll', m) }}>Reply all</MenuItem>
              <MenuItem icon={<Forward />} onClick={() => { setMenuOpen(false); props.onReply('forward', m) }}>Forward</MenuItem>
            </Menu>
          </span>
        </div>
      </div>

      <div className="mt-3 md:pl-[52px]">
        <div className="mail-body" dangerouslySetInnerHTML={{ __html: m.bodyHtml }} />
        {m.quotedHtml && (
          <div className="mt-3">
            <button
              type="button"
              title={showQuoted ? 'Hide trimmed content' : 'Show trimmed content'}
              onClick={() => setShowQuoted(!showQuoted)}
              className="rounded-full bg-chip px-2 py-0.5 text-ink-3 hover:bg-line"
            >
              <Ellipsis className="h-4 w-4" />
            </button>
            {showQuoted && (
              <div className="mail-body mt-3 border-l-2 border-line-strong pl-3 text-ink-2" dangerouslySetInnerHTML={{ __html: m.quotedHtml }} />
            )}
          </div>
        )}
        {m.attachments && m.attachments.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-2 text-xs font-medium text-ink-3">
              {m.attachments.length === 1 ? 'One attachment' : `${m.attachments.length} attachments`}
            </div>
            <div className="flex flex-wrap gap-2">
              {m.attachments.map((a) => (
                <AttachmentCard key={a.id} att={a} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ThreadView({ thread }: { thread: Thread }) {
  const closeThread = useMail((s) => s.closeThread)
  const archiveThreads = useMail((s) => s.archiveThreads)
  const trashThreads = useMail((s) => s.trashThreads)
  const deleteForever = useMail((s) => s.deleteForever)
  const markSpam = useMail((s) => s.markSpam)
  const notSpam = useMail((s) => s.notSpam)
  const moveToInbox = useMail((s) => s.moveToInbox)
  const markRead = useMail((s) => s.markRead)
  const unsnoozeThreads = useMail((s) => s.unsnoozeThreads)
  const applyLabel = useMail((s) => s.applyLabel)
  const labels = useMail((s) => s.labels)
  const isMobile = useIsMobile()

  const [labelOpen, setLabelOpen] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const nonDraft = thread.messages.filter((m) => !m.draft)
    const ids = new Set<string>()
    nonDraft.forEach((m, i) => {
      if (m.unread || i === nonDraft.length - 1) ids.add(m.id)
    })
    return ids
  })
  const [reply, setReply] = useState<{ mode: ReplyMode; base: Message } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const knownIds = useRef(new Set(thread.messages.map((m) => m.id)))

  // Messages that arrive while the thread is open (e.g. a reply just sent) start expanded
  useEffect(() => {
    const fresh = thread.messages.filter((m) => !m.draft && !knownIds.current.has(m.id))
    if (fresh.length) {
      setExpandedIds((prev) => {
        const next = new Set(prev)
        fresh.forEach((m) => next.add(m.id))
        return next
      })
    }
    thread.messages.forEach((m) => knownIds.current.add(m.id))
  }, [thread.messages])

  const nonDraft = thread.messages.filter((m) => !m.draft)
  const drafts = thread.messages.filter((m) => m.draft)
  const trailingDraft = drafts[drafts.length - 1]
  const base = lastNonDraft(thread)
  const inTrash = thread.location === 'trash'
  const inSpam = thread.location === 'spam'
  const snoozed = thread.snoozedUntil !== undefined && thread.snoozedUntil > Date.now()

  const startReply = (mode: ReplyMode, baseMsg: Message) => {
    setReply({ mode, base: baseMsg })
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 60)
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent).detail?.mode as ReplyMode
      if (base) startReply(mode, base)
    }
    window.addEventListener('fable:reply', handler)
    return () => window.removeEventListener('fable:reply', handler)
  }, [base?.id])

  const threadLabels = thread.labelIds
    .map((id) => labels.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l))

  const editorOpen = reply !== null || trailingDraft !== undefined

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-0.5 border-b border-line px-2 md:px-4">
        <IconButton title="Back to list (u)" onClick={closeThread}>
          <ArrowLeft />
        </IconButton>
        {inTrash || inSpam ? (
          <>
            <IconButton title={inSpam ? 'Not spam' : 'Move to Inbox'} onClick={() => (inSpam ? notSpam([thread.id]) : moveToInbox([thread.id]))}>
              <ArchiveRestore />
            </IconButton>
            <IconButton title="Delete forever" onClick={() => deleteForever([thread.id])}>
              <Trash2 />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton title="Archive (e)" onClick={() => archiveThreads([thread.id])}>
              <Archive />
            </IconButton>
            <IconButton title="Report spam (!)" onClick={() => markSpam([thread.id])}>
              <OctagonAlert />
            </IconButton>
            <IconButton title="Delete (#)" onClick={() => trashThreads([thread.id])}>
              <Trash2 />
            </IconButton>
            <span className="mx-1 h-5 w-px bg-line-strong max-md:hidden" />
            <IconButton
              title="Mark as unread (Shift+U)"
              className="max-md:hidden"
              onClick={() => {
                markRead([thread.id], false)
                closeThread()
              }}
            >
              <MailOpen />
            </IconButton>
            <span className="relative max-md:hidden">
              <IconButton title="Snooze" onClick={() => setSnoozeOpen(true)}>
                <Clock />
              </IconButton>
              <SnoozeMenu open={snoozeOpen} onClose={() => setSnoozeOpen(false)} threadIds={[thread.id]} />
            </span>
            <span className="relative">
              <IconButton title="Labels" onClick={() => setLabelOpen(true)}>
                <Tag />
              </IconButton>
              <LabelMenu open={labelOpen} onClose={() => setLabelOpen(false)} threadIds={[thread.id]} />
            </span>
            <span className="relative">
              <IconButton title="More" onClick={() => setMoreOpen(true)}>
                <MoreVertical />
              </IconButton>
              <Menu open={moreOpen} onClose={() => setMoreOpen(false)}>
                {thread.location === 'archive' && (
                  <MenuItem icon={<ArchiveRestore />} onClick={() => { setMoreOpen(false); moveToInbox([thread.id]) }}>
                    Move to Inbox
                  </MenuItem>
                )}
                {snoozed && (
                  <MenuItem icon={<Clock />} onClick={() => { setMoreOpen(false); unsnoozeThreads([thread.id]) }}>
                    Unsnooze
                  </MenuItem>
                )}
                <MenuItem
                  icon={<MailOpen />}
                  onClick={() => {
                    setMoreOpen(false)
                    markRead([thread.id], false)
                    closeThread()
                  }}
                >
                  Mark as unread
                </MenuItem>
                {isMobile && (
                  <MenuItem icon={<Clock />} onClick={() => { setMoreOpen(false); setSnoozeOpen(true) }}>
                    Snooze
                  </MenuItem>
                )}
              </Menu>
            </span>
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 pb-1 pt-4 md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-normal text-ink-1 md:text-[22px]">{thread.subject}</h2>
            {threadLabels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: label.color + '33', color: label.color }}
              >
                {label.name}
                <button
                  type="button"
                  title={`Remove label “${label.name}”`}
                  onClick={() => applyLabel([thread.id], label.id, false)}
                  className="hover:opacity-70"
                >
                  ×
                </button>
              </span>
            ))}
            {snoozed && (
              <span className="rounded bg-[#fef3e0] px-1.5 py-0.5 text-[11px] font-medium text-[#c26401] dark:bg-[#3d2e12] dark:text-[#f5b263]">
                Snoozed
              </span>
            )}
          </div>
          {isUnread(thread) && nonDraft.length > 1 && (
            <div className="mt-1 text-xs text-ink-3">{nonDraft.length} messages</div>
          )}
        </div>

        <div>
          {nonDraft.map((m, i) => (
            <MessageCard
              key={m.id}
              message={m}
              thread={thread}
              expanded={expandedIds.has(m.id)}
              isLast={i === nonDraft.length - 1}
              onToggle={() =>
                setExpandedIds((prev) => {
                  const next = new Set(prev)
                  if (next.has(m.id)) next.delete(m.id)
                  else next.add(m.id)
                  return next
                })
              }
              onReply={startReply}
            />
          ))}
        </div>

        <div className="pt-4">
          {editorOpen && base ? (
            trailingDraft && !reply ? (
              <ReplyEditor
                key={trailingDraft.id}
                thread={thread}
                base={base}
                mode={trailingDraft.to.length ? 'reply' : 'forward'}
                existingDraft={trailingDraft}
                onClose={() => setReply(null)}
              />
            ) : reply ? (
              <ReplyEditor
                key={`${reply.mode}-${reply.base.id}`}
                thread={thread}
                base={reply.base}
                mode={reply.mode}
                onClose={() => setReply(null)}
              />
            ) : null
          ) : (
            base && (
              <div className="flex gap-3 px-4 pb-6 md:px-14">
                <button
                  type="button"
                  onClick={() => startReply('reply', base)}
                  className="flex items-center gap-2 rounded-full border border-line-strong px-5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-hover"
                >
                  <Reply className="h-4 w-4" /> Reply
                </button>
                {(base.to.length + (base.cc?.length ?? 0) > 1 || (base.to.length > 0 && !base.from.me && base.to.some((r) => !r.me))) && (
                  <button
                    type="button"
                    onClick={() => startReply('replyAll', base)}
                    className="flex items-center gap-2 rounded-full border border-line-strong px-5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-hover"
                  >
                    <ReplyAll className="h-4 w-4" /> Reply all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startReply('forward', base)}
                  className="flex items-center gap-2 rounded-full border border-line-strong px-5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-hover"
                >
                  <Forward className="h-4 w-4" /> Forward
                </button>
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
