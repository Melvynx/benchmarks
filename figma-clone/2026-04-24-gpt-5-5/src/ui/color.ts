import type { RGBA, SolidFill } from "../types/nodes";

export function hexToRgba(hex: string): RGBA {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean.padEnd(6, "0").slice(0, 6);
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
    a: 1,
  };
}

export function rgbaToHex(color: RGBA): string {
  return `#${[color.r, color.g, color.b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

export function solidFill(hex: string): SolidFill {
  return { kind: "solid", color: hexToRgba(hex) };
}

export function firstSolidHex(fills: readonly { kind: string; color?: RGBA }[]): string {
  const fill = fills.find((item): item is SolidFill => item.kind === "solid" && item.color !== undefined);
  return fill ? rgbaToHex(fill.color) : "#000000";
}
