import { memo, useMemo, useRef, useState } from 'react'
import { useApp, threadPreview } from '../lib/app'
import { ME, resolveContact } from '../lib/contacts'
import { attachmentSummary, dateGroup, firstName, listDate, whenLabel } from '../lib/format'
import { useMedia } from '../lib/media'
import { formatHash } from '../lib/router'
import { highlightTerms, parseQuery, splitHighlight } from '../lib/search'
import { hasAttachments, isUnread, threadMessages, useStore, type State } from '../lib/store'
import { SYS, type Message, type Thread } from '../lib/types'
import { Icon, type IconName } from './Icon'
import { LabelMenu, MoreMenu, SnoozeMenu } from './Menus'
import { Avatar, cx, IconButton, MenuButton, Popover, Tooltip } from './ui'

const ROW_HEIGHT = { default: 'h-10', comfortable: 'h-[52px]', compact: 'h-8' } as const

/** Gmail's sender column: "me", "A, B", "A, B, C" with a count for long threads. */
function senderLine(msgs: Message[], unreadIds: Set<string>) {
  const real = msgs.filter((m) => !m.draft)
  const list = real.length ? real : msgs
  const names: { text: string; unread: boolean }[] = []
  for (const m of list) {
    const name = m.from === ME.email ? 'me' : firstName(resolveContact(m.from))
    const prev = names[names.length - 1]
    if (prev?.text === name) {
      prev.unread = prev.unread || unreadIds.has(m.id)
      continue
    }
    names.push({ text: name, unread: unreadIds.has(m.id) })
  }
  if (names.length <= 3) return names
  return [names[0], { text: '…', unread: false }, names[names.length - 1]]
}

export function ThreadList({ compact }: { compact?: boolean }) {
  const app = useApp()
  const state = useStore()
  const threads = app.threads
  const density = state.settings.density
  // Phones get Gmail's three-line row: avatar, sender/date, subject, snippet.
  const mobile = useMedia('(max-width: 639px)')

  const groups = useMemo(() => {
    const out: { key: string; label: string; threads: Thread[] }[] = []
    for (const t of threads) {
      const label = dateGroup(t.lastActivity)
      const last = out[out.length - 1]
      if (last?.label === label) last.threads.push(t)
      else out.push({ key: label, label, threads: [t] })
    }
    return out
  }, [threads])

  if (!threads.length) return <EmptyState />

  const showGroups = app.route.kind !== 'search' && threads.length > 6

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scroll-quiet" role="list">
      {groups.map((g) => (
        <div key={g.key}>
          {showGroups && (
            <div className="sticky top-0 z-[1] flex h-8 items-center bg-panel px-4 text-[11px] font-medium tracking-wide text-ink-3 uppercase sm:px-6">
              {g.label}
            </div>
          )}
          {g.threads.map((t) => (
            <ThreadRow
              key={t.id}
              thread={t}
              state={state}
              density={density}
              compact={compact}
              mobile={mobile}
            />
          ))}
        </div>
      ))}
      <div className="px-4 py-6 text-center text-[12px] text-ink-4 sm:px-6">
        {app.total} conversation{app.total === 1 ? '' : 's'} · seeded locally, stored in this
        browser
      </div>
    </div>
  )
}

interface RowProps {
  thread: Thread
  state: State
  density: State['settings']['density']
  compact?: boolean
  mobile?: boolean
}

const ThreadRow = memo(function ThreadRow({
  thread: t,
  state,
  density,
  compact,
  mobile,
}: RowProps) {
  const app = useApp()
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const anchor = useRef<HTMLDivElement>(null)

  const msgs = threadMessages(state, t)
  const unread = isUnread(state, t)
  const unreadIds = useMemo(
    () => new Set(msgs.filter((m) => m.unread && !m.draft).map((m) => m.id)),
    [msgs],
  )
  const selected = app.isSelected(t.id)
  const open = app.route.threadId === t.id
  const starred = t.labels.includes(SYS.STARRED)
  const important = t.labels.includes(SYS.IMPORTANT)
  const draft = t.labels.includes(SYS.DRAFT)
  const scheduled = t.labels.includes(SYS.SCHEDULED)
  const attach = hasAttachments(state, t)
  const senders = senderLine(msgs, unreadIds)
  const snippet = state.settings.snippets ? threadPreview(state, t) : ''
  const chips = t.labels
    .filter((l) => l.startsWith('lbl_'))
    .map((id) => state.labels.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => !!x)

  const terms = app.route.kind === 'search' ? app.route.query : undefined
  const needles = useMemo(() => (terms ? highlightTerms(parseQuery(terms)) : []), [terms])

  const pending = msgs.find((m) => m.sendAt)
  const dateText = scheduled && pending ? whenLabel(pending.sendAt!) : listDate(t.lastActivity)

  const activate = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    if (draft && msgs.length === 1 && msgs[0].draft) {
      app.editDraft(t, msgs[0])
      return
    }
    app.setCursor(t.id)
    app.openThread(t.id)
  }

  const stacked = !!compact || !!mobile
  const rowH = stacked ? 'h-auto min-h-[72px] py-2' : ROW_HEIGHT[density]
  const lead = msgs.filter((m) => !m.draft).pop() ?? msgs[msgs.length - 1]
  const leadFrom = resolveContact(lead?.from ?? ME.email)

  return (
    <>
      <div
        ref={anchor}
        role="listitem"
        data-thread={t.id}
        draggable
        onDragStart={(e) => {
          const ids = selected ? app.selection : [t.id]
          e.dataTransfer.setData('text/thread-ids', JSON.stringify(ids))
          e.dataTransfer.effectAllowed = 'move'
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          if (!selected) app.setSelection([t.id])
          setMenu({ x: e.clientX, y: e.clientY })
        }}
        className={cx(
          'group relative flex items-center gap-1 border-b border-line-soft px-1 text-[14px] sm:gap-2 sm:px-2',
          rowH,
          selected
            ? 'bg-selected'
            : open
              ? 'bg-selected-soft'
              : unread
                ? 'bg-panel font-medium shadow-[inset_0_-1px_0_var(--c-line-soft)] hover:z-[2] hover:shadow-e1'
                : 'bg-panel-alt hover:z-[2] hover:shadow-e1',
          app.cursor === t.id &&
            state.settings.shortcuts &&
            'z-[2] outline-2 -outline-offset-2 outline-accent/45',
        )}
      >
        <span className="hidden sm:contents">
          <Tooltip label={selected ? 'Deselect' : 'Select'}>
            <button
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-label={`Select conversation: ${t.subject}`}
              onClick={(e) => app.toggleSelect(t.id, e.shiftKey)}
              className={cx(
                'grid size-8 flex-none place-items-center rounded-full transition-colors hover:bg-hov',
                selected ? 'text-accent' : 'text-ink-4',
              )}
            >
              <Icon name={selected ? 'checkboxChecked' : 'checkboxBlank'} size={18} />
            </button>
          </Tooltip>
          <IconButton
            icon={starred ? 'star' : 'starOutline'}
            tip={starred ? 'Starred' : 'Not starred'}
            tone="star"
            active={starred}
            size={18}
            padding="p-1.5"
            onClick={() => app.toggleStar(t.id)}
          />
          <Tooltip label={important ? 'Important' : 'Mark as important'}>
            <button
              type="button"
              aria-label="Toggle important"
              onClick={() => app.toggleImportant([t.id])}
              className={cx(
                'grid h-8 w-5 flex-none place-items-center rounded transition-colors',
                important ? 'text-important' : 'text-ink-5 hover:text-ink-3',
              )}
            >
              <Icon name="important" size={16} />
            </button>
          </Tooltip>
        </span>

        {mobile && (
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-label={`Select conversation: ${t.subject}`}
            onClick={() => app.toggleSelect(t.id)}
            className="grid size-11 flex-none translate-y-[1px] place-items-center self-start rounded-full"
          >
            {selected ? (
              <span className="grid size-9 place-items-center rounded-full bg-accent text-white">
                <Icon name="check" size={20} />
              </span>
            ) : state.settings.senderImages ? (
              <Avatar name={leadFrom.name} hue={leadFrom.hue} size={36} />
            ) : (
              <Icon name="checkboxBlank" size={20} className="text-ink-4" />
            )}
          </button>
        )}

        <a
          href={formatHash({ ...app.route, threadId: t.id })}
          onClick={activate}
          className={cx(
            'flex min-w-0 flex-1 items-center gap-2',
            stacked && 'flex-col items-stretch gap-0.5 py-1',
          )}
        >
          {stacked ? (
            <>
              <div className="flex items-baseline gap-2">
                <span
                  className={cx(
                    'min-w-0 flex-1 truncate text-[14px]',
                    unread ? 'font-semibold text-ink' : 'text-ink-2',
                  )}
                >
                  {draft && !scheduled && msgs.every((m) => m.draft) ? (
                    <span className="text-danger">Draft</span>
                  ) : (
                    senders.map((s) => s.text).join(', ')
                  )}
                  {msgs.length > 1 && (
                    <span className="ml-1 text-[12px] text-ink-3">{msgs.length}</span>
                  )}
                </span>
                <span
                  className={cx(
                    'flex-none text-[12px] tabular-nums',
                    unread ? 'font-semibold text-ink' : 'text-ink-3',
                  )}
                >
                  {dateText}
                </span>
              </div>
              <span
                className={cx('truncate text-[14px]', unread ? 'font-semibold text-ink' : 'text-ink-2')}
              >
                {/* On a phone the labels move down a line so the subject gets the full width. */}
                {!mobile && <Chips chips={chips} />}
                <Hl text={t.subject || '(no subject)'} needles={needles} />
              </span>
              <span className="flex items-center gap-1.5 truncate text-[13px] text-ink-3">
                {attach && <Icon name="attach" size={14} className="flex-none text-ink-4" />}
                {mobile && <Chips chips={chips} />}
                <span className="truncate">{snippet}</span>
              </span>
            </>
          ) : (
            <>
              <span
                className={cx(
                  'w-[140px] flex-none truncate lg:w-[176px] xl:w-[200px]',
                  unread ? 'font-semibold text-ink' : 'text-ink-2',
                )}
              >
                {draft && msgs.every((m) => m.draft) ? (
                  <span className="text-danger">Draft</span>
                ) : (
                  senders.map((s, i) => (
                    <span key={i} className={s.unread ? 'font-semibold text-ink' : undefined}>
                      {i > 0 && <span className="text-ink-3">, </span>}
                      {s.text}
                    </span>
                  ))
                )}
                {msgs.length > 1 && (
                  <span className="ml-1.5 text-[12px] font-normal text-ink-3">{msgs.length}</span>
                )}
              </span>

              <span className="flex min-w-0 flex-1 items-baseline gap-1.5 truncate">
                <Chips chips={chips} />
                <span className={cx('flex-none truncate', unread ? 'text-ink' : 'text-ink-2')}>
                  {draft && scheduled && <span className="mr-1 text-accent">Scheduled</span>}
                  <Hl text={t.subject || '(no subject)'} needles={needles} />
                </span>
                {snippet && (
                  <span className="min-w-0 truncate text-[13px] font-normal text-ink-3">
                    <span className="mr-1">&ndash;</span>
                    <Hl text={snippet} needles={needles} />
                  </span>
                )}
              </span>
            </>
          )}
        </a>

        {mobile && (
          <IconButton
            icon={starred ? 'star' : 'starOutline'}
            tip={starred ? 'Starred' : 'Not starred'}
            tone="star"
            active={starred}
            size={20}
            onClick={() => app.toggleStar(t.id)}
          />
        )}

        {!stacked && (
          <div className="flex flex-none items-center gap-1 pr-1">
            {attach && (
              <Tooltip label={attachmentSummary(msgs.flatMap((m) => m.attachments ?? []))}>
                <span className="hidden text-ink-4 group-hover:hidden sm:block">
                  <Icon name="attach" size={16} />
                </span>
              </Tooltip>
            )}
            {t.snoozeUntil && (
              <span className="hidden text-[12px] text-accent group-hover:hidden sm:block">
                {whenLabel(t.snoozeUntil)}
              </span>
            )}
            <span
              className={cx(
                'w-[62px] text-right text-[12px] tabular-nums sm:group-hover:hidden',
                unread ? 'font-semibold text-ink' : 'text-ink-3',
                scheduled && 'text-accent',
              )}
            >
              {dateText}
            </span>

            {/* Hover actions replace the date, exactly like Gmail. */}
            <div className="hidden items-center sm:group-hover:flex">
              {app.route.kind === 'trash' || app.route.kind === 'spam' ? (
                <IconButton
                  icon="moveToInbox"
                  tip="Move to Inbox"
                  size={18}
                  padding="p-1.5"
                  onClick={() => app.restore([t.id])}
                />
              ) : (
                <IconButton
                  icon="archive"
                  tip="Archive"
                  size={18}
                  padding="p-1.5"
                  onClick={() => app.archive([t.id])}
                />
              )}
              <IconButton
                icon="trash"
                tip="Delete"
                size={18}
                padding="p-1.5"
                onClick={() => app.trash([t.id])}
              />
              <IconButton
                icon={unread ? 'mailOpen' : 'mail'}
                tip={unread ? 'Mark as read' : 'Mark as unread'}
                size={18}
                padding="p-1.5"
                onClick={() => app.setRead([t.id], unread)}
              />
              <MenuButton icon="clock" tip="Snooze" size={18} padding="p-1.5" width={280}>
                {(close) => <SnoozeMenu ids={[t.id]} close={close} />}
              </MenuButton>
            </div>
          </div>
        )}
      </div>

      {menu && (
        <RowContextMenu
          ids={app.selection.length ? app.selection : [t.id]}
          at={menu}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  )
})

function RowContextMenu({
  ids,
  at,
  onClose,
}: {
  ids: string[]
  at: { x: number; y: number }
  onClose: () => void
}) {
  // A 1×1 virtual anchor lets the shared Popover handle clamping and dismissal.
  const [el, setEl] = useState<HTMLElement | null>(null)
  return (
    <>
      <span
        ref={setEl}
        className="pointer-events-none fixed"
        style={{ left: at.x, top: at.y, width: 1, height: 1 }}
      />
      <Popover open anchor={el} onClose={onClose} placement="bottom-start" width={260}>
        <MoreMenu ids={ids} close={onClose} />
        <LabelMenuInline ids={ids} close={onClose} />
      </Popover>
    </>
  )
}

function LabelMenuInline({ ids, close }: { ids: string[]; close: () => void }) {
  const [open, setOpen] = useState(false)
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 border-t border-line px-4 py-[7px] text-left text-[13px] text-ink transition-colors hover:bg-hov"
      >
        <Icon name="label" size={18} className="text-ink-3" />
        <span className="flex-1">Label as…</span>
        <Icon name="chevronRight" size={16} className="text-ink-4" />
      </button>
    )
  return (
    <div className="border-t border-line pt-2">
      <LabelMenu ids={ids} close={close} />
    </div>
  )
}

function Chips({ chips }: { chips: { id: string; name: string; color: string }[] }) {
  if (!chips.length) return null
  return (
    <>
      {chips.slice(0, 3).map((l) => (
        <span
          key={l.id}
          className="mr-1 inline-flex max-w-[120px] flex-none items-center truncate rounded-[4px] px-1.5 py-[1px] text-[11px] leading-4 font-medium"
          style={{ background: `${l.color}22`, color: l.color }}
        >
          {l.name}
        </span>
      ))}
    </>
  )
}

function Hl({ text, needles }: { text: string; needles: string[] }) {
  if (!needles.length) return <>{text}</>
  return (
    <>
      {splitHighlight(text, needles).map(([part, hit], i) =>
        hit ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
      )}
    </>
  )
}

interface Empty {
  icon: IconName
  title: string
  body: string
}

function EmptyState() {
  const app = useApp()
  const kind = app.route.kind
  const copy: Record<string, Empty> = {
    inbox: {
      icon: 'checkCircle',
      title: "You're all caught up",
      body: 'Nothing new in this tab. Anything you archive stays searchable in All Mail.',
    },
    starred: {
      icon: 'starOutline',
      title: 'No starred conversations',
      body: 'Star a conversation to find it quickly later.',
    },
    snoozed: { icon: 'clock', title: 'Nothing snoozed', body: 'Snoozed mail returns to your inbox on schedule.' },
    sent: { icon: 'send', title: 'No sent mail yet', body: 'Messages you send appear here.' },
    drafts: { icon: 'mailOpen', title: 'No drafts', body: 'Unfinished messages are saved here automatically.' },
    scheduled: { icon: 'scheduleSend', title: 'Nothing scheduled', body: 'Use “Schedule send” in the composer.' },
    important: { icon: 'important', title: 'Nothing marked important', body: 'Important mail is flagged here.' },
    spam: { icon: 'spam', title: 'No spam', body: 'Reported mail is kept here for 30 days.' },
    trash: { icon: 'trash', title: 'Trash is empty', body: 'Deleted mail is kept here for 30 days.' },
    all: { icon: 'allMail', title: 'Nothing here', body: 'All your mail lives in this view.' },
    label: { icon: 'label', title: 'No mail with this label', body: 'Drag a conversation onto a label to apply it.' },
    search: {
      icon: 'search',
      title: 'No results',
      body: 'Try different keywords, or remove search operators like from: and has:attachment.',
    },
  }
  const c = copy[kind] ?? copy.all

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-selected-soft text-accent">
        <Icon name={c.icon} size={30} />
      </span>
      <p className="text-[16px] text-ink">{c.title}</p>
      <p className="max-w-[38ch] text-[13px] leading-5 text-ink-3">{c.body}</p>
      {kind === 'inbox' && (
        <button
          type="button"
          onClick={() => app.openCompose()}
          className="mt-1 text-[13px] font-medium text-accent hover:underline"
        >
          Compose a message
        </button>
      )}
    </div>
  )
}
