import { useStore } from '../store';
import { Settings, Clock } from 'lucide-react';
import { cn } from '../utils/classnames';
import { formatHour } from '../utils/time';

export function SettingsPanel() {
  const { wakeHour, sleepHour, timeFormat, setWakeHour, setSleepHour, setTimeFormat } = useStore();

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm sticky top-24">
      <div className="flex items-center gap-2 mb-6 text-zinc-900 dark:text-zinc-50 font-semibold">
        <Settings className="w-5 h-5 text-zinc-500" />
        <h2>Availability Window</h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Wake up time
          </label>
          <select 
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={wakeHour}
            onChange={e => setWakeHour(Number(e.target.value))}
          >
            {hours.map(h => (
              <option key={h} value={h}>{formatHour(h, timeFormat === '24h')}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Sleep time
          </label>
          <select 
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={sleepHour}
            onChange={e => setSleepHour(Number(e.target.value))}
          >
            {hours.map(h => (
              <option key={h} value={h}>{formatHour(h, timeFormat === '24h')}</option>
            ))}
          </select>
        </div>

        <hr className="border-zinc-200 dark:border-zinc-800" />

        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
            Time Format
            <Clock className="w-4 h-4 text-zinc-500" />
          </label>
          <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-lg">
            <button
              onClick={() => setTimeFormat('12h')}
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                timeFormat === '12h' 
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              )}
            >
              12h
            </button>
            <button
              onClick={() => setTimeFormat('24h')}
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                timeFormat === '24h' 
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              )}
            >
              24h
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
