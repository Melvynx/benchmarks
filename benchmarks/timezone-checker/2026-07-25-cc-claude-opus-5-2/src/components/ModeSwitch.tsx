import { cx } from "../lib/cx";
import type { Mode } from "../lib/schedule";

const OPTIONS: { value: Mode; label: string; hint: string }[] = [
  { value: "meeting", label: "Meeting", hint: "Hours when every city is awake at once" },
  { value: "base", label: "Base", hint: "Each city compared against the reference alone" },
];

export function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Overlap mode"
      className="flex rounded-xl border border-line bg-panel p-1"
    >
      {OPTIONS.map((option) => {
        const active = option.value === mode;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={cx(
              "rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-colors duration-150",
              active
                ? "bg-white/[0.09] text-ink shadow-[0_1px_0_0_rgb(255_255_255/0.06)_inset]"
                : "text-mute hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
