import type { Mode } from "../lib/time";

const OPTIONS: Array<{ id: Mode; label: string; hint: string }> = [
  { id: "meeting", label: "Meeting", hint: "Everyone awake at once" },
  { id: "base", label: "Base", hint: "Each city vs. the reference" },
];

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Mode">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={mode === o.id}
          title={o.hint}
          className={mode === o.id ? "seg active" : "seg"}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
