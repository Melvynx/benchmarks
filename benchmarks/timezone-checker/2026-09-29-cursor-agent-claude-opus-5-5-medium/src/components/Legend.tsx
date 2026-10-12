import type { Mode } from "../types";

export function Legend({ mode, referenceName }: { mode: Mode; referenceName: string }) {
  return (
    <footer className="legend">
      <ul className="legend__keys">
        <li>
          <span className="swatch swatch--overlap" /> Overlap
        </li>
        <li>
          <span className="swatch swatch--awake" /> Awake
        </li>
        <li>
          <span className="swatch swatch--sleeping" /> Asleep
        </li>
      </ul>
      <p className="legend__hint">
        {mode === "meeting" ? "Green cells = everyone awake" : `Green cells = awake at the same time as ${referenceName}`}
      </p>
      <p className="legend__tip">Click a city name to make it the reference.</p>
    </footer>
  );
}
