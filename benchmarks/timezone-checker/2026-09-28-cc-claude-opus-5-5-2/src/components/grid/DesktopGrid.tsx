import { useState } from "react";
import { CityName, OffsetLabel, RefBadge, RemoveCityButton } from "@/components/grid/CityControls";
import { ColumnInspector } from "@/components/grid/ColumnInspector";
import { GridCell, joins } from "@/components/grid/GridCell";
import { hourSegments } from "@/components/grid/segments";
import type { PlannerView } from "@/hooks/usePlannerView";
import { HOURS } from "@/lib/schedule";
import { formatClock, formatHour, formatShortDate, weekdayOf } from "@/lib/time";

const LABEL_WIDTH = 196;
const ACTION_WIDTH = 40;
const ROW_HEIGHT = 52;

/** First hour column in grid-line terms (the label column occupies line 1–2). */
const col = (hour: number) => hour + 2;

/** Cities as rows, the reference city's 24 hours as columns. */
export function DesktopGrid({ view }: { view: PlannerView }) {
  const { schedule, mode, settings, reference, referenceNow } = view;
  const [hovered, setHovered] = useState<number | null>(null);
  const { rows } = schedule;
  const format = settings.timeFormat;

  if (!reference || !referenceNow) return null;

  const nowHour = referenceNow.hour;
  const bands = mode === "meeting" ? hourSegments(schedule.meetingOverlap) : [];

  return (
    <div>
      <div className="-mx-2 overflow-x-auto px-2 pb-1">
        <div
          role="table"
          aria-label={`Hours of the day in each city, aligned to ${reference.name}`}
          aria-rowcount={rows.length + 1}
          onPointerLeave={() => setHovered(null)}
          className="relative grid min-w-[1010px] gap-y-1.5"
          style={{
            gridTemplateColumns: `${LABEL_WIDTH}px repeat(24, minmax(34px, 1fr)) ${ACTION_WIDTH}px`,
            gridTemplateRows: `26px repeat(${rows.length}, ${ROW_HEIGHT}px)`,
          }}
        >
          {/* Meeting-mode overlap bands: one continuous column of green behind every city. */}
          {bands.map((band) => (
            <div
              key={band.start}
              aria-hidden
              className="pointer-events-none -my-1 rounded-xl bg-overlap-soft ring-1 ring-overlap/25 ring-inset"
              style={{ gridColumn: `${col(band.start)} / span ${band.length}`, gridRow: `2 / -1` }}
            />
          ))}

          {hovered !== null && (
            <div
              aria-hidden
              className="pointer-events-none -my-1 rounded-lg bg-ink/[0.06]"
              style={{ gridColumn: col(hovered), gridRow: "1 / -1" }}
            />
          )}

          {/* Header: current time marker */}
          <div role="row" className="grid grid-cols-subgrid" style={{ gridColumn: "1 / -1", gridRow: 1 }}>
            <div role="columnheader" className="sticky left-0 z-20 flex items-end bg-surface pb-1 text-[11px] font-medium tracking-wide text-ink-3 uppercase">
              <span className="sr-only">City</span>
              <span aria-hidden>{formatShortDate(referenceNow)}</span>
            </div>
            {HOURS.map((hour) => (
              <div
                key={hour}
                role="columnheader"
                onPointerEnter={() => setHovered(hour)}
                className="relative flex items-end justify-center pb-1"
              >
                <span className="sr-only">{formatHour(hour, format)} in {reference.name}</span>
                {hour === hovered && hour !== nowHour && (
                  <span
                    aria-hidden
                    className="absolute bottom-1 rounded-full bg-ink px-1.5 py-0.5 font-mono text-[10px] leading-none font-medium whitespace-nowrap text-surface"
                  >
                    {formatHour(hour, format)}
                  </span>
                )}
                {hour === nowHour && (
                  <span
                    aria-hidden
                    className="absolute bottom-1 z-10 rounded-full bg-now px-1.5 py-0.5 text-[10px] leading-none font-semibold whitespace-nowrap text-white shadow-sm"
                    style={{
                      left: `${(referenceNow.minute / 60) * 100}%`,
                      // Keep the chip clear of the sticky label column at the start of the day.
                      transform: hour === 0 && referenceNow.minute < 30 ? "translateX(-2px)" : "translateX(-50%)",
                    }}
                  >
                    {formatClock(referenceNow.hour * 60 + referenceNow.minute, format)}
                  </span>
                )}
              </div>
            ))}
            <div role="columnheader">
              <span className="sr-only">Actions</span>
            </div>
          </div>

          {rows.map((row, index) => (
            <div
              key={row.city.id}
              role="row"
              className="group/row grid grid-cols-subgrid"
              style={{ gridColumn: "1 / -1", gridRow: index + 2 }}
            >
              <div role="rowheader" className="sticky left-0 z-20 flex min-w-0 flex-col justify-center gap-1 bg-surface pr-3">
                <div className="flex min-w-0 items-center gap-2">
                  <CityName row={row} />
                  {row.isReference && <RefBadge />}
                </div>
                <OffsetLabel row={row} />
              </div>

              {row.cells.map((cell, hour) => (
                <GridCell
                  key={hour}
                  cell={cell}
                  cityName={row.city.name}
                  format={format}
                  weekday={weekdayOf(referenceNow, cell.dayOffset)}
                  orientation="horizontal"
                  onHover={setHovered}
                  {...joins(row.cells, hour)}
                />
              ))}

              <div role="cell" className="flex items-center justify-end">
                <RemoveCityButton row={row} className="opacity-50 group-hover/row:opacity-100 focus-visible:opacity-100" />
              </div>
            </div>
          ))}

          {/* Now line, placed at the exact minute within the current hour. */}
          <div
            aria-hidden
            className="pointer-events-none relative z-10"
            style={{ gridColumn: col(nowHour), gridRow: "2 / -1" }}
          >
            <div
              className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-now"
              style={{ left: `${(referenceNow.minute / 60) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <ColumnInspector view={view} hour={hovered ?? nowHour} isNow={hovered === null || hovered === nowHour} />
    </div>
  );
}
