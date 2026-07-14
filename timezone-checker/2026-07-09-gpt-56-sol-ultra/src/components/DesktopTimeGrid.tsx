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

interface DesktopTimeGridProps {
  model: ComparisonModel;
  timeFormat: TimeFormat;
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
}

export function DesktopTimeGrid({
  model,
  timeFormat,
  onPromote,
  onRemove,
}: DesktopTimeGridProps) {
  return (
    <div className="desktop-grid" aria-label="Desktop timezone comparison">
      <div className="grid-scroll-area">
        <table className="time-table time-table--desktop">
          <caption className="sr-only">
            Local times and availability for each city by reference-city hour
          </caption>
          <thead>
            <tr>
              <th className="city-column-heading" scope="col">
                <span>City</span>
                <small>Click a name to make it REF</small>
              </th>
              {Array.from({ length: 24 }, (_, hour) => (
                <th
                  className="hour-heading"
                  data-phase={getDayPhase(hour)}
                  key={hour}
                  scope="col"
                  title={`Reference hour ${formatFullTime(hour * 60, timeFormat)}`}
                >
                  {formatCellTime(hour * 60, timeFormat)}
                </th>
              ))}
              <th className="action-column-heading" scope="col"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {model.timelines.map((timeline, index) => (
              <tr key={timeline.city.id}>
                <th className="city-cell" scope="row">
                  <CityLabel
                    city={timeline.city}
                    offsetMinutes={timeline.offsetMinutes}
                    isReference={index === 0}
                    onPromote={onPromote}
                  />
                </th>
                {timeline.cells.map((cell) => (
                  <td
                    className="time-cell"
                    data-state={getTimeCellState(cell)}
                    key={cell.referenceHour}
                    title={getTimeCellDescription(cell, timeFormat)}
                    aria-label={getTimeCellDescription(cell, timeFormat)}
                  >
                    <TimeCellContent cell={cell} timeFormat={timeFormat} />
                  </td>
                ))}
                <td className="remove-cell">
                  <button
                    className="icon-button icon-button--danger"
                    type="button"
                    aria-label={`Remove ${timeline.city.name}`}
                    onClick={() => onRemove(timeline.city.id)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
