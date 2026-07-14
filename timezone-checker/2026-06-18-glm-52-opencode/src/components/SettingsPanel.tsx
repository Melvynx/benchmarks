import { useEffect, useRef, useState } from 'react';
import type { Settings, TimeFormat } from '../lib/types';
import { formatHour, awakeDurationHours } from '../lib/format';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (next: Settings) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const overnight = settings.sleep <= settings.wake && settings.sleep !== settings.wake;
  const duration = awakeDurationHours(settings.wake, settings.sleep);
  const wakeLabel = formatHour(settings.wake, settings.format);
  const sleepLabel = formatHour(settings.sleep, settings.format);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={[
          'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
          open
            ? 'bg-ink-800 text-white ring-ink-600'
            : 'bg-ink-900/80 text-slate-300 ring-ink-700 hover:text-white',
        ].join(' ')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span className="hidden sm:inline">Awake</span>
        <span className="tabular-nums text-accent-300">
          {wakeLabel}–{sleepLabel}
        </span>
        <span className="text-slate-500">·</span>
        <span className="tabular-nums text-slate-300">{settings.format}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Availability settings"
          className="absolute right-0 z-30 mt-2 w-[min(20rem,90vw)] rounded-2xl border border-ink-700 bg-ink-850/95 p-4 shadow-2xl shadow-black/40 backdrop-blur animate-fade-in"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Personal availability
            </h2>
            <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] text-slate-400">
              {duration}h awake{overnight ? ' · overnight' : ''}
            </span>
          </div>

          <HourSlider
            label="Wake up"
            value={settings.wake}
            format={settings.format}
            onChange={(v) => onChange({ ...settings, wake: v })}
          />
          <HourSlider
            label="Sleep"
            value={settings.sleep}
            format={settings.format}
            onChange={(v) => onChange({ ...settings, sleep: v })}
          />

          <div className="mt-4">
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              Time format
            </div>
            <div className="inline-flex w-full rounded-lg bg-ink-900 p-1 ring-1 ring-inset ring-ink-700">
              {(['12h', '24h'] as TimeFormat[]).map((f) => {
                const active = settings.format === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => onChange({ ...settings, format: f })}
                    className={[
                      'flex-1 rounded-md py-1.5 text-sm font-medium transition-all',
                      active
                        ? 'bg-ink-700 text-white ring-1 ring-inset ring-ink-600'
                        : 'text-slate-400 hover:text-slate-200',
                    ].join(' ')}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Applies to every city. Overnight windows (e.g. 22→6) are supported.
          </p>
        </div>
      )}
    </div>
  );
}

interface HourSliderProps {
  label: string;
  value: number;
  format: TimeFormat;
  onChange: (v: number) => void;
}

function HourSlider({ label, value, format, onChange }: HourSliderProps) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="rounded-md bg-ink-800 px-2 py-0.5 text-sm font-medium tabular-nums text-accent-300">
          {formatHour(value, format)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={23}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tz-range w-full"
        aria-label={label}
      />
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-slate-600">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  );
}
