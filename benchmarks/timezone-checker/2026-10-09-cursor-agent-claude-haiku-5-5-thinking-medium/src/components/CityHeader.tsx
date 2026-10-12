interface CityHeaderProps {
  name: string;
  isRef: boolean;
  offsetLabel: string;
  onPromote: () => void;
  onRemove: () => void;
  /** Mobile renders this inside a column header; desktop inside the row's info cell. */
  className?: string;
}

/** City name (click to promote to reference), REF badge, UTC offset and remove button. */
export function CityHeader({ name, isRef, offsetLabel, onPromote, onRemove, className }: CityHeaderProps) {
  return (
    <div className={`city-header ${className ?? ''}`}>
      <div className="city-title">
        <button
          type="button"
          className="city-name"
          onClick={onPromote}
          disabled={isRef}
          title={isRef ? 'Reference city' : `Make ${name} the reference`}
        >
          {name}
        </button>
        {isRef && <span className="badge">REF</span>}
      </div>
      <span className="offset">{offsetLabel}</span>
      <button type="button" className="remove-btn" onClick={onRemove} aria-label={`Remove ${name}`} title="Remove">
        ×
      </button>
    </div>
  );
}
