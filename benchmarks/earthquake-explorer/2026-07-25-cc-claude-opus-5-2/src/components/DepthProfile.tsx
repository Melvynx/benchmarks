import type { CSSProperties } from "react";

import { RAMPS, sampleStops } from "../lib/color";

const MAX_DEPTH = 700;

const ZONES = [
  { from: 0, to: 70, name: "Shallow", note: "Crust & lithosphere" },
  { from: 70, to: 300, name: "Intermediate", note: "Descending slab" },
  { from: 300, to: 700, name: "Deep", note: "Lower mantle transition" },
];

export function depthClass(depth: number): (typeof ZONES)[number] {
  return ZONES.find((zone) => depth < zone.to) ?? ZONES[ZONES.length - 1];
}

/**
 * Where this event sits in the Earth. Depth is the single most under-explained
 * number in an earthquake report and the one that decides how hard the ground
 * actually shook, so it gets a picture rather than a figure.
 */
export function DepthProfile({ depth }: { depth: number }) {
  const clamped = Math.max(0, Math.min(MAX_DEPTH, depth));
  const position = (clamped / MAX_DEPTH) * 100;
  const zone = depthClass(depth);
  const color = sampleStops(RAMPS.depth.stops, depth);

  return (
    <div className="depth-profile">
      <div className="depth-scale">
        {ZONES.map((band) => (
          <div
            key={band.name}
            className="depth-band"
            style={{
              top: `${(band.from / MAX_DEPTH) * 100}%`,
              height: `${((band.to - band.from) / MAX_DEPTH) * 100}%`,
              background: `linear-gradient(90deg, ${sampleStops(RAMPS.depth.stops, (band.from + band.to) / 2)}22, transparent)`,
            }}
          >
            <span className="depth-band-label">{band.name}</span>
            <span className="depth-band-range">
              {band.from}–{band.to} km
            </span>
          </div>
        ))}
        <div className="depth-surface" aria-hidden="true" />
        <div className="depth-marker" style={{ top: `${position}%`, background: color }} />
        {/* Outside the marker line so it can be clamped to the track: most
            quakes are only a few km down, which puts the line — and an
            un-clamped flag with it — right on the top edge. */}
        <span
          className="depth-marker-flag"
          style={{ "--pos": `${position}%`, borderColor: color, color } as CSSProperties}
        >
          {depth < 10 ? depth.toFixed(1) : Math.round(depth)} km
        </span>
      </div>
      <p className="depth-caption">
        <strong style={{ color }}>{zone.name}</strong> — {zone.note}
      </p>
    </div>
  );
}
