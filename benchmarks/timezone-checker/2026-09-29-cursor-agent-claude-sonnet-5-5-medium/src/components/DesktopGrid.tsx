import { hourLabel, type Analysis, type Settings } from "../lib/time";
import { Cell } from "./Cell";
import { CityName, offsetLabel } from "./CityInfo";

interface Props {
  analysis: Analysis;
  settings: Settings;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}

export function DesktopGrid({ analysis, settings, onPromote, onRemove }: Props) {
  const { format } = settings;
  const refName = analysis.rows[0]?.city.name;
  return (
    <div className="dgrid" role="table" aria-label="Hour comparison">
      <div className="drow head" role="row">
        <div className="d-info muted small">Hours in {refName}</div>
        <div className="d-cells">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="hour-head" role="columnheader">
              {hourLabel(h, format, true)}
            </div>
          ))}
        </div>
        <div className="d-action" />
      </div>
      {analysis.rows.map((row, i) => (
        <div key={row.city.id} className="drow" role="row">
          <div className="d-info">
            <CityName row={row} isRef={i === 0} onPromote={onPromote} />
            <span className="muted small">
              {row.city.country} · {offsetLabel(row)}
            </span>
          </div>
          <div className="d-cells">
            {row.cells.map((cell) => (
              <Cell key={cell.refHour} cell={cell} format={format} />
            ))}
          </div>
          <div className="d-action">
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove ${row.city.name}`}
              onClick={() => onRemove(row.city.id)}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
