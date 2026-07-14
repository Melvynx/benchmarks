import { niceStep } from '../geometry/math';
import type { Viewport } from '../store/store';

/**
 * Adaptive canvas grid: a "nice" step (1/2/5×10ⁿ) kept between 72 and 360
 * screen px, with a finer sub-grid, plus a 1-px pixel grid above 800% zoom.
 * Drawn in screen space (ctx already scaled by dpr only).
 */
export function drawGrid(ctx: CanvasRenderingContext2D, viewport: Viewport, width: number, height: number): void {
  const { zoom, panX, panY } = viewport;
  const step = niceStep(zoom, 72);
  const screenStep = step * zoom;

  drawGridLevel(ctx, width, height, panX, panY, screenStep / 4, 'rgba(255, 255, 255, 0.025)');
  drawGridLevel(ctx, width, height, panX, panY, screenStep, 'rgba(255, 255, 255, 0.05)');

  if (zoom >= 8) {
    const alpha = Math.min(0.08, (zoom - 8) * 0.01 + 0.03);
    drawGridLevel(ctx, width, height, panX, panY, zoom, `rgba(255, 255, 255, ${alpha})`);
  }
}

function drawGridLevel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  panX: number,
  panY: number,
  screenStep: number,
  color: string,
): void {
  if (screenStep < 14) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const startX = ((panX % screenStep) + screenStep) % screenStep;
  for (let x = startX; x <= width; x += screenStep) {
    const px = Math.round(x) + 0.5;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
  }
  const startY = ((panY % screenStep) + screenStep) % screenStep;
  for (let y = startY; y <= height; y += screenStep) {
    const py = Math.round(y) + 0.5;
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
  }
  ctx.stroke();
}
