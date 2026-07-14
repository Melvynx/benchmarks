import type { Mode } from "../lib/overlap";

type Props = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

const OPTIONS: Array<{ value: Mode; label: string; description: string }> = [
  {
    value: "meeting",
    label: "Meeting",
    description: "Overlap when every city is awake",
  },
  {
    value: "base",
    label: "Base",
    description: "Per-city overlap against the reference",
  },
];

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Overlap mode"
      className="relative inline-flex rounded-full border border-[var(--border)] bg-[var(--panel)]/80 p-1 backdrop-blur"
    >
      {OPTIONS.map((opt) => {
        const selected = mode === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={selected}
            title={opt.description}
            onClick={() => onChange(opt.value)}
            className={
              "relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
              (selected
                ? "text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200")
            }
          >
            {selected && (
              <span
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full bg-gradient-to-b from-zinc-700/80 to-zinc-800/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.4)] ring-1 ring-zinc-600/40"
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
