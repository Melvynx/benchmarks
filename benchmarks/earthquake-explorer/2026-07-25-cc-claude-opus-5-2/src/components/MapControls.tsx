import { BASEMAPS, type BasemapId, type ProjectionId } from "../lib/basemaps";

export interface MapControlsProps {
  basemapId: BasemapId;
  onBasemapChange: (id: BasemapId) => void;
  projection: ProjectionId;
  onProjectionChange: (projection: ProjectionId) => void;
  showPlates: boolean;
  onShowPlatesChange: (value: boolean) => void;
}

/**
 * Appearance controls for the map, floated over the map itself rather than
 * buried in the filter sidebar: they change what you are looking at, not which
 * events are in play, and the sidebar column has no room for them anyway.
 */
export function MapControls({
  basemapId,
  onBasemapChange,
  projection,
  onProjectionChange,
  showPlates,
  onShowPlatesChange,
}: MapControlsProps) {
  return (
    <div className="map-controls">
      <div className="segmented segmented-sm" role="group" aria-label="Basemap">
        {BASEMAPS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`segment ${option.id === basemapId ? "is-active" : ""}`}
            aria-pressed={option.id === basemapId}
            onClick={() => onBasemapChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="map-controls-row">
        <div className="segmented segmented-sm" role="group" aria-label="Projection">
          <button
            type="button"
            className={`segment ${projection === "flat" ? "is-active" : ""}`}
            aria-pressed={projection === "flat"}
            onClick={() => onProjectionChange("flat")}
          >
            Flat
          </button>
          <button
            type="button"
            className={`segment ${projection === "globe" ? "is-active" : ""}`}
            aria-pressed={projection === "globe"}
            onClick={() => onProjectionChange("globe")}
          >
            Globe
          </button>
        </div>

        <button
          type="button"
          className={`plate-toggle ${showPlates ? "is-active" : ""}`}
          aria-pressed={showPlates}
          title="Tectonic plate boundaries — where nearly every quake originates"
          onClick={() => onShowPlatesChange(!showPlates)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M1 5.2c2.1 0 2.6 2.1 4.6 2.1S8 4.4 10 4.4s2.4 2.4 5 2.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="2.6 2.2"
            />
            <path
              d="M1 11.4c2.6 0 3-2.3 5.4-2.3s2.7 2.7 4.8 2.7 2.3-1.6 3.8-1.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="2.6 2.2"
            />
          </svg>
          Plates
        </button>
      </div>
    </div>
  );
}
