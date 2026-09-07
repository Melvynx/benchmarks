/**
 * Canvas painter for the garden dish. Everything here is pure presentation:
 * the simulation owns all state, this file only reads it and draws.
 */
import type { Blob, SimEvent, Tree } from "../sim/types";
import type { World } from "../sim/world";

/** Vertical squash of the ground plane — the whole "3D dish" illusion. */
const TILT = 0.54;
/** How many screen units one world unit of height is worth. */
const ZK = 0.86;

export interface Camera {
  yaw: number;
  scale: number;
  cx: number;
  cy: number;
}

export interface Projected {
  sx: number;
  sy: number;
  depth: number;
}

export function makeCamera(w: number, h: number, radius: number, yaw: number): Camera {
  const R = radius + 2.5;
  // Vertical room needed: the tilted dish, the rim below it, and the tallest
  // tree poking above the far edge.
  const scale = Math.max(
    2,
    Math.min((w - 16) / (2 * R), (h - 12) / (2 * R * TILT + 4.2)),
  );
  return { yaw, scale, cx: w / 2, cy: h / 2 - 4 };
}

export function project(cam: Camera, x: number, y: number, z: number): Projected {
  const c = Math.cos(cam.yaw);
  const s = Math.sin(cam.yaw);
  const rx = x * c - y * s;
  const ry = x * s + y * c;
  return {
    sx: cam.cx + rx * cam.scale,
    sy: cam.cy + ry * cam.scale * TILT - z * cam.scale * ZK,
    depth: ry,
  };
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  kind: "sparkle" | "spark" | "puff" | "pop";
  tone: string;
}

/** Deterministic hash so scenery keeps its place between frames and reloads. */
function hash(i: number, salt: number) {
  let x = Math.imul(i ^ salt, 0x9e3779b1) ^ 0x85ebca6b;
  x = Math.imul(x ^ (x >>> 15), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

interface Tuft {
  x: number;
  y: number;
  r: number;
  tone: number;
}

let tuftKey = "";
let tufts: Tuft[] = [];

function groundTufts(radius: number): Tuft[] {
  const key = radius.toFixed(1);
  if (key === tuftKey) return tufts;
  tuftKey = key;
  tufts = [];
  const n = Math.round(radius * radius * 0.55);
  for (let i = 0; i < n; i++) {
    const a = hash(i, 11) * Math.PI * 2;
    const r = Math.sqrt(hash(i, 23)) * (radius - 0.4);
    tufts.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      r: 0.18 + hash(i, 31) * 0.3,
      tone: hash(i, 47),
    });
  }
  return tufts;
}

const BLUE = {
  body: "#6fb7ff",
  deep: "#2f7fd6",
  rim: "#bfe2ff",
  shine: "#f2fbff",
};
const RED = {
  body: "#ff8272",
  deep: "#d1442f",
  rim: "#ffc9bd",
  shine: "#fff1ec",
};

function blobRadius(cam: Camera) {
  return Math.max(7, Math.min(cam.scale * 0.92, 21));
}

/** Screen position of a blob's centre — also used for click picking. */
export function blobScreen(cam: Camera, b: Blob) {
  const hop = Math.max(0, Math.sin(b.bounce)) * 0.22;
  return project(cam, b.x, b.y, 0.34 + hop);
}

function ellipsePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
}

function shadow(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  x: number,
  y: number,
  size: number,
  lift: number,
  alpha: number,
) {
  const p = project(cam, x, y, 0);
  const spread = 1 + lift * 0.5;
  ctx.fillStyle = `rgba(31,58,44,${alpha / spread})`;
  ellipsePath(ctx, p.sx, p.sy, size * spread, size * spread * TILT);
  ctx.fill();
}

function drawDish(ctx: CanvasRenderingContext2D, cam: Camera, radius: number) {
  const R = (radius + 1.6) * cam.scale;
  const RY = R * TILT;
  const wall = Math.max(12, cam.scale * 1.5);
  const { cx, cy } = cam;

  ctx.save();
  ctx.filter = "blur(10px)";
  ctx.fillStyle = "rgba(10,32,24,0.34)";
  ellipsePath(ctx, cx, cy + wall + 8, R * 1.02, RY * 1.02);
  ctx.fill();
  ctx.restore();

  // Front-facing band of the raised dish.
  const band = ctx.createLinearGradient(0, cy, 0, cy + wall + RY);
  band.addColorStop(0, "#b87a52");
  band.addColorStop(0.45, "#9a6242");
  band.addColorStop(1, "#6f4530");
  ctx.beginPath();
  ctx.moveTo(cx - R, cy);
  ctx.ellipse(cx, cy, R, RY, 0, Math.PI, 0, true);
  ctx.lineTo(cx + R, cy + wall);
  ctx.ellipse(cx, cy + wall, R, RY, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = band;
  ctx.fill();

  // Grass surface.
  const soil = ctx.createRadialGradient(
    cx - R * 0.24,
    cy - RY * 0.55,
    R * 0.1,
    cx,
    cy,
    R * 1.08,
  );
  soil.addColorStop(0, "#a8dc84");
  soil.addColorStop(0.55, "#7ec765");
  soil.addColorStop(1, "#4e9a52");
  ellipsePath(ctx, cx, cy, R, RY);
  ctx.fillStyle = soil;
  ctx.fill();

  ctx.save();
  ctx.clip();
  for (const t of groundTufts(radius)) {
    const p = project(cam, t.x, t.y, 0);
    const g = 0.1 + t.tone * 0.22;
    ctx.fillStyle =
      t.tone > 0.55
        ? `rgba(255,255,255,${g * 0.4})`
        : `rgba(38,102,58,${g})`;
    ellipsePath(ctx, p.sx, p.sy, t.r * cam.scale, t.r * cam.scale * TILT);
    ctx.fill();
  }
  ctx.restore();

  ctx.lineWidth = Math.max(1.5, cam.scale * 0.14);
  ctx.strokeStyle = "rgba(255,255,255,0.34)";
  ellipsePath(ctx, cx, cy, R, RY);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, cam.scale * 0.08);
  ctx.strokeStyle = "rgba(88,52,32,0.35)";
  ellipsePath(ctx, cx, cy + wall * 0.06, R, RY);
  ctx.stroke();
}

const FRUIT_TURN = 2.399963;

function fruitSpots(t: Tree, count: number) {
  const out: { dx: number; dy: number; dz: number }[] = [];
  const spread = 1.15 * t.scale;
  for (let i = 0; i < count; i++) {
    const a = t.seedAngle + i * FRUIT_TURN;
    const ring = 0.58 + ((i * 7) % 5) * 0.085;
    out.push({
      dx: Math.cos(a) * spread * ring,
      dy: Math.sin(a) * spread * ring * 0.9,
      dz: (2.05 + Math.sin(a * 1.7 + i) * 0.36) * t.scale,
    });
  }
  return out;
}

function drawFruit(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  r: number,
  ripe: number,
) {
  const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.1, sx, sy, r);
  g.addColorStop(0, ripe > 0.9 ? "#dcff9a" : "#c9ef8a");
  g.addColorStop(0.6, "#8ecb4c");
  g.addColorStop(1, "#4f8f2c");
  ellipsePath(ctx, sx, sy, r, r * 1.06);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ellipsePath(ctx, sx - r * 0.32, sy - r * 0.38, r * 0.3, r * 0.22);
  ctx.fill();
}

function drawTree(ctx: CanvasRenderingContext2D, cam: Camera, t: Tree, limit: number) {
  const base = project(cam, t.x, t.y, 0);
  const sway = Math.sin(t.seedAngle + t.pop * 3) * 0.05 * t.pop;
  const canopyZ = 2.05 * t.scale;
  const top = project(cam, t.x, t.y, canopyZ);
  const s = cam.scale;

  shadow(ctx, cam, t.x, t.y, 1.5 * t.scale * s, 0.3, 0.3);

  // Trunk.
  const w = Math.max(2.5, s * 0.26 * t.scale);
  ctx.beginPath();
  ctx.moveTo(base.sx - w, base.sy);
  ctx.quadraticCurveTo(
    base.sx - w * 0.7 + sway * s,
    (base.sy + top.sy) / 2,
    top.sx - w * 0.55 + sway * s,
    top.sy,
  );
  ctx.lineTo(top.sx + w * 0.55 + sway * s, top.sy);
  ctx.quadraticCurveTo(
    base.sx + w * 0.7 + sway * s,
    (base.sy + top.sy) / 2,
    base.sx + w,
    base.sy,
  );
  ctx.closePath();
  const bark = ctx.createLinearGradient(base.sx - w, 0, base.sx + w, 0);
  bark.addColorStop(0, "#6d4629");
  bark.addColorStop(0.42, "#a16c40");
  bark.addColorStop(1, "#67412696");
  ctx.fillStyle = bark;
  ctx.fill();

  // Canopy: a few overlapping puffs, lighter towards the light.
  const cr = 1.85 * t.scale * s;
  const puffs =
    t.kind === 0
      ? [
          [0, 0, 1],
          [-0.62, 0.18, 0.72],
          [0.6, 0.12, 0.75],
          [0.05, -0.42, 0.66],
        ]
      : t.kind === 1
        ? [
            [0, 0, 1.05],
            [-0.5, -0.2, 0.68],
            [0.52, 0.02, 0.7],
          ]
        : [
            [0, 0.06, 0.95],
            [-0.44, -0.3, 0.62],
            [0.46, -0.26, 0.64],
            [0, 0.4, 0.6],
          ];
  for (const [ox, oy, k] of puffs) {
    const x = top.sx + ox * cr + sway * s;
    const y = top.sy + oy * cr * 0.8;
    const r = cr * k;
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.15, x, y, r);
    g.addColorStop(0, "#9ade7a");
    g.addColorStop(0.6, "#5fb257");
    g.addColorStop(1, "#2f7a41");
    ellipsePath(ctx, x, y, r, r * 0.86);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Fruit still on the branch, plus the one currently regrowing as a bud.
  const spots = fruitSpots(t, t.fruit + 1);
  const fr = Math.max(2.8, s * 0.3);
  for (let i = 0; i < t.fruit; i++) {
    const sp = spots[i];
    const p = project(cam, t.x + sp.dx, t.y + sp.dy, sp.dz + 0.1);
    drawFruit(ctx, p.sx + sway * s, p.sy, fr, 1);
  }
  if (t.fruit < limit) {
    const sp = spots[t.fruit];
    const p = project(cam, t.x + sp.dx, t.y + sp.dy, sp.dz + 0.1);
    const bud = fr * (0.28 + t.grow * 0.62);
    ctx.globalAlpha = 0.45 + t.grow * 0.5;
    drawFruit(ctx, p.sx + sway * s, p.sy, bud, t.grow);
    ctx.globalAlpha = 1;
  }
  // The fruit that was just picked shrinks out of the canopy.
  if (t.pop > 0) {
    const sp = spots[Math.min(spots.length - 1, t.fruit)];
    const p = project(cam, t.x + sp.dx, t.y + sp.dy, sp.dz + 0.1);
    ctx.globalAlpha = t.pop * 0.8;
    drawFruit(ctx, p.sx, p.sy - (1 - t.pop) * 6, fr * t.pop, 1);
    ctx.globalAlpha = 1;
  }
}

function drawBlob(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  b: Blob,
  selected: boolean,
) {
  const skin = b.species === "blue" ? BLUE : RED;
  const r = blobRadius(cam);
  const hop = Math.max(0, Math.sin(b.bounce)) * 0.22;
  const p = project(cam, b.x, b.y, 0.34 + hop);
  const speed = Math.hypot(b.vx, b.vy);

  shadow(ctx, cam, b.x, b.y, r * 0.82, hop, 0.32);

  if (selected) {
    const g = project(cam, b.x, b.y, 0);
    ctx.strokeStyle = "#ffd766";
    ctx.lineWidth = 2.4;
    ellipsePath(ctx, g.sx, g.sy, r * 1.5, r * 1.5 * TILT);
    ctx.stroke();
  }

  if (b.glow > 0) {
    ctx.save();
    ctx.globalAlpha = b.glow * 0.5;
    ctx.filter = "blur(6px)";
    ctx.fillStyle = b.species === "blue" ? "#bff0a0" : "#ffb1a0";
    ellipsePath(ctx, p.sx, p.sy, r * 1.9, r * 1.7);
    ctx.fill();
    ctx.restore();
  }

  // A squash keeps its volume, so the body widens as it flattens.
  const squash = b.squash + Math.max(0, -Math.sin(b.bounce)) * 0.08;
  const rx = r * (1.06 + squash * 0.5);
  const ry = r * (1.16 - squash * 0.62);
  // Lean into the direction of travel, projected to screen.
  const dir = project(cam, b.x + b.vx, b.y + b.vy, 0);
  const g0 = project(cam, b.x, b.y, 0);
  const lean = speed > 0.05 ? Math.max(-0.42, Math.min(0.42, (dir.sx - g0.sx) * 0.06)) : 0;

  ctx.save();
  ctx.translate(p.sx, p.sy);
  ctx.transform(1, 0, -lean, 1, 0, 0);
  if (b.hidden) ctx.globalAlpha = 0.72;

  const body = ctx.createRadialGradient(-rx * 0.36, -ry * 0.46, r * 0.15, 0, 0, rx * 1.25);
  body.addColorStop(0, skin.rim);
  body.addColorStop(0.42, skin.body);
  body.addColorStop(1, skin.deep);
  ellipsePath(ctx, 0, 0, rx, ry);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.11);
  ctx.strokeStyle = "rgba(24,44,66,0.24)";
  ctx.stroke();

  // Gloss.
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ellipsePath(ctx, -rx * 0.34, -ry * 0.45, rx * 0.3, ry * 0.2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ellipsePath(ctx, rx * 0.36, ry * 0.3, rx * 0.18, ry * 0.12);
  ctx.fill();

  // Face: eyes track the way the blob is heading.
  const gaze = speed > 0.05 ? Math.max(-1, Math.min(1, (dir.sx - g0.sx) * 0.3)) : 0;
  const ex = rx * 0.34;
  const ey = -ry * 0.12;
  const er = r * 0.26;
  const blinking = b.blink <= 0;
  for (const side of [-1, 1]) {
    if (blinking) {
      ctx.strokeStyle = "#22384f";
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(side * ex - er * 0.8, ey);
      ctx.lineTo(side * ex + er * 0.8, ey);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = "#ffffff";
    ellipsePath(ctx, side * ex, ey, er, er * 1.12);
    ctx.fill();
    ctx.fillStyle = "#22384f";
    ellipsePath(ctx, side * ex + gaze * er * 0.4, ey + er * 0.12, er * 0.5, er * 0.58);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ellipsePath(ctx, side * ex + gaze * er * 0.4 - er * 0.16, ey - er * 0.1, er * 0.16, er * 0.16);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(28,54,74,0.8)";
  ctx.lineWidth = Math.max(1, r * 0.13);
  ctx.beginPath();
  const my = ry * 0.34;
  if (b.action === "eat") {
    // Chewing: the mouth opens and closes on the eat timer.
    const open = Math.abs(Math.sin(b.timer * 9)) * r * 0.3 + r * 0.06;
    ctx.ellipse(0, my, r * 0.24, open, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(60,30,40,0.6)";
    ctx.fill();
  } else if (b.species === "red") {
    ctx.moveTo(-r * 0.26, my - r * 0.06);
    ctx.quadraticCurveTo(0, my + r * 0.26, r * 0.26, my - r * 0.16);
  } else {
    ctx.moveTo(-r * 0.22, my);
    ctx.quadraticCurveTo(0, my + r * 0.24, r * 0.22, my);
  }
  ctx.stroke();

  // Little cheek blush for the reds so they read as cheeky, not menacing.
  if (b.species === "red") {
    ctx.fillStyle = "rgba(255,140,140,0.5)";
    ellipsePath(ctx, -rx * 0.62, ry * 0.18, r * 0.16, r * 0.1);
    ctx.fill();
    ellipsePath(ctx, rx * 0.62, ry * 0.18, r * 0.16, r * 0.1);
    ctx.fill();
  }
  ctx.restore();

  if (selected) {
    const w = r * 2.4;
    const y = p.sy - ry - r * 1.1;
    ctx.fillStyle = "rgba(16,32,26,0.5)";
    ctx.fillRect(p.sx - w / 2, y, w, 5);
    ctx.fillStyle = b.energy / b.maxEnergy > 0.35 ? "#8fe06a" : "#ffb04d";
    ctx.fillRect(p.sx - w / 2, y, (w * b.energy) / b.maxEnergy, 5);
  }
}

function drawParticle(ctx: CanvasRenderingContext2D, cam: Camera, q: Particle) {
  const p = project(cam, q.x, q.y, q.z);
  const k = q.life / q.max;
  ctx.globalAlpha = Math.min(1, k * 1.4);
  const s = cam.scale;
  if (q.kind === "sparkle" || q.kind === "spark") {
    const r = s * (q.kind === "spark" ? 0.3 : 0.22) * (0.4 + k);
    ctx.fillStyle = q.tone;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r * 0.42;
      const x = p.sx + Math.cos(a) * rr;
      const y = p.sy + Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (q.kind === "pop") {
    ctx.strokeStyle = q.tone;
    ctx.lineWidth = 2 * k;
    ellipsePath(ctx, p.sx, p.sy, s * 0.5 * (1.6 - k), s * 0.5 * (1.6 - k) * TILT);
    ctx.stroke();
  } else {
    ctx.fillStyle = q.tone;
    ellipsePath(ctx, p.sx, p.sy, s * 0.34 * (1.5 - k), s * 0.3 * (1.5 - k));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function spawnParticles(events: SimEvent[], out: Particle[]) {
  for (const e of events) {
    const n = e.type === "death" ? 7 : e.type === "birth" ? 10 : 6;
    if (e.type === "birth") {
      out.push({
        x: e.x,
        y: e.y,
        z: 0.5,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0.7,
        max: 0.7,
        kind: "pop",
        tone: e.species === "blue" ? "#bfe6ff" : "#ffd0c4",
      });
    }
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash(i, e.id) * 0.6;
      const sp = 0.7 + hash(i, e.id + 7) * 1.5;
      out.push({
        x: e.x,
        y: e.y,
        z: e.type === "eat" ? 0.7 : 0.5,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.6,
        vz: e.type === "death" ? 0.5 : 1.6 + hash(i, e.id + 3),
        life: e.type === "death" ? 0.9 : 0.62,
        max: e.type === "death" ? 0.9 : 0.62,
        kind:
          e.type === "eat"
            ? "sparkle"
            : e.type === "contact"
              ? "spark"
              : e.type === "birth"
                ? "sparkle"
                : "puff",
        tone:
          e.type === "eat"
            ? "#d8ff9c"
            : e.type === "contact"
              ? "#ffd36a"
              : e.type === "birth"
                ? e.species === "blue"
                  ? "#9fd8ff"
                  : "#ffb6a4"
                : "rgba(198,214,206,0.75)",
      });
    }
  }
}

export function stepParticles(list: Particle[], dt: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const q = list[i];
    q.life -= dt;
    if (q.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.z = Math.max(0, q.z + q.vz * dt);
    q.vz -= 4.2 * dt;
  }
  if (list.length > 900) list.splice(0, list.length - 900);
}

interface Item {
  depth: number;
  draw: () => void;
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  world: World,
  cam: Camera,
  particles: Particle[],
  selectedId: number | null,
  w: number,
  h: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#dff3ea");
  sky.addColorStop(1, "#b9dfd3");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  drawDish(ctx, cam, world.radius);

  const items: Item[] = [];
  for (const t of world.trees) {
    const d = project(cam, t.x, t.y, 0).depth;
    items.push({ depth: d, draw: () => drawTree(ctx, cam, t, world.params.fruitLimit) });
  }
  for (const b of world.blobs) {
    const d = project(cam, b.x, b.y, 0).depth;
    items.push({ depth: d + 0.01, draw: () => drawBlob(ctx, cam, b, b.id === selectedId) });
  }
  for (const q of particles) {
    const d = project(cam, q.x, q.y, 0).depth;
    items.push({ depth: d + 0.02, draw: () => drawParticle(ctx, cam, q) });
  }
  items.sort((a, b) => a.depth - b.depth);
  for (const it of items) it.draw();
}

/** Nearest blob to a click, in screen space, or null when nothing is close. */
export function pick(world: World, cam: Camera, mx: number, my: number): Blob | null {
  const r = blobRadius(cam) * 1.7;
  let best: Blob | null = null;
  let bestD = r * r;
  for (const b of world.blobs) {
    const p = blobScreen(cam, b);
    const d = (p.sx - mx) ** 2 + (p.sy - my) ** 2;
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}
