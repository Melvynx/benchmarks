import type { CSSProperties } from "react";
import type { City } from "../data/cities";
import {
  formatHour,
  formatLocalTime,
  formatUtcOffset,
  referenceDateLabel,
  type LocalTime,
  type Mode,
  type TimeFormat,
} from "../lib/timezone";
import { ArrowUpIcon, CloseIcon, PlusIcon } from "./Icons";

type TimeGridProps = {
  cities: City[];
  matrix: LocalTime[][];
  awakeMatrix: boolean[][];
  overlapRows: boolean[][];
  offsets: number[];
  mode: Mode;
  timeFormat: TimeFormat;
  now: Date;
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
  onOpenPicker: () => void;
};

type CellProps = {
  city: City;
  reference: City;
  localTime: LocalTime;
  referenceHour: number;
  awake: boolean;
  overlap: boolean;
  timeFormat: TimeFormat;
  mobile?: boolean;
};

function TimeCell({
  city,
  reference,
  localTime,
  referenceHour,
  awake,
  overlap,
  timeFormat,
  mobile = false,
}: CellProps) {
  const state = overlap ? "overlap" : awake ? "awake" : "sleeping";
  const localLabel = formatLocalTime(localTime, timeFormat, true);
  const referenceLabel = formatHour(referenceHour, timeFormat);
  const detail = `${city.name}, ${formatLocalTime(localTime, timeFormat, false)}. ${
    overlap ? "Shared awake hour" : awake ? "Awake, no overlap" : "Sleeping"
  }. ${reference.name} is ${referenceLabel}.`;
  return (
    <div
      className={`time-cell ${state} ${mobile ? "mobile-time-cell" : ""}`}
      data-marker={referenceHour % 6 === 0 || undefined}
      data-state={state}
      role="cell"
      aria-label={detail}
      title={detail}
    >
      <span>{localLabel}</span>
      {overlap && <i aria-hidden="true" />}
    </div>
  );
}

function ReferenceBadge() {
  return <span className="ref-badge">REF</span>;
}

export function TimeGrid({
  cities,
  matrix,
  awakeMatrix,
  overlapRows,
  offsets,
  mode,
  timeFormat,
  now,
  onPromote,
  onRemove,
  onOpenPicker,
}: TimeGridProps) {
  if (cities.length === 0) {
    return (
      <section className="grid-empty">
        <div className="empty-orbit" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <h2>Start with a reference city</h2>
          <p>Add a city, then compare it with teammates around the world.</p>
          <button type="button" className="empty-add-button" onClick={onOpenPicker}><PlusIcon /> Add first city</button>
        </div>
      </section>
    );
  }

  const reference = cities[0];
  const dateLabel = referenceDateLabel(reference.timeZone, now);

  return (
    <section className="grid-section" aria-label="Timezone comparison">
      <div className="grid-meta-row">
        <div>
          <span className="grid-kicker">Reference day</span>
          <strong>{dateLabel} in {reference.name}</strong>
        </div>
        <span>{cities.length} {cities.length === 1 ? "city" : "cities"} · offsets for today</span>
      </div>

      <div className="desktop-grid-shell">
        <div className="desktop-grid" role="table" aria-label={`24-hour comparison based on ${reference.name}`}>
          <div className="desktop-grid-row grid-header-row" role="row">
            <div className="city-header-cell" role="columnheader">City / local time</div>
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                className="hour-header"
                data-marker={hour % 6 === 0 || undefined}
                role="columnheader"
                key={hour}
                aria-label={`${formatHour(hour, timeFormat)} in ${reference.name}`}
              >
                <span>{formatHour(hour, timeFormat, true)}</span>
                {hour % 6 === 0 && <i>{hour === 0 ? "night" : hour === 6 ? "morning" : hour === 12 ? "noon" : "evening"}</i>}
              </div>
            ))}
            <div className="action-header" role="columnheader"><span className="sr-only">Remove</span></div>
          </div>

          {cities.map((city, cityIndex) => (
            <div className={`desktop-grid-row city-grid-row ${cityIndex === 0 ? "reference-row" : ""}`} role="row" key={city.id}>
              <div className="desktop-city-cell" role="rowheader">
                <button
                  type="button"
                  className="city-name-button"
                  onClick={() => onPromote(city.id)}
                  aria-label={cityIndex === 0 ? `${city.name} is the reference city` : `Make ${city.name} the reference city`}
                  aria-current={cityIndex === 0 ? "true" : undefined}
                >
                  <span className="city-name-line"><strong>{city.name}</strong>{cityIndex === 0 && <ReferenceBadge />}</span>
                  <span className="city-subline">{city.country} · {formatUtcOffset(offsets[cityIndex])}</span>
                  {cityIndex !== 0 && <span className="promote-hint"><ArrowUpIcon /> Make reference</span>}
                </button>
              </div>
              {matrix[cityIndex].map((localTime, hour) => (
                <TimeCell
                  key={hour}
                  city={city}
                  reference={reference}
                  localTime={localTime}
                  referenceHour={hour}
                  awake={awakeMatrix[cityIndex][hour]}
                  overlap={overlapRows[cityIndex][hour]}
                  timeFormat={timeFormat}
                />
              ))}
              <div className="row-action-cell" role="cell">
                <button type="button" className="remove-button" onClick={() => onRemove(city.id)} aria-label={`Remove ${city.name}`} title={`Remove ${city.name}`}>
                  <CloseIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mobile-grid-shell">
        <div
          className="mobile-grid"
          style={{ "--city-count": cities.length } as CSSProperties}
          role="table"
          aria-label={`Vertical 24-hour comparison based on ${reference.name}`}
        >
          <div className="mobile-corner" role="columnheader">{reference.name}<span>time</span></div>
          {cities.map((city, cityIndex) => (
            <div className={`mobile-city-header ${cityIndex === 0 ? "reference-column" : ""}`} role="columnheader" key={city.id}>
              <button
                type="button"
                className="mobile-city-name"
                onClick={() => onPromote(city.id)}
                aria-label={cityIndex === 0 ? `${city.name} is the reference city` : `Make ${city.name} the reference city`}
                aria-current={cityIndex === 0 ? "true" : undefined}
              >
                <strong>{city.name}</strong>
                <span>{formatUtcOffset(offsets[cityIndex])}</span>
                {cityIndex === 0 ? <ReferenceBadge /> : <span className="mobile-promote">Tap to make REF</span>}
              </button>
              <button type="button" className="mobile-remove-button" onClick={() => onRemove(city.id)} aria-label={`Remove ${city.name}`}>
                <CloseIcon />
              </button>
            </div>
          ))}

          {Array.from({ length: 24 }, (_, hour) => (
            <div className="mobile-hour-row" role="row" key={hour}>
              <div className="mobile-hour-label" data-marker={hour % 6 === 0 || undefined} role="rowheader">
                <span>{formatHour(hour, timeFormat, true)}</span>
              </div>
              {cities.map((city, cityIndex) => (
                <TimeCell
                  key={city.id}
                  city={city}
                  reference={reference}
                  localTime={matrix[cityIndex][hour]}
                  referenceHour={hour}
                  awake={awakeMatrix[cityIndex][hour]}
                  overlap={overlapRows[cityIndex][hour]}
                  timeFormat={timeFormat}
                  mobile
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid-footer">
        <div className="legend" aria-label="Grid legend">
          <span><i className="legend-swatch sleeping" /> Sleeping</span>
          <span><i className="legend-swatch awake" /> Awake</span>
          <span><i className="legend-swatch overlap"><b /></i> Overlap</span>
        </div>
        <p>{mode === "meeting" ? "Green cells = everyone awake" : "Green cells = reference + this city awake"}</p>
      </div>
    </section>
  );
}
