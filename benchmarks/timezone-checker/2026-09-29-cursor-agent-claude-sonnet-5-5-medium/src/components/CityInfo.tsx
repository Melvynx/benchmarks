import type { Row } from "../lib/time";
import { formatOffset } from "../lib/time";

export function CityName({
  row,
  isRef,
  onPromote,
}: {
  row: Row;
  isRef: boolean;
  onPromote: (id: string) => void;
}) {
  return (
    <span className="city-name-wrap">
      <button
        type="button"
        className="city-name"
        disabled={isRef}
        title={isRef ? "Reference city" : `Make ${row.city.name} the reference`}
        onClick={() => onPromote(row.city.id)}
      >
        {row.city.name}
      </button>
      {isRef && <span className="ref-badge">REF</span>}
    </span>
  );
}

export const offsetLabel = (row: Row) => formatOffset(row.offset);
