import type { ReactNode } from "react";
import type { Mode, Overlap } from "../lib/schedule";
import type { ScheduleView } from "../state/useScheduleView";
import { AlertIcon } from "./icons";
import styles from "./OverlapSummary.module.css";

interface OverlapSummaryProps {
  view: ScheduleView;
  mode: Mode;
}

export function OverlapSummary({ view, mode }: OverlapSummaryProps) {
  const { reference, canCompare } = view;
  if (!reference || !canCompare) return null;

  const zoneNote = `in ${reference.name} time`;

  if (mode === "meeting") {
    const { meeting } = view;
    return (
      <section className={styles.summary} aria-live="polite" aria-label="Overlap summary">
        {meeting.total === 0 ? (
          <Warning>
            <strong>No common window.</strong> There is no hour when every city is awake. Try widening the awake
            window, removing a city, or switching to Base mode.
          </Warning>
        ) : (
          <div className={styles.meeting}>
            <div className={styles.total}>
              <span className={styles.totalValue}>{meeting.total}</span>
              <span className={styles.totalUnit}>{meeting.total === 1 ? "hour" : "hours"}</span>
            </div>
            <div className={styles.meetingBody}>
              <p className={styles.lead}>
                Everyone is awake for {meeting.total === 1 ? "this hour" : "these hours"}{" "}
                <span className={styles.muted}>{zoneNote}</span>
              </p>
              <Ranges overlap={meeting} view={view} />
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={styles.summary} aria-live="polite" aria-label="Overlap summary">
      <p className={styles.lead}>
        Overlap with <strong>{reference.name}</strong> <span className={styles.muted}>· times {zoneNote}</span>
      </p>
      <ul className={styles.baseList}>
        {view.rows.slice(1).map(({ city, baseOverlap }) => (
          <li key={city.id} className={styles.baseItem}>
            <span className={styles.baseCity}>{city.name}</span>
            {baseOverlap && baseOverlap.total > 0 ? (
              <>
                <span className={styles.count}>{baseOverlap.total}h</span>
                <Ranges overlap={baseOverlap} view={view} />
              </>
            ) : (
              <span className={styles.inlineWarning}>
                <AlertIcon size={14} />
                No overlap with {reference.name}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Ranges({ overlap, view }: { overlap: Overlap; view: ScheduleView }) {
  return (
    <ul className={styles.ranges}>
      {overlap.ranges.map((range) => (
        <li key={range.start} className={styles.range} title={view.describeRangeLocally(range)}>
          {view.formatRange(range)}
          <span className={styles.rangeLength}>{range.length}h</span>
        </li>
      ))}
    </ul>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <div className={styles.warning} role="status">
      <AlertIcon size={18} />
      <p>{children}</p>
    </div>
  );
}
