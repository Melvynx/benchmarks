import { useMemo, useState, type ReactNode } from 'react'
import { AlarmClock, FolderInput, Inbox, Tag, Check, Minus, Calendar } from 'lucide-react'
import { useMail } from '../store/mail'
import { useUI } from '../store/ui'
import { actions } from '../actions'
import { Button, Dropdown, IconButton, MenuDivider, MenuItem, MenuLabel, Modal, cx } from './ui'
import { atHour, nextWeekday } from '../lib/format'

function snoozeOptions(now = Date.now()) {
  const d = new Date(now)
  const opts: { label: string; at: number }[] = []
  const laterToday = atHour(0, Math.max(d.getHours() + 3, 18), 0, now)
  if (d.getHours() < 20) opts.push({ label: 'Later today', at: laterToday })
  opts.push({ label: 'Tomorrow', at: atHour(1, 8, 0, now) })
  const day = d.getDay()
  if (day !== 6 && day !== 0) opts.push({ label: 'This weekend', at: nextWeekday(6, 8, now) })
  opts.push({ label: 'Next week', at: nextWeekday(1, 8, now) })
  return opts
}

function fmtOpt(ts: number) {
  const d = new Date(ts)
  const sameDay = new Date().toDateString() === d.toDateString()
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

export function DateTimeDialog({
  open,
  onClose,
  onPick,
  title,
  confirm,
}: {
  open: boolean
  onClose: () => void
  onPick: (ts: number) => void
  title: string
  confirm: string
}) {
  const initial = useMemo(() => {
    const t = new Date(atHour(1, 8))
    const pad = (n: number) => String(n).padStart(2, '0')
    return { date: `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`, time: '08:00' }
  }, [])
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const ts = new Date(`${date}T${time}`).getTime()
  const valid = !Number.isNaN(ts) && ts > Date.now()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={380}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="filled"
            disabled={!valid}
            onClick={() => {
              onPick(ts)
              onClose()
            }}
          >
            {confirm}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-md border border-line-strong bg-transparent px-3 text-[15px] text-ink outline-none focus:border-accent" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Time
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-md border border-line-strong bg-transparent px-3 text-[15px] text-ink outline-none focus:border-accent" />
        </label>
        {!valid && <p className="text-xs text-danger">Pick a time in the future.</p>}
      </div>
    </Modal>
  )
}

export function SnoozeMenu({ ids, trigger, onDone }: { ids: string[]; trigger?: (toggle: () => void) => ReactNode; onDone?: () => void }) {
  const [custom, setCustom] = useState(false)
  return (
    <>
      <Dropdown
        width={290}
        trigger={({ toggle }) =>
          trigger ? trigger(toggle) : (
            <IconButton label="Snooze" onClick={toggle}>
              <AlarmClock size={20} />
            </IconButton>
          )
        }
      >
        {(close) => (
          <>
            <MenuLabel>Snooze until…</MenuLabel>
            {snoozeOptions().map((o) => (
              <MenuItem
                key={o.label}
                hint={fmtOpt(o.at)}
                onClick={() => {
                  close()
                  actions.snooze(ids, o.at)
                  onDone?.()
                }}
              >
                {o.label}
              </MenuItem>
            ))}
            <MenuDivider />
            <MenuItem
              icon={<Calendar size={18} />}
              onClick={() => {
                close()
                setCustom(true)
              }}
            >
              Pick date &amp; time
            </MenuItem>
          </>
        )}
      </Dropdown>
      {custom && (
        <DateTimeDialog
          open
          title="Pick date & time"
          confirm="Save"
          onClose={() => setCustom(false)}
          onPick={(ts) => {
            actions.snooze(ids, ts)
            onDone?.()
          }}
        />
      )}
    </>
  )
}

function LabelSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="px-3 pb-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded border-b-2 border-accent bg-transparent px-2 text-[14px] outline-none"
      />
    </div>
  )
}

export function LabelMenu({ ids, trigger }: { ids: string[]; trigger?: (toggle: () => void) => ReactNode }) {
  const labels = useMail((s) => s.labels)
  const threads = useMail((s) => s.threads)
  const createLabel = useMail((s) => s.createLabel)
  const [q, setQ] = useState('')
  const filtered = labels.filter((l) => l.name.toLowerCase().includes(q.toLowerCase()))
  const state = (id: string) => {
    const n = ids.filter((t) => threads[t]?.labels.includes(id)).length
    return n === 0 ? 'none' : n === ids.length ? 'all' : 'some'
  }
  return (
    <Dropdown
      width={260}
      onOpenChange={(o) => !o && setQ('')}
      trigger={({ toggle }) =>
        trigger ? trigger(toggle) : (
          <IconButton label="Labels" onClick={toggle}>
            <Tag size={20} />
          </IconButton>
        )
      }
    >
      {(close) => (
        <>
          <MenuLabel>Label as:</MenuLabel>
          <LabelSearch value={q} onChange={setQ} placeholder="Search labels" />
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((l) => {
              const st = state(l.id)
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => actions.label(ids, l.id, st !== 'all')}
                  className="flex w-full items-center gap-3 px-4 py-[7px] text-left hover:bg-hover"
                >
                  <span className={cx('flex h-4 w-4 items-center justify-center rounded-[3px] border-2', st !== 'none' ? 'border-ink bg-ink text-surface' : 'border-muted')}>
                    {st === 'all' ? <Check size={12} strokeWidth={3} /> : st === 'some' ? <Minus size={12} strokeWidth={3} /> : null}
                  </span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="truncate">{l.name}</span>
                </button>
              )
            })}
            {filtered.length === 0 && !q && <div className="px-4 py-2 text-muted">No labels yet</div>}
          </div>
          <MenuDivider />
          {q.trim() && !labels.some((l) => l.name.toLowerCase() === q.trim().toLowerCase()) ? (
            <MenuItem
              onClick={() => {
                const l = createLabel(q.trim())
                actions.label(ids, l.id, true)
                setQ('')
                close()
              }}
            >
              "{q.trim()}" (create new)
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => {
                close()
                useUI.getState().setOverlay('newLabel')
              }}
            >
              Create new
            </MenuItem>
          )}
        </>
      )}
    </Dropdown>
  )
}

export function MoveMenu({ ids, onDone, trigger }: { ids: string[]; onDone?: () => void; trigger?: (toggle: () => void) => ReactNode }) {
  const labels = useMail((s) => s.labels)
  const [q, setQ] = useState('')
  const filtered = labels.filter((l) => l.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <Dropdown
      width={250}
      onOpenChange={(o) => !o && setQ('')}
      trigger={({ toggle }) =>
        trigger ? trigger(toggle) : (
          <IconButton label="Move to" onClick={toggle}>
            <FolderInput size={20} />
          </IconButton>
        )
      }
    >
      {(close) => (
        <>
          <MenuLabel>Move to:</MenuLabel>
          <LabelSearch value={q} onChange={setQ} placeholder="Search" />
          <MenuItem
            icon={<Inbox size={16} />}
            onClick={() => {
              close()
              actions.moveToInbox(ids)
              onDone?.()
            }}
          >
            Inbox
          </MenuItem>
          {filtered.map((l) => (
            <MenuItem
              key={l.id}
              icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />}
              onClick={() => {
                close()
                actions.moveTo(ids, l.id)
                onDone?.()
              }}
            >
              {l.name}
            </MenuItem>
          ))}
          <MenuDivider />
          <MenuItem
            onClick={() => {
              close()
              actions.spam(ids)
              onDone?.()
            }}
          >
            Spam
          </MenuItem>
          <MenuItem
            onClick={() => {
              close()
              actions.trash(ids)
              onDone?.()
            }}
          >
            Trash
          </MenuItem>
        </>
      )}
    </Dropdown>
  )
}
