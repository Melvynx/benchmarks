import type { Mode } from '../lib/overlap';
import { LocateIcon, UsersIcon } from './Icons';

interface Props {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="seg" role="group" aria-label="Overlap mode">
      <button
        type="button"
        className={mode === 'meeting' ? 'active' : ''}
        aria-pressed={mode === 'meeting'}
        title="Meeting mode: highlight hours when everyone in every city is awake"
        onClick={() => onChange('meeting')}
      >
        <UsersIcon size={13} /> Meeting
      </button>
      <button
        type="button"
        className={mode === 'base' ? 'active' : ''}
        aria-pressed={mode === 'base'}
        title="Base mode: compare each city independently against the reference city"
        onClick={() => onChange('base')}
      >
        <LocateIcon size={13} /> Base
      </button>
    </div>
  );
}
