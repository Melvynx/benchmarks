import { formatOffset } from "../lib/time";
import type { GridCity } from "./types";

export function CityLabel({ city, isRef, onPromote }: { city: GridCity; isRef: boolean; onPromote: (id: string) => void }) {
  return (
    <div className="city-label">
      <div className="city-top">
        <button
          className="city-name"
          onClick={() => onPromote(city.id)}
          disabled={isRef}
          title={isRef ? "Reference city" : `Use ${city.name} as reference`}
        >
          {city.name}
        </button>
        {isRef && <span className="ref">REF</span>}
      </div>
      <span className="offset">{formatOffset(city.offset)}</span>
    </div>
  );
}

export function RemoveButton({ city, onRemove }: { city: GridCity; onRemove: (id: string) => void }) {
  return (
    <button className="remove" aria-label={`Remove ${city.name}`} title={`Remove ${city.name}`} onClick={() => onRemove(city.id)}>
      ×
    </button>
  );
}
