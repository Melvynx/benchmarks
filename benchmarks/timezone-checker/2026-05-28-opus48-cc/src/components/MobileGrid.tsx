import { formatHourCompact, type TimeFormat } from "../lib/format";
import { formatOffset } from "../lib/timezone";
import { HOURS, type CityComputed } from "../lib/overlap";

interface Props {
  cities: CityComputed[];
  timeFormat: TimeFormat;
  nowRefHour: number;
  canRemove: boolean;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}

function cellClass(awake: boolean, overlap: boolean): string {
  if (overlap) return "mcell mcell--overlap";
  if (awake) return "mcell mcell--awake";
  return "mcell mcell--sleep";
}

export function MobileGrid({
  cities,
  timeFormat,
  nowRefHour,
  canRemove,
  onPromote,
  onRemove,
}: Props) {
  return (
    <div
      className="mgrid"
      style={{ gridTemplateColumns: `3.4rem repeat(${cities.length}, minmax(0, 1fr))` }}
    >
      <div className="mgrid__corner" />
      {cities.map((c) => (
        <div className="mgrid__city" key={c.city.id}>
          <button
            className="city-name city-name--col"
            onClick={() => onPromote(c.city.id)}
            disabled={c.isReference}
            title={c.isReference ? "Reference city" : "Set as reference"}
          >
            {c.isReference && <span className="ref-badge">REF</span>}
            <span className="city-name__text">{c.city.name}</span>
          </button>
          <span className="city-offset">{formatOffset(c.offsetMinutes)}</span>
          <button
            className="remove-btn remove-btn--sm"
            onClick={() => onRemove(c.city.id)}
            disabled={!canRemove}
            aria-label={`Remove ${c.city.name}`}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                d="M6 6l12 12M18 6 6 18"
              />
            </svg>
          </button>
        </div>
      ))}

      {HOURS.map((h) => (
        <div className="mgrid__rowgroup" key={h} style={{ display: "contents" }}>
          <div className={`mgrid__hour ${h === nowRefHour ? "is-now" : ""}`}>
            {formatHourCompact(h, 0, timeFormat)}
          </div>
          {cities.map((c) => {
            const cell = c.cells[h];
            return (
              <div
                key={c.city.id}
                className={`${cellClass(cell.awake, cell.overlap)} ${
                  h === nowRefHour ? "is-now-row" : ""
                }`}
              >
                {formatHourCompact(cell.localHour, cell.localMinute, timeFormat)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
