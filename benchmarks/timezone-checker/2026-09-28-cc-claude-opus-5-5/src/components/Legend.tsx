import styles from "./Legend.module.css";

const ITEMS = [
  { key: "asleep", label: "Sleeping" },
  { key: "awake", label: "Awake" },
  { key: "overlap", label: "Overlap" },
] as const;

export function Legend() {
  return (
    <ul className={styles.legend} aria-label="Legend">
      {ITEMS.map((item) => (
        <li key={item.key} className={styles.item}>
          <span className={`${styles.swatch} ${styles[item.key]}`} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
