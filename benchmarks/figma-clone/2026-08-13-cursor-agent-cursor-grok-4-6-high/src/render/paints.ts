import { colorToCss } from "../core/color";
import type { Paint, Stroke } from "../core/types";

export function applyPaint(
  ctx: CanvasRenderingContext2D,
  paint: Paint,
  w: number,
  h: number,
): CanvasGradient | string {
  if (paint.type === "solid") {
    return colorToCss({ ...paint.color, a: paint.color.a * paint.opacity });
  }
  if (paint.type === "linear") {
    const g = ctx.createLinearGradient(paint.start.x * w, paint.start.y * h, paint.end.x * w, paint.end.y * h);
    for (const s of paint.stops) g.addColorStop(s.offset, colorToCss({ ...s.color, a: s.color.a * paint.opacity }));
    return g;
  }
  const g = ctx.createRadialGradient(
    paint.center.x * w,
    paint.center.y * h,
    0,
    paint.center.x * w,
    paint.center.y * h,
    paint.radius * Math.max(w, h),
  );
  for (const s of paint.stops) g.addColorStop(s.offset, colorToCss({ ...s.color, a: s.color.a * paint.opacity }));
  return g;
}

export function strokeOffset(stroke: Stroke, w: number, h: number): { x: number; y: number; w: number; h: number } {
  if (stroke.align === "center") return { x: 0, y: 0, w, h };
  const t = stroke.thickness / 2;
  if (stroke.align === "inside") return { x: t, y: t, w: w - stroke.thickness, h: h - stroke.thickness };
  return { x: -t, y: -t, w: w + stroke.thickness, h: h + stroke.thickness };
}
