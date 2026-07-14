import { useId } from "react";
import type { Filters, SortKey } from "../types";

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  activeCount: number;
  onReset: () => void;
  open: boolean;
  onToggle: () => void;
};

const MAG_STOPS = [0, 1, 2.5, 4.5, 6];

export function FilterPanel({ filters, onChange, sort, onSort, activeCount, onReset, open, onToggle }: Props) {
  const id = useId();
  return (
    <section className="filters" aria-label="Filters and sorting">
      <div className="filters-bar">
        <button
          type="button"
          className="filters-toggle"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={onToggle}
        >
          <span aria-hidden="true" className={`chev ${open ? "is-open" : ""}`}>▸</span>
          Filters
          {activeCount > 0 && <span className="filters-count">{activeCount}</span>}
        </button>
        <label className="sort-label">
          <span className="sr-only">Sort events by</span>
          <select className="select" value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
            <option value="time">Newest first</option>
            <option value="mag">Strongest first</option>
            <option value="sig">Most significant</option>
          </select>
        </label>
        {activeCount > 0 && (
          <button type="button" className="btn-reset" onClick={onReset}>
            Reset all
          </button>
        )}
      </div>

      {open && (
        <div className="filters-body" id={`${id}-body`}>
          <fieldset className="filter-group">
            <legend>
              Minimum magnitude
              <button type="button" className="hint" aria-label="What is magnitude?">
                ?
                <span role="tooltip" className="hint-pop">
                  Magnitude measures the energy released at the source, on a logarithmic scale — each
                  whole step is ~32× more energy. It does not by itself predict damage.
                </span>
              </button>
            </legend>
            <div className="mag-stops" role="radiogroup" aria-label="Minimum magnitude">
              {MAG_STOPS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={filters.minMag === m}
                  className={`chip ${filters.minMag === m ? "is-on" : ""}`}
                  onClick={() => onChange({ minMag: m })}
                >
                  {m === 0 ? "All" : `M ${m}+`}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="filter-group">
            <legend>
              Depth
              <button type="button" className="hint" aria-label="What does depth mean?">
                ?
                <span role="tooltip" className="hint-pop">
                  How far below the surface the rupture started. Shallow events (&lt;70 km) are usually
                  felt more strongly; deep events (&gt;300 km) occur in subducting slabs.
                </span>
              </button>
            </legend>
            <div className="chip-row" role="radiogroup" aria-label="Depth band">
              {(
                [
                  ["any", "Any"],
                  ["shallow", "Shallow <70 km"],
                  ["intermediate", "70–300 km"],
                  ["deep", "Deep >300 km"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={filters.depth === value}
                  className={`chip ${filters.depth === value ? "is-on" : ""}`}
                  onClick={() => onChange({ depth: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="filter-group">
            <legend>
              PAGER alert
              <button type="button" className="hint" aria-label="What is a PAGER alert?">
                ?
                <span role="tooltip" className="hint-pop">
                  USGS PAGER estimates humanitarian impact: green (little), yellow, orange, red
                  (major). Most small events are never assessed.
                </span>
              </button>
            </legend>
            <div className="chip-row" role="radiogroup" aria-label="Alert level">
              {(["any", "green", "yellow", "orange", "red"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={filters.alert === value}
                  className={`chip ${value !== "any" ? `chip-alert-${value}` : ""} ${filters.alert === value ? "is-on" : ""}`}
                  onClick={() => onChange({ alert: value })}
                >
                  {value === "any" ? "Any" : value}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="filter-group filter-checks">
            <legend className="sr-only">Other filters</legend>
            <label className="check">
              <input
                type="checkbox"
                checked={filters.tsunamiOnly}
                onChange={(e) => onChange({ tsunamiOnly: e.target.checked })}
              />
              Tsunami information issued
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={filters.status === "reviewed"}
                onChange={(e) => onChange({ status: e.target.checked ? "reviewed" : "any" })}
              />
              Reviewed by seismologists only
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={filters.quakesOnly}
                onChange={(e) => onChange({ quakesOnly: e.target.checked })}
              />
              Earthquakes only (hide blasts &amp; other events)
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={filters.inView}
                onChange={(e) => onChange({ inView: e.target.checked })}
              />
              Only events in the current map view
            </label>
          </fieldset>
        </div>
      )}
    </section>
  );
}
