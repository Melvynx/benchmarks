import type { CSSProperties } from "react";
import { HOURS } from "../lib/time";
import { CityIdentity, RemoveButton } from "./CityIdentity";
import type { GridProps } from "./DesktopGrid";
import { HourCell, runEdges } from "./HourCell";
import styles from "./MobileGrid.module.css";

/** Cities as columns, the reference city's 24 hours as rows. */
export function MobileGrid({ schedule, format, onPromote, onRemove }: GridProps) {
  const referenceName = schedule.reference?.city.name ?? "";
  const { rows } = schedule;

  return (
    <div className={styles.scroller}>
      <div
        className={styles.grid}
        role="table"
        aria-label={`Hourly availability, anchored to ${referenceName} time`}
        style={{ "--cities": rows.length } as CSSProperties}
      >
        <div className={styles.referenceColumn} aria-hidden="true" />

        <div role="row" className={styles.contents}>
          {rows.map((row, column) => (
            <div
              key={row.city.id}
              role="columnheader"
              className={styles.head}
              style={{ gridRow: 1, gridColumn: column + 1 }}
            >
              <CityIdentity row={row} format={format} onPromote={onPromote} layout="stack" />
              <RemoveButton name={row.city.name} onClick={() => onRemove(row.city.id)} />
            </div>
          ))}
        </div>

        {HOURS.map((hour) => (
          <div key={hour} role="row" className={styles.contents}>
            {rows.map((row, column) => {
              const cell = row.cells[hour];
              if (!cell) return null;
              return (
                <HourCell
                  key={row.city.id}
                  cell={cell}
                  format={format}
                  cityName={row.city.name}
                  referenceName={referenceName}
                  orientation="vertical"
                  style={{ gridRow: hour + 2, gridColumn: column + 1 }}
                  {...runEdges(row.cells, hour)}
                />
              );
            })}
          </div>
        ))}

        <div className={styles.nowTrack} aria-hidden="true">
          <span className={styles.nowLine} style={{ top: `${(schedule.nowRefHour / 24) * 100}%` }}>
            <span className={styles.nowTag}>Now</span>
          </span>
        </div>
      </div>
    </div>
  );
}
