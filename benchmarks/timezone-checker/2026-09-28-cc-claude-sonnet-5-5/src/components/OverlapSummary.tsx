import { formatRange, type Computation, type HourFormat, type Mode, type Overlap } from "../lib/time";
import type { GridCity } from "./types";

function Ranges({ overlap, format }: { overlap: Overlap; format: HourFormat }) {
  return (
    <span className="badges">
      {overlap.ranges.map((r) => (
        <span className="badge" key={r.start}>
          {formatRange(r, format)}
        </span>
      ))}
    </span>
  );
}

const hoursLabel = (n: number) => `${n} ${n === 1 ? "hour" : "hours"}`;

export function OverlapSummary({
  cities,
  result,
  mode,
  format,
}: {
  cities: GridCity[];
  result: Computation;
  mode: Mode;
  format: HourFormat;
}) {
  const refName = cities[0].name;
  return (
    <div className="summary" aria-live="polite">
      {mode === "meeting" ? (
        result.meeting.count === 0 ? (
          <p className="warn">No common awake hours across all {cities.length} cities. Try adjusting the awake window or removing a city.</p>
        ) : (
          <div className="summary-row">
            <strong>{hoursLabel(result.meeting.count)} overlap</strong>
            <Ranges overlap={result.meeting} format={format} />
            <span className="muted">in {refName} time</span>
          </div>
        )
      ) : (
        cities.slice(1).map((c) => {
          const o = result.perCity[c.id];
          return (
            <div className="summary-row" key={c.id}>
              <span className="who">{c.name}</span>
              {o.count === 0 ? (
                <span className="warn inline">No overlap with {refName}</span>
              ) : (
                <>
                  <strong>{hoursLabel(o.count)}</strong>
                  <Ranges overlap={o} format={format} />
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
