import { useState } from 'react'
import { CalendarClock, CalendarDays, Coffee, Sofa, Sunrise } from 'lucide-react'
import { formatFuture } from '@/lib/utils'
import { Button } from './ui/bits'
import { Popover } from './ui/popover'

interface Preset {
  id: string
  icon: React.ReactNode
  label: string
  when: Date
}

function at(base: Date, hour: number, minute = 0) {
  const d = new Date(base)
  d.setHours(hour, minute, 0, 0)
  return d
}

export function snoozePresets(now: Date): Preset[] {
  const out: Preset[] = []

  const laterToday = new Date(now.getTime() + 3 * 3600_000)
  laterToday.setMinutes(0, 0, 0)
  if (laterToday.getHours() < 22 && laterToday.getDate() === now.getDate()) {
    out.push({ id: 'later', icon: <Coffee />, label: 'Later today', when: laterToday })
  }

  out.push({
    id: 'tomorrow',
    icon: <Sunrise />,
    label: 'Tomorrow',
    when: at(new Date(now.getTime() + 86_400_000), 8),
  })

  const day = now.getDay()
  if (day !== 0 && day !== 6) {
    out.push({
      id: 'weekend',
      icon: <Sofa />,
      label: 'This weekend',
      when: at(new Date(now.getTime() + (((6 - day) % 7) || 7) * 86_400_000), 8),
    })
  }

  out.push({
    id: 'nextweek',
    icon: <CalendarDays />,
    label: 'Next week',
    when: at(new Date(now.getTime() + (((8 - day) % 7) || 7) * 86_400_000), 8),
  })

  return out
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`
}

interface SnoozeMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  onPick: (iso: string, human: string) => void
  align?: 'start' | 'end' | 'center'
  /** Confirm-button label in the custom picker. */
  verb?: string
  title?: string
}

export function SnoozeMenu({
  anchorRef,
  open,
  onClose,
  onPick,
  align = 'start',
  verb = 'Save',
  title = 'Snooze until',
}: SnoozeMenuProps) {
  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      align={align}
      role="dialog"
      ariaLabel={title}
      className="w-[19rem] py-0"
    >
      <SnoozeBody onClose={onClose} onPick={onPick} verb={verb} title={title} />
    </Popover>
  )
}

function SnoozeBody({
  onClose,
  onPick,
  verb,
  title,
}: {
  onClose: () => void
  onPick: (iso: string, human: string) => void
  verb: string
  title: string
}) {
  const [now] = useState(() => new Date())
  const [custom, setCustom] = useState(false)
  const [value, setValue] = useState(() => toLocalInput(at(new Date(now.getTime() + 86_400_000), 8)))
  const presets = snoozePresets(now)

  const pick = (d: Date) => {
    onClose()
    onPick(d.toISOString(), formatFuture(d.toISOString(), now))
  }

  if (custom) {
    return (
      <div className="space-y-3 p-4">
        <div className="text-[13px] font-medium text-ink">{title}</div>
        <input
          type="datetime-local"
          value={value}
          min={toLocalInput(new Date(now.getTime() + 60_000))}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded border border-line bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-accent"
        />
        <div className="flex justify-end gap-1">
          <Button variant="text" onClick={() => setCustom(false)}>
            Back
          </Button>
          <Button
            disabled={!value || Number.isNaN(Date.parse(value))}
            onClick={() => {
              const d = new Date(value)
              if (!Number.isNaN(d.getTime())) pick(d)
            }}
          >
            {verb}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="px-4 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-4">
        {title}
      </div>
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => pick(p.when)}
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
        >
          <span className="text-ink-3 [&_svg]:h-[18px] [&_svg]:w-[18px]">{p.icon}</span>
          <span className="flex-1">{p.label}</span>
          <span className="text-[12px] text-ink-4">
            {p.when.toLocaleString(undefined, {
              weekday: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </button>
      ))}
      <div className="my-1.5 h-px bg-line-soft" />
      <button
        type="button"
        onClick={() => setCustom(true)}
        className="flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
      >
        <span className="text-ink-3 [&_svg]:h-[18px] [&_svg]:w-[18px]">
          <CalendarClock />
        </span>
        <span className="flex-1">Pick date &amp; time</span>
      </button>
    </div>
  )
}
