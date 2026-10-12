"use client";

import { useState } from "react";
import type { Board } from "@/lib/board";
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

/** Mobile (<768px): cities as columns, the 24 reference hours as rows. A separate layout, not a squeezed desktop grid. */
export function MobileGrid({ board, timeFormat, onPromote, onRemove }: GridProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto" onMouseLeave={() => setHoveredHour(null)}>
      <table className="w-full min-w-full border-separate border-spacing-[3px]">
        <caption className="sr-only">
          Each city&apos;s local time for every hour of the reference city&apos;s day
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 w-14 bg-white pb-2 text-left align-bottom text-xs font-medium text-stone-500 dark:bg-stone-900 dark:text-stone-400"
            >
              Ref. hour
            </th>
            {board.rows.map((row) => (
              <th
                key={row.city.id}
                scope="col"
                className="min-w-[88px] px-0.5 pb-2 text-left align-bottom font-normal"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <CityNameButton
                      city={row.city}
                      isReference={row.isReference}
                      onPromote={onPromote}
                      className="break-words text-[13px] leading-snug"
                    />
                    <RemoveCityButton city={row.city} onRemove={onRemove} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs tabular-nums text-stone-500 dark:text-stone-400">
                    {row.isReference && <ReferenceBadge />}
                    <span>{formatUtcOffset(row.utcOffsetMinutes)}</span>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {HOURS.map((hour) => {
            const isNow = board.nowHour === hour;
            const hovered = hoveredHour === hour;
            return (
              <tr key={hour} onMouseEnter={() => setHoveredHour(hour)}>
                <th
                  scope="row"
                  className={cx(
                    "sticky left-0 z-10 w-14 bg-white pr-1 text-left text-xs font-medium tabular-nums dark:bg-stone-900",
                    hovered ? "text-stone-900 dark:text-stone-100" : "text-stone-500 dark:text-stone-400",
                  )}
                >
                  {formatClock(hour * 60, timeFormat, "full")}
                  {isNow && <span className="sr-only"> (current hour)</span>}
                  {isNow && (
                    <span aria-hidden className="ml-1.5 inline-block size-1.5 rounded-full bg-stone-900 align-middle dark:bg-stone-100" />
                  )}
                </th>

                {board.rows.map((row) => (
                  <HourCell
                    key={row.city.id}
                    slot={row.slots[hour]}
                    overlap={row.overlap[hour]}
                    cityName={row.city.name}
                    timeFormat={timeFormat}
                    clockStyle="full"
                    hovered={hovered}
                    onHover={setHoveredHour}
                    className="h-9 rounded-lg text-[13px]"
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
