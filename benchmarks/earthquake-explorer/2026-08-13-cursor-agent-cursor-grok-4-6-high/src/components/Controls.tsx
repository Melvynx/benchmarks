import { FEEDS } from "../lib/usgs";
import { REGIONS } from "../lib/map";
import type { BasemapId, DepthBand, Filters, WindowId } from "../lib/types";

type Props = {
  windowId: WindowId;
  onWindow: (id: WindowId) => void;
  filters: Filters;
  onFilters: (next: Filters) => void;
  basemapId: BasemapId;
  onBasemap: (id: BasemapId) => void;
  showPlates: boolean;
  onPlates: (on: boolean) => void;
  regionId: string;
  onRegion: (id: string) => void;
  onLocate: () => void;
  locating: boolean;
};

export function Controls({
  windowId,
  onWindow,
  filters,
  onFilters,
  basemapId,
  onBasemap,
  showPlates,
  onPlates,
  regionId,
  onRegion,
  onLocate,
  locating,
}: Props) {
  return (
    <div className="controls">
      <fieldset className="field">
        <legend>Time window</legend>
        <div className="seg wrap">
          {(Object.keys(FEEDS) as WindowId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={windowId === id ? "seg-btn is-on" : "seg-btn"}
              aria-pressed={windowId === id}
              onClick={() => onWindow(id)}
            >
              {FEEDS[id].label.replace("Past ", "")}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span className="field-label">
          Minimum magnitude
          <strong>{filters.minMag.toFixed(1)}</strong>
        </span>
        <input
          type="range"
          min={0}
          max={7}
          step={0.1}
          value={filters.minMag}
          onChange={(e) => onFilters({ ...filters, minMag: Number(e.target.value) })}
        />
        <span className="range-ends">
          <span>0</span>
          <span>7+</span>
        </span>
      </label>

      <fieldset className="field">
        <legend>Depth</legend>
        <div className="seg wrap">
          {(
            [
              ["all", "All"],
              ["shallow", "Shallow"],
              ["intermediate", "Mid"],
              ["deep", "Deep"],
            ] as [DepthBand, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={filters.depth === id ? "seg-btn is-on" : "seg-btn"}
              aria-pressed={filters.depth === id}
              onClick={() => onFilters({ ...filters, depth: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="hint">Shallow &lt; 70 km · Deep ≥ 300 km</p>
      </fieldset>

      <label className="field">
        <span className="field-label">Place</span>
        <input
          type="search"
          placeholder="Alaska, Japan, ridge…"
          value={filters.query}
          onChange={(e) => onFilters({ ...filters, query: e.target.value })}
        />
      </label>

      <fieldset className="field">
        <legend>Region</legend>
        <div className="chip-row">
          {REGIONS.map((region) => (
            <button
              key={region.id}
              type="button"
              className={regionId === region.id ? "chip is-on" : "chip"}
              onClick={() => onRegion(region.id)}
            >
              {region.label}
            </button>
          ))}
          <button type="button" className="chip" onClick={onLocate} disabled={locating}>
            {locating ? "Locating…" : "Near me"}
          </button>
        </div>
      </fieldset>

      <div className="checks">
        <label className="check">
          <input
            type="checkbox"
            checked={filters.feltOnly}
            onChange={(e) => onFilters({ ...filters, feltOnly: e.target.checked })}
          />
          Felt reports only
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={filters.tsunamiOnly}
            onChange={(e) => onFilters({ ...filters, tsunamiOnly: e.target.checked })}
          />
          Tsunami flag
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={filters.viewportOnly}
            onChange={(e) => onFilters({ ...filters, viewportOnly: e.target.checked })}
          />
          Map view only
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={showPlates}
            onChange={(e) => onPlates(e.target.checked)}
          />
          Plate boundaries
        </label>
      </div>

      <fieldset className="field">
        <legend>Basemap</legend>
        <div className="seg">
          <button
            type="button"
            className={basemapId === "table" ? "seg-btn is-on" : "seg-btn"}
            aria-pressed={basemapId === "table"}
            onClick={() => onBasemap("table")}
          >
            Survey table
          </button>
          <button
            type="button"
            className={basemapId === "night" ? "seg-btn is-on" : "seg-btn"}
            aria-pressed={basemapId === "night"}
            onClick={() => onBasemap("night")}
          >
            Night watch
          </button>
        </div>
      </fieldset>
    </div>
  );
}
