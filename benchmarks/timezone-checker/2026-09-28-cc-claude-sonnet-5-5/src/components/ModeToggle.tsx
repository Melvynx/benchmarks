import type { Mode } from "../lib/time";

const OPTIONS: { value: Mode; label: string }[] = [
  { value: "meeting", label: "Meeting" },
  { value: "base", label: "Base" },
];

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Mode">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={mode === o.value}
          className={mode === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
