import type { CityRow } from "@/lib/types";

type DesktopGridProps = {
  rows: CityRow[];
  canRemove: boolean;
  onPromoteCity: (cityId: string) => void;
  onRemoveCity: (cityId: string) => void;
};

export function DesktopGrid({
  rows,
  canRemove,
  onPromoteCity,
  onRemoveCity,
}: DesktopGridProps) {
  if (!rows.length) {
    return null;
  }

  const referenceHours = rows[0].cells.map((cell) => cell.referenceLabel);

  return (
    <section className="grid-card desktop-only">
      <div className="desktop-board">
        <div className="desktop-hour-header">
          <div className="desktop-city-heading">Cities</div>
          <div className="desktop-hours">
            {referenceHours.map((label, index) => (
              <div key={`${label}-${index}`} className="hour-tick">
                {label}
              </div>
            ))}
          </div>
          <div className="desktop-remove-heading">Remove</div>
        </div>

        {rows.map((row) => (
          <div key={row.city.id} className="desktop-row">
            <button type="button" className="city-meta" onClick={() => onPromoteCity(row.city.id)}>
              <span className="city-meta-top">
                <strong>{row.city.name}</strong>
                {row.isReference ? <span className="ref-badge">REF</span> : null}
              </span>
              <span className="city-meta-bottom">
                {row.city.country} · {row.offsetLabel}
              </span>
            </button>

            <div className="desktop-hours">
              {row.cells.map((cell) => (
                <div
                  key={`${row.city.id}-${cell.referenceHour}`}
                  className={`hour-cell ${cell.isAwake ? "awake" : "sleeping"} ${
                    cell.isOverlap ? "overlap" : ""
                  }`}
                >
                  <strong>{cell.label}</strong>
                  {cell.dayShiftLabel ? <small>{cell.dayShiftLabel}</small> : null}
                </div>
              ))}
            </div>

            <div className="remove-slot">
              <button
                type="button"
                className="remove-button"
                disabled={!canRemove}
                onClick={() => onRemoveCity(row.city.id)}
                aria-label={`Remove ${row.city.name}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
