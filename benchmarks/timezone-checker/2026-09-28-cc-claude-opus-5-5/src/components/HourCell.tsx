import { memo, type CSSProperties } from "react";
import { cx } from "../lib/cx";
import type { CellState, ScheduleCell } from "../lib/schedule";
import { clockParts, formatClock, formatHour, type TimeFormat } from "../lib/time";
import styles from "./HourCell.module.css";

const STATE_LABEL: Record<CellState, string> = {
  asleep: "Sleeping",
  awake: "Awake",
  overlap: "Overlap",
};

interface HourCellProps {
  cell: ScheduleCell;
  format: TimeFormat;
  cityName: string;
  referenceName: string;
  orientation: "horizontal" | "vertical";
  runStart: boolean;
  runEnd: boolean;
  highlighted?: boolean;
  style?: CSSProperties;
}

export const HourCell = memo(function HourCell({
  cell,
  format,
  cityName,
  referenceName,
  orientation,
  runStart,
  runEnd,
  highlighted = false,
  style,
}: HourCellProps) {
  const { hour, minutes, period } = clockParts(cell.localMinutes, format);
  const description = `${cityName}: ${formatClock(cell.localMinutes, format)} ${cell.weekday} when it's ${formatHour(
    cell.refHour,
    format,
  )} in ${referenceName} — ${STATE_LABEL[cell.state]}`;

  return (
    <div
      role="cell"
      data-col={cell.refHour}
      aria-label={description}
      title={description}
      style={style}
      className={cx(
        styles.cell,
        styles[orientation],
        styles[cell.state],
        runStart && styles.runStart,
        runEnd && styles.runEnd,
        cell.startsDay && styles.dayStart,
        highlighted && styles.highlighted,
      )}
    >
      {cell.startsDay && <span className={styles.dayTag}>{cell.weekday}</span>}
      {orientation === "horizontal" ? (
        <>
          <span className={styles.time}>{hour}</span>
          {(minutes || period) && (
            <span className={styles.period}>
              {minutes && <span className={styles.minutes}>{minutes}</span>}
              {period}
            </span>
          )}
        </>
      ) : (
        <>
          <span className={styles.time}>
            {hour}
            {minutes && <span className={styles.minutes}>{minutes}</span>}
          </span>
          {period && <span className={styles.period}>{period}</span>}
        </>
      )}
    </div>
  );
});

/** Where each cell sits within a run of identical states, so runs render as continuous pills. */
export function runEdges(cells: readonly ScheduleCell[], index: number) {
  const state = cells[index]?.state;
  return {
    runStart: index === 0 || cells[index - 1]?.state !== state,
    runEnd: index === cells.length - 1 || cells[index + 1]?.state !== state,
  };
}
