import { ChevronDown, type LucideIcon, Moon, RotateCcw, SlidersHorizontal, Sunrise } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useRef, useState } from 'react';
import { type DismissReason, useDismiss } from '../../hooks/use-dismiss';
import { cx } from '../../lib/cx';
import { formatHour, type TimeFormat } from '../../lib/format';
import { type AwakeWindow, awakeHourCount, HOURS, isAwake } from '../../lib/overlap';
import { resetWithUndo } from '../../store/actions';
import { useAppStore } from '../../store/app-store';
import { type SegmentedOption, SegmentedControl } from '../ui/SegmentedControl';

const PRESETS: ReadonlyArray<{ label: string } & AwakeWindow> = [
  { label: 'Standard', wakeHour: 7, sleepHour: 23 },
  { label: 'Workday', wakeHour: 9, sleepHour: 18 },
  { label: 'Early bird', wakeHour: 5, sleepHour: 21 },
  { label: 'Night owl', wakeHour: 10, sleepHour: 2 },
  { label: 'Night shift', wakeHour: 22, sleepHour: 6 },
];

const FORMAT_OPTIONS: readonly SegmentedOption<TimeFormat>[] = [
  { value: '12h', label: '12-hour' },
  { value: '24h', label: '24-hour' },
];

export function SettingsPopover() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const { wakeHour, sleepHour, timeFormat } = useAppStore((state) => state.settings);

  useDismiss(containerRef, open, (reason: DismissReason) => {
    setOpen(false);
    if (reason === 'escape') triggerRef.current?.focus();
  });

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={cx(
          'flex h-11 w-full items-center gap-2.5 rounded-xl border bg-surface pr-3 pl-3.5 text-sm shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors sm:w-auto',
          open ? 'border-line-strong' : 'border-line hover:border-line-strong',
        )}
      >
        <SlidersHorizontal className="size-4 text-ink-3" aria-hidden />
        <span className="text-ink-3">Awake</span>
        <span className="font-mono font-medium whitespace-nowrap text-ink">
          {formatHour(wakeHour, timeFormat)}–{formatHour(sleepHour, timeFormat)}
        </span>
        <ChevronDown
          className={cx('ml-auto size-4 text-ink-3 transition-transform sm:ml-0', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Availability settings"
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.985, transition: { duration: 0.1 } }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="popover absolute top-full right-0 z-40 mt-2 w-full origin-top-right sm:w-[23rem]"
          >
            <SettingsPanel onDone={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsPanel({ onDone }: { onDone: () => void }) {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const { wakeHour, sleepHour, timeFormat } = settings;

  return (
    <div className="flex flex-col">
      <div className="space-y-4 p-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Awake window</h2>
          <p className="mt-0.5 text-xs text-ink-3">Everyone shares the same schedule, in their own local time.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <HourSelect
            label="Wake up"
            icon={Sunrise}
            value={wakeHour}
            format={timeFormat}
            onChange={(hour) => updateSettings({ wakeHour: hour })}
          />
          <HourSelect
            label="Go to sleep"
            icon={Moon}
            value={sleepHour}
            format={timeFormat}
            onChange={(hour) => updateSettings({ sleepHour: hour })}
          />
        </div>

        <AwakePreview window={{ wakeHour, sleepHour }} format={timeFormat} />

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Presets">
          {PRESETS.map((preset) => {
            const selected = preset.wakeHour === wakeHour && preset.sleepHour === sleepHour;
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={selected}
                onClick={() => updateSettings({ wakeHour: preset.wakeHour, sleepHour: preset.sleepHour })}
                className={cx(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  selected
                    ? 'border-ink bg-ink font-medium text-canvas'
                    : 'border-line text-ink-2 hover:border-line-strong hover:text-ink',
                )}
              >
                {preset.label}
                <span className={cx('ml-1.5 font-mono', selected ? 'text-canvas/70' : 'text-ink-3')}>
                  {formatHour(preset.wakeHour, timeFormat)}–{formatHour(preset.sleepHour, timeFormat)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line p-4">
        <span className="text-sm font-medium text-ink">Time format</span>
        <SegmentedControl
          label="Time format"
          size="sm"
          value={timeFormat}
          options={FORMAT_OPTIONS}
          onChange={(value) => updateSettings({ timeFormat: value })}
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-line bg-sunken px-4 py-2.5">
        <button
          type="button"
          onClick={() => {
            resetWithUndo();
            onDone();
          }}
          className="flex items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-ink"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset everything
        </button>
        <span className="text-xs text-ink-3">Changes apply instantly</span>
      </div>
    </div>
  );
}

interface HourSelectProps {
  label: string;
  icon: LucideIcon;
  value: number;
  format: TimeFormat;
  onChange: (hour: number) => void;
}

function HourSelect({ label, icon: Icon, value, format, onChange }: HourSelectProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
        <Icon className="size-3.5 text-ink-3" aria-hidden />
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-10 w-full appearance-none rounded-lg border border-line bg-sunken pr-8 pl-3 font-mono text-sm text-ink transition-colors hover:border-line-strong"
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {formatHour(hour, format)}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-3"
          aria-hidden
        />
      </div>
    </div>
  );
}

function AwakePreview({ window, format }: { window: AwakeWindow; format: TimeFormat }) {
  const awake = awakeHourCount(window);
  const summary =
    window.wakeHour === window.sleepHour
      ? 'Same hour for both — awake around the clock'
      : `${window.wakeHour > window.sleepHour ? 'Overnight · ' : ''}${awake}h awake · ${24 - awake}h asleep`;

  return (
    <div>
      <div className="flex h-6 gap-[2px]" aria-hidden>
        {HOURS.map((hour) => (
          <span
            key={hour}
            className={cx(
              'flex-1 rounded-[3px] transition-colors',
              isAwake(hour, window) ? 'bg-ink-2' : 'swatch h-full w-auto border-0',
            )}
            data-availability={isAwake(hour, window) ? undefined : 'asleep'}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[0.625rem] text-ink-3" aria-hidden>
        {[0, 6, 12, 18, 24].map((hour) => (
          <span key={hour}>{formatHour(hour, format)}</span>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-2">{summary}</p>
    </div>
  );
}
