import styles from "./Legend.module.css";

const ITEMS = [
  { status: "overlap", label: "Overlap" },
  { status: "awake", label: "Awake" },
  { status: "asleep", label: "Asleep" },
] as const;

export function Legend() {
  return (
    <ul className={styles.legend} aria-label="Legend">
      {ITEMS.map(({ status, label }) => (
        <li key={status} className={styles.item}>
          <span className={styles.swatch} data-status={status} aria-hidden="true" />
          {label}
        </li>
      ))}
      <li className={styles.item}>
        <span className={styles.now} aria-hidden="true" />
        Now
      </li>
      <li className={styles.item}>
        <span className={styles.day} aria-hidden="true" />
        New day
      </li>
    </ul>
  );
}
