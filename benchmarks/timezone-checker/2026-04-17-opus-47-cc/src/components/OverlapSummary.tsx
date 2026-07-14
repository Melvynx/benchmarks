import { type CityRow, type Mode } from "../lib/overlap";
import { formatRange, groupHourRanges } from "../lib/timezone";
import { AlertIcon, CheckIcon } from "./Icons";

type Props = {
  rows: CityRow[];
  globalOverlap: boolean[];
  mode: Mode;
  format12h: boolean;
};

export function OverlapSummary({ rows, globalOverlap, mode, format12h }: Props) {
  if (rows.length < 2) return null;
  const ref = rows[0].city;

  if (mode === "meeting") {
    const total = globalOverlap.filter(Boolean).length;
    const ranges = groupHourRanges(globalOverlap);

    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/70 p-4 backdrop-blur sm:p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold tabular-nums text-zinc-100">
                {total}
              </span>
              <span className="text-sm text-zinc-400">
                {total === 1 ? "hour" : "hours"} of overlap
              </span>
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">
              when everyone is awake together
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2">
            {total === 0 ? (
              <WarningPill>
                No shared awake window across these {rows.length} cities.
              </WarningPill>
            ) : (
              ranges.map((r, i) => (
                <RangePill
                  key={i}
                  label={formatRange(r, format12h)}
                  tz={ref.name}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // base mode
  const refRow = rows[0];
  const others = rows.slice(1);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/70 p-4 backdrop-blur sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium text-zinc-300">
          Overlap with{" "}
          <span className="font-semibold text-zinc-100">{ref.name}</span>
        </h2>
        <span className="text-xs text-zinc-500">hours in {ref.name}</span>
      </div>
      <ul className="divide-y divide-[var(--border-soft)]">
        {others.map((row) => {
          const hours = row.overlapMask.filter(Boolean).length;
          const ranges = groupHourRanges(row.overlapMask);
          return (
            <li
              key={row.city.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="flex w-40 shrink-0 items-baseline gap-2">
                <span className="truncate text-sm font-medium text-zinc-200">
                  {row.city.name}
                </span>
              </div>
              <div className="w-12 shrink-0 font-mono text-sm tabular-nums text-zinc-100">
                {hours}
                <span className="ml-1 text-xs text-zinc-500">h</span>
              </div>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {hours === 0 ? (
                  <WarningPill>No shared awake hours</WarningPill>
                ) : (
                  ranges.map((r, i) => (
                    <RangePill
                      key={i}
                      small
                      label={formatRange(r, format12h)}
                    />
                  ))
                )}
              </div>
            </li>
          );
        })}
        {others.length === 0 && (
          <li className="py-2 text-sm text-zinc-500">
            Add another city to see per-city overlap.
          </li>
        )}
      </ul>
      <div className="sr-only">Reference row: {refRow.city.name}</div>
    </div>
  );
}

function RangePill({
  label,
  tz,
  small,
}: {
  label: string;
  tz?: string;
  small?: boolean;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full bg-emerald-900/30 px-3 py-1 font-mono tabular-nums text-emerald-300 ring-1 ring-emerald-700/40 " +
        (small ? "text-[11px]" : "text-xs")
      }
    >
      <CheckIcon width={12} height={12} className="text-emerald-400" />
      <span>{label}</span>
      {tz && <span className="text-emerald-500/70">· {tz}</span>}
    </span>
  );
}

function WarningPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/40 px-3 py-1 text-xs text-amber-300 ring-1 ring-amber-800/40">
      <AlertIcon width={12} height={12} className="text-amber-400" />
      {children}
    </span>
  );
}
