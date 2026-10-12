import { formatRange, hourCountLabel } from "../lib/format";
import type { OverlapLine } from "../lib/board";
import type { Mode, TimeFormat, TimeRange } from "../types";

type Props = {
  mode: Mode;
  format: TimeFormat;
  referenceName: string;
  meeting: { hours: number; ranges: TimeRange[] } | null;
  baseLines: OverlapLine[];
};

export function OverlapSummary({ mode, format, referenceName, meeting, baseLines }: Props) {
  if (mode === "meeting") {
    if (!meeting) return null;
    if (meeting.hours === 0) {
      return (
        <div className="summary" role="status">
          <p className="warn">No shared awake hours for these cities.</p>
        </div>
      );
    }
    return (
      <div className="summary is-open" role="status">
        <p className="summary-lead">
          <strong>{meeting.hours}</strong> shared {meeting.hours === 1 ? "hour" : "hours"} in {referenceName}
        </p>
        <div className="badges">
          {meeting.ranges.map((range) => (
            <span className="badge" key={`${range.start}-${range.end}`}>
              {formatRange(range, format)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (baseLines.length === 0) return null;

  return (
    <div className="summary" role="status">
      <p className="summary-lead">
        Times in <strong>{referenceName}</strong>
      </p>
      <ul className="base-list">
        {baseLines.map((line) => (
          <li key={line.cityId}>
            <span className="who">{line.cityName}</span>
            {line.hours === 0 ? (
              <span className="warn inline">No overlap with {line.cityName}</span>
            ) : (
              <>
                <span className="count">{hourCountLabel(line.hours)}</span>
                <span className="badges">
                  {line.ranges.map((range) => (
                    <span className="badge" key={`${line.cityId}-${range.start}-${range.end}`}>
                      {formatRange(range, format)}
                    </span>
                  ))}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
