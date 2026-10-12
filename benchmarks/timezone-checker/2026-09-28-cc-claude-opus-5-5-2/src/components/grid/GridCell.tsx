import { cn } from "@/lib/cn";
import type { CellState, HourCell } from "@/lib/schedule";
import { clockParts, formatClock, type TimeFormat } from "@/lib/time";

export type Orientation = "horizontal" | "vertical";

const STATE_LABEL: Record<CellState, string> = {
  sleeping: "asleep",
  awake: "awake",
  overlap: "awake, overlap",
};

const STATE_CLASS: Record<CellState, string> = {
  sleeping: "text-sleep-ink",
  awake: "bg-awake text-awake-ink",
  overlap: "bg-overlap text-overlap-ink font-semibold",
};

/** Cells in the same filled state merge into one continuous pill, separated by hairlines. */
function shapeClass(state: CellState, orientation: Orientation, joinStart: boolean, joinEnd: boolean): string {
  if (state === "sleeping") return "rounded-lg";
  const horizontal = orientation === "horizontal";
  return cn(
    !joinStart && (horizontal ? "rounded-l-lg" : "rounded-t-lg"),
    !joinEnd && (horizontal ? "rounded-r-lg" : "rounded-b-lg"),
    joinStart &&
      (state === "overlap"
        ? horizontal
          ? "shadow-[inset_1px_0_0_var(--overlap-divider)]"
          : "shadow-[inset_0_1px_0_var(--overlap-divider)]"
        : horizontal
          ? "shadow-[inset_1px_0_0_var(--awake-divider)]"
          : "shadow-[inset_0_1px_0_var(--awake-divider)]"),
  );
}

/** Whether neighbouring cells share a filled state and should visually join. */
export function joins(cells: readonly HourCell[], index: number) {
  const state = cells[index]?.state;
  return {
    joinStart: state !== "sleeping" && cells[index - 1]?.state === state,
    joinEnd: state !== "sleeping" && cells[index + 1]?.state === state,
  };
}

interface GridCellProps {
  cell: HourCell;
  cityName: string;
  format: TimeFormat;
  /** Local weekday, shown where a new day begins. */
  weekday: string;
  orientation: Orientation;
  joinStart: boolean;
  joinEnd: boolean;
  compact?: boolean;
  onHover?: (hour: number) => void;
  className?: string;
}

export function GridCell({
  cell,
  cityName,
  format,
  weekday,
  orientation,
  joinStart,
  joinEnd,
  compact = false,
  onHover,
  className,
}: GridCellProps) {
  const { time, period } = clockParts(cell.localMinutes, format);
  const long = time.length > 3;
  const horizontal = orientation === "horizontal";
  const label = `${cityName}: ${formatClock(cell.localMinutes, format)}${cell.dayOffset !== 0 ? ` ${weekday}` : ""}, ${STATE_LABEL[cell.state]}`;

  return (
    <div
      role="cell"
      aria-label={label}
      data-state={cell.state}
      onPointerEnter={onHover ? () => onHover(cell.refHour) : undefined}
      className={cn(
        "relative flex min-w-0 items-center justify-center font-mono leading-none tabular-nums transition-colors duration-150 select-none",
        horizontal || compact ? "flex-col gap-1" : "gap-1",
        STATE_CLASS[cell.state],
        shapeClass(cell.state, orientation, joinStart, joinEnd),
        className,
      )}
    >
      <span aria-hidden className={cn(horizontal ? (long ? "text-[10.5px]" : "text-[13px]") : long && compact ? "text-[11px]" : "text-[13px]")}>
        {time}
        {!horizontal && !compact && !cell.startsNewDay && period && <span className="ml-0.5 text-[10px] opacity-70">{period}</span>}
      </span>
      {cell.startsNewDay ? (
        <span
          aria-hidden
          className={cn(
            "rounded-[4px] px-1 py-px font-sans text-[9px] font-semibold tracking-wider uppercase",
            cell.state === "overlap" ? "bg-overlap-ink/12" : "bg-ink/7 text-ink-2",
          )}
        >
          {weekday}
        </span>
      ) : (
        (horizontal || compact) &&
        period && (
          <span aria-hidden className="font-sans text-[10px] font-medium tracking-wide opacity-65">
            {period}
          </span>
        )
      )}
    </div>
  );
}
