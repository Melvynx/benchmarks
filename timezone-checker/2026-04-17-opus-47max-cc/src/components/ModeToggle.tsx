export type Mode = "meeting" | "base";

type Props = {
  mode: Mode;
  onChange: (m: Mode) => void;
};

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-zinc-900/60 border border-white/10">
      {([
        { v: "meeting", label: "Meeting", hint: "Everyone awake" },
        { v: "base", label: "Base", hint: "Per-city vs. reference" },
      ] as const).map((opt) => {
        const active = mode === opt.v;
        return (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            title={opt.hint}
            className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
              active
                ? "bg-white/10 text-zinc-50 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
