"use client";

import { useState } from "react";
import type { Board, BoardRow } from "@/lib/board";
import { cx } from "@/lib/cx";
import { formatClock, formatUtcOffset, type TimeFormat } from "@/lib/time";
import { CityNameButton, ReferenceBadge, RemoveCityButton } from "./city-controls";
import { HourCell } from "./hour-cell";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

interface GridProps {
  readonly board: Board;
  readonly timeFormat: TimeFormat;
  readonly onPromote: (cityId: string) => void;
  readonly onRemove: (cityId: string) => void;
}

/** Desktop (≥768px): cities as rows, the 24 reference hours as columns. */
export function DesktopGrid({ board, timeFormat, onPromote, onRemove }: GridProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const referenceOverlap = board.rows[0]?.overlap;

  return (
    <div className="overflow-x-auto" onMouseLeave={() => setHoveredHour(null)}>
      <table className="w-full min-w-[1080px] table-fixed border-separate border-spacing-[2px]">
        <caption className="sr-only">
          Each city&apos;s local time for every hour of the reference city&apos;s day
        </caption>
        <colgroup>
          <col className="w-[176px]" />
          {HOURS.map((hour) => (
            <col key={hour} />
          ))}
          <col className="w-7" />
        </colgroup>

        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 bg-white pb-2 text-left text-xs font-medium text-stone-500 dark:bg-stone-900 dark:text-stone-400"
            >
              Ref. hour
            </th>
            {HOURS.map((hour) => {
              const isOverlap = referenceOverlap?.[hour] ?? false;
              const isNow = board.nowHour === hour;
              return (
                <th
                  key={hour}
                  scope="col"
                  onMouseEnter={() => setHoveredHour(hour)}
                  className={cx(
                    "relative pb-2 text-center text-xs font-medium tabular-nums transition-colors",
                    isOverlap
                      ? "font-semibold text-emerald-700 dark:text-emerald-400"
                      : "text-stone-500 dark:text-stone-400",
                    hoveredHour === hour && "text-stone-900 dark:text-stone-100",
                  )}
                >
                  {formatClock(hour * 60, timeFormat, "compact")}
                  {isNow && (
                    <>
                      <span
                        aria-hidden
                        className="absolute inset-x-0 -bottom-0.5 mx-auto size-1 rounded-full bg-stone-900 dark:bg-stone-100"
                      />
                      <span className="sr-only"> (current hour)</span>
                    </>
                  )}
                </th>
              );
            })}
            <th scope="col">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {board.rows.map((row) => (
            <DesktopRow
              key={row.city.id}
              row={row}
              timeFormat={timeFormat}
              hoveredHour={hoveredHour}
              onHover={setHoveredHour}
              onPromote={onPromote}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DesktopRowProps {
  readonly row: BoardRow;
  readonly timeFormat: TimeFormat;
  readonly hoveredHour: number | null;
  readonly onHover: (hour: number) => void;
  readonly onPromote: (cityId: string) => void;
  readonly onRemove: (cityId: string) => void;
}

function DesktopRow({ row, timeFormat, hoveredHour, onHover, onPromote, onRemove }: DesktopRowProps) {
  return (
    <tr>
      <th
        scope="row"
        className="sticky left-0 z-10 bg-white pr-3 text-left align-middle font-normal dark:bg-stone-900"
      >
        <div className="flex min-w-0 flex-col gap-1 py-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <CityNameButton
              city={row.city}
              isReference={row.isReference}
              onPromote={onPromote}
              className="truncate"
            />
            {row.isReference && <ReferenceBadge />}
          </div>
          <div className="flex items-center gap-1.5 text-xs tabular-nums text-stone-500 dark:text-stone-400">
            <span>{formatUtcOffset(row.utcOffsetMinutes)}</span>
            <span aria-hidden>·</span>
            <span>Now {formatClock(row.localNowMinutes, timeFormat, "full")}</span>
          </div>
        </div>
      </th>

      {row.slots.map((slot) => (
        <HourCell
          key={slot.refHour}
          slot={slot}
          overlap={row.overlap[slot.refHour]}
          cityName={row.city.name}
          timeFormat={timeFormat}
          clockStyle="compact"
          hovered={hoveredHour === slot.refHour}
          onHover={onHover}
          className="h-10 rounded-lg text-[11px] leading-none"
        />
      ))}

      <td className="text-center">
        <RemoveCityButton city={row.city} onRemove={onRemove} />
      </td>
    </tr>
  );
}
