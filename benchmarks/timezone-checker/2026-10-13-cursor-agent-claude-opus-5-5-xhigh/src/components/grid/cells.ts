import { cn } from "@/lib/cn";
import { formatClock, formatWeekday, type TimeFormat } from "@/lib/format";
import type { HourCell, ScheduleRow } from "@/lib/overlap";
import type { WallClock } from "@/lib/timezone";

export type CellState = "sleep" | "awake" | "overlap";
export type Orientation = "horizontal" | "vertical";

export interface Segment {
  state: CellState;
  /** First cell of a run of identical states. */
  isStart: boolean;
  /** Last cell of a run of identical states. */
  isEnd: boolean;
}

export const cellState = (cell: HourCell): CellState =>
  cell.overlap ? "overlap" : cell.awake ? "awake" : "sleep";

export function toSegments(cells: readonly HourCell[]): Segment[] {
  const states = cells.map(cellState);
  return states.map((state, index) => ({
    state,
    isStart: index === 0 || states[index - 1] !== state,
    isEnd: index === states.length - 1 || states[index + 1] !== state,
  }));
}

const STATE_SURFACE: Record<CellState, string> = {
  sleep: "bg-sleep text-sleep-ink",
  awake: "bg-awake text-awake-ink font-medium",
  overlap: "bg-overlap text-overlap-ink font-semibold",
};

const DIVIDER: Record<CellState, string> = {
  sleep: "before:bg-sleep-divider",
  awake: "before:bg-awake-divider",
  overlap: "before:bg-overlap-divider",
};

const LAYOUT = {
  horizontal: {
    gutterStart: "pl-0.5",
    gutterEnd: "pr-0.5",
    roundStart: "rounded-l-[10px]",
    roundEnd: "rounded-r-[10px]",
    border: "border-y",
    borderStart: "border-l",
    borderEnd: "border-r",
    divider: "before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px",
    dayDivider: "before:absolute before:left-0 before:inset-y-1 before:w-0.5 before:-translate-x-1/2 before:rounded-full before:bg-ink-3/45",
  },
  vertical: {
    gutterStart: "pt-0.5",
    gutterEnd: "pb-0.5",
    roundStart: "rounded-t-[10px]",
    roundEnd: "rounded-b-[10px]",
    border: "border-x",
    borderStart: "border-t",
    borderEnd: "border-b",
    divider: "before:absolute before:top-0 before:left-3 before:right-3 before:h-px",
    dayDivider: "before:absolute before:top-0 before:inset-x-1 before:h-0.5 before:-translate-y-1/2 before:rounded-full before:bg-ink-3/45",
  },
} as const;

export function cellClasses(segment: Segment, orientation: Orientation, startsNewDay: boolean) {
  const layout = LAYOUT[orientation];
  const { state, isStart, isEnd } = segment;
  return {
    wrapper: cn(isStart && layout.gutterStart, isEnd && layout.gutterEnd),
    surface: cn(
      "relative flex h-full transition-[background-color,color,border-color] duration-200",
      STATE_SURFACE[state],
      isStart && layout.roundStart,
      isEnd && layout.roundEnd,
      state === "awake" && cn("border-awake-line", layout.border, isStart && layout.borderStart, isEnd && layout.borderEnd),
      !isStart && (startsNewDay ? layout.dayDivider : cn(layout.divider, DIVIDER[state])),
    ),
  };
}

const STATE_LABEL: Record<CellState, string> = {
  sleep: "asleep",
  awake: "awake",
  overlap: "overlap",
};

export function weekdayOf(clock: WallClock | null, dayOffset: number): string {
  return clock ? formatWeekday(clock.weekday + dayOffset) : "";
}

export function cellAriaLabel(row: ScheduleRow, cell: HourCell, state: CellState, clock: WallClock | null, format: TimeFormat) {
  return `${row.city.name}, ${weekdayOf(clock, cell.dayOffset)} ${formatClock(cell.minutesOfDay, format, true)}: ${STATE_LABEL[state]}`;
}

/** Splits a set of focused hours into contiguous on-screen bands (no midnight wrap — bands are positional). */
export function focusBands(hours: ReadonlySet<number>): Array<{ start: number; length: number }> {
  const bands: Array<{ start: number; length: number }> = [];
  for (let hour = 0; hour < 24; hour++) {
    if (!hours.has(hour)) continue;
    const last = bands.at(-1);
    if (last && last.start + last.length === hour) last.length += 1;
    else bands.push({ start: hour, length: 1 });
  }
  return bands;
}
