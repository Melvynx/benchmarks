import type { CSSProperties } from "react";

import type { CityOption } from "@/lib/city-catalog";
import type { AppMode, TimeFormat } from "@/lib/timezone";
import {
  formatAxisHour,
  formatRangeLabel,
  summarizeOverlap,
} from "@/lib/timezone";

type GridCell = {
  label: string;
  awake: boolean;
  overlap: boolean;
};

type CityRow = {
  city: CityOption;
  offsetLabel: string;
  cells: GridCell[];
};

type SummaryLine = {
  id: string;
  label: string;
  hours: boolean[];
};

type TimezoneGridProps = {
  cities: CityRow[];
  mode: AppMode;
  timeFormat: TimeFormat;
  referenceDateLabel: string;
  referenceCityName: string;
  onPromoteCity: (cityId: string) => void;
  onRemoveCity: (cityId: string) => void;
};

export default function TimezoneGrid({
  cities,
  mode,
  timeFormat,
  referenceDateLabel,
  referenceCityName,
  onPromoteCity,
  onRemoveCity,
}: TimezoneGridProps) {
  const referenceCity = cities[0];
  const summaryLines: SummaryLine[] =
    mode === "meeting"
      ? [
          {
            id: "meeting",
            label: "Everyone",
            hours: referenceCity.cells.map((cell) => cell.overlap),
          },
        ]
      : cities.slice(1).map((row) => ({
          id: row.city.id,
          label: row.city.city,
          hours: row.cells.map((cell) => cell.overlap),
        }));

  const desktopStyle = {
    "--city-count": String(cities.length),
  } as CSSProperties;

  return (
    <>
      {cities.length >= 2 ? (
        <section className="summary-card">
          <div className="summary-card__header">
            <p className="eyebrow">
              {mode === "meeting" ? "Meeting mode" : "Base mode"}
            </p>
            <h2>
              {mode === "meeting"
                ? "Shared meeting windows"
                : `Base windows from ${referenceCityName}`}
            </h2>
            <p className="summary-card__note">
              All ranges are shown in {referenceCityName}&apos;s timezone for{" "}
              {referenceDateLabel}.
            </p>
          </div>
          <div className="summary-list">
            {summaryLines.map((line) => {
              const summary = summarizeOverlap(line.hours);

              return (
                <div className="summary-line" key={line.id}>
                  <div className="summary-line__lead">
                    <span className="summary-line__name">{line.label}</span>
                    <span className="summary-line__count">
                      {summary.count} {summary.count === 1 ? "hour" : "hours"}
                    </span>
                  </div>
                  {summary.count > 0 ? (
                    <div className="summary-line__ranges">
                      {summary.segments.map((segment) => (
                        <span className="range-pill" key={`${segment.start}-${segment.end}`}>
                          {formatRangeLabel(segment.start, segment.end, timeFormat)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="summary-line__warning">
                      No overlap on this reference day.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="board-card">
        <div className="board-card__header">
          <div>
            <p className="eyebrow">Reference day</p>
            <h2>{referenceDateLabel}</h2>
          </div>
          <p className="board-card__copy">
            Click any city name to promote it to the reference row.
          </p>
        </div>

        <div className="desktop-board" style={desktopStyle}>
          <div className="desktop-board__row desktop-board__row--header">
            <div className="desktop-board__city-spacer">
              <span>City</span>
            </div>
            <div className="desktop-board__hours desktop-board__hours--header">
              {Array.from({ length: 24 }, (_, hour) => (
                <div className="axis-cell" key={hour}>
                  {formatAxisHour(hour, timeFormat)}
                </div>
              ))}
            </div>
            <div className="desktop-board__remove-spacer" />
          </div>
          {cities.map((row, index) => (
            <div className="desktop-board__row" key={row.city.id}>
              <div className="desktop-board__city">
                <button
                  className="city-name-button"
                  type="button"
                  onClick={() => onPromoteCity(row.city.id)}
                >
                  <span>{row.city.city}</span>
                  {index === 0 ? <span className="ref-badge">REF</span> : null}
                </button>
                <div className="desktop-board__meta">
                  <span>{row.city.country}</span>
                  <span>{row.offsetLabel}</span>
                </div>
              </div>
              <div className="desktop-board__hours">
                {row.cells.map((cell, cellIndex) => (
                  <div
                    className={[
                      "time-cell",
                      cell.overlap
                        ? "time-cell--overlap"
                        : cell.awake
                          ? "time-cell--awake"
                          : "time-cell--sleeping",
                    ].join(" ")}
                    key={`${row.city.id}-${cellIndex}`}
                  >
                    {cell.label}
                  </div>
                ))}
              </div>
              <div className="desktop-board__remove">
                <button
                  className="remove-button"
                  type="button"
                  onClick={() => onRemoveCity(row.city.id)}
                  disabled={cities.length === 1}
                  aria-label={`Remove ${row.city.city}`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mobile-board">
          <div
            className="mobile-board__grid"
            style={{ "--city-count": String(cities.length) } as CSSProperties}
          >
            <div className="mobile-board__corner">Hour</div>
            {cities.map((row, index) => (
              <div className="mobile-board__city-head" key={row.city.id}>
                <button
                  className="mobile-board__city-button"
                  type="button"
                  onClick={() => onPromoteCity(row.city.id)}
                >
                  {row.city.city}
                </button>
                <div className="mobile-board__city-meta">
                  {index === 0 ? <span className="ref-badge">REF</span> : null}
                  <span>{row.offsetLabel}</span>
                </div>
                <button
                  className="remove-button remove-button--compact"
                  type="button"
                  onClick={() => onRemoveCity(row.city.id)}
                  disabled={cities.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            {Array.from({ length: 24 }, (_, hour) => (
              <FragmentRow
                hour={hour}
                key={hour}
                cities={cities}
                timeFormat={timeFormat}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function FragmentRow({
  hour,
  cities,
  timeFormat,
}: {
  hour: number;
  cities: CityRow[];
  timeFormat: TimeFormat;
}) {
  return (
    <>
      <div className="mobile-board__hour">{formatAxisHour(hour, timeFormat)}</div>
      {cities.map((row) => {
        const cell = row.cells[hour];

        return (
          <div
            className={[
              "time-cell",
              "time-cell--mobile",
              cell.overlap
                ? "time-cell--overlap"
                : cell.awake
                  ? "time-cell--awake"
                  : "time-cell--sleeping",
            ].join(" ")}
            key={`${row.city.id}-${hour}`}
          >
            {cell.label}
          </div>
        );
      })}
    </>
  );
}
