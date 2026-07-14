import { degToRad } from '../geometry/math';
import type { GradientPaint, Paint, SceneNode } from '../scene/types';
import { rgbaToCss } from '../utils/color';
import { getImage, imageFailed } from './imageCache';

/**
 * Resolve a paint into a canvas fill/stroke style, sized to the node's box.
 * Image paints return null — they need drawImage, handled by drawImageFill.
 */
export function paintStyle(
  ctx: CanvasRenderingContext2D,
  paint: Paint,
  width: number,
  height: number,
): string | CanvasGradient | null {
  if (paint.type === 'solid') return rgbaToCss(paint.color, paint.opacity);
  if (paint.type === 'image') return null;
  return gradientStyle(ctx, paint, width, height);
}

function gradientStyle(
  ctx: CanvasRenderingContext2D,
  paint: GradientPaint,
  width: number,
  height: number,
): CanvasGradient {
  const w = Math.max(width, 1e-6);
  const h = Math.max(height, 1e-6);
  let gradient: CanvasGradient;
  if (paint.type === 'gradient-linear') {
    // Project the box onto the gradient direction so stops span the full shape.
    const rad = degToRad(paint.angle);
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    gradient = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  } else {
    gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
  }
  for (const stop of paint.stops) {
    gradient.addColorStop(Math.min(1, Math.max(0, stop.position)), rgbaToCss(stop.color, paint.opacity));
  }
  return gradient;
}

/** Cover/contain image fill, clipped to the node's path by the caller. */
export function drawImageFill(
  ctx: CanvasRenderingContext2D,
  paint: Paint & { type: 'image' },
  node: SceneNode,
): void {
  const img = getImage(paint.src);
  if (!img) {
    // Loading or failed: quiet placeholder so the layout still reads.
    ctx.fillStyle = imageFailed(paint.src) ? 'rgba(120, 60, 60, 0.4)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 0, node.width, node.height);
    return;
  }
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const scale =
    paint.scaleMode === 'fill'
      ? Math.max(node.width / iw, node.height / ih)
      : Math.min(node.width / iw, node.height / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = prevAlpha * paint.opacity;
  ctx.drawImage(img, (node.width - dw) / 2, (node.height - dh) / 2, dw, dh);
  ctx.globalAlpha = prevAlpha;
}

/** CSS preview string for swatches and the gradient editor. */
export function paintToCss(paint: Paint): string {
  if (paint.type === 'solid') return rgbaToCss(paint.color, paint.opacity);
  if (paint.type === 'image') return 'rgba(160, 160, 160, 1)';
  const stops = paint.stops
    .map((s) => `${rgbaToCss(s.color, paint.opacity)} ${Math.round(s.position * 100)}%`)
    .join(', ');
  return paint.type === 'gradient-linear'
    ? `linear-gradient(${paint.angle + 90}deg, ${stops})`
    : `radial-gradient(circle, ${stops})`;
}
