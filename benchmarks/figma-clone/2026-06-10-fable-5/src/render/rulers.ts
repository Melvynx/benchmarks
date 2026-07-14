import { niceStep } from '../geometry/math';
import type { Rect } from '../geometry/rect';
import type { Viewport } from '../store/store';

export const RULER_SIZE = 20;

function formatTick(value: number): string {
  if (Math.abs(value) >= 10000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
}

/** Top + left rulers with adaptive ticks and a highlight for the selection extent. */
export function drawRulers(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  width: number,
  height: number,
  selectionBounds: Rect | null,
): void {
  const { zoom, panX, panY } = viewport;
  const step = niceStep(zoom, 64);
  const screenStep = step * zoom;

  ctx.save();
  ctx.fillStyle = 'rgba(30, 30, 30, 0.92)';
  ctx.fillRect(0, 0, width, RULER_SIZE);
  ctx.fillRect(0, 0, RULER_SIZE, height);

  // Selection extent highlight.
  if (selectionBounds) {
    ctx.fillStyle = 'rgba(13, 153, 255, 0.25)';
    const sx = selectionBounds.x * zoom + panX;
    const sw = selectionBounds.width * zoom;
    ctx.fillRect(sx, 0, sw, RULER_SIZE);
    const sy = selectionBounds.y * zoom + panY;
    const sh = selectionBounds.height * zoom;
    ctx.fillRect(0, sy, RULER_SIZE, sh);
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '9px Inter, sans-serif';
  ctx.lineWidth = 1;

  // Horizontal ruler.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.beginPath();
  const firstWorldX = Math.floor(-panX / zoom / step) * step;
  for (let wx = firstWorldX; ; wx += step) {
    const x = wx * zoom + panX;
    if (x > width) break;
    if (x < RULER_SIZE) continue;
    const px = Math.round(x) + 0.5;
    ctx.moveTo(px, RULER_SIZE - 6);
    ctx.lineTo(px, RULER_SIZE);
    ctx.fillText(formatTick(wx), x + 3, RULER_SIZE - 6);
    // Minor ticks.
    if (screenStep >= 50) {
      for (let i = 1; i < 5; i++) {
        const mx = Math.round(x + (screenStep * i) / 5) + 0.5;
        if (mx > RULER_SIZE && mx < width) {
          ctx.moveTo(mx, RULER_SIZE - 3);
          ctx.lineTo(mx, RULER_SIZE);
        }
      }
    }
  }
  ctx.stroke();

  // Vertical ruler (labels rotated).
  ctx.beginPath();
  const firstWorldY = Math.floor(-panY / zoom / step) * step;
  for (let wy = firstWorldY; ; wy += step) {
    const y = wy * zoom + panY;
    if (y > height) break;
    if (y < RULER_SIZE) continue;
    const py = Math.round(y) + 0.5;
    ctx.moveTo(RULER_SIZE - 6, py);
    ctx.lineTo(RULER_SIZE, py);
    ctx.save();
    ctx.translate(RULER_SIZE - 6, y + 3);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'right';
    ctx.fillText(formatTick(wy), 0, 0);
    ctx.restore();
    if (screenStep >= 50) {
      for (let i = 1; i < 5; i++) {
        const my = Math.round(y + (screenStep * i) / 5) + 0.5;
        if (my > RULER_SIZE && my < height) {
          ctx.moveTo(RULER_SIZE - 3, my);
          ctx.lineTo(RULER_SIZE, my);
        }
      }
    }
  }
  ctx.stroke();

  // Corner square + edges.
  ctx.fillStyle = 'rgba(30, 30, 30, 1)';
  ctx.fillRect(0, 0, RULER_SIZE, RULER_SIZE);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(0, RULER_SIZE + 0.5);
  ctx.lineTo(width, RULER_SIZE + 0.5);
  ctx.moveTo(RULER_SIZE + 0.5, 0);
  ctx.lineTo(RULER_SIZE + 0.5, height);
  ctx.stroke();
  ctx.restore();
}
