import { Trash2 } from 'lucide-react';

import {
  formatCellTime,
  formatFullTime,
  getDayPhase,
  getTimeCellDescription,
  getTimeCellState,
} from '../lib/timezone';
import type { ComparisonModel, TimeFormat } from '../types';
import { CityLabel } from './CityLabel';
import { TimeCellContent } from './TimeCellContent';

interface MobileTimeGridProps {
  model: ComparisonModel;
  timeFormat: TimeFormat;
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
}

export function MobileTimeGrid({
  model,
  timeFormat,
  onPromote,
  onRemove,
}: MobileTimeGridProps) {
  return (
    <div className="mobile-grid" aria-label="Mobile timezone comparison">
      <div className="grid-scroll-area">
        <table className="time-table time-table--mobile">
          <caption className="sr-only">
            Cities as columns and reference-city hours as rows
          </caption>
          <thead>
            <tr>
              <th className="mobile-reference-heading" scope="col">
                <span>REF</span>
                <small>{model.referenceCity.name}</small>
              </th>
              {model.timelines.map((timeline, index) => (
                <th className="mobile-city-heading" key={timeline.city.id} scope="col">
                  <CityLabel
                    city={timeline.city}
                    offsetMinutes={timeline.offsetMinutes}
                    isReference={index === 0}
                    compact
                    onPromote={onPromote}
                  />
                  <button
                    className="mobile-remove-button"
                    type="button"
                    aria-label={`Remove ${timeline.city.name}`}
                    onClick={() => onRemove(timeline.city.id)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 24 }, (_, hour) => (
              <tr key={hour}>
                <th
                  className="mobile-hour-heading"
                  data-phase={getDayPhase(hour)}
                  scope="row"
                  title={`Reference hour ${formatFullTime(hour * 60, timeFormat)}`}
                >
                  {formatCellTime(hour * 60, timeFormat)}
                </th>
                {model.timelines.map((timeline) => {
                  const cell = timeline.cells[hour];
                  return (
                    <td
                      className="time-cell"
                      data-state={getTimeCellState(cell)}
                      key={timeline.city.id}
                      title={getTimeCellDescription(cell, timeFormat)}
                      aria-label={`${timeline.city.name}: ${getTimeCellDescription(cell, timeFormat)}`}
                    >
                      <TimeCellContent cell={cell} timeFormat={timeFormat} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
