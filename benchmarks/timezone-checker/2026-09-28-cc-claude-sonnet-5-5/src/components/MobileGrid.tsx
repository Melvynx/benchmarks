import { HOURS, formatHourLabel } from "../lib/time";
import { Cell } from "./Cell";
import { CityLabel, RemoveButton } from "./CityLabel";
import type { GridProps } from "./types";

export function MobileGrid({ cities, views, settings, onPromote, onRemove }: GridProps) {
  const cols = `2.6rem repeat(${cities.length}, minmax(0, 1fr))`;
  return (
    <div className="mgrid" role="table" aria-label="Hourly comparison">
      <div className="mrow mhead" style={{ gridTemplateColumns: cols }}>
        <div className="corner">Ref</div>
        {cities.map((city, i) => (
          <div className="mcity" key={city.id}>
            <CityLabel city={city} isRef={i === 0} onPromote={onPromote} />
            <RemoveButton city={city} onRemove={onRemove} />
          </div>
        ))}
      </div>
      {HOURS.map((h) => (
        <div className="mrow" style={{ gridTemplateColumns: cols }} key={h}>
          <div className="mhour">{formatHourLabel(h, settings.format)}</div>
          {views.map((v) => (
            <Cell key={v.id} cell={v.cells[h]} format={settings.format} />
          ))}
        </div>
      ))}
    </div>
  );
}
