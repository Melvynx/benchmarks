import type { Mode } from '../lib/appState';

export function Legend({ mode, refName }: { mode: Mode; refName?: string }) {
  return (
    <div className="legend">
      <span className="legend-item">
        <i className="swatch swatch--sleeping" />
        Sleeping
      </span>
      <span className="legend-item">
        <i className="swatch swatch--awake" />
        Awake
      </span>
      <span className="legend-item">
        <i className="swatch swatch--overlap" />
        Overlap
      </span>
      <span className="legend-hint">
        {mode === 'meeting' || !refName
          ? 'Green cells = everyone awake'
          : `Green cells = awake at the same time as ${refName}`}
      </span>
    </div>
  );
}
