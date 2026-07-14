import { nodePath } from '../geometry/shapePath';
import type { Rect } from '../geometry/rect';
import type { SceneNode, ShadowEffect } from '../scene/types';
import { rgbaToCss } from '../utils/color';

/**
 * Shadow offsets/blur on a 2D context are specified in DEVICE space —
 * unaffected by the current transform. All shadow math here multiplies by
 * `deviceScale` (dpr × zoom) and uses the classic "draw far away, offset the
 * shadow back" trick so only the shadow lands on the canvas.
 */

/** Translate the context by a device-space delta, whatever the current transform. */
function translateDevice(ctx: CanvasRenderingContext2D, dxDevice: number, dyDevice: number): void {
  const t = ctx.getTransform();
  const det = t.a * t.d - t.b * t.c;
  if (det === 0) return;
  ctx.translate((t.d * dxDevice - t.c * dyDevice) / det, (t.a * dyDevice - t.b * dxDevice) / det);
}

export function drawDropShadow(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  effect: ShadowEffect,
  deviceScale: number,
): void {
  const shift = ctx.canvas.width + 512;
  ctx.save();
  ctx.shadowColor = rgbaToCss(effect.color);
  ctx.shadowBlur = effect.blur * deviceScale;
  ctx.shadowOffsetX = effect.offsetX * deviceScale + shift;
  ctx.shadowOffsetY = effect.offsetY * deviceScale;
  translateDevice(ctx, -shift, 0);
  ctx.fillStyle = '#000';
  if (node.type === 'line') {
    ctx.lineWidth = Math.max(node.strokeWeight, 0.5);
    ctx.strokeStyle = '#000';
    ctx.stroke(nodePath(node));
  } else {
    ctx.fill(nodePath(node, effect.spread));
  }
  ctx.restore();
}

export function drawInnerShadow(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  effect: ShadowEffect,
  deviceScale: number,
): void {
  if (node.type === 'line') return;
  const shift = ctx.canvas.width + 512;
  const margin = effect.blur * 3 + Math.abs(effect.offsetX) + Math.abs(effect.offsetY) + Math.abs(effect.spread) + 24;

  ctx.save();
  ctx.clip(nodePath(node));
  ctx.shadowColor = rgbaToCss(effect.color);
  ctx.shadowBlur = effect.blur * deviceScale;
  ctx.shadowOffsetX = effect.offsetX * deviceScale + shift;
  ctx.shadowOffsetY = effect.offsetY * deviceScale;
  translateDevice(ctx, -shift, 0);
  // Inverse silhouette (ring) — its shadow falls inside the clipped shape.
  const inverse = new Path2D();
  inverse.rect(-margin, -margin, node.width + margin * 2, node.height + margin * 2);
  inverse.addPath(nodePath(node, -effect.spread));
  ctx.fillStyle = '#000';
  ctx.fill(inverse, 'evenodd');
  ctx.restore();
}

export function supportsCanvasFilter(ctx: CanvasRenderingContext2D): boolean {
  return typeof ctx.filter === 'string';
}

// ---------------------------------------------------------------------------
// Scratch canvas pool (layer compositing, blur passes)
// ---------------------------------------------------------------------------

interface Scratch {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  inUse: boolean;
}

const pool: Scratch[] = [];

export function acquireScratch(width: number, height: number): Scratch | null {
  const w = Math.max(1, Math.ceil(width));
  const h = Math.max(1, Math.ceil(height));
  if (w > 8192 || h > 8192) return null; // refuse absurd allocations
  let scratch = pool.find((s) => !s.inUse);
  if (!scratch) {
    if (pool.length >= 6) return null; // deep nesting fallback: skip the layer
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    scratch = { canvas, ctx, inUse: false };
    pool.push(scratch);
  }
  if (scratch.canvas.width < w || scratch.canvas.height < h) {
    scratch.canvas.width = Math.max(w, scratch.canvas.width);
    scratch.canvas.height = Math.max(h, scratch.canvas.height);
  }
  scratch.inUse = true;
  scratch.ctx.setTransform(1, 0, 0, 1, 0, 0);
  scratch.ctx.clearRect(0, 0, w, h);
  return scratch;
}

export function releaseScratch(scratch: Scratch): void {
  scratch.inUse = false;
}

/**
 * Backdrop blur: snapshot what is already painted behind the node, blur it,
 * and paint it back clipped to the node's shape. Runs before fills so a
 * translucent fill tints the blurred backdrop, like Figma.
 */
export function drawBackgroundBlur(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  radius: number,
  deviceScale: number,
  worldBounds: Rect,
  worldToDevice: (x: number, y: number) => { x: number; y: number },
): void {
  if (!supportsCanvasFilter(ctx)) return;
  const blurDevice = radius * deviceScale;
  const pad = blurDevice * 2;
  const p0 = worldToDevice(worldBounds.x, worldBounds.y);
  const p1 = worldToDevice(worldBounds.x + worldBounds.width, worldBounds.y + worldBounds.height);
  const dx = Math.max(0, Math.floor(Math.min(p0.x, p1.x) - pad));
  const dy = Math.max(0, Math.floor(Math.min(p0.y, p1.y) - pad));
  const dw = Math.min(ctx.canvas.width - dx, Math.ceil(Math.abs(p1.x - p0.x) + pad * 2));
  const dh = Math.min(ctx.canvas.height - dy, Math.ceil(Math.abs(p1.y - p0.y) + pad * 2));
  if (dw <= 0 || dh <= 0) return;

  const scratch = acquireScratch(dw, dh);
  if (!scratch) return;
  scratch.ctx.filter = `blur(${blurDevice}px)`;
  scratch.ctx.drawImage(ctx.canvas, dx, dy, dw, dh, 0, 0, dw, dh);
  scratch.ctx.filter = 'none';

  ctx.save();
  ctx.clip(nodePath(node));
  const t = ctx.getTransform();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(scratch.canvas, 0, 0, dw, dh, dx, dy, dw, dh);
  ctx.setTransform(t);
  ctx.restore();
  releaseScratch(scratch);
}
