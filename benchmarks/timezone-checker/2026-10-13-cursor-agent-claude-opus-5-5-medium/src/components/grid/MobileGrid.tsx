import { useState, type CSSProperties } from "react";
import { HOURS } from "../../lib/schedule";
import { CityName, OffsetBadge, RemoveButton } from "./CityControls";
import styles from "./grid.module.css";
import { HourCell } from "./HourCell";
import type { GridProps } from "./types";

export function MobileGrid({ view, timeFormat, onPromote, onRemove }: GridProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const { rows, nowHour } = view;

  return (
    <div className={styles.mobileScroll}>
      <div
        role="table"
        aria-label="Hourly availability by city"
        className={styles.mobile}
        style={{ "--columns": rows.length } as CSSProperties}
      >
        <div role="row" className={styles.mobileRow} data-header>
          {rows.map((row) => (
            <div
              key={row.city.id}
              role="columnheader"
              className={styles.mobileHead}
              data-reference={row.isReference || undefined}
            >
              <CityName city={row.city} isReference={row.isReference} onPromote={onPromote} />
              <OffsetBadge offsetMinutes={row.offsetMinutes} />
              <RemoveButton city={row.city} onRemove={onRemove} />
            </div>
          ))}
        </div>

        {HOURS.map((hour) => (
          <div key={hour} role="row" className={styles.mobileRow} data-now={hour === nowHour || undefined}>
            {rows.map((row) => {
              const cell = row.cells[hour];
              if (!cell) return null;
              return (
                <HourCell
                  key={row.city.id}
                  layout="mobile"
                  cell={cell}
                  cityName={row.city.name}
                  format={timeFormat}
                  dayLabel={cell.isNewDay ? view.dayLabel(cell.dayShift) : null}
                  isNow={hour === nowHour}
                  isHovered={hour === hovered}
                  onHover={setHovered}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
