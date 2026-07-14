import { useTimezoneStore } from "../store/useTimezoneStore";
import type { Mode } from "../lib/types";

const OPTIONS: { value: Mode; label: string; hint: string }[] = [
  { value: "meeting", label: "Meeting", hint: "One shared overlap for everyone" },
  { value: "base", label: "Base", hint: "Per-city overlap vs. reference" },
];

export function ModeToggle() {
  const mode = useTimezoneStore((state) => state.mode);
  const setMode = useTimezoneStore((state) => state.setMode);

  return (
    <div
      role="radiogroup"
      aria-label="Overlap mode"
      className="inline-flex rounded-xl border border-base-700/70 bg-base-850/80 p-1"
    >
      {OPTIONS.map((option) => {
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={() => setMode(option.value)}
            className={`relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-overlap-500 text-base-950 shadow-[0_0_0_1px_rgba(52,224,161,0.4)]"
                : "text-base-300 hover:text-base-100"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
