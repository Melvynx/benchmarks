import type { Mode } from "../lib/overlap";

interface Props {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

const OPTIONS: { value: Mode; label: string; hint: string }[] = [
  { value: "meeting", label: "Meeting", hint: "Everyone awake together" },
  { value: "base", label: "Base", hint: "Each city vs the reference" },
];

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="segmented" role="tablist" aria-label="Overlap mode">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={mode === opt.value}
          className={`segmented__btn ${mode === opt.value ? "is-active" : ""}`}
          onClick={() => onChange(opt.value)}
          title={opt.hint}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
