import type { Mode } from '../types';

export function Legend({ mode, refName }: { mode: Mode; refName: string }) {
  return (
    <div className="legend">
      <span className="legend-item">
        <i className="sw sw-sleep" />
        Sleeping
      </span>
      <span className="legend-item">
        <i className="sw sw-awake" />
        Awake
      </span>
      <span className="legend-item">
        <i className="sw sw-overlap" />
        Overlap
      </span>
      <span className="legend-hint">
        <strong>Green cells</strong> = {mode === 'meeting' ? 'everyone awake' : `awake while ${refName} is awake`}
      </span>
      <span className="legend-tip">Click a city name to change the reference.</span>
    </div>
  );
}
