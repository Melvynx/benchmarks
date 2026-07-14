import { UsersRound, Waypoints } from 'lucide-react';

import type { AppMode } from '../types';

interface ModeSwitchProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

const MODES = [
  { value: 'meeting', label: 'Meeting', icon: UsersRound },
  { value: 'base', label: 'Base', icon: Waypoints },
] as const;

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className="mode-control">
      <span className="control-label" id="mode-label">Compare as</span>
      <div className="segmented-control" role="group" aria-labelledby="mode-label">
        {MODES.map(({ value, label, icon: Icon }) => (
          <button
            className="segmented-control__button"
            data-active={mode === value}
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => onChange(value)}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
