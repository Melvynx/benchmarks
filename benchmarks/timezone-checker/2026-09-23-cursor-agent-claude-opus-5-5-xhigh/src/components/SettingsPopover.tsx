import * as Popover from '@radix-ui/react-popover'
import { ChevronDown, Moon, RotateCcw, SunMoon, Sunrise, type LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { awakeHours, HOURS, isAwake, type AwakeWindow } from '../domain/schedule'
import { formatHour, formatHours, type TimeFormat } from '../domain/time'
import { cn } from '../lib/cn'
import { useAppStore } from '../state/app-store'
import { Button } from './ui/Button'
import { Segmented, type SegmentedOption } from './ui/Segmented'

const FORMAT_OPTIONS: readonly SegmentedOption<TimeFormat>[] = [
  { value: '12h', label: '12-hour' },
  { value: '24h', label: '24-hour' },
]

export function SettingsPopover() {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const resetSettings = useAppStore((s) => s.resetSettings)
  const { wakeHour, sleepHour, timeFormat } = settings
  const duration = awakeHours(settings)

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="secondary">
          <SunMoon aria-hidden />
          <span className="text-ink-2">Awake</span>
          <span className="font-mono text-[13px] tabular-nums">
            {formatHour(wakeHour, timeFormat)}–{formatHour(sleepHour, timeFormat)}
          </span>
          <ChevronDown aria-hidden className="-mr-1 text-ink-3" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="popover w-[min(21rem,calc(100vw-1.5rem))] p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Awake window</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-3">Same schedule for everyone, in their local time.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={resetSettings} className="-mt-1 -mr-1.5 px-2.5">
              <RotateCcw aria-hidden />
              Reset
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <HourSelect
              label="Wake-up hour"
              icon={Sunrise}
              value={wakeHour}
              format={timeFormat}
              onChange={(hour) => updateSettings({ wakeHour: hour })}
            />
            <HourSelect
              label="Sleep hour"
              icon={Moon}
              value={sleepHour}
              format={timeFormat}
              onChange={(hour) => updateSettings({ sleepHour: hour })}
            />
          </div>

          <AwakeBar window={settings} format={timeFormat} />
          <p className="mt-2 text-xs text-ink-2">
            {duration === 24 ? 'Awake around the clock' : `${formatHours(duration)} awake`}
            {wakeHour > sleepHour && <span className="text-ink-3"> · overnight schedule</span>}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-sm font-medium text-ink">Time format</span>
            <Segmented
              label="Time format"
              size="sm"
              value={timeFormat}
              options={FORMAT_OPTIONS}
              onChange={(format) => updateSettings({ timeFormat: format })}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

interface HourSelectProps {
  label: string
  icon: LucideIcon
  value: number
  format: TimeFormat
  onChange: (hour: number) => void
}

function HourSelect({ label, icon: Icon, value, format, onChange }: HourSelectProps) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-2">
        <Icon aria-hidden className="size-3.5" />
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-10 w-full appearance-none rounded-xl border border-line bg-surface-2 pr-8 pl-3 font-mono text-sm text-ink tabular-nums transition-colors hover:border-line-strong"
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {formatHour(hour, format)}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-3" />
      </div>
    </div>
  )
}

const TICKS = [0, 6, 12, 18, 24]

function AwakeBar({ window, format }: { window: AwakeWindow; format: TimeFormat }) {
  return (
    <div className="mt-4" aria-hidden>
      <div className="flex h-5 gap-px overflow-hidden rounded-md">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className={cn('flex-1 transition-colors duration-200', isAwake(hour * 60, window) ? 'bg-ink/80' : 'bg-hatch bg-surface-2')}
          />
        ))}
      </div>
      <div className="relative mt-1 h-3.5 font-mono text-[10px] text-ink-3">
        {TICKS.map((tick) => (
          <span
            key={tick}
            className={cn('absolute', tick === 0 ? 'left-0' : tick === 24 ? 'right-0' : '-translate-x-1/2')}
            style={tick > 0 && tick < 24 ? { left: `${(tick / 24) * 100}%` } : undefined}
          >
            {formatHour(tick % 24, format)}
          </span>
        ))}
      </div>
    </div>
  )
}
