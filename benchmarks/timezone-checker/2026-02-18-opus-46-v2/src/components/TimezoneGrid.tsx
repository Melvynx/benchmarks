import { useEffect, useState } from 'react';
import type { TimezoneRow, Settings } from '../types';
import {
  getUtcOffset,
  formatUtcOffset,
  getLocalTime,
  getCurrentHour,
  getCellType,
  hasAnyOverlap,
  formatHourLabel,
} from '../utils/timezone';

interface TimezoneGridProps {
  rows: TimezoneRow[];
  settings: Settings;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

function RowHeader({
  row,
  primaryTimezone,
  settings,
  onRemove,
  onSetPrimary,
}: {
  row: TimezoneRow;
  primaryTimezone: string;
  settings: Settings;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  const offset = getUtcOffset(row.city.timezone);
  const localTime = getLocalTime(row.city.timezone, settings.timeFormat);
  const overlap = row.isPrimary || hasAnyOverlap(row.city.timezone, primaryTimezone, settings);

  return (
    <div
      className={`tz-row-header ${row.isPrimary ? 'primary' : ''}`}
      onClick={() => onSetPrimary(row.id)}
      title={row.isPrimary ? 'Primary timezone' : 'Click to set as primary'}
    >
      <div className="row-header-top">
        <div className="row-city-info">
          {row.isPrimary && <span className="primary-badge">PRIMARY</span>}
          <span className="row-city">{row.city.name}</span>
          <span className="row-country">{row.city.country}</span>
        </div>
        <button
          className="row-delete"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(row.id);
          }}
          title="Remove"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="row-header-bottom">
        <span className="row-time">{localTime}</span>
        <span className="row-offset">{formatUtcOffset(offset)}</span>
        {!row.isPrimary && !overlap && (
          <span className="no-overlap-badge">No overlap</span>
        )}
      </div>
    </div>
  );
}

export function TimezoneGrid({ rows, settings, onRemove, onSetPrimary }: TimezoneGridProps) {
  const [, setTick] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const primaryRow = rows.find((r) => r.isPrimary) || rows[0];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  if (isMobile) {
    return (
      <div className="grid-container">
        <div className="mobile-grid">
          {rows.map((row) => {
            const currentH = getCurrentHour(row.city.timezone);
            return (
              <div className="mobile-tz-card" key={row.id}>
                <RowHeader
                  row={row}
                  primaryTimezone={primaryRow.city.timezone}
                  settings={settings}
                  onRemove={onRemove}
                  onSetPrimary={onSetPrimary}
                />
                <div className="mobile-hours-scroll">
                  <div className="mobile-hours-track">
                    {hours.map((h) => {
                      const cellType = getCellType(h, row.city.timezone, primaryRow.city.timezone, settings);
                      const isCurrent = h === currentH;
                      return (
                        <div key={h} className="mobile-hour-col">
                          <div className={`mobile-hour-label ${isCurrent ? 'current-hour' : ''}`}>
                            {formatHourLabel(h, settings.timeFormat)}
                          </div>
                          <div className={`tz-cell ${cellType} ${isCurrent ? 'current' : ''}`}>
                            {isCurrent && <div className="current-dot" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Legend />
      </div>
    );
  }

  return (
    <div className="grid-container">
      <div className="grid-scroll">
        <div className="tz-grid" style={{ gridTemplateColumns: `clamp(180px, 22vw, 260px) repeat(24, 1fr)` }}>
          <div className="grid-corner" />
          {hours.map((h) => {
            const isCurrentInPrimary = primaryRow && getCurrentHour(primaryRow.city.timezone) === h;
            return (
              <div
                key={h}
                className={`grid-hour-label ${isCurrentInPrimary ? 'current-hour' : ''}`}
              >
                {formatHourLabel(h, settings.timeFormat)}
              </div>
            );
          })}

          {rows.map((row) => {
            const currentH = getCurrentHour(row.city.timezone);
            return (
              <div className="tz-row-contents" key={row.id}>
                <RowHeader
                  row={row}
                  primaryTimezone={primaryRow.city.timezone}
                  settings={settings}
                  onRemove={onRemove}
                  onSetPrimary={onSetPrimary}
                />
                {hours.map((h) => {
                  const cellType = getCellType(h, row.city.timezone, primaryRow.city.timezone, settings);
                  const isCurrent = h === currentH;
                  return (
                    <div
                      key={h}
                      className={`tz-cell ${cellType} ${isCurrent ? 'current' : ''}`}
                      title={`${formatHourLabel(h, settings.timeFormat)} - ${cellType}`}
                    >
                      {isCurrent && <div className="current-dot" />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="grid-legend">
      <div className="legend-item">
        <div className="legend-swatch overlap" />
        <span>Working overlap</span>
      </div>
      <div className="legend-item">
        <div className="legend-swatch wake" />
        <span>Wake-up</span>
      </div>
      <div className="legend-item">
        <div className="legend-swatch day" />
        <span>Daytime</span>
      </div>
      <div className="legend-item">
        <div className="legend-swatch night" />
        <span>Night</span>
      </div>
      <div className="legend-item">
        <div className="legend-swatch current-indicator" />
        <span>Now</span>
      </div>
    </div>
  );
}
