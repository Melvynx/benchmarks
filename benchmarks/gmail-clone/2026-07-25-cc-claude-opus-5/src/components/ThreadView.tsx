import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../lib/app'
import { ME, resolveContact } from '../lib/contacts'
import {
  ATTACHMENT_TINT,
  fileSize,
  fullDate,
  messageDate,
  relativeDate,
  toSnippet,
  whenLabel,
} from '../lib/format'
import { threadMessages, useDispatch, useStore } from '../lib/store'
import { SYS, type Attachment, type Contact, type Message, type Thread } from '../lib/types'
import { Compose } from './Compose'
import { Icon, type IconName } from './Icon'
import { LabelMenu, MoreMenu, MoveMenu, SnoozeMenu } from './Menus'
import { Avatar, cx, IconButton, MenuButton, MenuItem, Tooltip } from './ui'

export function ThreadView({ thread, onBack }: { thread: Thread; onBack: () => void }) {
  const app = useApp()
  const state = useStore()
  const dispatch = useDispatch()
  const msgs = threadMessages(state, thread)
  const scroller = useRef<HTMLDivElement>(null)

  const starred = thread.labels.includes(SYS.STARRED)
  const inTrash = thread.labels.includes(SYS.TRASH)
  const inSpam = thread.labels.includes(SYS.SPAM)
  const labelChips = thread.labels
    .filter((l) => l.startsWith('lbl_'))
    .map((id) => state.labels.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => !!x)

  const lastReal = [...msgs].reverse().find((m) => !m.draft)
  const inlineDraft = app.compose.find((c) => c.inline && c.threadId === thread.id)

  // Opening a conversation marks it read, like Gmail.
  useEffect(() => {
    const unread = thread.messageIds.filter((id) => {
      const m = state.messages[id]
      return m && !m.draft && m.unread
    })
    if (!unread.length) return
    const run = () => dispatch({ t: 'setUnread', ids: [thread.id], unread: false })
    if (!state.settings.markAsReadDelay) {
      run()
      return
    }
    const timer = window.setTimeout(run, 1500)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id])

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [thread.id])

  const ids = [thread.id]

  return (
    <div className="print-root flex min-h-0 flex-1 flex-col bg-panel">
      <div className="no-print flex h-12 flex-none items-center gap-0.5 border-b border-line-soft px-1 sm:gap-1 sm:px-2">
        <IconButton icon="arrowBack" tip="Back to list" onClick={onBack} />
        <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
        {!inTrash && !inSpam && (
          <IconButton icon="archive" tip="Archive" onClick={() => app.archive(ids)} />
        )}
        {inTrash ? (
          <IconButton
            icon="deleteForever"
            tip="Delete forever"
            onClick={() => app.deleteForever(ids)}
          />
        ) : (
          <IconButton icon="trash" tip="Delete" onClick={() => app.trash(ids)} />
        )}
        {inSpam ? (
          <IconButton
            icon="checkCircle"
            tip="Not spam"
            onClick={() => app.markSpam(ids, false)}
          />
        ) : (
          <IconButton icon="spam" tip="Report spam" onClick={() => app.markSpam(ids, true)} />
        )}
        <IconButton
          icon="markUnread"
          tip="Mark as unread"
          onClick={() => {
            app.setRead(ids, false)
            onBack()
          }}
        />
        <MenuButton icon="clock" tip="Snooze" width={280}>
          {(close) => <SnoozeMenu ids={ids} close={close} />}
        </MenuButton>
        <span className="hidden sm:contents">
          <MenuButton icon="moveTo" tip="Move to" width={280}>
            {(close) => <MoveMenu ids={ids} close={close} />}
          </MenuButton>
          <MenuButton icon="label" tip="Labels" width={280}>
            {(close) => <LabelMenu ids={ids} close={close} />}
          </MenuButton>
        </span>
        <MenuButton icon="moreVert" tip="More" width={260}>
          {(close) => <MoreMenu ids={ids} close={close} />}
        </MenuButton>

        <div className="ml-auto flex items-center gap-1">
          <span className="hidden text-[12px] text-ink-3 sm:block">
            {msgs.length} message{msgs.length === 1 ? '' : 's'}
          </span>
          <IconButton icon="print" tip="Print" onClick={() => window.print()} />
        </div>
      </div>

      <div ref={scroller} className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1000px] px-3 pt-4 pb-12 sm:px-6">
          <header className="mb-4 flex items-start gap-3">
            <h1 className="min-w-0 flex-1 text-[20px] leading-7 font-normal break-words text-ink sm:text-[22px]">
              {thread.subject || '(no subject)'}
              {labelChips.map((l) => (
                <span
                  key={l.id}
                  className="ml-2 inline-flex translate-y-[-2px] items-center gap-1 rounded-[4px] px-2 py-[2px] align-middle text-[11px] leading-4 font-medium"
                  style={{ background: `${l.color}22`, color: l.color }}
                >
                  {l.name}
                  <button
                    type="button"
                    aria-label={`Remove label ${l.name}`}
                    onClick={() => app.applyLabel(ids, l.id, false)}
                    className="no-print grid size-3.5 place-items-center rounded-full hover:bg-black/10"
                  >
                    <Icon name="close" size={12} />
                  </button>
                </span>
              ))}
            </h1>
            <span className="no-print flex flex-none items-center">
              <IconButton
                icon={starred ? 'star' : 'starOutline'}
                tip={starred ? 'Starred' : 'Not starred'}
                tone="star"
                active={starred}
                onClick={() => app.toggleStar(thread.id)}
              />
            </span>
          </header>

          {thread.snoozeUntil && (
            <Banner icon="clock" tone="accent">
              Snoozed until {whenLabel(thread.snoozeUntil)}.{' '}
              <button
                className="font-medium underline"
                onClick={() => app.unsnooze(ids)}
                type="button"
              >
                Unsnooze
              </button>
            </Banner>
          )}
          {inTrash && (
            <Banner icon="trash" tone="warn">
              This conversation is in Trash.{' '}
              <button className="font-medium underline" onClick={() => app.restore(ids)} type="button">
                Move to Inbox
              </button>
            </Banner>
          )}
          {inSpam && (
            <Banner icon="spam" tone="danger">
              This message looks like spam. Links and attachments are not opened.{' '}
              <button
                className="font-medium underline"
                onClick={() => app.markSpam(ids, false)}
                type="button"
              >
                Report not spam
              </button>
            </Banner>
          )}

          <div className="flex flex-col gap-2">
            {msgs.map((m, i) => (
              <MessageItem
                key={m.id}
                thread={thread}
                msg={m}
                // Gmail expands the newest real message plus anything unread;
                // a trailing draft never hides the message it replies to.
                initiallyOpen={m.id === lastReal?.id || (!!m.unread && !m.draft)}
                isLast={i === msgs.length - 1}
              />
            ))}
          </div>

          {inlineDraft ? (
            <div className="mt-3">
              <Compose win={inlineDraft} />
            </div>
          ) : (
            lastReal &&
            !inTrash && (
              <div className="no-print mt-4 flex flex-wrap gap-2">
                <ReplyButton icon="reply" onClick={() => app.replyTo(thread, lastReal, 'reply')}>
                  Reply
                </ReplyButton>
                {(lastReal.to.length > 1 || (lastReal.cc?.length ?? 0) > 0) && (
                  <ReplyButton
                    icon="replyAll"
                    onClick={() => app.replyTo(thread, lastReal, 'replyAll')}
                  >
                    Reply all
                  </ReplyButton>
                )}
                <ReplyButton icon="forward" onClick={() => app.replyTo(thread, lastReal, 'forward')}>
                  Forward
                </ReplyButton>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

function ReplyButton({
  icon,
  children,
  onClick,
}: {
  icon: IconName
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-line-2 px-4 text-[13px] font-medium text-ink-2 transition-colors hover:bg-hov"
    >
      <Icon name={icon} size={18} />
      {children}
    </button>
  )
}

function Banner({
  icon,
  tone,
  children,
}: {
  icon: IconName
  tone: 'accent' | 'warn' | 'danger'
  children: React.ReactNode
}) {
  const cls = {
    accent: 'bg-selected-soft text-accent',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
  }[tone]
  return (
    <div
      className={cx('mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px]', cls)}
      role="status"
    >
      <Icon name={icon} size={18} />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ message */

function MessageItem({
  thread,
  msg,
  initiallyOpen,
  isLast,
}: {
  thread: Thread
  msg: Message
  initiallyOpen: boolean
  isLast: boolean
}) {
  const app = useApp()
  const state = useStore()
  const dispatch = useDispatch()
  const [open, setOpen] = useState(initiallyOpen)
  const [details, setDetails] = useState(false)
  const [showQuoted, setShowQuoted] = useState(false)

  const from = resolveContact(msg.from)
  const mine = msg.from === ME.email
  const toContacts = msg.to.map(resolveContact)
  const ccContacts = (msg.cc ?? []).map(resolveContact)
  const bccContacts = (msg.bcc ?? []).map(resolveContact)

  const { visible, quoted } = useMemo(() => splitQuoted(msg.body), [msg.body])

  if (msg.draft) {
    return (
      <div className="rounded-xl border border-dashed border-line-2 bg-panel-alt px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded bg-danger-soft px-1.5 py-[1px] text-[11px] font-medium text-danger">
            Draft
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] text-ink-3">
            {msg.to.length ? `To ${msg.to.join(', ')}` : 'No recipients yet'} ·{' '}
            {relativeDate(msg.date)}
          </p>
          <button
            type="button"
            onClick={() => app.editDraft(thread, msg)}
            className="text-[13px] font-medium text-accent hover:underline"
          >
            Continue editing
          </button>
          <IconButton
            icon="trash"
            tip="Discard draft"
            size={18}
            padding="p-1.5"
            onClick={() => {
              dispatch({ t: 'draft:discard', messageId: msg.id })
              app.closeCompose(msg.id)
              app.toast('Draft discarded.')
            }}
          />
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-hov sm:px-3"
      >
        {state.settings.senderImages && (
          <Avatar name={from.name} hue={from.hue} size={28} email={from.email} />
        )}
        <span className="flex-none text-[13px] font-medium text-ink">
          {mine ? 'me' : from.name}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3">
          {toSnippet(msg.body).slice(0, 180)}
        </span>
        {!!msg.attachments?.length && <Icon name="attach" size={15} className="text-ink-4" />}
        <span className="flex-none text-[12px] text-ink-3">{relativeDate(msg.date)}</span>
      </button>
    )
  }

  return (
    <article
      className={cx(
        'rounded-xl bg-panel px-1 py-3 sm:px-3',
        !isLast && 'border-b border-line-soft last:border-0',
      )}
    >
      <div className="flex items-start gap-3">
        {state.settings.senderImages && (
          <Avatar name={from.name} hue={from.hue} size={40} email={from.email} className="mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[14px] font-medium text-ink">{mine ? 'me' : from.name}</span>
            {/* The address is redundant next to the name on a phone. */}
            <span className="hidden text-[12px] text-ink-3 sm:inline">&lt;{msg.from}&gt;</span>
            <div className="ml-auto flex items-center gap-1">
              {msg.sendAt && (
                <span className="rounded bg-selected-soft px-1.5 py-[1px] text-[11px] font-medium text-accent">
                  Sends {whenLabel(msg.sendAt)}
                </span>
              )}
              <Tooltip label={fullDate(msg.date)}>
                <span className="text-[12px] whitespace-nowrap text-ink-3">
                  {messageDate(msg.date)}
                </span>
              </Tooltip>
              <span className="no-print flex items-center">
                <IconButton
                  icon="important"
                  tip={
                    thread.labels.includes(SYS.IMPORTANT) ? 'Mark not important' : 'Mark important'
                  }
                  tone="important"
                  active={thread.labels.includes(SYS.IMPORTANT)}
                  size={16}
                  padding="p-1.5"
                  onClick={() => app.toggleImportant([thread.id])}
                />
                <IconButton
                  icon="reply"
                  tip="Reply"
                  size={18}
                  padding="p-1.5"
                  onClick={() => app.replyTo(thread, msg, 'reply')}
                />
                <MenuButton icon="moreVert" tip="More" size={18} padding="p-1.5" width={240}>
                  {(close) => (
                    <>
                      <MenuItem
                        icon="reply"
                        onClick={() => (close(), app.replyTo(thread, msg, 'reply'))}
                      >
                        Reply
                      </MenuItem>
                      <MenuItem
                        icon="replyAll"
                        onClick={() => (close(), app.replyTo(thread, msg, 'replyAll'))}
                      >
                        Reply all
                      </MenuItem>
                      <MenuItem
                        icon="forward"
                        onClick={() => (close(), app.replyTo(thread, msg, 'forward'))}
                      >
                        Forward
                      </MenuItem>
                      <MenuItem icon="unfold" onClick={() => (close(), setDetails((v) => !v))}>
                        {details ? 'Hide details' : 'Show original details'}
                      </MenuItem>
                      <MenuItem icon="print" onClick={() => (close(), window.print())}>
                        Print
                      </MenuItem>
                      <MenuItem
                        icon="mail"
                        onClick={() => {
                          close()
                          dispatch({ t: 'setMessageUnread', id: msg.id, unread: true })
                          app.toast('Message marked as unread.')
                        }}
                      >
                        Mark this message unread
                      </MenuItem>
                      <MenuItem
                        icon="minimize"
                        onClick={() => (close(), setOpen(false))}
                      >
                        Collapse
                      </MenuItem>
                    </>
                  )}
                </MenuButton>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDetails((v) => !v)}
            className="flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink-2"
          >
            <span className="truncate">
              to {recipientLine(toContacts)}
              {ccContacts.length > 0 && `, cc ${recipientLine(ccContacts)}`}
            </span>
            <Icon name={details ? 'expandLess' : 'expandMore'} size={14} />
          </button>

          {details && (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-lg bg-panel-alt px-3 py-2 text-[12px]">
              <Detail label="from">
                {from.name} &lt;{msg.from}&gt;
              </Detail>
              <Detail label="to">{msg.to.join(', ') || '—'}</Detail>
              {!!ccContacts.length && <Detail label="cc">{msg.cc?.join(', ')}</Detail>}
              {!!bccContacts.length && <Detail label="bcc">{msg.bcc?.join(', ')}</Detail>}
              <Detail label="date">{fullDate(msg.date)}</Detail>
              <Detail label="subject">{thread.subject}</Detail>
            </dl>
          )}

          <div className="mail-body mt-3 text-[14px] leading-[1.6] text-ink">
            <div dangerouslySetInnerHTML={{ __html: visible }} />
            {quoted && (
              <>
                <button
                  type="button"
                  onClick={() => setShowQuoted((v) => !v)}
                  aria-label="Show trimmed content"
                  className="no-print my-2 inline-flex h-4 items-center rounded bg-line px-1.5 leading-none text-ink-2 transition-colors hover:bg-line-2"
                >
                  <Icon name="moreHoriz" size={14} />
                </button>
                {showQuoted && <div dangerouslySetInnerHTML={{ __html: quoted }} />}
              </>
            )}
          </div>

          {!!msg.attachments?.length && (
            <AttachmentGrid message={msg} attachments={msg.attachments} />
          )}
        </div>
      </div>
    </article>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-right text-ink-3">{label}:</dt>
      <dd className="min-w-0 break-words text-ink-2">{children}</dd>
    </>
  )
}

function recipientLine(cs: Contact[]) {
  if (!cs.length) return 'undisclosed recipients'
  const shown = cs.slice(0, 3).map((c) => (c.email === ME.email ? 'me' : c.name))
  return shown.join(', ') + (cs.length > 3 ? `, +${cs.length - 3}` : '')
}

/* --------------------------------------------------------------- attachments */

function AttachmentGrid({ message, attachments }: { message: Message; attachments: Attachment[] }) {
  const app = useApp()
  return (
    <div className="mt-4 border-t border-line-soft pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-[12px] text-ink-3">
        <Icon name="attach" size={14} />
        {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
      </p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-label={`Preview ${a.name}, ${fileSize(a.size)}`}
            onClick={() =>
              app.setDialog({ kind: 'attachment', messageId: message.id, attachmentId: a.id })
            }
            className="group/att w-[170px] overflow-hidden rounded-lg border border-line-2 text-left transition-shadow hover:shadow-e1"
          >
            <span
              className="grid h-[88px] place-items-center"
              style={{ background: a.preview ?? ATTACHMENT_TINT[a.kind] }}
            >
              <Icon
                name={a.kind === 'image' ? 'image' : a.kind}
                size={30}
                className={a.preview ? 'text-white/90' : 'text-white'}
              />
            </span>
            <span className="flex items-center gap-1.5 border-t border-line-2 bg-panel px-2 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-ink">{a.name}</span>
                <span className="block text-[11px] text-ink-3">{fileSize(a.size)}</span>
              </span>
              <Icon
                name="download"
                size={16}
                className="text-ink-4 opacity-0 transition-opacity group-hover/att:opacity-100"
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- utils */

/** Splits Gmail's trimmed-quote block out of the body so it can be collapsed. */
function splitQuoted(html: string) {
  const i = html.indexOf('<div class="quoted">')
  if (i === -1) return { visible: html, quoted: '' }
  return { visible: html.slice(0, i), quoted: html.slice(i) }
}
