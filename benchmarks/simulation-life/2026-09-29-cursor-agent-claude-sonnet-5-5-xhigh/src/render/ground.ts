import { Rng } from '../sim/rng';
import type { World } from '../sim/engine';
import { TAU } from './util';

const SIZE = 1400;

/** Paints the meadow once per world. The renderer drapes it over the dish with an affine transform. */
export function makeGround(world: World): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const R = world.radius;
  const rng = new Rng(world.params.seed * 977 + 13);
  const k = SIZE / (2 * R);

  ctx.translate(SIZE / 2, SIZE / 2);
  ctx.scale(k, k);

  const base = ctx.createRadialGradient(-R * 0.15, -R * 0.2, R * 0.05, 0, 0, R * 1.05);
  base.addColorStop(0, '#d5f08f');
  base.addColorStop(0.55, '#b3e072');
  base.addColorStop(1, '#8fca5c');
  ctx.fillStyle = base;
  ctx.fillRect(-R, -R, R * 2, R * 2);

  // gentle mown stripes
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.clip();
  for (let r = 0; r < R; r += 3.2) {
    if (Math.round(r / 3.2) % 2 === 0) continue;
    ctx.strokeStyle = 'rgba(255,255,220,0.13)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 1.6, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  // soft blotches
  for (let i = 0; i < 90; i++) {
    const a = rng.range(0, TAU);
    const r = Math.sqrt(rng.next()) * R;
    const s = rng.range(1.5, 4.5);
    const light = rng.chance(0.5);
    const g = ctx.createRadialGradient(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(a) * r, Math.sin(a) * r, s);
    g.addColorStop(0, light ? 'rgba(235,255,170,0.32)' : 'rgba(70,150,60,0.20)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(Math.cos(a) * r - s, Math.sin(a) * r - s, s * 2, s * 2);
  }

  // worn soil around each tree
  for (const t of world.trees) {
    const g = ctx.createRadialGradient(t.x, t.y, 0.3, t.x, t.y, 4.4);
    g.addColorStop(0, 'rgba(150,108,66,0.55)');
    g.addColorStop(0.55, 'rgba(160,120,70,0.28)');
    g.addColorStop(1, 'rgba(160,120,70,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 4.4, 0, TAU);
    ctx.fill();
  }

  // grass tufts
  ctx.lineCap = 'round';
  for (let i = 0; i < Math.floor(R * R * 1.6); i++) {
    const a = rng.range(0, TAU);
    const r = Math.sqrt(rng.next()) * (R - 0.6);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    const dark = rng.chance(0.55);
    ctx.strokeStyle = dark ? 'rgba(62,140,58,0.55)' : 'rgba(224,255,160,0.7)';
    ctx.lineWidth = 0.09;
    for (let j = -1; j <= 1; j++) {
      ctx.beginPath();
      ctx.moveTo(x + j * 0.12, y);
      ctx.lineTo(x + j * 0.2, y - rng.range(0.22, 0.42));
      ctx.stroke();
    }
  }

  // flowers
  const petals = ['#ffffff', '#fff2a8', '#ffc6dc', '#e2d4ff', '#ffd9a8'];
  for (let i = 0; i < Math.floor(R * 3.2); i++) {
    const a = rng.range(0, TAU);
    const r = Math.sqrt(rng.next()) * (R - 1);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (world.trees.some((t) => Math.hypot(t.x - x, t.y - y) < 2)) continue;
    const c = petals[rng.int(petals.length)];
    ctx.fillStyle = c;
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * TAU;
      ctx.beginPath();
      ctx.arc(x + Math.cos(pa) * 0.16, y + Math.sin(pa) * 0.16, 0.13, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#f5b83b';
    ctx.beginPath();
    ctx.arc(x, y, 0.1, 0, TAU);
    ctx.fill();
  }

  // pebbles
  for (let i = 0; i < Math.floor(R * 0.9); i++) {
    const a = rng.range(0, TAU);
    const r = Math.sqrt(rng.next()) * (R - 1.2);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (world.trees.some((t) => Math.hypot(t.x - x, t.y - y) < 2.2)) continue;
    const s = rng.range(0.15, 0.3);
    ctx.fillStyle = 'rgba(96,84,70,0.22)';
    ctx.beginPath();
    ctx.ellipse(x + 0.05, y + 0.06, s * 1.1, s * 0.8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e4dfd2';
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.75, 0.3, 0, TAU);
    ctx.fill();
  }

  // darker edge where the meadow meets the rim
  const edge = ctx.createRadialGradient(0, 0, R * 0.86, 0, 0, R);
  edge.addColorStop(0, 'rgba(40,90,40,0)');
  edge.addColorStop(1, 'rgba(40,90,40,0.34)');
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();

  return canvas;
}
