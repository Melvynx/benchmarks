import { memo } from "react";
import type { Cell } from "../../lib/schedule";
import { clockParts, formatTime, type TimeFormat } from "../../lib/time";
import styles from "./grid.module.css";

const STATUS_LABEL = { asleep: "asleep", awake: "awake", overlap: "overlap" } as const;

interface HourCellProps {
  cell: Cell;
  cityName: string;
  format: TimeFormat;
  dayLabel: string | null;
  isNow: boolean;
  isHovered: boolean;
  layout: "desktop" | "mobile";
  onHover: (refHour: number | null) => void;
}

export const HourCell = memo(function HourCell({
  cell,
  cityName,
  format,
  dayLabel,
  isNow,
  isHovered,
  layout,
  onHover,
}: HourCellProps) {
  const { hour, minutes, meridiem } = clockParts(cell.localMinutes, format);
  const time = formatTime(cell.localMinutes, format);
  const label = `${time}${dayLabel ? ` ${dayLabel}` : ""} in ${cityName}, ${STATUS_LABEL[cell.status]}`;

  return (
    <div
      role="cell"
      aria-label={label}
      title={label}
      className={styles.cell}
      data-layout={layout}
      data-status={cell.status}
      data-now={isNow || undefined}
      data-hovered={isHovered || undefined}
      data-newday={(cell.isNewDay && cell.refHour > 0) || undefined}
      onPointerEnter={() => onHover(cell.refHour)}
      onPointerLeave={() => onHover(null)}
    >
      {layout === "desktop" ? (
        <>
          <span className={styles.cellHour}>{hour}</span>
          <span className={styles.cellSub} data-day={!!dayLabel || undefined}>
            {dayLabel ?? `${minutes}${meridiem}`}
          </span>
        </>
      ) : (
        <>
          <span className={styles.cellTime}>
            {hour}
            {minutes || (format === "24h" ? ":00" : "")}
            <span className={styles.cellMeridiem}>{meridiem}</span>
          </span>
          {dayLabel && <span className={styles.cellDay}>{dayLabel}</span>}
        </>
      )}
    </div>
  );
});
