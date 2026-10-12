import type { Row } from "../../lib/grid";
import { formatOffset, formatTime } from "../../lib/time";
import type { TimeFormat } from "../../types";
import { CloseIcon } from "../Icons";

interface CityLabelProps {
  row: Row;
  refOffset: number;
  format: TimeFormat;
  onPromote: (id: string) => void;
}

function formatDiff(minutes: number): string {
  if (minutes === 0) return "same time";
  const sign = minutes > 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}h`;
}

export function CityLabel({ row, refOffset, format, onPromote }: CityLabelProps) {
  const { city, isReference } = row;
  return (
    <div className="city">
      <div className="city__title">
        <button
          type="button"
          className="city__name"
          onClick={() => onPromote(city.id)}
          disabled={isReference}
          title={isReference ? "Reference city" : `Make ${city.name} the reference city`}
        >
          {city.name}
        </button>
        {isReference && <span className="badge-ref">REF</span>}
      </div>
      <div className="city__meta">
        <span>{formatOffset(row.offset)}</span>
        {!isReference && <span className="city__diff">{formatDiff(row.offset - refOffset)}</span>}
        <span className="city__clock">{formatTime(row.localNowMinute, format)}</span>
      </div>
    </div>
  );
}

export function RemoveButton({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <button type="button" className="remove" onClick={onRemove} aria-label={`Remove ${name}`} title={`Remove ${name}`}>
      <CloseIcon />
    </button>
  );
}
