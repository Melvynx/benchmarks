import { useMemo, useState } from 'react'
import { useApp } from '../lib/app'
import { whenLabel } from '../lib/format'
import { useDispatch, useStore } from '../lib/store'
import { SYS, type Category } from '../lib/types'
import { Icon, type IconName } from './Icon'
import { Button, cx, MenuDivider, MenuHeading, MenuItem } from './ui'

const DAY = 86_400_000

function atHour(base: number, hour: number, minute = 0) {
  const d = new Date(base)
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}

/** Gmail's snooze presets, skipping any that have already passed today. */
export function snoozeOptions(now = Date.now()) {
  const d = new Date(now)
  const hour = d.getHours()
  const out: { key: string; label: string; when: number }[] = []

  if (hour < 13) out.push({ key: 'later', label: 'Later today', when: atHour(now, 13) })
  else if (hour < 17) out.push({ key: 'later', label: 'Later today', when: atHour(now, 18) })
  else if (hour < 20) out.push({ key: 'later', label: 'This evening', when: atHour(now, 20) })

  out.push({ key: 'tomorrow', label: 'Tomorrow', when: atHour(now + DAY, 8) })

  // Saturday of the current week; next week's if the weekend has started.
  const dow = d.getDay()
  const daysToSat = (6 - dow + 7) % 7
  if (dow !== 6 && dow !== 0)
    out.push({ key: 'weekend', label: 'This weekend', when: atHour(now + daysToSat * DAY, 8) })

  const daysToMon = (8 - dow) % 7 || 7
  out.push({ key: 'nextweek', label: 'Next week', when: atHour(now + daysToMon * DAY, 8) })
  out.push({ key: 'month', label: 'Next month', when: atHour(now + 30 * DAY, 8) })
  return out
}

export function SnoozeMenu({ ids, close }: { ids: string[]; close: () => void }) {
  const app = useApp()
  const [custom, setCustom] = useState(false)
  const now = Date.now()
  const options = useMemo(() => snoozeOptions(now), [now])
  const [value, setValue] = useState(() => {
    const d = new Date(now + DAY)
    d.setHours(8, 0, 0, 0)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
  })

  if (custom) {
    return (
      <div className="px-4 pt-1 pb-2">
        <p className="mb-2 text-[13px] font-medium text-ink">Pick date &amp; time</p>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 w-full rounded border border-line-2 bg-transparent px-2 text-[13px] text-ink outline-none focus:border-accent"
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="text" onClick={() => setCustom(false)}>
            Back
          </Button>
          <Button
            variant="filled"
            onClick={() => {
              const t = new Date(value).getTime()
              if (!Number.isNaN(t)) app.snooze(ids, t)
              close()
            }}
          >
            Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <MenuHeading>Snooze until</MenuHeading>
      {options.map((o) => (
        <MenuItem
          key={o.key}
          trailing={whenLabel(o.when, now)}
          onClick={() => {
            app.snooze(ids, o.when)
            close()
          }}
        >
          {o.label}
        </MenuItem>
      ))}
      <MenuDivider />
      <MenuItem icon="calendar" onClick={() => setCustom(true)}>
        Pick date &amp; time
      </MenuItem>
    </>
  )
}

export function LabelMenu({ ids, close }: { ids: string[]; close: () => void }) {
  const app = useApp()
  const state = useStore()
  const [filter, setFilter] = useState('')

  const threads = state.threads.filter((t) => ids.includes(t.id))
  const status = (labelId: string): boolean | 'mixed' => {
    const on = threads.filter((t) => t.labels.includes(labelId)).length
    if (on === 0) return false
    if (on === threads.length) return true
    return 'mixed'
  }

  const shown = state.labels.filter((l) => l.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      <div className="px-3 pb-2">
        <p className="px-1 pb-2 text-[13px] font-medium text-ink">Label as:</p>
        <input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search labels"
          className="h-8 w-full rounded border border-line-2 bg-transparent px-2 text-[13px] outline-none focus:border-accent"
        />
      </div>
      <div className="max-h-60 overflow-y-auto scroll-thin">
        {shown.map((l) => {
          const st = status(l.id)
          return (
            <MenuItem
              key={l.id}
              checkbox={st}
              swatch={l.color}
              onClick={() => app.applyLabel(ids, l.id, st !== true)}
            >
              {l.name}
            </MenuItem>
          )
        })}
        {!shown.length && (
          <p className="px-4 py-3 text-[13px] text-ink-3">No labels match “{filter}”.</p>
        )}
      </div>
      <MenuDivider />
      <MenuItem
        icon="add"
        onClick={() => {
          close()
          app.setDialog({ kind: 'newLabel', seed: filter, applyTo: ids })
        }}
      >
        Create new
      </MenuItem>
    </>
  )
}

export function MoveMenu({ ids, close }: { ids: string[]; close: () => void }) {
  const app = useApp()
  const state = useStore()
  const [filter, setFilter] = useState('')
  const shown = state.labels.filter((l) => l.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      <div className="px-3 pb-2">
        <p className="px-1 pb-2 text-[13px] font-medium text-ink">Move to:</p>
        <input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search labels"
          className="h-8 w-full rounded border border-line-2 bg-transparent px-2 text-[13px] outline-none focus:border-accent"
        />
      </div>
      <div className="max-h-52 overflow-y-auto scroll-thin">
        {shown.map((l) => (
          <MenuItem
            key={l.id}
            swatch={l.color}
            onClick={() => {
              app.moveTo(ids, l.id)
              close()
            }}
          >
            {l.name}
          </MenuItem>
        ))}
      </div>
      <MenuDivider />
      <MenuItem
        icon="spam"
        onClick={() => {
          app.markSpam(ids, true)
          close()
        }}
      >
        Spam
      </MenuItem>
      <MenuItem
        icon="trash"
        onClick={() => {
          app.trash(ids)
          close()
        }}
      >
        Trash
      </MenuItem>
    </>
  )
}

/** Overflow menu shared by the toolbar and the row context menu. */
export function MoreMenu({ ids, close }: { ids: string[]; close: () => void }) {
  const app = useApp()
  const state = useStore()
  const dispatch = useDispatch()
  const threads = state.threads.filter((t) => ids.includes(t.id))
  const anyUnread = threads.some((t) =>
    t.messageIds.some((id) => state.messages[id]?.unread && !state.messages[id]?.draft),
  )
  const inTrash = threads.some((t) => t.labels.includes(SYS.TRASH))
  const inSpam = threads.some((t) => t.labels.includes(SYS.SPAM))
  const anyImportant = threads.some((t) => t.labels.includes(SYS.IMPORTANT))
  const anySnoozed = threads.some((t) => t.labels.includes(SYS.SNOOZED))

  const run = (fn: () => void) => () => {
    fn()
    close()
  }

  return (
    <>
      <MenuItem icon={anyUnread ? 'mailOpen' : 'mail'} onClick={run(() => app.setRead(ids, anyUnread))}>
        Mark as {anyUnread ? 'read' : 'unread'}
      </MenuItem>
      {anySnoozed && (
        <MenuItem icon="clock" onClick={run(() => app.unsnooze(ids))}>
          Unsnooze
        </MenuItem>
      )}
      <MenuItem icon="important" onClick={run(() => app.toggleImportant(ids))}>
        Mark as {anyImportant ? 'not important' : 'important'}
      </MenuItem>
      <MenuDivider />
      {inTrash || inSpam ? (
        <MenuItem icon="moveToInbox" onClick={run(() => app.restore(ids))}>
          Move to Inbox
        </MenuItem>
      ) : (
        <MenuItem icon="archive" onClick={run(() => app.archive(ids))}>
          Archive
        </MenuItem>
      )}
      {inSpam ? (
        <MenuItem icon="checkCircle" onClick={run(() => app.markSpam(ids, false))}>
          Not spam
        </MenuItem>
      ) : (
        <MenuItem icon="spam" onClick={run(() => app.markSpam(ids, true))}>
          Report spam
        </MenuItem>
      )}
      {inTrash ? (
        <MenuItem icon="trash" danger onClick={run(() => app.deleteForever(ids))}>
          Delete forever
        </MenuItem>
      ) : (
        <MenuItem icon="trash" onClick={run(() => app.trash(ids))}>
          Delete
        </MenuItem>
      )}
      <MenuDivider />
      <MenuHeading>Move to tab</MenuHeading>
      {CATEGORY_TABS.map(({ key, title }) => (
        <MenuItem
          key={key}
          selected={threads.length > 0 && threads.every((t) => t.category === key)}
          onClick={run(() => {
            dispatch({ t: 'setCategory', ids, category: key })
            app.clearSelection()
            app.toast(`${ids.length === 1 ? 'Conversation' : `${ids.length} conversations`} moved to ${title}.`)
          })}
        >
          {title}
        </MenuItem>
      ))}
    </>
  )
}

const CATEGORY_TABS: { key: Category; title: string; icon: IconName }[] = [
  { key: 'primary', title: 'Primary', icon: 'inbox' },
  { key: 'promotions', title: 'Promotions', icon: 'offer' },
  { key: 'social', title: 'Social', icon: 'people' },
  { key: 'updates', title: 'Updates', icon: 'info' },
  { key: 'forums', title: 'Forums', icon: 'forum' },
]

export function CategoryTabs() {
  const app = useApp()
  const state = useStore()
  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const t of state.threads) {
      if (!t.labels.includes(SYS.INBOX) || t.labels.includes(SYS.TRASH) || t.labels.includes(SYS.SPAM))
        continue
      if (t.labels.includes(SYS.SNOOZED)) continue
      const unread = t.messageIds.some((id) => state.messages[id]?.unread)
      if (unread) out[t.category] = (out[t.category] ?? 0) + 1
    }
    return out
  }, [state])

  const current = app.route.category ?? 'primary'

  return (
    <div
      className="flex overflow-x-auto border-b border-line px-1 sm:px-2"
      role="tablist"
      aria-label="Inbox categories"
    >
      {CATEGORY_TABS.map((t) => {
        const active = current === t.key
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => app.navigate({ kind: 'inbox', category: t.key })}
            className={cx(
              'relative flex h-12 min-w-[110px] flex-1 items-center gap-3 px-3 text-[14px] transition-colors sm:min-w-[140px] sm:px-4',
              active ? 'font-medium text-accent' : 'text-ink-2 hover:bg-hov',
            )}
          >
            <Icon name={t.icon} size={20} />
            <span className="truncate">{t.title}</span>
            {!!counts[t.key] && !active && (
              <span className="text-[12px] font-medium text-accent">{counts[t.key]}</span>
            )}
            {active && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t bg-accent" />}
          </button>
        )
      })}
    </div>
  )
}
