import { ArrowUpToLine, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CityRow } from "@/lib/schedule";
import { formatRelativeOffset, formatUtcOffset } from "@/lib/time";
import { usePlanner } from "@/state/store";

export function RefBadge({ small = false, className }: { small?: boolean; className?: string }) {
  return (
    <span
      title="Reference city — every column is an hour of its day"
      className={cn(
        "inline-flex shrink-0 items-center bg-ink font-semibold tracking-[0.08em] text-surface",
        small ? "h-4 rounded-[4px] px-1 text-[9px]" : "h-[18px] rounded-[5px] px-1.5 text-[10px]",
        className,
      )}
    >
      REF
    </span>
  );
}

/** City name that promotes the city to reference when clicked. `wrap` allows two lines in narrow columns. */
export function CityName({ row, wrap = false, className }: { row: CityRow; wrap?: boolean; className?: string }) {
  const makeReference = usePlanner((state) => state.makeReference);
  const nameClass = wrap ? "line-clamp-2 break-words" : "truncate";

  if (row.isReference) {
    return <span className={cn("font-semibold text-ink", nameClass, className)}>{row.city.name}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => makeReference(row.city.id)}
      title={`Make ${row.city.name} the reference city`}
      aria-label={`${row.city.name} — make reference city`}
      className={cn(
        "group/name inline-flex min-w-0 items-center gap-1 rounded-md text-left font-medium text-ink decoration-ink-3 decoration-dotted underline-offset-4 hover:underline",
        className,
      )}
    >
      <span className={nameClass}>{row.city.name}</span>
      {!wrap && (
        <ArrowUpToLine
          aria-hidden
          className="size-3.5 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover/name:opacity-100 group-focus-visible/name:opacity-100"
        />
      )}
    </button>
  );
}

interface OffsetLabelProps {
  row: CityRow;
  /** UTC offset and relative difference on separate lines. */
  stacked?: boolean;
  /** UTC offset only. */
  minimal?: boolean;
  className?: string;
}

export function OffsetLabel({ row, stacked = false, minimal = false, className }: OffsetLabelProps) {
  return (
    <span
      className={cn(
        "min-w-0 overflow-hidden font-mono text-[11px] text-ellipsis whitespace-nowrap text-ink-2 tabular-nums",
        stacked && "flex flex-col gap-0.5 text-[10.5px] leading-tight",
        className,
      )}
    >
      <span>{formatUtcOffset(row.offsetMinutes)}</span>
      {!row.isReference && !minimal && (
        <span className="text-ink-3">
          {!stacked && " · "}
          {formatRelativeOffset(row.diffMinutes)}
        </span>
      )}
    </span>
  );
}

export function RemoveCityButton({ row, className }: { row: CityRow; className?: string }) {
  const removeCity = usePlanner((state) => state.removeCity);
  return (
    <button
      type="button"
      onClick={() => removeCity(row.city.id)}
      aria-label={`Remove ${row.city.name}`}
      title={`Remove ${row.city.name}`}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      <X aria-hidden className="size-4" />
    </button>
  );
}
