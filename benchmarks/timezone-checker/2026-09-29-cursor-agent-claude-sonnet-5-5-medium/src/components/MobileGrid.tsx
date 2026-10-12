import { hourLabel, type Analysis, type Settings } from "../lib/time";
import { Cell } from "./Cell";
import { CityName, offsetLabel } from "./CityInfo";

interface Props {
  analysis: Analysis;
  settings: Settings;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}

export function MobileGrid({ analysis, settings, onPromote, onRemove }: Props) {
  const { format } = settings;
  const cols = analysis.rows.length;
  return (
    <div className="mscroll">
      <div className="mgrid" style={{ gridTemplateColumns: `44px repeat(${cols}, minmax(78px, 1fr))` }}>
        <div className="m-corner" />
        {analysis.rows.map((row, i) => (
          <div key={row.city.id} className="m-head">
            <button
              type="button"
              className="icon-btn tiny"
              aria-label={`Remove ${row.city.name}`}
              onClick={() => onRemove(row.city.id)}
            >
              ×
            </button>
            <CityName row={row} isRef={i === 0} onPromote={onPromote} />
            <span className="muted tiny-text">{offsetLabel(row)}</span>
          </div>
        ))}
        {Array.from({ length: 24 }, (_, h) => (
          <MobileRow key={h} hour={h} analysis={analysis} format={format} />
        ))}
      </div>
    </div>
  );
}

function MobileRow({ hour, analysis, format }: { hour: number; analysis: Analysis; format: Settings["format"] }) {
  return (
    <>
      <div className="m-hour">{hourLabel(hour, format, true)}</div>
      {analysis.rows.map((row) => (
        <Cell key={row.city.id} cell={row.cells[hour]} format={format} />
      ))}
    </>
  );
}
