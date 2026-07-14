import type { OverlapData } from "../hooks/useOverlapData";
import { formatRangeLabel } from "../lib/timezone";
import type { CityComputed } from "../lib/types";

export function OverlapSummary({ data }: { data: OverlapData }) {
  if (data.cities.length < 2) return null;

  if (data.mode === "meeting") {
    const shared = data.cities[0];
    return (
      <section className="mb-5 rounded-2xl border border-base-700/60 bg-base-850/70 p-4">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-base-500">
          Everyone available
        </p>
        <OverlapRow city={shared} format={data.settings.format} zeroLabel="No hour works for every city — try widening your awake window." />
      </section>
    );
  }

  const [reference, ...others] = data.cities;
  return (
    <section className="mb-5 rounded-2xl border border-base-700/60 bg-base-850/70 p-4">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-base-500">
        Overlap with {reference.name} (reference)
      </p>
      <div className="space-y-3">
        {others.map((city) => (
          <div key={city.id} className="flex flex-wrap items-center gap-2.5 border-t border-base-700/50 pt-3 first:border-t-0 first:pt-0">
            <span className="min-w-24 text-sm font-medium text-base-100">{city.name}</span>
            <OverlapRow city={city} format={data.settings.format} zeroLabel={`No overlap with ${reference.name}.`} />
          </div>
        ))}
      </div>
    </section>
  );
}

function OverlapRow({
  city,
  format,
  zeroLabel,
}: {
  city: CityComputed;
  format: OverlapData["settings"]["format"];
  zeroLabel: string;
}) {
  if (city.overlapCount === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-glow">
        <WarningIcon />
        {zeroLabel}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="tabular rounded-full bg-overlap-500/15 px-2.5 py-1 text-xs font-semibold text-overlap-400 ring-1 ring-overlap-500/30">
        {city.overlapCount}h overlap
      </span>
      <div className="flex flex-wrap gap-1.5">
        {city.overlapRanges.map((range, index) => (
          <span
            key={index}
            className="tabular rounded-full border border-base-600/70 bg-base-800/80 px-2.5 py-1 text-xs text-base-200"
          >
            {formatRangeLabel(range, format)}
          </span>
        ))}
      </div>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <path
        d="M8 1.5 14.5 13a1 1 0 0 1-.87 1.5H2.37A1 1 0 0 1 1.5 13L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M8 6v3.2M8 11.6h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
