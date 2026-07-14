import { MoonStar, SlidersHorizontal, UserRound, UsersRound } from 'lucide-react';

import { formatHour } from '../lib/timezone';
import type { PlannerMode, PlannerState, TimeFormat } from '../types';
import { CityPicker } from './CityPicker';

interface ControlsPanelProps {
  state: PlannerState;
  onChange: (patch: Partial<PlannerState>) => void;
  onAddCity: (cityId: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function ControlsPanel({ state, onChange, onAddCity }: ControlsPanelProps) {
  return (
    <aside className="controls-panel" aria-label="Planner settings">
      <div className="control-heading">
        <span><SlidersHorizontal size={16} /></span>
        <div><strong>Plan the window</strong><small>Changes apply instantly</small></div>
      </div>

      <fieldset className="control-group mode-control">
        <legend>Compare as</legend>
        <div className="mode-switch">
          <ModeButton
            mode="meeting"
            activeMode={state.mode}
            label="Meeting"
            detail="Everyone together"
            icon={<UsersRound size={17} />}
            onChange={(mode) => onChange({ mode })}
          />
          <ModeButton
            mode="base"
            activeMode={state.mode}
            label="Base"
            detail="One-to-one"
            icon={<UserRound size={17} />}
            onChange={(mode) => onChange({ mode })}
          />
        </div>
      </fieldset>

      <fieldset className="control-group">
        <legend>Shared awake window</legend>
        <div className="awake-fields">
          <label>
            <span>Wake up</span>
            <select
              value={state.wakeHour}
              onChange={(event) => onChange({ wakeHour: Number(event.target.value) })}
            >
              {HOURS.map((hour) => <option key={hour} value={hour}>{formatHour(hour, state.timeFormat)}</option>)}
            </select>
          </label>
          <span className="awake-connector" aria-hidden="true"><MoonStar size={16} /></span>
          <label>
            <span>Sleep</span>
            <select
              value={state.sleepHour}
              onChange={(event) => onChange({ sleepHour: Number(event.target.value) })}
            >
              {HOURS.map((hour) => <option key={hour} value={hour}>{formatHour(hour, state.timeFormat)}</option>)}
            </select>
          </label>
        </div>
        <p className="control-note">
          {state.wakeHour === state.sleepHour
            ? 'Same time means awake all day.'
            : 'Overnight windows are supported.'}
        </p>
      </fieldset>

      <fieldset className="control-group format-row">
        <legend>Time format</legend>
        <div className="compact-switch">
          {(['12h', '24h'] as const).map((format) => (
            <button
              type="button"
              key={format}
              className={state.timeFormat === format ? 'is-active' : ''}
              aria-pressed={state.timeFormat === format}
              onClick={() => onChange({ timeFormat: format as TimeFormat })}
            >
              {format}
            </button>
          ))}
        </div>
      </fieldset>

      <CityPicker selectedCityIds={state.cityIds} onAddCity={onAddCity} />
    </aside>
  );
}

interface ModeButtonProps {
  mode: PlannerMode;
  activeMode: PlannerMode;
  label: string;
  detail: string;
  icon: React.ReactNode;
  onChange: (mode: PlannerMode) => void;
}

function ModeButton({ mode, activeMode, label, detail, icon, onChange }: ModeButtonProps) {
  const isActive = mode === activeMode;

  return (
    <button
      type="button"
      className={isActive ? 'mode-button is-active' : 'mode-button'}
      aria-pressed={isActive}
      onClick={() => onChange(mode)}
    >
      <span className="mode-icon">{icon}</span>
      <span><strong>{label}</strong><small>{detail}</small></span>
    </button>
  );
}
