export function RefBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="Reference city — all hours are anchored here"
      className={`shrink-0 rounded-[4px] bg-ref/15 font-semibold tracking-[0.08em] text-ref ring-1 ring-ref/30 ${
        compact ? "px-1 py-px text-[8px]" : "px-1.5 py-[2px] text-[9px]"
      }`}
    >
      REF
    </span>
  );
}
