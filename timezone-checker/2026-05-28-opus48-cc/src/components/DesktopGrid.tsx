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
  if (overlap) return "cell cell--overlap";
  if (awake) return "cell cell--awake";
  return "cell cell--sleep";
}

export function DesktopGrid({
  cities,
  timeFormat,
  nowRefHour,
  canRemove,
  onPromote,
  onRemove,
}: Props) {
  return (
    <div className="dgrid" role="table" aria-label="Timezone overlap grid">
      <div className="dgrid__corner" role="columnheader">
        City
      </div>
      {HOURS.map((h) => (
        <div
          key={h}
          className={`dgrid__hour ${h === nowRefHour ? "is-now" : ""}`}
          role="columnheader"
        >
          {formatHourCompact(h, 0, timeFormat)}
        </div>
      ))}
      <div className="dgrid__corner" />

      {cities.map((c) => (
        <div className="dgrid__row" role="row" key={c.city.id} style={{ display: "contents" }}>
          <div className="dgrid__info" role="rowheader">
            <button
              className="city-name"
              onClick={() => onPromote(c.city.id)}
              title={c.isReference ? "Reference city" : "Set as reference"}
              disabled={c.isReference}
            >
              {c.isReference && <span className="ref-badge">REF</span>}
              <span className="city-name__text">{c.city.name}</span>
            </button>
            <span className="city-offset">{formatOffset(c.offsetMinutes)}</span>
          </div>

          {c.cells.map((cell) => (
            <div
              key={cell.refHour}
              className={`${cellClass(cell.awake, cell.overlap)} ${
                cell.refHour === nowRefHour ? "is-now-col" : ""
              }`}
              role="cell"
              title={`${c.city.name}: ${formatHourCompact(cell.localHour, cell.localMinute, timeFormat)} local`}
            >
              {formatHourCompact(cell.localHour, cell.localMinute, timeFormat)}
            </div>
          ))}

          <div className="dgrid__action">
            <button
              className="remove-btn"
              onClick={() => onRemove(c.city.id)}
              disabled={!canRemove}
              aria-label={`Remove ${c.city.name}`}
              title={canRemove ? `Remove ${c.city.name}` : "Keep at least one city"}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  d="M6 6l12 12M18 6 6 18"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
