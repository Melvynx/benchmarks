import type { CSSProperties } from "react";
import { HOURS } from "../../lib/time";
import type { GridViewProps } from "./types";
import { CityLabel, RemoveButton } from "./CityLabel";
import { HourCell } from "./HourCell";

export function MobileGrid({ rows, refNowHour, format, onPromote, onRemove }: GridViewProps) {
  const reference = rows[0]!;
  const style = { "--cols": rows.length } as CSSProperties;

  return (
    <div className="mgrid-scroll">
      <div className="mgrid" style={style} role="table" aria-label="Hourly availability by city">
        <div className="mgrid__head" role="row">
          {rows.map((row) => (
            <div key={row.city.id} className={`mhead${row.isReference ? " mhead--ref" : ""}`} role="columnheader">
              <CityLabel row={row} refOffset={reference.offset} format={format} onPromote={onPromote} />
              <RemoveButton name={row.city.name} onRemove={() => onRemove(row.city.id)} />
            </div>
          ))}
        </div>

        {HOURS.map((hour) => (
          <div key={hour} className={`mgrid__row${hour === refNowHour ? " mgrid__row--now" : ""}`} role="row">
            {rows.map((row) => (
              <HourCell
                key={row.city.id}
                cell={row.cells[hour]!}
                format={format}
                cityName={row.city.name}
                referenceName={reference.city.name}
                isNow={hour === refNowHour}
                layout="mobile"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
