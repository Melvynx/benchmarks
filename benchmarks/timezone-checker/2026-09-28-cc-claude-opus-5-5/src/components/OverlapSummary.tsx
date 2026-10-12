import type { ReactNode } from "react";
import { flagEmoji } from "../lib/cities";
import { formatHours, formatRange } from "../lib/format";
import type { HourRange, Schedule } from "../lib/schedule";
import type { TimeFormat } from "../lib/time";
import styles from "./OverlapSummary.module.css";

interface OverlapSummaryProps {
  schedule: Schedule;
  format: TimeFormat;
}

export function OverlapSummary({ schedule, format }: OverlapSummaryProps) {
  const { reference, rows, mode } = schedule;
  if (!reference) return null;

  if (rows.length < 2) {
    return (
      <div className={styles.summary}>
        <p className={styles.muted}>Add another city to see when your schedules overlap.</p>
      </div>
    );
  }

  const refName = reference.city.name;

  if (mode === "meeting") {
    return (
      <div className={styles.summary} aria-live="polite">
        {schedule.sharedHours > 0 ? (
          <div className={styles.meeting}>
            <p className={styles.stat}>
              <span className={styles.statValue}>{schedule.sharedHours}</span>
              <span className={styles.statLabel}>
                {schedule.sharedHours === 1 ? "hour" : "hours"} when everyone is awake
              </span>
            </p>
            <div className={styles.rangesBlock}>
              <Ranges ranges={schedule.sharedRanges} format={format} />
              <span className={styles.caption}>{refName} time</span>
            </div>
          </div>
        ) : (
          <Warning>
            No hour where everyone is awake. Try widening the awake window or removing a city.
          </Warning>
        )}
      </div>
    );
  }

  return (
    <div className={styles.summary} aria-live="polite">
      <ul className={styles.baseList}>
        {rows.slice(1).map((row) => (
          <li key={row.city.id} className={styles.baseItem}>
            <span className={styles.baseCity}>
              <span aria-hidden="true">{flagEmoji(row.city.countryCode)}</span>
              {row.city.name}
            </span>
            {row.overlapHours > 0 ? (
              <>
                <span className={styles.count}>{formatHours(row.overlapHours)}</span>
                <Ranges ranges={row.ranges} format={format} />
              </>
            ) : (
              <Warning compact>No overlap with {refName}</Warning>
            )}
          </li>
        ))}
      </ul>
      <p className={styles.caption}>Overlap with {refName}, shown in {refName} time.</p>
    </div>
  );
}

function Ranges({ ranges, format }: { ranges: HourRange[]; format: TimeFormat }) {
  return (
    <ul className={styles.ranges}>
      {ranges.map((range) => (
        <li key={range.start} className={styles.range}>
          {formatRange(range, format)}
        </li>
      ))}
    </ul>
  );
}

function Warning({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <p className={compact ? `${styles.warning} ${styles.compact}` : styles.warning} role="status">
      <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.warningIcon}>
        <path d="M10 2.5 1.5 17.5h17L10 2.5Zm-.75 5.5h1.5v4.5h-1.5V8Zm0 6h1.5v1.5h-1.5V14Z" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
