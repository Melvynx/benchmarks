import { Info } from 'lucide-react';

import type { AppMode } from '../types';

interface GridLegendProps {
  mode: AppMode;
  referenceCityName: string;
}

export function GridLegend({ mode, referenceCityName }: GridLegendProps) {
  const overlapLabel = mode === 'meeting'
    ? 'Green cells = everyone awake'
    : 'Green cells = both cities awake';

  return (
    <div className="grid-footer">
      <div className="legend" aria-label="Grid legend">
        <span className="legend-item"><i data-state="overlap" />{overlapLabel}</span>
        <span className="legend-item"><i data-state="awake" />Awake</span>
        <span className="legend-item"><i data-state="sleeping" />Sleeping</span>
      </div>
      {mode === 'base' && (
        <p className="base-mode-note">
          <Info size={14} aria-hidden="true" />
          Green compares each city with {referenceCityName}; the REF row stays neutral.
        </p>
      )}
    </div>
  );
}
