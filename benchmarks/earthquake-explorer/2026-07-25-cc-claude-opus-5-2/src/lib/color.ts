/**
 * The colour system.
 *
 * Three interchangeable encodings, each a piecewise-linear ramp over stops.
 * Every ramp is also the source of truth for the on-map legend, so the swatches
 * a user reads and the pixels they see can never drift apart.
 */

import type { Quake } from "./usgs";

export type ColorMode = "magnitude" | "depth" | "recency";

export interface Stop {
  /** Position along the ramp's domain (magnitude, km, or ms of age). */
  at: number;
  color: string;
  /** Legend caption. Omitted on interior stops that only shape the gradient. */
  label?: string;
}

export interface Ramp {
  id: ColorMode;
  name: string;
  /** One line explaining what the colour is telling you. */
  blurb: string;
  unit: string;
  stops: Stop[];
  /** Legend tick captions are read left-to-right from `stops`; reverse for depth. */
  scale: "linear" | "log-age";
}

/** Rising heat: cool cyan for the imperceptible, white-hot for the destructive. */
const MAGNITUDE_STOPS: Stop[] = [
  { at: 0, color: "#22d3ee", label: "0" },
  { at: 1.5, color: "#38e0a5", label: "1.5" },
  { at: 3, color: "#a3e635", label: "3" },
  { at: 4.5, color: "#facc15", label: "4.5" },
  { at: 6, color: "#f97316", label: "6" },
  { at: 7, color: "#ef4444", label: "7" },
  { at: 8, color: "#fecdd3", label: "8+" },
];

/**
 * Depth follows seismological convention: shallow events (the damaging ones,
 * because their energy has less crust to cross) burn hot; slab events deep in
 * the mantle cool through violet into blue.
 */
const DEPTH_STOPS: Stop[] = [
  { at: 0, color: "#fde047", label: "0" },
  { at: 35, color: "#fb923c", label: "35" },
  { at: 70, color: "#f43f5e", label: "70" },
  { at: 150, color: "#c026d3", label: "150" },
  { at: 300, color: "#7c3aed", label: "300" },
  { at: 500, color: "#3b82f6", label: "500" },
  { at: 700, color: "#67e8f9", label: "700" },
];

/** A cooling ember: minutes old is white-hot, weeks old is a dark cinder. */
const RECENCY_STOPS: Stop[] = [
  { at: 0, color: "#fff7ed", label: "now" },
  { at: 3_600_000, color: "#fde047", label: "1h" },
  { at: 21_600_000, color: "#fb923c", label: "6h" },
  { at: 86_400_000, color: "#ef4444", label: "1d" },
  { at: 604_800_000, color: "#9f1239", label: "7d" },
  { at: 2_592_000_000, color: "#6d3550", label: "30d" },
];

export const RAMPS: Record<ColorMode, Ramp> = {
  magnitude: {
    id: "magnitude",
    name: "Magnitude",
    blurb: "Energy released. Each whole step is ~32× more energy.",
    unit: "M",
    stops: MAGNITUDE_STOPS,
    scale: "linear",
  },
  depth: {
    id: "depth",
    name: "Depth",
    blurb: "Shallow quakes shake the surface hardest. Deep ones mark sinking slabs.",
    unit: "km",
    stops: DEPTH_STOPS,
    scale: "linear",
  },
  recency: {
    id: "recency",
    name: "Recency",
    blurb: "How long ago it struck. Fresh events glow, older ones cool to ember.",
    unit: "ago",
    stops: RECENCY_STOPS,
    scale: "log-age",
  },
};

export const COLOR_MODES = Object.values(RAMPS);

/* -------------------------------------------------------------------------- */
/* Colour maths                                                               */
/* -------------------------------------------------------------------------- */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const int = Number.parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function mixHex(a: string, b: string, t: number): string {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex({
    r: from.r + (to.r - from.r) * k,
    g: from.g + (to.g - from.g) * k,
    b: from.b + (to.b - from.b) * k,
  });
}

/** Sample a stop list at `value`, clamping outside the domain. */
export function sampleStops(stops: Stop[], value: number): string {
  if (value <= stops[0].at) return stops[0].color;
  const last = stops[stops.length - 1];
  if (value >= last.at) return last.color;

  for (let i = 1; i < stops.length; i += 1) {
    const prev = stops[i - 1];
    const next = stops[i];
    if (value <= next.at) {
      const span = next.at - prev.at;
      return mixHex(prev.color, next.color, span === 0 ? 0 : (value - prev.at) / span);
    }
  }
  return last.color;
}

/** The value a quake contributes to a given ramp. */
export function rampValue(mode: ColorMode, quake: Quake, now: number): number {
  if (mode === "magnitude") return quake.mag;
  if (mode === "depth") return quake.depth;
  return Math.max(0, now - quake.time);
}

export function quakeColor(mode: ColorMode, quake: Quake, now: number): string {
  return sampleStops(RAMPS[mode].stops, rampValue(mode, quake, now));
}

/**
 * A CSS `linear-gradient` matching the ramp, for legend bars.
 * `log-age` ramps are laid out on a log scale so the first hour is not a sliver.
 */
export function rampGradient(ramp: Ramp): string {
  const positions = stopPositions(ramp);
  const parts = ramp.stops.map((stop, i) => `${stop.color} ${(positions[i] * 100).toFixed(2)}%`);
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

/** Normalised 0–1 position of each stop along the legend bar. */
export function stopPositions(ramp: Ramp): number[] {
  const stops = ramp.stops;
  if (ramp.scale === "log-age") {
    // log1p keeps the "now" stop at exactly 0 while spreading the decades evenly.
    const max = Math.log1p(stops[stops.length - 1].at);
    return stops.map((s) => Math.log1p(s.at) / max);
  }
  const min = stops[0].at;
  const max = stops[stops.length - 1].at;
  return stops.map((s) => (s.at - min) / (max - min));
}

/* -------------------------------------------------------------------------- */
/* MapLibre expressions                                                       */
/* -------------------------------------------------------------------------- */

/**
 * MapLibre style expressions are heterogeneous nested arrays that the library
 * types as a large discriminated union. Building them programmatically is far
 * more readable with a local alias than with the full spec type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Expression = any;

/**
 * Build the `interpolate` expression that paints the circle layer.
 * Feature properties are pre-computed in `toCollection`, so the GPU reads a
 * plain number and no per-frame JavaScript runs.
 */
export function colorExpression(mode: ColorMode): Expression {
  const ramp = RAMPS[mode];
  const property = mode === "recency" ? "age" : mode === "depth" ? "depth" : "mag";
  const expr: unknown[] = ["interpolate", ["linear"], ["get", property]];
  for (const stop of ramp.stops) {
    expr.push(stop.at, stop.color);
  }
  return expr;
}

/**
 * Circle radius in pixels, multiplied by `scale` and then widened by a flat
 * `pad` pixels (used for the invisible tap target).
 *
 * Magnitude is already logarithmic, so an exponential ramp on top of it makes
 * a felt M5 unmistakable next to an instrument-only M1 without letting an M8
 * swallow a continent. Radius also grows with zoom, so dense aftershock
 * sequences pull apart as you move in.
 *
 * `pad` is folded into each stop rather than wrapped in an `["+", …]`: the
 * style spec only allows `["zoom"]` as the direct input of a top-level
 * `interpolate`, so the zoom ramp has to stay the outermost expression.
 */
export function radiusExpression(scale = 1, pad = 0): Expression {
  const byMag = (zoomScale: number): unknown[] => {
    const k = scale * zoomScale;
    return [
      "interpolate",
      ["exponential", 1.9],
      ["get", "mag"],
      0,
      1.6 * k + pad,
      2,
      2.6 * k + pad,
      4,
      5 * k + pad,
      6,
      10 * k + pad,
      8,
      19 * k + pad,
    ];
  };
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    0,
    byMag(0.72),
    3,
    byMag(1),
    7,
    byMag(1.7),
    12,
    byMag(2.6),
  ];
}
