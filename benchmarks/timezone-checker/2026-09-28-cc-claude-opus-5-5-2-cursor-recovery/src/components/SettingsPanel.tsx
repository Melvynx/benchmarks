import { ChevronDown, Moon, SlidersHorizontal, Sun } from "lucide-react";
import { type ReactNode, type Ref, useCallback, useEffect, useId, useRef, useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { type DismissReason, useDismiss } from "@/hooks/useDismiss";
import { cn } from "@/lib/cn";
import { awakeHourCount, HOURS, isAwake } from "@/lib/schedule";
import { formatHour, type TimeFormat } from "@/lib/time";
import { DEFAULT_SETTINGS, usePlanner } from "@/state/store";

const FORMAT_OPTIONS = [
  { value: "12h", label: "12-hour" },
  { value: "24h", label: "24-hour" },
] as const;

/** Toolbar button that opens the awake-window and time-format settings. */
export function SettingsPanel() {
  const settings = usePlanner((state) => state.settings);
  const updateSettings = usePlanner((state) => state.updateSettings);
  const resetSettings = usePlanner((state) => state.resetSettings);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const panelId = useId();

  const close = useCallback((reason: DismissReason) => {
    setOpen(false);
    if (reason === "escape") triggerRef.current?.focus();
  }, []);
  useDismiss(rootRef, open, close);

  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open]);

  const { wakeHour, sleepHour, timeFormat } = settings;
  const awakeHours = awakeHourCount(settings);
  const overnight = wakeHour > sleepHour;
  const isDefault =
    wakeHour === DEFAULT_SETTINGS.wakeHour &&
    sleepHour === DEFAULT_SETTINGS.sleepHour &&
    timeFormat === DEFAULT_SETTINGS.timeFormat;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-surface pr-3 pl-3.5 text-sm shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-colors hover:border-ink-3",
          open && "border-ink-3",
        )}
      >
        <SlidersHorizontal aria-hidden className="size-4 text-ink-2" />
        <span className="text-ink-2">Awake</span>
        <span className="font-medium text-ink tabular-nums">
          {wakeHour === sleepHour ? "all day" : `${formatHour(wakeHour, timeFormat)} – ${formatHour(sleepHour, timeFormat)}`}
        </span>
        <ChevronDown aria-hidden className={cn("size-4 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Availability settings"
          className="absolute top-full left-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] sm:right-0 sm:left-auto animate-pop-in rounded-2xl border border-line bg-surface p-4 shadow-pop"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Awake window</h2>
            <p className="text-xs text-ink-2">Shared by every city</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <HourSelect
              ref={firstFieldRef}
              label="Wake up"
              icon={<Sun aria-hidden className="size-3.5" />}
              value={wakeHour}
              format={timeFormat}
              onChange={(hour) => updateSettings({ wakeHour: hour })}
            />
            <HourSelect
              label="Go to sleep"
              icon={<Moon aria-hidden className="size-3.5" />}
              value={sleepHour}
              format={timeFormat}
              onChange={(hour) => updateSettings({ sleepHour: hour })}
            />
          </div>

          <DayStrip wakeHour={wakeHour} sleepHour={sleepHour} format={timeFormat} />

          <p className="mt-2 text-xs text-ink-2" aria-live="polite">
            <span className="font-medium text-ink tabular-nums">{awakeHours} hours</span> awake
            {wakeHour === sleepHour
              ? " — waking and sleeping at the same hour means awake around the clock."
              : overnight
                ? " · overnight schedule, crossing midnight."
                : "."}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-sm font-medium text-ink">Time format</span>
            <SegmentedControl
              label="Time format"
              size="sm"
              value={timeFormat}
              options={FORMAT_OPTIONS}
              onChange={(format: TimeFormat) => updateSettings({ timeFormat: format })}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={isDefault}
              onClick={resetSettings}
              className="rounded-md text-xs font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline disabled:pointer-events-none disabled:opacity-40"
            >
              Reset to 7am – 11pm, 12-hour
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface HourSelectProps {
  ref?: Ref<HTMLSelectElement>;
  label: string;
  icon: ReactNode;
  value: number;
  format: TimeFormat;
  onChange: (hour: number) => void;
}

function HourSelect({ ref, label, icon, value, format, onChange }: HourSelectProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-2">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-line-strong bg-surface pr-8 pl-3 font-mono text-sm text-ink tabular-nums transition-colors hover:border-ink-3"
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
  );
}

/** A 24-segment preview of the awake window, midnight to midnight. */
function DayStrip({ wakeHour, sleepHour, format }: { wakeHour: number; sleepHour: number; format: TimeFormat }) {
  return (
    <div className="mt-4" aria-hidden>
      <div className="flex h-6 gap-px overflow-hidden rounded-md">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className={cn(
              "flex-1 transition-colors duration-200",
              isAwake(hour, { wakeHour, sleepHour }) ? "bg-overlap" : "bg-surface-2",
            )}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-3">
        {[0, 6, 12, 18, 24].map((hour) => (
          <span key={hour}>{formatHour(hour % 24, format)}</span>
        ))}
      </div>
    </div>
  );
}
