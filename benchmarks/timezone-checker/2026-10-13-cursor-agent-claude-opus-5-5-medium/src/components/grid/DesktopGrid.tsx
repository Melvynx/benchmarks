import { useState } from "react";
import { HOURS } from "../../lib/schedule";
import { formatHour } from "../../lib/time";
import { CityName, OffsetBadge, RemoveButton } from "./CityControls";
import styles from "./grid.module.css";
import { HourCell } from "./HourCell";
import type { GridProps } from "./types";

export function DesktopGrid({ view, timeFormat, onPromote, onRemove }: GridProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const { rows, nowHour, reference } = view;

  return (
    <div className={styles.desktopScroll}>
      <div role="table" aria-label="Hourly availability by city" className={styles.desktop}>
        <div role="row" className={styles.desktopRow} data-header>
          <div role="columnheader" className={styles.headerLabel}>
            {reference ? `${reference.name} hours` : "Hours"}
          </div>
          {HOURS.map((hour) => (
            <div key={hour} role="columnheader" className={styles.headerSlot} aria-label={formatHour(hour, timeFormat)}>
              {hour === hovered ? (
                <span className={styles.hoverPill}>{formatHour(hour, timeFormat)}</span>
              ) : hour === nowHour ? (
                <span className={styles.nowPill}>Now</span>
              ) : null}
            </div>
          ))}
          <div role="columnheader" aria-label="Actions" />
        </div>

        {rows.map((row) => (
          <div role="row" key={row.city.id} className={styles.desktopRow} data-reference={row.isReference || undefined}>
            <div role="rowheader" className={styles.cityInfo}>
              <CityName city={row.city} isReference={row.isReference} onPromote={onPromote} />
              <div className={styles.cityMeta}>
                <OffsetBadge offsetMinutes={row.offsetMinutes} />
                <span className={styles.cityClock}>{view.nowLabels[row.city.id]}</span>
              </div>
            </div>
            {row.cells.map((cell) => (
              <HourCell
                key={cell.refHour}
                layout="desktop"
                cell={cell}
                cityName={row.city.name}
                format={timeFormat}
                dayLabel={cell.isNewDay ? view.dayLabel(cell.dayShift) : null}
                isNow={cell.refHour === nowHour}
                isHovered={cell.refHour === hovered}
                onHover={setHovered}
              />
            ))}
            <div role="cell" className={styles.actions}>
              <RemoveButton city={row.city} onRemove={onRemove} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
