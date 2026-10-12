import type { CityRowModel } from '../lib/board';

export function CityFacts({ row }: { row: CityRowModel }) {
  const offset = row.abbrev ? `${row.abbrev} · ${row.offsetLabel}` : row.offsetLabel;
  return (
    <>
      <span className="name-row">
        {row.isReference ? <span className="ref-badge">REF</span> : null}
        <span className="city-name">{row.city.name}</span>
      </span>
      <span className="city-sub">{row.city.country}</span>
      <span className="city-sub">{offset}</span>
      <span className="city-now">{row.nowLabel}</span>
    </>
  );
}

export function promoteLabel(row: CityRowModel): string {
  return row.isReference ? `${row.city.name}, reference city` : `Make ${row.city.name} the reference city`;
}

export function RemoveButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button type="button" className="icon-btn" aria-label={`Remove ${name}`} onClick={onClick}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M4 4l8 8M12 4 4 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}
