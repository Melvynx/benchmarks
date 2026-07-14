import type { OverlapData } from "../../hooks/useOverlapData";
import { formatHourLabel, formatUtcOffset } from "../../lib/timezone";
import type { CityComputed, TimeFormat } from "../../lib/types";
import { useTimezoneStore } from "../../store/useTimezoneStore";
import { Cell } from "./Cell";
import { CloseIcon, RefBadge } from "./shared";

const GRID_COLS = "grid-cols-[200px_repeat(24,minmax(2.15rem,1fr))_2.25rem]";

export function DesktopGrid({ data }: { data: OverlapData }) {
  const promoteToReference = useTimezoneStore((s) => s.promoteToReference);
  const removeCity = useTimezoneStore((s) => s.removeCity);
  const format = data.settings.format;

  return (
    <div className="hidden max-h-[65vh] overflow-auto rounded-2xl border border-base-700/60 bg-base-850/50 md:block">
      <div className={`grid ${GRID_COLS} min-w-[920px]`}>
        <div className="sticky left-0 top-0 z-30 border-b border-base-700/60 bg-base-850 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-base-500">
          City
        </div>
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="tabular sticky top-0 z-20 flex items-center justify-center border-b border-base-700/60 bg-base-850 py-2.5 text-[11px] font-medium text-base-400"
          >
            {formatHourLabel(h, format)}
          </div>
        ))}
        <div className="sticky top-0 z-20 border-b border-base-700/60 bg-base-850" />

        {data.cities.map((city) => (
          <Row
            key={city.id}
            city={city}
            format={format}
            onPromote={() => promoteToReference(city.id)}
            onRemove={() => removeCity(city.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  city,
  format,
  onPromote,
  onRemove,
}: {
  city: CityComputed;
  format: TimeFormat;
  onPromote: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex flex-col justify-center gap-0.5 border-t border-base-700/50 bg-base-850/95 px-3 py-2">
        <button
          type="button"
          onClick={onPromote}
          disabled={city.isReference}
          title={city.isReference ? "Reference city" : "Set as reference city"}
          className="flex items-center gap-1.5 text-left text-sm font-medium text-base-100 transition-colors enabled:hover:text-overlap-400 disabled:cursor-default"
        >
          <span className="truncate">{city.name}</span>
          {city.isReference && <RefBadge />}
        </button>
        <span className="truncate text-[11px] text-base-500">
          {city.country} · {formatUtcOffset(city.offsetMinutes)}
        </span>
      </div>

      {city.cellStates.map((state, h) => (
        <div key={h} className="border-t border-base-700/50 p-1">
          <Cell state={state} label={formatHourLabel(city.localHours[h], format)} />
        </div>
      ))}

      <div className="flex items-center justify-center border-t border-base-700/50">
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${city.name}`}
          className="rounded-md p-1.5 text-base-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <CloseIcon />
        </button>
      </div>
    </>
  );
}
