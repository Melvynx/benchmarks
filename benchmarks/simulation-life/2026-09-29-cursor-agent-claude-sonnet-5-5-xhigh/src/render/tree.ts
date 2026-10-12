import { slotAnchor, TREE_CANOPY_Z, type Slot, type Tree } from '../sim/engine';
import type { Camera, Pt } from './camera';
import { TAU, hash, hsl, lerp } from './util';

const LOBES = [
  { x: 0.95, y: 0.0, z: -0.15, r: 0.98 },
  { x: 0.47, y: 0.82, z: 0.05, r: 1.02 },
  { x: -0.47, y: 0.82, z: -0.1, r: 0.96 },
  { x: -0.95, y: 0.0, z: 0.05, r: 1.02 },
  { x: -0.47, y: -0.82, z: -0.05, r: 0.97 },
  { x: 0.47, y: -0.82, z: 0.1, r: 1.02 },
  { x: 0.0, y: 0.0, z: 0.78, r: 1.12 },
  { x: 0.0, y: 0.0, z: -0.05, r: 1.15 },
];

const p0: Pt = { x: 0, y: 0, d: 0 };
const p1: Pt = { x: 0, y: 0, d: 0 };

interface LobeDraw {
  sx: number;
  sy: number;
  r: number;
  d: number;
  i: number;
}

const lobeBuf: LobeDraw[] = LOBES.map(() => ({ sx: 0, sy: 0, r: 0, d: 0, i: 0 }));

export function fruitSize(slot: Slot) {
  switch (slot.state) {
    case 'ripe':
      return 1;
    case 'growing':
      return 0.22 + 0.78 * slot.progress;
    case 'eating':
      return Math.max(0.08, 1 - slot.eat * 0.95);
    default:
      return 0;
  }
}

function drawFruit(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number, slot: Slot, clock: number) {
  const size = fruitSize(slot);
  if (slot.state === 'resting') {
    ctx.fillStyle = '#6a8f3f';
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.16, 0, TAU);
    ctx.fill();
    return;
  }
  const rr = r * size;
  if (rr < 0.6) return;
  const ripe = slot.state === 'ripe' || slot.state === 'eating';
  const t = slot.state === 'growing' ? slot.progress : 1;
  const hue = lerp(72, 98, t);
  const g = ctx.createRadialGradient(sx - rr * 0.35, sy - rr * 0.4, rr * 0.1, sx, sy, rr * 1.1);
  g.addColorStop(0, hsl(hue - 6, 85, lerp(78, 74, t)));
  g.addColorStop(0.5, hsl(hue, lerp(60, 66, t), lerp(60, 48, t)));
  g.addColorStop(1, hsl(hue + 14, 55, lerp(46, 30, t)));

  if (ripe && slot.state === 'ripe') {
    const pulse = 0.5 + 0.5 * Math.sin(clock * 2.4 + sx * 0.05);
    ctx.fillStyle = `rgba(210,255,120,${0.16 + pulse * 0.12})`;
    ctx.beginPath();
    ctx.arc(sx, sy, rr * 1.55, 0, TAU);
    ctx.fill();
  }

  ctx.strokeStyle = '#5a7d2f';
  ctx.lineWidth = Math.max(1, rr * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx, sy - rr * 0.85);
  ctx.lineTo(sx + rr * 0.1, sy - rr * 1.3);
  ctx.stroke();

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, rr, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(38,92,30,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,240,0.75)';
  ctx.beginPath();
  ctx.ellipse(sx - rr * 0.36, sy - rr * 0.4, rr * 0.22, rr * 0.13, -0.6, 0, TAU);
  ctx.fill();

  if (rr > 3) {
    ctx.fillStyle = '#4fae35';
    ctx.beginPath();
    ctx.ellipse(sx + rr * 0.42, sy - rr * 1.15, rr * 0.36, rr * 0.16, -0.5, 0, TAU);
    ctx.fill();
  }
}

export function drawTree(ctx: CanvasRenderingContext2D, cam: Camera, tree: Tree, clock: number) {
  const S = cam.scale;
  const ts = tree.scale;
  const rot = tree.seed * TAU;
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const sway = Math.sin(clock * 1.2 + tree.seed * 12) * 0.05 + Math.sin(clock * 46) * 0.13 * tree.shake * tree.shake;
  const cz = TREE_CANOPY_Z * ts;

  // trunk
  cam.project(tree.x, tree.y, 0, p0);
  cam.project(tree.x + sway * 0.4, tree.y, cz * 0.72, p1);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6e452b';
  ctx.lineWidth = 0.82 * S * ts;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();
  ctx.strokeStyle = '#a06d46';
  ctx.lineWidth = 0.3 * S * ts;
  ctx.beginPath();
  ctx.moveTo(p0.x - 0.18 * S * ts, p0.y - 1);
  ctx.lineTo(p1.x - 0.14 * S * ts, p1.y);
  ctx.stroke();

  // lobes: project and depth sort
  for (let i = 0; i < LOBES.length; i++) {
    const l = LOBES[i];
    const lx = (l.x * cr - l.y * sr) * ts;
    const ly = (l.x * sr + l.y * cr) * ts;
    const lz = l.z * ts;
    const lean = lz * sway * 0.6 + sway;
    cam.project(tree.x + lx + lean, tree.y + ly, cz + lz, p0);
    const d = lobeBuf[i];
    d.sx = p0.x;
    d.sy = p0.y;
    d.r = l.r * ts * S;
    d.d = p0.d;
    d.i = i;
  }
  const order = [...lobeBuf].sort((a, b) => b.d - a.d);

  // back-facing fruit peeks out behind the leaves
  drawFruits(ctx, cam, tree, clock, cz, ts, true);

  for (const l of order) {
    const hue = 104 + (hash(tree.id * 13 + l.i) - 0.5) * 16;
    const g = ctx.createRadialGradient(l.sx - l.r * 0.35, l.sy - l.r * 0.45, l.r * 0.1, l.sx, l.sy, l.r * 1.05);
    g.addColorStop(0, hsl(hue - 12, 62, 66));
    g.addColorStop(0.55, hsl(hue, 52, 47));
    g.addColorStop(1, hsl(hue + 18, 46, 30));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.sx, l.sy, l.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(28,80,34,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawFruits(ctx, cam, tree, clock, cz, ts, false);
}

function drawFruits(ctx: CanvasRenderingContext2D, cam: Camera, tree: Tree, clock: number, cz: number, ts: number, back: boolean) {
  const S = cam.scale;
  const rc = 1.86 * ts;
  const sway = Math.sin(clock * 1.2 + tree.seed * 12) * 0.05;
  for (let i = 0; i < tree.slots.length; i++) {
    const { az, elev, ch } = slotAnchor(tree, i);
    const nx = Math.cos(az) * ch;
    const ny = Math.sin(az) * ch;
    const facing = nx * cam.viewX + ny * cam.viewY + elev * cam.viewZ;
    const isBack = facing < -0.05;
    if (isBack !== back) continue;
    const slot = tree.slots[i];
    if (slot.state === 'resting' && back) continue;
    const x = tree.x + nx * rc + sway;
    const y = tree.y + ny * rc;
    const z = cz + elev * rc * 0.9;
    cam.project(x, y, z, p0);
    drawFruit(ctx, p0.x, p0.y, 0.36 * ts * S, slot, clock);
  }
}
