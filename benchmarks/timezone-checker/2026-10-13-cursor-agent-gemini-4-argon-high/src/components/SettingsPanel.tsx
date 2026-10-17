import React from 'react';
import { Sun, Moon, Clock, RotateCcw } from 'lucide-react';
import { formatHourLabel, TimeFormat } from '../utils/timezone';

interface SettingsPanelProps {
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
  onChangeWakeHour: (hour: number) => void;
  onChangeSleepHour: (hour: number) => void;
  onChangeTimeFormat: (format: TimeFormat) => void;
  onResetDefaults: () => void;
  isDefaultState: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  wakeHour,
  sleepHour,
  timeFormat,
  onChangeWakeHour,
  onChangeSleepHour,
  onChangeTimeFormat,
  onResetDefaults,
  isDefaultState,
}) => {
  const isOvernight = wakeHour > sleepHour;
  const awakeCount =
    wakeHour === sleepHour
      ? 0
      : wakeHour < sleepHour
        ? sleepHour - wakeHour
        : 24 - wakeHour + sleepHour;

  const awakeRangeText = `${formatHourLabel(wakeHour, timeFormat)}–${formatHourLabel(
    sleepHour,
    timeFormat
  )}`;

  return (
    <section
      aria-label="Availability Settings"
      className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3.5 sm:px-5 sm:py-3.5 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Awake window title & summary */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Awake Window
              </span>
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                {awakeRangeText}
              </span>
              {isOvernight && (
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[11px] font-medium text-indigo-300 border border-indigo-500/30">
                  Overnight shift
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Uniform schedule across all cities ({awakeCount}h awake / day)
            </p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Wake-up Hour */}
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <span className="flex items-center gap-1 font-medium text-slate-400">
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              Wake-up
            </span>
            <select
              aria-label="Wake-up hour"
              value={wakeHour}
              onChange={(e) => onChangeWakeHour( Number(e.target.value) )}
              className="rounded-lg border border-slate-700/80 bg-slate-950 px-2.5 py-1.5 font-mono text-xs font-medium text-slate-100 transition hover:border-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {formatHourLabel(h, timeFormat)} ({h}:00)
                </option>
              ))}
            </select>
          </label>

          {/* Sleep Hour */}
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <span className="flex items-center gap-1 font-medium text-slate-400">
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
              Sleep
            </span>
            <select
              aria-label="Sleep hour"
              value={sleepHour}
              onChange={(e) => onChangeSleepHour(Number(e.target.value))}
              className="rounded-lg border border-slate-700/80 bg-slate-950 px-2.5 py-1.5 font-mono text-xs font-medium text-slate-100 transition hover:border-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {formatHourLabel(h, timeFormat)} ({h}:00)
                </option>
              ))}
            </select>
          </label>

          {/* Time format toggle (12h / 24h) */}
          <div
            role="group"
            aria-label="Time format"
            className="inline-flex items-center rounded-lg border border-slate-700/80 bg-slate-950 p-0.5"
          >
            <button
              type="button"
              onClick={() => onChangeTimeFormat('12h')}
              aria-pressed={timeFormat === '12h'}
              className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition ${
                timeFormat === '12h'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              12h
            </button>
            <button
              type="button"
              onClick={() => onChangeTimeFormat('24h')}
              aria-pressed={timeFormat === '24h'}
              className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition ${
                timeFormat === '24h'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              24h
            </button>
          </div>

          {!isDefaultState && (
            <button
              type="button"
              onClick={onResetDefaults}
              title="Reset to default cities and settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-800/60 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
