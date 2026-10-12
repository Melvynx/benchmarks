import type { Mode } from "../lib/schedule";
import { Segmented } from "./Segmented";
import styles from "./Panel.module.css";

interface ModeToggleProps {
  mode: Mode;
  referenceName: string | undefined;
  onChange: (mode: Mode) => void;
}

const MODE_OPTIONS = [
  { value: "meeting", label: "Meeting" },
  { value: "base", label: "Base" },
] as const;

export function ModeToggle({ mode, referenceName, onChange }: ModeToggleProps) {
  const reference = referenceName ?? "the reference city";
  return (
    <div className={styles.group}>
      <span className={styles.label}>
        Mode
      </span>
      <Segmented label="Overlap mode" value={mode} options={MODE_OPTIONS} onChange={onChange} />
      <p className={styles.help}>
        {mode === "meeting"
          ? "Hours when every city is awake at the same time — for group calls."
          : `Each city compared one-to-one with ${reference} — for per-person availability.`}
      </p>
    </div>
  );
}
