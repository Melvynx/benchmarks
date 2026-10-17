import type { Mode } from "../lib/schedule";
import { AnchorIcon, UsersIcon } from "./icons";
import styles from "./Panel.module.css";
import { Segmented } from "./Segmented";

const DESCRIPTIONS: Record<Mode, string> = {
  meeting: "Hours when every city is awake at the same time.",
  base: "Each city's overlap with the reference city, computed on its own.",
};

interface ModeToggleProps {
  mode: Mode;
  referenceName: string | null;
  onChange: (mode: Mode) => void;
}

export function ModeToggle({ mode, referenceName, onChange }: ModeToggleProps) {
  const description =
    mode === "base" && referenceName
      ? `Each city's overlap with ${referenceName}, computed on its own.`
      : DESCRIPTIONS[mode];

  return (
    <section className={styles.panel} aria-labelledby="mode-heading">
      <h2 id="mode-heading" className={styles.heading}>
        Mode
      </h2>
      <Segmented
        label="Overlap mode"
        value={mode}
        onChange={onChange}
        options={[
          { value: "meeting", label: "Meeting", icon: <UsersIcon size={15} /> },
          { value: "base", label: "Base", icon: <AnchorIcon size={15} /> },
        ]}
      />
      <p className={styles.description}>{description}</p>
    </section>
  );
}
