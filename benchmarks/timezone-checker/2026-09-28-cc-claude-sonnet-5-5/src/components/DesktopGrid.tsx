import { HOURS, formatHourLabel } from "../lib/time";
import { Cell } from "./Cell";
import { CityLabel, RemoveButton } from "./CityLabel";
import type { GridProps } from "./types";

export function DesktopGrid({ cities, views, settings, onPromote, onRemove }: GridProps) {
  return (
    <div className="dgrid" role="table" aria-label="Hourly comparison">
      <div className="drow head" role="row">
        <div />
        <div className="hours">
          {HOURS.map((h) => (
            <span key={h} className={h % 3 === 0 ? "tick" : ""}>
              {h % 3 === 0 ? formatHourLabel(h, settings.format) : ""}
            </span>
          ))}
        </div>
        <div />
      </div>
      {cities.map((city, i) => (
        <div className="drow" role="row" key={city.id}>
          <CityLabel city={city} isRef={i === 0} onPromote={onPromote} />
          <div className="cells">
            {views[i].cells.map((cell, h) => (
              <Cell key={h} cell={cell} format={settings.format} />
            ))}
          </div>
          <RemoveButton city={city} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
