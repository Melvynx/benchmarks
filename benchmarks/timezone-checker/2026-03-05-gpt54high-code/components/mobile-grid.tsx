import type { CityRow } from "@/lib/types";

type MobileGridProps = {
  rows: CityRow[];
  canRemove: boolean;
  onPromoteCity: (cityId: string) => void;
  onRemoveCity: (cityId: string) => void;
};

export function MobileGrid({ rows, canRemove, onPromoteCity, onRemoveCity }: MobileGridProps) {
  if (!rows.length) {
    return null;
  }

  const referenceHours = rows[0].cells.map((cell) => ({
    hour: cell.referenceHour,
    label: cell.referenceLabel,
  }));

  return (
    <section className="grid-card mobile-only">
      <div className="mobile-board">
        <div
          className="mobile-grid"
          style={{
            gridTemplateColumns: `4.5rem repeat(${rows.length}, minmax(8.5rem, 1fr))`,
          }}
        >
          <div className="mobile-corner">Ref</div>
          {rows.map((row) => (
            <div key={row.city.id} className="mobile-city-head">
              <button type="button" className="mobile-promote" onClick={() => onPromoteCity(row.city.id)}>
                <strong>{row.city.name}</strong>
                {row.isReference ? <span className="ref-badge">REF</span> : null}
              </button>
              <small>
                {row.city.country} · {row.offsetLabel}
              </small>
              <button
                type="button"
                className="remove-button compact"
                disabled={!canRemove}
                onClick={() => onRemoveCity(row.city.id)}
              >
                Remove
              </button>
            </div>
          ))}

          {referenceHours.map((reference) => (
            <MobileHourRow key={reference.hour} hour={reference.label} rows={rows} referenceHour={reference.hour} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MobileHourRow({
  hour,
  rows,
  referenceHour,
}: {
  hour: string;
  rows: CityRow[];
  referenceHour: number;
}) {
  return (
    <>
      <div className="mobile-hour-label">{hour}</div>
      {rows.map((row) => {
        const cell = row.cells[referenceHour];

        return (
          <div
            key={`${row.city.id}-${referenceHour}`}
            className={`mobile-cell ${cell.isAwake ? "awake" : "sleeping"} ${
              cell.isOverlap ? "overlap" : ""
            }`}
          >
            <strong>{cell.label}</strong>
            {cell.dayShiftLabel ? <small>{cell.dayShiftLabel}</small> : null}
          </div>
        );
      })}
    </>
  );
}
