import { HOURS } from "../../lib/time";
import type { GridViewProps } from "./types";
import { CityLabel, RemoveButton } from "./CityLabel";
import { HourCell } from "./HourCell";

export function DesktopGrid({ rows, refNowHour, format, onPromote, onRemove }: GridViewProps) {
  const reference = rows[0]!;
  return (
    <div className="dgrid-scroll">
      <div className="dgrid" role="table" aria-label="Hourly availability by city">
        <div className="drow drow--axis" role="row" aria-hidden>
          <div className="drow__lead" />
          {HOURS.map((hour) => (
            <div key={hour} className={`axis${hour === refNowHour ? " axis--now" : ""}`}>
              {hour === refNowHour && <span className="now-pill">Now</span>}
            </div>
          ))}
          <div />
        </div>

        {rows.map((row) => (
          <div key={row.city.id} className={`drow${row.isReference ? " drow--ref" : ""}`} role="row">
            <div className="drow__lead" role="rowheader">
              <CityLabel row={row} refOffset={reference.offset} format={format} onPromote={onPromote} />
            </div>
            {row.cells.map((cell) => (
              <HourCell
                key={cell.refHour}
                cell={cell}
                format={format}
                cityName={row.city.name}
                referenceName={reference.city.name}
                isNow={cell.refHour === refNowHour}
                layout="desktop"
              />
            ))}
            <div className="drow__tail">
              <RemoveButton name={row.city.name} onRemove={() => onRemove(row.city.id)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
