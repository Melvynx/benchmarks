import { useEffect, useRef, useState } from 'react';
import { CalendarClock, ChevronDown, Clock } from 'lucide-react';
import { formatSendAt, fromLocalInput, toLocalInput } from '../../lib/time';
import { Button } from '../ui/Button';
import { MenuItem, Modal } from '../ui/primitives';

interface SchedulePreset {
  key: string;
  label: string;
  at: number;
}

/** Next occurrences of common send times, relative to now. */
export function schedulePresets(now: number): SchedulePreset[] {
  const at = (daysFromToday: number, hour: number): number => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysFromToday);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
  };
  const dayOfWeek = new Date(now).getDay();
  const daysToMonday = ((1 - dayOfWeek + 7) % 7) || 7;
  return [
    { key: 'tomorrow-morning', label: 'Tomorrow morning', at: at(1, 8) },
    { key: 'tomorrow-afternoon', label: 'Tomorrow afternoon', at: at(1, 13) },
    { key: 'monday', label: 'Monday morning', at: at(daysToMonday, 8) },
  ];
}

const MIN_LEAD_MS = 60_000;

export function ScheduleMenu({ onSchedule }: { onSchedule: (at: number) => void }) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [custom, setCustom] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const presets = schedulePresets(Date.now());
  const customAt = fromLocalInput(custom);
  const customValid = Number.isFinite(customAt) && customAt - Date.now() > MIN_LEAD_MS;

  const openPicker = () => {
    setCustom(toLocalInput(Date.now() + 60 * 60_000));
    setOpen(false);
    setPicking(true);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Schedule send"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-7 items-center justify-center rounded-r-full border-l border-white/25 bg-primary text-on-primary transition hover:brightness-110"
      >
        <ChevronDown className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border border-line bg-surface p-1.5 text-ink shadow-xl"
        >
          <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-ink-3">Schedule send</p>
          {presets.map((p) => (
            <MenuItem
              key={p.key}
              icon={<Clock />}
              onSelect={() => {
                setOpen(false);
                onSchedule(p.at);
              }}
            >
              <span className="flex items-center justify-between gap-3">
                <span>{p.label}</span>
                <span className="text-xs text-ink-3">{formatSendAt(p.at, Date.now())}</span>
              </span>
            </MenuItem>
          ))}
          <MenuItem icon={<CalendarClock />} onSelect={openPicker}>
            Pick date and time…
          </MenuItem>
        </div>
      )}

      {picking && (
        <Modal
          title="Schedule send"
          width="sm:max-w-md"
          onClose={() => setPicking(false)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setPicking(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!customValid}
                onClick={() => {
                  setPicking(false);
                  onSchedule(customAt);
                }}
              >
                Schedule
              </Button>
            </>
          }
        >
          <div className="px-5 py-4">
            <label htmlFor="schedule-custom" className="mb-2 block text-sm text-ink-2">
              Send on
            </label>
            <input
              id="schedule-custom"
              type="datetime-local"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {!customValid && custom && (
              <p className="mt-2 text-xs text-danger">Pick a time at least a minute from now.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
