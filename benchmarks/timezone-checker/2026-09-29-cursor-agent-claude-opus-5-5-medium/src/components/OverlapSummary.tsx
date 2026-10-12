import type { ReactNode } from "react";
import type { HourRange, Summary } from "../lib/grid";
import { formatHour, formatOffset, formatTime } from "../lib/time";
import type { City, TimeFormat } from "../types";
import { AlertIcon } from "./Icons";

interface OverlapSummaryProps {
  summary: Summary;
  reference: City;
  refOffset: number;
  format: TimeFormat;
}

export function OverlapSummary({ summary, reference, refOffset, format }: OverlapSummaryProps) {
  if (summary.kind === "meeting") {
    return (
      <section className="panel summary" aria-live="polite" aria-label="Overlap summary">
        {summary.hours > 0 ? (
          <div className="summary__meeting">
            <div className="summary__headline">
              <span className="summary__count">{summary.hours}h</span>
              <span className="summary__label">
                when everyone is awake
                <span className="summary__sub">in {reference.name} time</span>
              </span>
            </div>
            <RangeList ranges={summary.ranges} format={format} />
          </div>
        ) : (
          <Warning>
            No hour where everyone is awake. Widen the awake window, switch to Base mode, or drop a city.
          </Warning>
        )}
      </section>
    );
  }

  return (
    <section className="panel summary" aria-live="polite" aria-label="Overlap summary">
      <div className="summary__base-head">
        <span className="eyebrow">Overlap with {reference.name}</span>
        <span className="summary__sub">times in {reference.name} time</span>
      </div>
      <ul className="summary__base">
        {summary.entries.map((entry) => (
          <li key={entry.city.id} className="summary__entry">
            <div className="summary__entry-city">
              <span className="summary__entry-name">{entry.city.name}</span>
              <span className="summary__entry-offset">{formatOffset(entry.offset)}</span>
            </div>
            {entry.hours > 0 ? (
              <>
                <span className="summary__entry-count">{entry.hours}h</span>
                <div className="summary__entry-ranges">
                  <RangeList ranges={entry.ranges} format={format} />
                  <span className="summary__local">
                    {entry.ranges
                      .map(
                        (range) =>
                          `${formatTime(range.start * 60 - refOffset + entry.offset, format)}–${formatTime(
                            range.end * 60 - refOffset + entry.offset,
                            format,
                          )}`,
                      )
                      .join(", ")}{" "}
                    in {entry.city.name}
                  </span>
                </div>
              </>
            ) : (
              <Warning compact>No shared awake hours</Warning>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RangeList({ ranges, format }: { ranges: HourRange[]; format: TimeFormat }) {
  return (
    <ul className="ranges">
      {ranges.map((range) => (
        <li key={range.start} className="range">
          <span>{formatHour(range.start, format)}</span>
          <span className="range__dash" aria-label="to">
            —
          </span>
          <span>{formatHour(range.end % 24, format)}</span>
          <span className="range__len">{range.end - range.start}h</span>
        </li>
      ))}
    </ul>
  );
}

function Warning({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={`warning${compact ? " warning--compact" : ""}`} role="status">
      <AlertIcon />
      <span>{children}</span>
    </div>
  );
}
