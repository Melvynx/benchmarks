import type { Viewport } from '../../state/types';

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  v: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  showRulers: boolean,
): void => {
  // Base grid step in world units; choose steps that always produce 10–80px on screen.
  const baseStep = pickStep(v.zoom);
  const minorAlpha = 0.035;
  const majorAlpha = 0.09;

  // Compute visible world bounds
  const x0 = v.x;
  const y0 = v.y;
  const x1 = v.x + canvasWidth / v.zoom;
  const y1 = v.y + canvasHeight / v.zoom;

  ctx.save();
  ctx.lineWidth = 1 / v.zoom;

  const minor = baseStep;
  const major = baseStep * 5;

  // Minor lines
  ctx.strokeStyle = `rgba(255, 255, 255, ${minorAlpha})`;
  ctx.beginPath();
  const startX = Math.floor(x0 / minor) * minor;
  for (let x = startX; x < x1; x += minor) {
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
  }
  const startY = Math.floor(y0 / minor) * minor;
  for (let y = startY; y < y1; y += minor) {
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
  }
  ctx.stroke();

  // Major lines
  ctx.strokeStyle = `rgba(255, 255, 255, ${majorAlpha})`;
  ctx.beginPath();
  const startMajorX = Math.floor(x0 / major) * major;
  for (let x = startMajorX; x < x1; x += major) {
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
  }
  const startMajorY = Math.floor(y0 / major) * major;
  for (let y = startMajorY; y < y1; y += major) {
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
  }
  ctx.stroke();

  // Origin axes
  if (showRulers) {
    ctx.strokeStyle = 'rgba(255, 59, 129, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(0, y1);
    ctx.moveTo(x0, 0);
    ctx.lineTo(x1, 0);
    ctx.stroke();
  }
  ctx.restore();
};

const pickStep = (zoom: number): number => {
  const target = 24; // target pixels per minor step
  const ideal = target / zoom;
  // Round to nearest "nice" number: 1, 2, 5, 10, 20, 50, 100, ...
  const pow = Math.pow(10, Math.floor(Math.log10(ideal)));
  const norm = ideal / pow;
  let nice: number;
  if (norm < 1.5) nice = 1;
  else if (norm < 3.5) nice = 2;
  else if (norm < 7.5) nice = 5;
  else nice = 10;
  return nice * pow;
};
