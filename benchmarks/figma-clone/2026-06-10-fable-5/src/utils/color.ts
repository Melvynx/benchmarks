/** Color model used across the document: 8-bit RGB channels, alpha 0..1. */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSVA {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
  a: number; // 0..1
}

export function rgba(r: number, g: number, b: number, a = 1): RGBA {
  return { r, g, b, a };
}

export function rgbaToCss(c: RGBA, extraOpacity = 1): string {
  const a = clamp01(c.a * extraOpacity);
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${round3(a)})`;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function hex2(v: number): string {
  return Math.round(Math.max(0, Math.min(255, v)))
    .toString(16)
    .padStart(2, '0');
}

/** Uppercase hex without leading '#', alpha omitted when 1 ("FF8800" / "FF880080"). */
export function rgbaToHex(c: RGBA, includeAlpha = false): string {
  const base = `${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`.toUpperCase();
  if (includeAlpha && c.a < 1) return base + hex2(c.a * 255).toUpperCase();
  return base;
}

/** Forgiving hex parser: accepts #RGB, #RRGGBB, #RRGGBBAA, with or without '#'. */
export function parseHex(input: string): RGBA | null {
  const s = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    const [r, g, b] = s.split('').map((ch) => parseInt(ch + ch, 16));
    return rgba(r ?? 0, g ?? 0, b ?? 0, 1);
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) {
    return rgba(parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), 1);
  }
  if (/^[0-9a-fA-F]{8}$/.test(s)) {
    return rgba(
      parseInt(s.slice(0, 2), 16),
      parseInt(s.slice(2, 4), 16),
      parseInt(s.slice(4, 6), 16),
      parseInt(s.slice(6, 8), 16) / 255,
    );
  }
  return null;
}

export function rgbaToHsva(c: RGBA): HSVA {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max, a: c.a };
}

export function hsvaToRgba(c: HSVA): RGBA {
  const h = ((c.h % 360) + 360) % 360;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return c.v - c.v * c.s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return rgba(f(5) * 255, f(3) * 255, f(1) * 255, c.a);
}

export interface HSLA {
  h: number;
  s: number;
  l: number;
  a: number;
}

export function rgbaToHsla(c: RGBA): HSLA {
  const { h, s, v, a } = rgbaToHsva(c);
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h, s: sl, l, a };
}

export function hslaToRgba(c: HSLA): RGBA {
  const v = c.l + c.s * Math.min(c.l, 1 - c.l);
  const sv = v === 0 ? 0 : 2 * (1 - c.l / v);
  return hsvaToRgba({ h: c.h, s: sv, v, a: c.a });
}

export function colorsEqual(a: RGBA, b: RGBA): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

/** Perceived luminance, used to pick readable text over a swatch. */
export function isLight(c: RGBA): boolean {
  return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255 > 0.6;
}
