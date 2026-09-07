import type { ColorMode, Quake } from "./types";

/** Magnitude ramps from ice (small) to magma (large). Visible on both basemaps. */
export const MAG_STOPS = [
  { max: 2, label: "< 2", color: "#8ec5d4", ink: "#102027" },
  { max: 3, label: "2–3", color: "#5aa38f", ink: "#0c1c18" },
  { max: 4, label: "3–4", color: "#c9c85a", ink: "#1c1a08" },
  { max: 5, label: "4–5", color: "#e39a32", ink: "#1c1206" },
  { max: 6, label: "5–6", color: "#e05228", ink: "#fff8f4" },
  { max: 7, label: "6–7", color: "#c41e3a", ink: "#fff6f6" },
  { max: Infinity, label: "7+", color: "#7a1238", ink: "#fff4f6" },
] as const;

/** Depth ramps from crustal heat to indigo mantle. */
export const DEPTH_STOPS = [
  { max: 35, label: "0–35 km", color: "#e05228", ink: "#fff8f4" },
  { max: 70, label: "35–70 km", color: "#e39a32", ink: "#1c1206" },
  { max: 150, label: "70–150 km", color: "#c9c85a", ink: "#1c1a08" },
  { max: 300, label: "150–300 km", color: "#5aa38f", ink: "#0c1c18" },
  { max: Infinity, label: "300+ km", color: "#6d5cff", ink: "#f6f4ff" },
] as const;

export const UNKNOWN_COLOR = "#8a8896";

export function magColor(mag: number | null): string {
  if (mag === null) return UNKNOWN_COLOR;
  for (const stop of MAG_STOPS) {
    if (mag < stop.max) return stop.color;
  }
  return MAG_STOPS[MAG_STOPS.length - 1].color;
}

export function magInk(mag: number | null): string {
  if (mag === null) return "#141318";
  for (const stop of MAG_STOPS) {
    if (mag < stop.max) return stop.ink;
  }
  return MAG_STOPS[MAG_STOPS.length - 1].ink;
}

export function depthColor(depth: number | null): string {
  if (depth === null) return UNKNOWN_COLOR;
  for (const stop of DEPTH_STOPS) {
    if (depth < stop.max) return stop.color;
  }
  return DEPTH_STOPS[DEPTH_STOPS.length - 1].color;
}

export function quakeColor(quake: Pick<Quake, "mag" | "depth">, mode: ColorMode): string {
  return mode === "depth" ? depthColor(quake.depth) : magColor(quake.mag);
}

export function magRadius(mag: number | null, zoom = 2): number {
  const m = mag === null ? 1 : Math.max(0, mag);
  const base = 3.2 + m * 1.85;
  const zoomBoost = Math.max(0, zoom - 1.5) * 0.55;
  return Math.min(28, base + zoomBoost);
}

/** MapLibre data-driven paint. Unknown mag/depth are encoded as -1. */
export function circleColorExpression(mode: ColorMode) {
  if (mode === "depth") {
    return [
      "case",
      ["<", ["get", "depth"], 0],
      UNKNOWN_COLOR,
      [
        "step",
        ["get", "depth"],
        DEPTH_STOPS[0].color,
        35,
        DEPTH_STOPS[1].color,
        70,
        DEPTH_STOPS[2].color,
        150,
        DEPTH_STOPS[3].color,
        300,
        DEPTH_STOPS[4].color,
      ],
    ];
  }
  return [
    "case",
    ["<", ["get", "mag"], 0],
    UNKNOWN_COLOR,
    [
      "step",
      ["get", "mag"],
      MAG_STOPS[0].color,
      2,
      MAG_STOPS[1].color,
      3,
      MAG_STOPS[2].color,
      4,
      MAG_STOPS[3].color,
      5,
      MAG_STOPS[4].color,
      6,
      MAG_STOPS[5].color,
      7,
      MAG_STOPS[6].color,
    ],
  ];
}
