import { useMemo } from "react";
import { formatTime, getLocalHour, getUTCOffsetString } from "./useClock";
import { getOverlapHours, getWakeHours, isNightHour, hasAnyOverlap } from "./overlap";
import "./TimezoneCard.css";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourLabel(h) {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

export function TimezoneCard({ card, isPrimary, onSetPrimary, onRemove, primaryTimezone, settings, now }) {
  const { timezone, city, country } = card;
  const { workStart, workEnd, wakeStart, wakeEnd, timeFormat } = settings;

  const currentHour = getLocalHour(now, timezone);
  const timeString = formatTime(now, timezone, timeFormat);
  const utcOffset = getUTCOffsetString(timezone, now);

  const overlapHours = useMemo(
    () => getOverlapHours(primaryTimezone, timezone, workStart, workEnd),
    [primaryTimezone, timezone, workStart, workEnd, now]
  );

  const wakeHours = useMemo(
    () => getWakeHours(wakeStart, wakeEnd),
    [wakeStart, wakeEnd]
  );

  const hasOverlap = hasAnyOverlap(overlapHours);
  const isSelf = primaryTimezone === timezone;

  return (
    <div
      className={`tz-card ${isPrimary ? "tz-card--primary" : ""}`}
      style={{ "--card-in": 1 }}
    >
      <div className="tz-card__header" onClick={onSetPrimary} title="Set as primary">
        <div className="tz-card__info">
          <div className="tz-card__city">{city}</div>
          <div className="tz-card__country">{country}</div>
        </div>
        <div className="tz-card__meta">
          {isPrimary && <span className="primary-badge">Primary</span>}
          {!hasOverlap && !isSelf && <span className="no-overlap-badge">No overlap</span>}
        </div>
        <button
          className="tz-card__remove"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Remove"
        >
          ×
        </button>
      </div>

      <div className="tz-card__time">
        <span className="tz-card__clock">{timeString}</span>
        <span className="tz-card__offset">{utcOffset}</span>
      </div>

      <div className="tz-card__grid" role="grid" aria-label="24-hour timeline">
        {HOURS.map((h) => {
          const isOverlap = overlapHours[h];
          const isWake = wakeHours[h] && !isOverlap;
          const isNight = isNightHour(h);
          const isCurrent = h === currentHour;

          let cellClass = "grid-cell";
          if (isOverlap) cellClass += " grid-cell--overlap";
          else if (isWake) cellClass += " grid-cell--wake";
          else if (isNight) cellClass += " grid-cell--night";
          else cellClass += " grid-cell--day";
          if (isCurrent) cellClass += " grid-cell--current";

          return (
            <div key={h} className={cellClass} title={`${hourLabel(h)} local`}>
              <span className="grid-cell__label">{hourLabel(h)}</span>
            </div>
          );
        })}
      </div>

      <div className="tz-card__legend">
        {isSelf ? (
          <span className="legend-item"><span className="legend-dot legend-dot--overlap" /> Working hours</span>
        ) : hasOverlap ? (
          <span className="legend-item"><span className="legend-dot legend-dot--overlap" /> Overlap</span>
        ) : null}
        <span className="legend-item"><span className="legend-dot legend-dot--wake" /> Wake window</span>
      </div>
    </div>
  );
}
