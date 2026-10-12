import { flagEmoji } from "../lib/cities";
import { cx } from "../lib/cx";
import type { ScheduleRow } from "../lib/schedule";
import { formatClock, formatOffset, type TimeFormat } from "../lib/time";
import styles from "./CityIdentity.module.css";

interface CityIdentityProps {
  row: ScheduleRow;
  format: TimeFormat;
  onPromote: (id: string) => void;
  layout?: "row" | "stack";
}

export function CityIdentity({ row, format, onPromote, layout = "row" }: CityIdentityProps) {
  const { city, isReference } = row;
  return (
    <div className={cx(styles.identity, styles[layout])}>
      <span className={styles.flag} aria-hidden="true">
        {flagEmoji(city.countryCode)}
      </span>
      <div className={styles.text}>
        <div className={styles.nameLine}>
          {isReference ? (
            <span className={styles.name}>{city.name}</span>
          ) : (
            <button
              type="button"
              className={cx(styles.name, styles.promote)}
              title={`Make ${city.name} the reference city`}
              onClick={() => onPromote(city.id)}
            >
              {city.name}
            </button>
          )}
          {isReference && (
            <span className={styles.ref} title="Reference city — all hours are anchored to its timezone">
              REF
            </span>
          )}
        </div>
        <div className={styles.meta}>
          <span className={styles.clock}>{formatClock(row.nowMinutes, format)}</span>
          <span className={styles.offset}>{formatOffset(row.offsetMinutes)}</span>
        </div>
      </div>
    </div>
  );
}

export function RemoveButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.remove} aria-label={`Remove ${name}`} title={`Remove ${name}`} onClick={onClick}>
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5.28 4.22 4.22 5.28 8.94 10l-4.72 4.72 1.06 1.06L10 11.06l4.72 4.72 1.06-1.06L11.06 10l4.72-4.72-1.06-1.06L10 8.94 5.28 4.22Z" />
      </svg>
    </button>
  );
}
