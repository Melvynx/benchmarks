export function Legend({ hint }: { hint: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
      <LegendDot variant="overlap" label="Overlap" />
      <LegendDot variant="awake" label="Awake" />
      <LegendDot variant="sleep" label="Sleeping" />
      <span className="ml-auto italic text-zinc-500">{hint}</span>
    </div>
  );
}

function LegendDot({
  variant,
  label,
}: {
  variant: "overlap" | "awake" | "sleep";
  label: string;
}) {
  const style =
    variant === "overlap"
      ? "bg-emerald-500/80 ring-emerald-400/40"
      : variant === "awake"
        ? "bg-zinc-700 ring-zinc-600/60"
        : "bg-zinc-900 ring-zinc-800";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-[4px] ring-1 ring-inset ${style}`} />
      {label}
    </span>
  );
}
