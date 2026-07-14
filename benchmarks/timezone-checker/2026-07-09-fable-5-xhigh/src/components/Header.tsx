import type { Mode, TimeFormat } from '../types';
import { awakeWindowLabel } from '../lib/format';
import { cx } from '../lib/cx';
import { BrandMark, ChevronIcon, MoonIcon } from './icons';

interface HeaderProps {
  mode: Mode;
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
  settingsOpen: boolean;
  onModeChange: (mode: Mode) => void;
  onToggleSettings: () => void;
}

export function Header({
  mode,
  wakeHour,
  sleepHour,
  timeFormat,
  settingsOpen,
  onModeChange,
  onToggleSettings,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <BrandMark />
        <div className="brand-text">
          <h1 className="brand-title">Claude Fable 5</h1>
          <p className="brand-tag">Timezone overlap checker</p>
        </div>
      </div>
      <div className="header-controls">
        <div className="segmented" role="group" aria-label="Overlap mode">
          <button
            type="button"
            className={cx('seg-btn', mode === 'meeting' && 'active')}
            aria-pressed={mode === 'meeting'}
            title="Find hours when every city is awake at once"
            onClick={() => onModeChange('meeting')}
          >
            Meeting
          </button>
          <button
            type="button"
            className={cx('seg-btn', mode === 'base' && 'active')}
            aria-pressed={mode === 'base'}
            title="Compare each city independently against the reference city"
            onClick={() => onModeChange('base')}
          >
            Base
          </button>
        </div>
        <button
          type="button"
          className="settings-chip"
          aria-expanded={settingsOpen}
          onClick={onToggleSettings}
          title="Awake window & time format"
        >
          <MoonIcon />
          <span>{awakeWindowLabel(wakeHour, sleepHour, timeFormat)}</span>
          <span className="chev">
            <ChevronIcon />
          </span>
        </button>
      </div>
    </header>
  );
}
