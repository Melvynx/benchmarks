import { formatRange, toRanges, type Analysis, type Mode, type TimeFormat } from "../lib/time";

function Ranges({ hours, format }: { hours: number[]; format: TimeFormat }) {
  return (
    <span className="ranges">
      {toRanges(hours).map((r) => (
        <span key={r[0]} className="badge">
          {formatRange(r, format)}
        </span>
      ))}
    </span>
  );
}

const plural = (n: number) => `${n} hour${n === 1 ? "" : "s"}`;

export function OverlapSummary({
  analysis,
  mode,
  format,
}: {
  analysis: Analysis;
  mode: Mode;
  format: TimeFormat;
}) {
  if (mode === "meeting") {
    const hours = analysis.meetingHours;
    return (
      <div className="summary" aria-live="polite">
        {hours.length === 0 ? (
          <p className="warn">No common awake hours across all cities. Try widening the awake window or removing a city.</p>
        ) : (
          <div className="summary-line">
            <strong>{plural(hours.length)} of overlap</strong>
            <Ranges hours={hours} format={format} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="summary" aria-live="polite">
      {analysis.rows.slice(1).map((row) => (
        <div key={row.city.id} className="summary-line">
          <strong>{row.city.name}</strong>
          {row.overlapHours.length === 0 ? (
            <span className="warn inline">No overlap with {analysis.rows[0].city.name}</span>
          ) : (
            <>
              <span className="muted">{plural(row.overlapHours.length)}</span>
              <Ranges hours={row.overlapHours} format={format} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
