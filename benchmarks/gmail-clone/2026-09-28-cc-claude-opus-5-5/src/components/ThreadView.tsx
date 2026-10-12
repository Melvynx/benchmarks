import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  OctagonAlert,
  Trash2,
  Mail,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Reply,
  ReplyAll,
  Forward,
  Printer,
  X,
  ChevronDown,
  Download,
  Star,
  Filter,
  Bookmark,
  AlarmClockOff,
  Inbox,
  Smile,
} from 'lucide-react'
import type { Label, Message, ReplyMode, Thread, View } from '../types'
import { useMail } from '../store/mail'
import { buildReplyDraft, useUI } from '../store/ui'
import { useViewThreads } from '../hooks'
import { actions } from '../actions'
import { goView } from '../lib/router'
import { formatFullDate, formatLongDate, formatListDate, formatScheduleLabel } from '../lib/format'
import { isMe, isSnoozed } from '../lib/mail'
import { sanitizeHtml, stripHtml } from '../lib/html'
import { Avatar, cx, Dropdown, IconButton, MenuDivider, MenuItem, useIsMobile } from './ui'
import { LabelMenu, MoveMenu, SnoozeMenu } from './menus'
import { AttachmentCard, downloadAttachment } from './Attachments'
import { ComposeForm } from './Compose'
import { ImportantMarker, StarButton } from './MailList'
import { runSearch } from './TopBar'

function markRead(id: string) {
  const t = useMail.getState().threads[id]
  if (t?.unread) useMail.setState({ threads: { ...useMail.getState().threads, [id]: { ...t, unread: false } } })
}

function MessageBody({ html }: { html: string }) {
  const [showQuote, setShowQuote] = useState(false)
  const { main, quote } = useMemo(() => {
    const clean = sanitizeHtml(html)
    const idx = clean.search(/<(blockquote|div) class="quote"/)
    if (idx === -1) return { main: clean, quote: '' }
    return { main: clean.slice(0, idx), quote: clean.slice(idx) }
  }, [html])
  return (
    <div>
      <div className="mail-body" dangerouslySetInnerHTML={{ __html: main }} />
      {quote && (
        <>
          <button
            type="button"
            aria-label={showQuote ? 'Hide trimmed content' : 'Show trimmed content'}
            data-tip={showQuote ? 'Hide trimmed content' : 'Show trimmed content'}
            onClick={() => setShowQuote(!showQuote)}
            className="mb-2 flex h-3 w-6 items-center justify-center rounded-sm bg-hover-strong text-[10px] leading-none text-muted hover:bg-line-strong"
          >
            •••
          </button>
          {showQuote && <div className="mail-body" dangerouslySetInnerHTML={{ __html: quote }} />}
        </>
      )}
    </div>
  )
}

function RecipientDetails({ m, subject }: { m: Message; subject: string }) {
  const toLabel = m.to.map((c) => (isMe(c) ? 'me' : c.name.split(' ')[0])).join(', ')
  const ccLabel = m.cc.length ? `, cc: ${m.cc.map((c) => c.name.split(' ')[0]).join(', ')}` : ''
  return (
    <Dropdown
      width={440}
      trigger={({ toggle }) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); toggle() }} className="flex max-w-full items-center gap-0.5 text-[12px] text-muted hover:text-ink">
          <span className="truncate">to {toLabel}{ccLabel}</span>
          <ChevronDown size={14} className="shrink-0" />
        </button>
      )}
    >
      {() => (
        <table className="mx-4 my-1 text-[12px]">
          <tbody>
            {(
              [
                ['from:', `${m.from.name} <${m.from.email}>`],
                ['to:', m.to.map((c) => `${c.name} <${c.email}>`).join(', ')],
                ...(m.cc.length ? [['cc:', m.cc.map((c) => `${c.name} <${c.email}>`).join(', ')]] : []),
                ...(m.bcc?.length ? [['bcc:', m.bcc.map((c) => `${c.name} <${c.email}>`).join(', ')]] : []),
                ['date:', formatLongDate(m.date)],
                ['subject:', subject],
                ['security:', 'Standard encryption (TLS)'],
              ] as [string, string][]
            ).map(([k, v]) => (
              <tr key={k}>
                <td className="whitespace-nowrap py-0.5 pr-3 text-right align-top text-muted">{k}</td>
                <td className="break-all py-0.5">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Dropdown>
  )
}

function MessageItem({
  thread,
  m,
  expanded,
  onToggle,
  onReply,
  isLast,
  mobile,
}: {
  thread: Thread
  m: Message
  expanded: boolean
  onToggle: () => void
  onReply: (mode: ReplyMode, messageId: string) => void
  isLast: boolean
  mobile: boolean
}) {
  const setPreview = useUI((s) => s.setPreview)
  if (!expanded) {
    return (
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left hover:bg-hover md:px-0 md:pl-2">
        <Avatar contact={m.from} size={mobile ? 36 : 40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 truncate text-[14px] font-semibold">{isMe(m.from) ? 'me' : m.from.name}</span>
            <span className="ml-auto shrink-0 text-[12px] text-muted md:hidden">{formatListDate(m.date)}</span>
          </div>
          <div className="truncate text-[14px] text-muted">{stripHtml(m.html).slice(0, 180)}</div>
        </div>
        <span className="shrink-0 pr-4 text-[12px] text-muted max-md:hidden">{formatFullDate(m.date)}</span>
      </button>
    )
  }
  return (
    <article className={cx('border-t border-line first:border-t-0', isLast ? 'pb-2' : 'pb-4')}>
      <div className="flex cursor-pointer items-start gap-3 px-4 pt-4 md:px-0 md:pl-2" onClick={onToggle}>
        <Avatar contact={m.from} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-[14px] font-semibold">{m.from.name}</span>
            <span className="truncate text-[12px] text-muted">&lt;{m.from.email}&gt;</span>
          </div>
          <RecipientDetails m={m} subject={thread.subject} />
        </div>
        <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <span className="mr-2 text-[12px] text-muted max-md:hidden">{formatFullDate(m.date)}</span>
          <span className="mr-1 text-[12px] text-muted md:hidden">{formatListDate(m.date)}</span>
          {isLast && !mobile && <StarButton on={thread.starred} onClick={() => useMail.getState().toggleStar(thread.id)} />}
          {!mobile && (
            <IconButton size="sm" label="React with emoji" onClick={() => onReply('reply', m.id)} className="max-lg:hidden">
              <Smile size={17} />
            </IconButton>
          )}
          <IconButton size="sm" label="Reply" onClick={() => onReply('reply', m.id)}>
            <Reply size={18} />
          </IconButton>
          <Dropdown
            align="right"
            width={230}
            trigger={({ toggle }) => (
              <IconButton size="sm" label="More" onClick={toggle}>
                <MoreVertical size={18} />
              </IconButton>
            )}
          >
            {(close) => (
              <>
                <MenuItem icon={<Reply size={16} />} onClick={() => { close(); onReply('reply', m.id) }}>Reply</MenuItem>
                <MenuItem icon={<ReplyAll size={16} />} onClick={() => { close(); onReply('replyAll', m.id) }}>Reply all</MenuItem>
                <MenuItem icon={<Forward size={16} />} onClick={() => { close(); onReply('forward', m.id) }}>Forward</MenuItem>
                <MenuDivider />
                <MenuItem icon={<Filter size={16} />} onClick={() => { close(); runSearch(`from:${m.from.email}`) }}>
                  Filter messages from {m.from.name.split(' ')[0]}
                </MenuItem>
                <MenuItem icon={<Printer size={16} />} onClick={() => { close(); window.print() }}>Print</MenuItem>
                <MenuItem
                  icon={<Mail size={16} />}
                  onClick={() => {
                    close()
                    useMail.getState().markUnreadFrom(thread.id)
                    goView(parseCurrentView())
                  }}
                >
                  Mark unread from here
                </MenuItem>
                {thread.messages.length > 1 && (
                  <MenuItem
                    danger
                    icon={<Trash2 size={16} />}
                    onClick={() => {
                      close()
                      useMail.getState().deleteMessage(thread.id, m.id)
                      useUI.getState().showToast('Message deleted.', { action: { label: 'Undo', run: () => useMail.getState().undo() } })
                    }}
                  >
                    Delete this message
                  </MenuItem>
                )}
              </>
            )}
          </Dropdown>
        </div>
      </div>
      <div className="pl-4 pr-4 pt-3 md:pl-[60px] md:pr-6">
        <MessageBody html={m.html} />
        {m.attachments.length > 0 && (
          <div className="mt-2 border-t border-line pt-4">
            <div className="mb-3 flex items-center gap-3 text-[14px] font-medium">
              {m.attachments.length} attachment{m.attachments.length > 1 ? 's' : ''}
              <span className="text-[12px] font-normal text-muted">• Scanned by Opus 5.5</span>
              {m.attachments.length > 1 && (
                <IconButton size="sm" label="Download all" onClick={() => m.attachments.forEach(downloadAttachment)}>
                  <Download size={16} />
                </IconButton>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {m.attachments.map((a) => (
                <AttachmentCard key={a.id} a={a} onOpen={() => setPreview({ threadId: thread.id, messageId: m.id, attachmentId: a.id })} />
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

function parseCurrentView(): View {
  const h = window.location.hash.replace(/^#\/?/, '').split('/')
  if (h[0] === 'label') return { kind: 'label', labelId: decodeURIComponent(h[1]) }
  if (h[0] === 'search') return { kind: 'search', query: decodeURIComponent(h[1] ?? '') }
  return { kind: 'folder', folder: (h[0] || 'inbox') as never }
}

function SubjectLabels({ thread, labels }: { thread: Thread; labels: Label[] }) {
  const own = thread.labels.map((id) => labels.find((l) => l.id === id)).filter(Boolean) as Label[]
  const chip = 'group inline-flex h-6 items-center gap-1 rounded pl-2 pr-1 text-[12px] font-medium align-middle'
  return (
    <>
      {thread.inbox && !thread.trash && !thread.spam && (
        <span className={cx(chip, 'bg-hover-strong')}>
          Inbox
          <button type="button" aria-label="Remove Inbox label (archive)" onClick={() => actions.archive([thread.id])} className="rounded p-0.5 opacity-60 hover:bg-hover-strong hover:opacity-100">
            <X size={12} />
          </button>
        </span>
      )}
      {thread.trash && <span className={cx(chip, 'bg-hover-strong pr-2')}>Trash</span>}
      {thread.spam && <span className={cx(chip, 'bg-danger/20 pr-2')}>Spam</span>}
      {own.map((l) => (
        <span key={l.id} className={chip} style={{ background: `color-mix(in srgb, ${l.color} 24%, transparent)` }}>
          {l.name}
          <button type="button" aria-label={`Remove label ${l.name}`} onClick={() => actions.label([thread.id], l.id, false)} className="rounded p-0.5 opacity-60 hover:bg-hover-strong hover:opacity-100">
            <X size={12} />
          </button>
        </span>
      ))}
    </>
  )
}

export function ThreadView({ view, threadId, embedded }: { view: View; threadId: string; embedded?: boolean }) {
  const thread = useMail((s) => s.threads[threadId])
  const labels = useMail((s) => s.labels)
  const drafts = useMail((s) => s.drafts)
  const composes = useUI((s) => s.composes)
  const autoAdvance = useMail((s) => s.settings.autoAdvance)
  const list = useViewThreads(view)
  const mobile = useIsMobile()
  const listSnapshot = useRef<string[]>([])
  const scroller = useRef<HTMLDivElement>(null)

  // freeze the neighbour order so actions don't shuffle navigation
  if (!listSnapshot.current.includes(threadId) || listSnapshot.current.length === 0) listSnapshot.current = list.map((t) => t.id)
  const order = listSnapshot.current
  const index = order.indexOf(threadId)

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [replyId, setReplyId] = useState<string | null>(null)

  useEffect(() => {
    if (!thread) return
    const last = thread.messages[thread.messages.length - 1]
    const init = new Set<string>([last.id])
    if (thread.unread) {
      // expand the trailing unread messages
      thread.messages.slice(-2).forEach((m) => init.add(m.id))
    }
    setExpanded(init)
    setShowAll(thread.messages.length <= 4)
    const existing = Object.values(useMail.getState().drafts).find((d) => d.threadId === threadId && !d.sendAt)
    setReplyId(existing && !useUI.getState().composes.some((c) => c.id === existing.id) ? existing.id : null)
    markRead(threadId)
    scroller.current?.scrollTo({ top: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId])

  // expand newly arrived messages
  const count = thread?.messages.length ?? 0
  useEffect(() => {
    if (!thread) return
    const last = thread.messages[thread.messages.length - 1]
    setExpanded((s) => new Set(s).add(last.id))
    if (thread.unread) markRead(thread.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  useEffect(() => {
    const onReply = (e: Event) => startReply((e as CustomEvent<ReplyMode>).detail)
    window.addEventListener('thread-reply', onReply)
    return () => window.removeEventListener('thread-reply', onReply)
  })

  // inline draft vanished (sent / discarded)
  useEffect(() => {
    if (replyId && !drafts[replyId]) setReplyId(null)
  }, [drafts, replyId])

  if (!thread) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-muted">
        <p>This conversation could not be found. It may have been deleted.</p>
        <button type="button" className="text-accent hover:underline" onClick={() => goView(view)}>
          Back to {view.kind === 'search' ? 'search results' : 'list'}
        </button>
      </div>
    )
  }

  const back = () => goView(view)
  const neighbour = (dir: 1 | -1) => order[index + dir]
  const goNeighbour = (dir: 1 | -1) => {
    const id = neighbour(dir)
    if (id) goView(view, id)
  }
  const afterRemove = () => {
    const next = neighbour(1) ?? neighbour(-1)
    if (autoAdvance === 'next' && next) goView(view, next, true)
    else goView(view, undefined, true)
  }

  function startReply(mode: ReplyMode, messageId?: string) {
    const d = buildReplyDraft(threadId, mode, messageId)
    useMail.getState().saveDraft(d)
    if (replyId && drafts[replyId]) {
      const old = drafts[replyId]
      if (!stripHtml(old.html.split('<blockquote')[0]).replace(/--.*/, '').trim()) useMail.getState().discardDraft(replyId)
    }
    if (mobile) {
      useUI.getState().openDraft(d.id)
      return
    }
    setReplyId(d.id)
    requestAnimationFrame(() => {
      const el = document.getElementById('inline-reply')
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const msgs = thread.messages
  const hiddenCount = !showAll && msgs.length > 4 ? msgs.length - 3 : 0
  const visible = hiddenCount ? [msgs[0], ...msgs.slice(-2)] : msgs
  const inTrash = thread.trash
  const inSpam = thread.spam
  const snoozed = isSnoozed(thread, Date.now())
  const lastMsg = msgs[msgs.length - 1]
  const canReplyAll = [...lastMsg.to, ...lastMsg.cc].filter((c) => !isMe(c)).length + (isMe(lastMsg.from) ? 0 : 1) > 1
  const inWindow = composes.some((c) => c.id === replyId)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* toolbar */}
      <div className={cx('no-print flex h-12 shrink-0 items-center gap-0.5 pl-2 pr-2', mobile && 'h-14 bg-bg')}>
        {!embedded && (
          <IconButton label={`Back to ${view.kind === 'search' ? 'Search results' : 'list'}`} onClick={back}>
            <ArrowLeft size={20} />
          </IconButton>
        )}
        {embedded && (
          <IconButton label="Close" onClick={back}>
            <X size={20} />
          </IconButton>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-0.5 max-md:justify-end">
          {inSpam ? (
            <button type="button" onClick={() => { actions.notSpam([thread.id]); afterRemove() }} className="mx-1 h-8 rounded px-2 text-[14px] font-medium hover:bg-hover">
              Not spam
            </button>
          ) : !inTrash && thread.inbox && !snoozed ? (
            <IconButton label="Archive" onClick={() => { actions.archive([thread.id]); afterRemove() }}>
              <Archive size={18} />
            </IconButton>
          ) : (
            <IconButton label="Move to Inbox" onClick={() => { actions.moveToInbox([thread.id]); if (inTrash) afterRemove() }}>
              {inTrash ? <Inbox size={18} /> : <ArchiveRestore size={18} />}
            </IconButton>
          )}
          {!inSpam && !inTrash && !mobile && (
            <IconButton label="Report spam" onClick={() => { actions.spam([thread.id]); afterRemove() }}>
              <OctagonAlert size={18} />
            </IconButton>
          )}
          {inTrash ? (
            <button type="button" onClick={() => { actions.deleteForever([thread.id]); afterRemove() }} className="mx-1 h-8 shrink-0 rounded px-2 text-[14px] font-medium hover:bg-hover">
              Delete forever
            </button>
          ) : (
            <IconButton label="Delete" onClick={() => { actions.trash([thread.id]); afterRemove() }}>
              <Trash2 size={18} />
            </IconButton>
          )}
          {!mobile && <span className="mx-2 h-5 w-px bg-line-strong/60" />}
          <IconButton
            label="Mark as unread"
            onClick={() => {
              actions.read([thread.id], true)
              back()
            }}
          >
            <Mail size={18} />
          </IconButton>
          {snoozed ? (
            <IconButton label="Unsnooze" onClick={() => actions.unsnooze([thread.id])}>
              <AlarmClockOff size={18} />
            </IconButton>
          ) : (
            <SnoozeMenu ids={[thread.id]} onDone={afterRemove} />
          )}
          {!mobile && <span className="mx-2 h-5 w-px bg-line-strong/60" />}
          {!mobile && <MoveMenu ids={[thread.id]} onDone={afterRemove} />}
          {!mobile && <LabelMenu ids={[thread.id]} />}
          <Dropdown
            align={mobile ? 'right' : 'left'}
            width={260}
            trigger={({ toggle }) => (
              <IconButton label="More" onClick={toggle}>
                <MoreVertical size={18} />
              </IconButton>
            )}
          >
            {(close) => (
              <>
                <MenuItem icon={<Star size={16} />} onClick={() => { close(); useMail.getState().toggleStar(thread.id) }}>
                  {thread.starred ? 'Remove star' : 'Add star'}
                </MenuItem>
                <MenuItem icon={<Bookmark size={16} />} onClick={() => { close(); actions.important([thread.id], !thread.important) }}>
                  Mark as {thread.important ? 'not important' : 'important'}
                </MenuItem>
                {mobile && (
                  <>
                    <MenuItem icon={<OctagonAlert size={16} />} onClick={() => { close(); actions.spam([thread.id]); afterRemove() }}>Report spam</MenuItem>
                    <LabelMenu ids={[thread.id]} trigger={(t) => <MenuItem icon={<Filter size={16} />} onClick={t}>Change labels</MenuItem>} />
                  </>
                )}
                <MenuDivider />
                <MenuItem icon={<Filter size={16} />} onClick={() => { close(); runSearch(`from:${lastMsg.from.email}`) }}>
                  Filter messages like these
                </MenuItem>
                <MenuItem icon={<Printer size={16} />} onClick={() => { close(); window.print() }}>
                  Print all
                </MenuItem>
              </>
            )}
          </Dropdown>
        </div>
        {!mobile && index >= 0 && (
          <div className="ml-auto flex shrink-0 items-center gap-1 text-[12px] text-muted">
            <span className="px-2">
              {index + 1} of {order.length}
            </span>
            <IconButton label="Newer" size="sm" disabled={!neighbour(-1)} onClick={() => goNeighbour(-1)}>
              <ChevronLeft size={18} />
            </IconButton>
            <IconButton label="Older" size="sm" disabled={!neighbour(1)} onClick={() => goNeighbour(1)}>
              <ChevronRight size={18} />
            </IconButton>
          </div>
        )}
      </div>

      <div ref={scroller} className={cx('scroll-thin min-h-0 flex-1 overflow-y-auto', mobile ? 'pb-28' : 'pb-10')}>
        {snoozed && thread.snoozeUntil && (
          <div className="mx-4 mb-2 mt-1 rounded-lg bg-active/60 px-4 py-2 text-[13px] md:ml-[72px]">Snoozed until {formatScheduleLabel(thread.snoozeUntil)}</div>
        )}
        <div className="flex items-start gap-2 pb-3 pl-4 pr-4 pt-2 md:pl-[72px] md:pr-6">
          <h2 className="min-w-0 flex-1 text-[22px] leading-8 text-ink">
            <span className="mr-2">{thread.subject}</span>
            <span className="inline-flex flex-wrap gap-1.5 align-middle">
              <SubjectLabels thread={thread} labels={labels} />
            </span>
          </h2>
          <div className="flex shrink-0 items-center">
            {mobile ? (
              <StarButton on={thread.starred} size={22} onClick={() => useMail.getState().toggleStar(thread.id)} />
            ) : (
              <>
                <ImportantMarker on={thread.important} onClick={() => actions.important([thread.id], !thread.important)} />
                <IconButton label="Print all" onClick={() => window.print()}>
                  <Printer size={18} />
                </IconButton>
              </>
            )}
          </div>
        </div>

        <div className="md:pl-4 md:pr-4">
          {visible.map((m, i) => (
            <div key={m.id}>
              {hiddenCount > 0 && i === 1 && (
                <div className="relative flex h-6 items-center border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="relative left-4 flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-surface text-[14px] font-medium text-muted hover:bg-hover md:left-2"
                    aria-label={`Show ${hiddenCount} older messages`}
                  >
                    {hiddenCount}
                  </button>
                </div>
              )}
              <MessageItem
                thread={thread}
                m={m}
                mobile={mobile}
                isLast={m.id === lastMsg.id}
                expanded={expanded.has(m.id)}
                onToggle={() =>
                  setExpanded((s) => {
                    const n = new Set(s)
                    if (n.has(m.id) && m.id !== lastMsg.id) n.delete(m.id)
                    else n.add(m.id)
                    return n
                  })
                }
                onReply={startReply}
              />
            </div>
          ))}
        </div>

        {/* reply area */}
        <div id="inline-reply" className="no-print px-4 pt-4 md:pl-[76px] md:pr-6">
          {replyId && drafts[replyId] && !inWindow ? (
            <div className="flex gap-3">
              <span className="max-md:hidden">
                <Avatar contact={{ name: 'Sam Rivera', email: 'sam.rivera@lumenlabs.io' }} size={40} />
              </span>
              <div className="flex min-h-[260px] min-w-0 flex-1 flex-col rounded-2xl border border-line bg-surface shadow-pop">
                <ComposeForm
                  key={replyId}
                  draftId={replyId}
                  variant="inline"
                  onClose={() => setReplyId(null)}
                  onPopOut={() => {
                    useUI.getState().openDraft(replyId)
                    setReplyId(null)
                  }}
                />
              </div>
            </div>
          ) : (
            <div className={cx('flex flex-wrap gap-2', mobile && 'fixed inset-x-0 bottom-0 z-20 justify-around border-t border-line bg-bg px-3 py-3')}>
              <ReplyPill icon={<Reply size={18} />} label="Reply" onClick={() => startReply('reply')} mobile={mobile} />
              {canReplyAll && <ReplyPill icon={<ReplyAll size={18} />} label="Reply all" onClick={() => startReply('replyAll')} mobile={mobile} />}
              <ReplyPill icon={<Forward size={18} />} label="Forward" onClick={() => startReply('forward')} mobile={mobile} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ReplyPill({ icon, label, onClick, mobile }: { icon: React.ReactNode; label: string; onClick: () => void; mobile: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx('flex h-10 items-center gap-2 rounded-full border border-line-strong px-5 text-[14px] font-medium text-ink hover:bg-hover', mobile && 'flex-1 justify-center px-2')}
    >
      {icon}
      {label}
    </button>
  )
}
