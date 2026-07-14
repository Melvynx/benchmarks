import type { CityRow } from '../lib/overlap';

interface Props {
  row: CityRow;
  onPromote: (id: string) => void;
}

/** City name (click to promote to reference), REF badge, UTC offset. */
export function CityLabel({ row, onPromote }: Props) {
  return (
    <div className="city-label">
      <button
        type="button"
        className="city-label__name"
        onClick={() => onPromote(row.city.id)}
        disabled={row.isReference}
        title={row.isReference ? `${row.city.name} is the reference city` : `Make ${row.city.name} the reference city`}
      >
        {row.city.name}
      </button>
      {row.isReference && <span className="city-label__ref">REF</span>}
      <span className="city-label__offset">{row.offsetLabel}</span>
    </div>
  );
}

export function RemoveButton({
  cityName,
  onRemove,
}: {
  cityName: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      className="city-remove"
      onClick={onRemove}
      aria-label={`Remove ${cityName}`}
      title={`Remove ${cityName}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
