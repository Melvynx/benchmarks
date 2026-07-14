import { classifyDepth } from "./format";

/** Marker core radius in px, driven by magnitude on a sqrt scale so area ~ energy-ish perception. */
export function magnitudeToRadius(mag: number | null): number {
  const m = Math.max(mag ?? 0, 0);
  return 4 + Math.sqrt(m) * 5.2;
}

export const DEPTH_COLORS: Record<ReturnType<typeof classifyDepth>["key"], string> = {
  shallow: "#e2725b", // warm terra-cotta — near-surface
  intermediate: "#d9a441", // amber
  deep: "#4f7cac", // cool slate blue — deep focus
};

export function depthToColor(depthKm: number | null): string {
  return DEPTH_COLORS[classifyDepth(depthKm).key];
}

export const ALERT_COLORS: Record<string, string> = {
  green: "#4f9d69",
  yellow: "#d9b02a",
  orange: "#d9791f",
  red: "#c94c3f",
};
