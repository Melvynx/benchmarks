import type { OverlapData } from "../../hooks/useOverlapData";
import { formatHourLabel, formatUtcOffset } from "../../lib/timezone";
import type { TimeFormat } from "../../lib/types";
import { useTimezoneStore } from "../../store/useTimezoneStore";
import { Cell } from "./Cell";
import { CloseIcon, RefBadge } from "./shared";

export function MobileGrid({ data }: { data: OverlapData }) {
  const promoteToReference = useTimezoneStore((s) => s.promoteToReference);
  const removeCity = useTimezoneStore((s) => s.removeCity);
  const format = data.settings.format;
  const columnCount = data.cities.length;

  return (
    <div className="max-h-[70vh] overflow-auto rounded-2xl border border-base-700/60 bg-base-850/50 md:hidden">
      <div
        className="grid"
        style={{ gridTemplateColumns: `3.5rem repeat(${columnCount}, minmax(6.5rem,1fr))` }}
      >
        <div className="sticky left-0 top-0 z-30 border-b border-r border-base-700/60 bg-base-850" />

        {data.cities.map((city) => (
          <div
            key={city.id}
            className="sticky top-0 z-20 flex flex-col items-center gap-1 border-b border-l border-base-700/50 bg-base-850/95 px-2 py-2.5"
          >
            <button
              type="button"
              onClick={() => promoteToReference(city.id)}
              disabled={city.isReference}
              title={city.isReference ? "Reference city" : "Set as reference city"}
              className="flex items-center gap-1 text-sm font-medium text-base-100 enabled:hover:text-overlap-400 disabled:cursor-default"
            >
              <span className="max-w-[6rem] truncate">{city.name}</span>
            </button>
            {city.isReference && <RefBadge />}
            <span className="text-[10px] text-base-500">{formatUtcOffset(city.offsetMinutes)}</span>
            <button
              type="button"
              onClick={() => removeCity(city.id)}
              aria-label={`Remove ${city.name}`}
              className="mt-0.5 rounded-md p-1 text-base-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <CloseIcon />
            </button>
          </div>
        ))}

        {Array.from({ length: 24 }, (_, hour) => (
          <HourRow key={hour} hour={hour} data={data} format={format} />
        ))}
      </div>
    </div>
  );
}

function HourRow({ hour, data, format }: { hour: number; data: OverlapData; format: TimeFormat }) {
  return (
    <>
      <div className="tabular sticky left-0 z-10 flex items-center justify-center border-b border-r border-base-700/40 bg-base-850/95 px-1 text-[11px] text-base-400">
        {formatHourLabel(hour, format)}
      </div>
      {data.cities.map((city) => (
        <div key={city.id} className="border-b border-l border-base-700/40 p-1">
          <Cell state={city.cellStates[hour]} label={formatHourLabel(city.localHours[hour], format)} />
        </div>
      ))}
    </>
  );
}
