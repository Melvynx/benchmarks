import { memo } from "react";
import type { Cell } from "../../lib/grid";
import { formatCell, formatTime } from "../../lib/time";
import type { TimeFormat } from "../../types";

interface HourCellProps {
  cell: Cell;
  format: TimeFormat;
  cityName: string;
  referenceName: string;
  isNow: boolean;
  layout: "desktop" | "mobile";
}

const STATE_LABEL = { sleeping: "asleep", awake: "awake", overlap: "overlap" } as const;

export const HourCell = memo(function HourCell({
  cell,
  format,
  cityName,
  referenceName,
  isNow,
  layout,
}: HourCellProps) {
  const { primary, secondary } = formatCell(cell.localMinute, format);
  const local = formatTime(cell.localMinute, format);
  const ref = formatTime(cell.refHour * 60, format);
  const title =
    cityName === referenceName
      ? `${cell.weekday} ${local} in ${cityName} · ${STATE_LABEL[cell.state]}`
      : `${cell.weekday} ${local} in ${cityName} when it's ${ref} in ${referenceName} · ${STATE_LABEL[cell.state]}`;

  const className = [
    "cell",
    `cell--${layout}`,
    `cell--${cell.state}`,
    isNow && "cell--now",
    cell.isLocalMidnight && "cell--midnight",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} title={title} role="cell" aria-label={title}>
      {layout === "desktop" ? (
        <>
          <span className="cell__primary">{primary}</span>
          <span className="cell__secondary">{cell.isLocalMidnight ? cell.weekday : secondary}</span>
        </>
      ) : (
        <>
          <span className="cell__primary">
            {primary}
            <span className="cell__secondary">{secondary}</span>
          </span>
          {cell.isLocalMidnight && <span className="cell__day">{cell.weekday}</span>}
        </>
      )}
    </div>
  );
});
