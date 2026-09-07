import { DEPTH_STOPS, MAG_STOPS, UNKNOWN_COLOR } from "../lib/color";
import type { ColorMode } from "../lib/types";

type Props = {
  mode: ColorMode;
  onMode: (mode: ColorMode) => void;
};

export function Legend({ mode, onMode }: Props) {
  const stops = mode === "depth" ? DEPTH_STOPS : MAG_STOPS;
  return (
    <section className="legend" aria-label="Map color legend">
      <div className="legend-head">
        <span className="legend-title">{mode === "depth" ? "Depth" : "Magnitude"}</span>
        <div className="seg" role="group" aria-label="Color earthquakes by">
          <button
            type="button"
            className={mode === "magnitude" ? "seg-btn is-on" : "seg-btn"}
            aria-pressed={mode === "magnitude"}
            onClick={() => onMode("magnitude")}
          >
            Mag
          </button>
          <button
            type="button"
            className={mode === "depth" ? "seg-btn is-on" : "seg-btn"}
            aria-pressed={mode === "depth"}
            onClick={() => onMode("depth")}
          >
            Depth
          </button>
        </div>
      </div>
      <ol className="legend-stops">
        {stops.map((stop) => (
          <li key={stop.label}>
            <span className="swatch" style={{ background: stop.color }} />
            <span>{stop.label}</span>
          </li>
        ))}
        <li>
          <span className="swatch" style={{ background: UNKNOWN_COLOR }} />
          <span>Unknown</span>
        </li>
      </ol>
      <p className="legend-note">
        {mode === "depth"
          ? "Warm colors sit in the crust. Indigo marks deep mantle events."
          : "Point size also scales with magnitude. Every event is its own point."}
      </p>
    </section>
  );
}
