import type { Color, ColorStop, Paint } from "./types";

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function color(r: number, g: number, b: number, a = 1): Color {
  return { r, g, b, a };
}

export function rgb(r: number, g: number, b: number, a = 1): Color {
  return { r: r / 255, g: g / 255, b: b / 255, a };
}

export function cloneColor(c: Color): Color {
  return { r: c.r, g: c.g, b: c.b, a: c.a };
}

export function colorsEqual(a: Color, b: Color, eps = 1 / 255): boolean {
  return (
    Math.abs(a.r - b.r) < eps &&
    Math.abs(a.g - b.g) < eps &&
    Math.abs(a.b - b.b) < eps &&
    Math.abs(a.a - b.a) < eps
  );
}

export function colorToCss(c: Color): string {
  const r = Math.round(clamp01(c.r) * 255);
  const g = Math.round(clamp01(c.g) * 255);
  const b = Math.round(clamp01(c.b) * 255);
  const a = clamp01(c.a);
  if (a >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function colorToHex(c: Color, withAlpha = false): string {
  const h = (n: number) =>
    Math.round(clamp01(n) * 255)
      .toString(16)
      .padStart(2, "0");
  const base = `#${h(c.r)}${h(c.g)}${h(c.b)}`;
  if (!withAlpha && c.a >= 1) return base.toUpperCase();
  return `${base}${h(c.a)}`.toUpperCase();
}

export function parseHex(input: string): Color | null {
  let s = input.trim().replace(/^#/, "");
  if (s.length === 3 || s.length === 4) {
    s = s
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (s.length !== 6 && s.length !== 8) return null;
  const n = Number.parseInt(s, 16);
  if (!Number.isFinite(n)) return null;
  if (s.length === 6) {
    return {
      r: ((n >> 16) & 255) / 255,
      g: ((n >> 8) & 255) / 255,
      b: (n & 255) / 255,
      a: 1,
    };
  }
  return {
    r: ((n >> 24) & 255) / 255,
    g: ((n >> 16) & 255) / 255,
    b: ((n >> 8) & 255) / 255,
    a: (n & 255) / 255,
  };
}

export function rgbToHsl(c: Color): { h: number; s: number; l: number; a: number } {
  const r = clamp01(c.r);
  const g = clamp01(c.g);
  const b = clamp01(c.b);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l, a: c.a };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l, a: c.a };
}

export function hslToRgb(h: number, s: number, l: number, a = 1): Color {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp01(s);
  const ll = clamp01(l);
  if (ss === 0) return { r: ll, g: ll, b: ll, a };
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const hk = hh / 360;
  return {
    r: hue2rgb(p, q, hk + 1 / 3),
    g: hue2rgb(p, q, hk),
    b: hue2rgb(p, q, hk - 1 / 3),
    a,
  };
}

export function solid(c: Color, opacity = 1): Paint {
  return { type: "solid", color: cloneColor(c), opacity };
}

export function linearPaint(
  stops: ColorStop[],
  start: { x: number; y: number } = { x: 0.5, y: 0 },
  end: { x: number; y: number } = { x: 0.5, y: 1 },
  opacity = 1,
): Paint {
  return { type: "linear", stops, start, end, opacity };
}

export function clonePaint(p: Paint): Paint {
  if (p.type === "solid") return { type: "solid", color: cloneColor(p.color), opacity: p.opacity };
  if (p.type === "linear") {
    return {
      type: "linear",
      opacity: p.opacity,
      start: { ...p.start },
      end: { ...p.end },
      stops: p.stops.map((s) => ({ offset: s.offset, color: cloneColor(s.color) })),
    };
  }
  return {
    type: "radial",
    opacity: p.opacity,
    center: { ...p.center },
    radius: p.radius,
    stops: p.stops.map((s) => ({ offset: s.offset, color: cloneColor(s.color) })),
  };
}

export const WHITE = color(1, 1, 1, 1);
export const BLACK = color(0, 0, 0, 1);
export const TRANSPARENT = color(0, 0, 0, 0);
export const FIGMA_BLUE = rgb(13, 153, 255);
export const GUIDE_PINK = rgb(255, 0, 229);
export const SELECTION = rgb(13, 153, 255);
