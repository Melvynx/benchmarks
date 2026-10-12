import type { HourSlot } from "@/lib/overlap";
import { cx } from "@/lib/cx";
import {
  compactClockLines,
  formatClock,
  wrapMinutes,
  type ClockStyle,
  type TimeFormat,
} from "@/lib/time";

type Tone = "overlap" | "awake" | "asleep";

const TONE_CLASS: Record<Tone, string> = {
  overlap:
    "bg-emerald-500 font-bold text-white shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_2px_6px_-2px_rgb(16_185_129/0.6)] dark:bg-emerald-500",
  awake: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
  asleep: "sleep-hatch text-stone-400 dark:text-stone-600",
};

const TONE_LABEL: Record<Tone, string> = {
  overlap: "overlap",
  awake: "awake",
  asleep: "asleep",
};

interface HourCellProps {
  readonly slot: HourSlot;
  readonly overlap: boolean;
  readonly cityName: string;
  readonly timeFormat: TimeFormat;
  readonly clockStyle: ClockStyle;
  readonly hovered: boolean;
  readonly onHover: (refHour: number) => void;
  readonly className?: string;
}

export function HourCell({
  slot,
  overlap,
  cityName,
  timeFormat,
  clockStyle,
  hovered,
  onHover,
  className,
}: HourCellProps) {
  const tone: Tone = overlap ? "overlap" : slot.awake ? "awake" : "asleep";
  const start = formatClock(slot.localStart, timeFormat, "full");
  const end = formatClock(wrapMinutes(slot.localStart + 60), timeFormat, "full");
  const lines =
    clockStyle === "compact"
      ? compactClockLines(slot.localStart, timeFormat)
      : [formatClock(slot.localStart, timeFormat, "full")];

  return (
    <td
      onMouseEnter={() => onHover(slot.refHour)}
      title={`${cityName}: ${start} – ${end} (${TONE_LABEL[tone]})`}
      className={cx(
        "text-center tabular-nums transition-[background-color,box-shadow] duration-150",
        TONE_CLASS[tone],
        hovered && "ring-2 ring-inset ring-stone-900/50 dark:ring-white/60",
        className,
      )}
    >
      {lines.length === 1 ? (
        lines[0]
      ) : (
        <span className="flex flex-col items-center leading-tight">
          <span>{lines[0]}</span>
          <span className="text-[9px] font-medium opacity-80">{lines[1]}</span>
        </span>
      )}
      <span className="sr-only">, {TONE_LABEL[tone]}</span>
    </td>
  );
}
