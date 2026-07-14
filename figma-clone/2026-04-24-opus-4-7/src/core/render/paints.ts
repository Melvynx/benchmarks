import type { Paint, LinearGradientPaint, RadialGradientPaint, SolidPaint, ImagePaint } from '../scene';
import type { Rect } from '../geometry/Rect';
import { ImageCache } from './ImageCache';

/** Returns a fillStyle value that renders the paint over the given bounds (in local space). */
export const paintToFillStyle = (
  ctx: CanvasRenderingContext2D,
  paint: Paint,
  bounds: Rect,
): string | CanvasGradient | CanvasPattern | null => {
  switch (paint.type) {
    case 'solid':
      return solidToStyle(paint);
    case 'linear':
      return linearToStyle(ctx, paint, bounds);
    case 'radial':
      return radialToStyle(ctx, paint, bounds);
    case 'image':
      return imageToStyle(ctx, paint, bounds);
  }
};

const solidToStyle = (paint: SolidPaint): string => {
  if (paint.opacity >= 0.999) return paint.color;
  return hexWithAlpha(paint.color, paint.opacity);
};

const linearToStyle = (
  ctx: CanvasRenderingContext2D,
  paint: LinearGradientPaint,
  bounds: Rect,
): CanvasGradient => {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const len = Math.max(bounds.width, bounds.height) / 2;
  const x0 = cx - Math.cos(paint.angle) * len;
  const y0 = cy - Math.sin(paint.angle) * len;
  const x1 = cx + Math.cos(paint.angle) * len;
  const y1 = cy + Math.sin(paint.angle) * len;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const s of paint.stops) g.addColorStop(clamp01(s.offset), hexWithAlpha(s.color, s.opacity));
  return g;
};

const radialToStyle = (
  ctx: CanvasRenderingContext2D,
  paint: RadialGradientPaint,
  bounds: Rect,
): CanvasGradient => {
  const cx = bounds.x + paint.cx * bounds.width;
  const cy = bounds.y + paint.cy * bounds.height;
  const r = paint.radius * Math.max(bounds.width, bounds.height);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r));
  for (const s of paint.stops) g.addColorStop(clamp01(s.offset), hexWithAlpha(s.color, s.opacity));
  return g;
};

const imageToStyle = (
  ctx: CanvasRenderingContext2D,
  paint: ImagePaint,
  _bounds: Rect,
): CanvasPattern | null => {
  const img = ImageCache.get(paint.src);
  if (!img) return null;
  const p = ctx.createPattern(img, 'no-repeat');
  return p;
};

export const hexWithAlpha = (hex: string, opacity: number): string => {
  // Supports #rgb, #rrggbb, #rrggbbaa (alpha multiplied by opacity).
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 1;
  if (hex.startsWith('#')) {
    const v = hex.slice(1);
    if (v.length === 3) {
      r = parseInt(v[0]! + v[0]!, 16);
      g = parseInt(v[1]! + v[1]!, 16);
      b = parseInt(v[2]! + v[2]!, 16);
    } else if (v.length === 6) {
      r = parseInt(v.slice(0, 2), 16);
      g = parseInt(v.slice(2, 4), 16);
      b = parseInt(v.slice(4, 6), 16);
    } else if (v.length === 8) {
      r = parseInt(v.slice(0, 2), 16);
      g = parseInt(v.slice(2, 4), 16);
      b = parseInt(v.slice(4, 6), 16);
      a = parseInt(v.slice(6, 8), 16) / 255;
    }
  }
  const final = clamp01(a * opacity);
  return `rgba(${r}, ${g}, ${b}, ${final})`;
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
