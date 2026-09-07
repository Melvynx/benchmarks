import { useCallback, useRef, useState } from "react";
import { HOURS, awakeWindowLength, isAwake } from "../lib/availability";
import { cx } from "../lib/cx";
import { formatHourLabel, type TimeFormat } from "../lib/format";
import { useDismiss } from "../hooks/useDismiss";
import { SlidersIcon } from "./icons";

type Props = {
  wake: number;
  sleep: number;
  format: TimeFormat;
  onWake: (hour: number) => void;
  onSleep: (hour: number) => void;
  onFormat: (format: TimeFormat) => void;
  onReset: () => void;
};

export function SettingsPanel({ wake, sleep, format, onWake, onSleep, onFormat, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(container, open, close);

  const awakeHours = awakeWindowLength(wake, sleep);
  const overnight = wake > sleep;

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cx(
          "flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-[12.5px] font-medium transition-colors",
          open ? "bg-white/[0.07] text-ink" : "bg-panel text-mute hover:text-ink",
        )}
      >
        <SlidersIcon className="h-3.5 w-3.5" />
        <span className="tnum">
          {formatHourLabel(wake, format)} – {formatHourLabel(sleep, format)}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Availability settings"
          className="animate-rise absolute top-full right-0 z-40 mt-2 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-line bg-panel-soft p-4 shadow-2xl shadow-black/60"
        >
          <header className="mb-3.5">
            <h3 className="text-[13px] font-medium text-ink">Your awake window</h3>
            <p className="mt-0.5 text-[11px] text-mute">
              Applied to every city. {awakeHours} awake {awakeHours === 1 ? "hour" : "hours"}
              {overnight && " · crosses midnight"}.
            </p>
          </header>

          <HourSlider label="Wake up" value={wake} format={format} onChange={onWake} />
          <HourSlider label="Sleep" value={sleep} format={format} onChange={onSleep} />

          <WindowPreview wake={wake} sleep={sleep} />

          <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3.5">
            <span className="text-[11.5px] text-mute">Time format</span>
            <div className="flex rounded-lg border border-line p-0.5">
              {(["12h", "24h"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onFormat(value)}
                  aria-pressed={format === value}
                  className={cx(
                    "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                    format === value ? "bg-white/[0.09] text-ink" : "text-mute hover:text-ink",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onReset();
              close();
            }}
            className="mt-3 w-full rounded-lg border border-line py-1.5 text-[11.5px] text-mute transition-colors hover:border-alert/40 hover:text-alert"
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}

function HourSlider({
  label,
  value,
  format,
  onChange,
}: {
  label: string;
  value: number;
  format: TimeFormat;
  onChange: (hour: number) => void;
}) {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11.5px] text-mute">{label}</span>
        <span className="tnum text-[12.5px] font-medium text-ink">
          {formatHourLabel(value, format)}
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={23}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-overlap"
      />
    </label>
  );
}

/** A 24-slot strip so an overnight window reads at a glance. */
function WindowPreview({ wake, sleep }: { wake: number; sleep: number }) {
  return (
    <div className="mt-1">
      <div className="flex gap-[2px]">
        {HOURS.map((hour) => (
          <span
            key={hour}
            className={cx(
              "h-2.5 flex-1 rounded-[2px]",
              isAwake(hour, wake, sleep) ? "bg-overlap/55" : "bg-white/[0.07]",
            )}
          />
        ))}
      </div>
      <div className="tnum mt-1 flex justify-between text-[9px] text-faint">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}
