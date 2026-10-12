import { useState, type PointerEvent } from "react";
import { cx } from "../lib/cx";
import type { Schedule } from "../lib/schedule";
import { HOURS, formatHour, type TimeFormat } from "../lib/time";
import { CityIdentity, RemoveButton } from "./CityIdentity";
import { HourCell, runEdges } from "./HourCell";
import styles from "./DesktopGrid.module.css";

export interface GridProps {
  schedule: Schedule;
  format: TimeFormat;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}

/** Cities as rows, the reference city's 24 hours as columns. */
export function DesktopGrid({ schedule, format, onPromote, onRemove }: GridProps) {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const referenceName = schedule.reference?.city.name ?? "";

  const trackHover = (event: PointerEvent) => {
    const col = (event.target as HTMLElement).closest<HTMLElement>("[data-col]")?.dataset.col;
    setHoveredCol(col === undefined ? null : Number(col));
  };

  return (
    <div className={styles.scroller}>
      <div
        className={styles.grid}
        role="table"
        aria-label={`Hourly availability, anchored to ${referenceName} time`}
        onPointerOver={trackHover}
        onPointerLeave={() => setHoveredCol(null)}
      >
        <div className={cx(styles.row, styles.head)} role="row">
          <div className={styles.headLabel} role="columnheader">
            {referenceName} day
          </div>
          {HOURS.map((hour) => (
            <div
              key={hour}
              role="columnheader"
              aria-label={formatHour(hour, format)}
              className={cx(styles.tick, hour % 6 === 0 && styles.tickMajor, hoveredCol === hour && styles.tickActive)}
            >
              <span className={styles.tickMark} />
            </div>
          ))}
          <div role="columnheader" aria-label="Actions" />
        </div>

        <div className={styles.body}>
          {schedule.rows.map((row) => (
            <div key={row.city.id} role="row" className={cx(styles.row, row.isReference && styles.referenceRow)}>
              <div role="rowheader" className={styles.info}>
                <CityIdentity row={row} format={format} onPromote={onPromote} />
              </div>
              {row.cells.map((cell, index) => (
                <HourCell
                  key={cell.refHour}
                  cell={cell}
                  format={format}
                  cityName={row.city.name}
                  referenceName={referenceName}
                  orientation="horizontal"
                  highlighted={hoveredCol === cell.refHour}
                  {...runEdges(row.cells, index)}
                />
              ))}
              <div role="cell" className={styles.action}>
                <RemoveButton name={row.city.name} onClick={() => onRemove(row.city.id)} />
              </div>
            </div>
          ))}
        </div>

        <div className={cx(styles.row, styles.overlay)} aria-hidden="true">
          <div className={styles.nowTrack}>
            <span className={styles.nowLine} style={{ left: `${(schedule.nowRefHour / 24) * 100}%` }}>
              <span className={styles.nowTag}>Now</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
