import React from 'react';
import { useTimezone } from '../context/TimezoneContext';
import { Sun, Moon, Clock, X, Info } from 'lucide-react';
import { formatRangeHour } from '../lib/timezone';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useTimezone();

  if (!isOpen) return null;

  // Calculate awake duration
  const awakeHoursCount =
    settings.wakeHour === settings.sleepHour
      ? 24
      : settings.wakeHour < settings.sleepHour
      ? settings.sleepHour - settings.wakeHour
      : 24 - settings.wakeHour + settings.sleepHour;

  const hoursOptions = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="mb-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Availability & Schedule Settings</h3>
            <p className="text-xs text-slate-400">
              Configures the shared awake window and time format across all cities.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close settings"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Wake-up Hour */}
        <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Wake-up Hour
            </span>
            <span className="text-xs font-bold text-amber-400">
              {formatRangeHour(settings.wakeHour, settings.timeFormat)}
            </span>
          </label>
          <select
            value={settings.wakeHour}
            onChange={(e) => updateSettings({ wakeHour: parseInt(e.target.value, 10) })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {hoursOptions.map((h) => (
              <option key={h} value={h}>
                {formatRangeHour(h, settings.timeFormat)} ({h.toString().padStart(2, '0')}:00)
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">Hour when personal schedule starts.</p>
        </div>

        {/* Sleep Hour */}
        <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              Bedtime / Sleep Hour
            </span>
            <span className="text-xs font-bold text-indigo-400">
              {formatRangeHour(settings.sleepHour, settings.timeFormat)}
            </span>
          </label>
          <select
            value={settings.sleepHour}
            onChange={(e) => updateSettings({ sleepHour: parseInt(e.target.value, 10) })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {hoursOptions.map((h) => (
              <option key={h} value={h}>
                {formatRangeHour(h, settings.timeFormat)} ({h.toString().padStart(2, '0')}:00)
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">Hour when sleeping begins.</p>
        </div>

        {/* Time Format */}
        <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            Time Format
          </label>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => updateSettings({ timeFormat: '12h' })}
              className={`py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold border transition-all ${
                settings.timeFormat === '12h'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              12-Hour (am/pm)
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ timeFormat: '24h' })}
              className={`py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold border transition-all ${
                settings.timeFormat === '24h'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              24-Hour (00–23)
            </button>
          </div>
          <p className="text-[11px] text-slate-400">Controls grid hour labels & summaries.</p>
        </div>
      </div>

      {/* Schedule Summary Banner */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Awake Window: <strong className="text-slate-200">{awakeHoursCount} hours</strong> (
            {formatRangeHour(settings.wakeHour, settings.timeFormat)} to{' '}
            {formatRangeHour(settings.sleepHour, settings.timeFormat)})
            {settings.wakeHour > settings.sleepHour && (
              <span className="ml-1 text-amber-400 font-medium">(Overnight range active)</span>
            )}
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Applied uniformly to all participant cities.
        </span>
      </div>
    </div>
  );
};
